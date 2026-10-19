def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok" and r.json()["templates"] > 100


def test_vendors_platforms_categories_stats(client):
    v = client.get("/api/vendors").json()
    assert {x["id"] for x in v} == {"cisco", "dell", "huawei", "fortinet"}
    assert all(x["template_count"] == sum(p["template_count"] for p in x["platforms"]) for x in v)
    assert {p["id"] for p in client.get("/api/platforms?vendor=dell").json()} == {"os6", "os9", "os10"}
    assert len(client.get("/api/categories").json()) >= 10
    s = client.get("/api/stats").json()
    assert s["templates"] == sum(x["template_count"] for x in v)
    assert sum(s["by_status"].values()) == s["templates"] and s["by_status"]["reviewed"] == 4
    assert len(s["recent"]) == 6


def test_list_filters_and_validation(client):
    r = client.get("/api/templates", params={"q": "vlan", "vendor": "cisco", "platform": "nx-os"}).json()
    assert r["total"] > 0 and {i["platform"] for i in r["items"]} == {"nx-os"}
    assert client.get("/api/templates?sort=bogus").status_code == 422
    assert client.get("/api/templates?page=0").status_code == 422
    assert client.get("/api/templates?page_size=1000").status_code == 422
    assert client.get("/api/search", params={"q": "ospf"}).json()["total"] > 0


def test_ids_filter(client):
    r = client.get("/api/templates", params={"ids": "cisco-ios-xe-vlan-create,nope"}).json()
    assert [i["id"] for i in r["items"]] == ["cisco-ios-xe-vlan-create"]


def test_detail_and_404(client):
    d = client.get("/api/templates/cisco-ios-xe-vlan-create").json()
    assert d["verification_status"] == "reviewed" and d["related_templates"] and d["source_urls"] and d["review_evidence"]
    r = client.get("/api/templates/does-not-exist")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"
    assert client.get("/api/nope").status_code == 404


def test_generate_ok(client):
    r = client.post("/api/templates/cisco-ios-xe-vlan-create/generate", json={"values": {"vlan_id": 10, "vlan_name": "USERS"}})
    assert r.status_code == 200
    j = r.json()
    assert j["config"] == "vlan 10\n name USERS"
    assert "show vlan id 10" in j["verification_commands"]
    assert j["verification_status"] == "reviewed"


def test_generate_validation_errors(client):
    url = "/api/templates/cisco-ios-xe-vlan-create/generate"
    r = client.post(url, json={"values": {"vlan_id": 5000, "vlan_name": "x\ny", "extra": "1"}})
    assert r.status_code == 422
    e = r.json()["error"]
    assert e["code"] == "validation_failed"
    assert set(e["details"]) == {"vlan_id", "vlan_name", "extra"}
    assert client.post(url, json={"values": {}}).status_code == 422
    assert client.post(url, json={"values": {"vlan_id": 1, "vlan_name": "a"}, "bogus": 1}).status_code == 422
    assert client.post("/api/templates/nope/generate", json={"values": {}}).status_code == 404


def test_generate_blocks_injection(client):
    url = "/api/templates/fortinet-fortios-hostname-basics/generate"
    r = client.post(url, json={"values": {"hostname": 'x"\n end\nconfig system admin'}})
    assert r.status_code == 422


def test_diff_endpoint(client):
    r = client.post("/api/diff", json={"original": "a\nb", "updated": "a\nc"}).json()
    assert (r["added"], r["removed"], r["unchanged"]) == (1, 1, 1)
    assert client.post("/api/diff", json={"original": "x" * 200_001, "updated": ""}).status_code == 422
    assert client.post("/api/diff", json={"original": "a"}).status_code == 422


def test_body_limit(client):
    big = "x" * 1_100_000
    r = client.post("/api/diff", content=big, headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_glossary(client):
    g = client.get("/api/glossary").json()
    assert any(x["term"] == "VLAN" for x in g)
    assert [x["term"] for x in client.get("/api/glossary?q=lacp").json()]


PERSONAL = {
    "id": "personal-abc123", "title": "My VLAN", "vendor": "cisco", "platform": "ios-xe", "category": "vlan",
    "summary": "mine", "template": "vlan {{vid}}", "placeholders": {"vid": {"type": "integer", "min": 1, "max": 4094}},
}


def test_personal_validate_and_generate(client):
    assert client.post("/api/personal/validate", json=PERSONAL).json() == {"ok": True, "warnings": [], "verification_status": "unverified"}
    r = client.post("/api/personal/generate", json={"template": PERSONAL, "values": {"vid": 77}}).json()
    assert r["config"] == "vlan 77" and r["verification_status"] == "unverified"
    assert any("Personal / Unverified" in w for w in r["warnings"])


def test_personal_rejections(client):
    bad = dict(PERSONAL, vendor="nope")
    assert client.post("/api/personal/validate", json=bad).status_code == 422
    bad = dict(PERSONAL, platform="os10")  # platform of another vendor
    assert client.post("/api/personal/validate", json=bad).status_code == 422
    bad = dict(PERSONAL, template="vlan {{undefined}}")
    assert client.post("/api/personal/validate", json=bad).status_code == 422
    bad = dict(PERSONAL, id="x")
    assert client.post("/api/personal/validate", json=bad).status_code == 422
    bad = dict(PERSONAL, verification_status="reviewed")  # cannot self-certify
    assert client.post("/api/personal/validate", json=bad).status_code == 422
    flagged = dict(PERSONAL, template="vlan {{vid}}\nenable secret SuperSecret1")
    assert client.post("/api/personal/validate", json=flagged).json()["warnings"]


def test_errors_never_leak_traces(client):
    r = client.get("/api/templates", params={"q": "x" * 500})
    assert r.status_code == 422
    assert "Traceback" not in r.text
