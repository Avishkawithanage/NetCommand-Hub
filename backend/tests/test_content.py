"""Content tests: every bundled template must be consistent and honestly labelled."""

import pytest

from app.engine import render
from app.loader import ContentError, load_store
from app.schemas import PLACEHOLDER_REF_RE


def test_loads_and_has_all_vendors(store):
    assert {v.id for v in store.catalog.vendors} == {"cisco", "dell", "huawei", "fortinet"}
    for p in store.catalog.platforms:
        assert any(t.platform == p.id for t in store.templates.values()), f"no templates for {p.id}"


def test_ids_unique_and_prefixed(store):
    assert len(store.order) == len(set(store.order)) == len(store.templates)
    for t in store.templates.values():
        assert t.id.startswith(f"{t.vendor}-{t.platform}-")


def test_references_exist(store):
    cats = {c.id for c in store.catalog.categories}
    for t in store.templates.values():
        assert t.category in cats
        assert store.platform(t.platform).vendor == t.vendor
        assert all(r in store.templates for r in t.related)


def test_reviewed_entries_have_evidence(store):
    for t in store.templates.values():
        if t.verification_status in ("reviewed", "lab-tested"):
            assert t.reviewed_at and t.review_evidence and t.source_urls


def test_reviewed_templates_are_documentation_reviews_only(store):
    # Nothing has been lab-tested yet, and reviewed entries must be platform-scoped.
    statuses = {t.verification_status for t in store.templates.values()}
    assert "lab-tested" not in statuses
    reviewed = {t.id for t in store.templates.values() if t.verification_status == "reviewed"}
    assert reviewed == {
        "cisco-ios-xe-vlan-create",
        "cisco-ios-xe-access-port",
        "cisco-ios-xe-trunk-port",
        "cisco-ios-xe-svi-ip",
    }
    for tid in reviewed:
        t = store.templates[tid]
        assert t.os_versions and "lab" not in (t.review_evidence or "").lower().replace("no lab test", "")
    # classic IOS shares the text but was not reviewed
    assert store.templates["cisco-ios-vlan-create"].verification_status == "unverified"


def test_compatibility_stated(store):
    for t in store.templates.values():
        assert t.compatibility_note.strip()


def test_every_template_renders_with_its_examples(store):
    """Each template must produce output when filled with its own example/default values."""
    for t in store.templates.values():
        values = {}
        for name, p in t.placeholders.items():
            values[name] = p.example if p.example is not None else p.default
            assert values[name] is not None, f"{t.id}:{name} has no example/default"
        out = render(t, values)  # raises if an example fails its own validation
        assert out.config.strip()
        assert not PLACEHOLDER_REF_RE.search(out.config)
        assert not any(PLACEHOLDER_REF_RE.search(c) for c in out.verification_commands)


def test_platform_separation_in_output(store):
    """Spot checks that vendor/platform syntax was not mixed up."""
    def cfg(tid):
        t = store.templates[tid]
        return render(t, {n: p.example or p.default for n, p in t.placeholders.items()}).config

    assert "ip address 192.168.10.1/24" in cfg("cisco-nx-os-svi-ip")
    assert "ip address 192.168.10.1 255.255.255.0" in cfg("cisco-ios-xe-svi-ip")
    assert "interface Vlanif 10" in cfg("huawei-vrp-vlanif-ip")
    assert "config system interface" in cfg("fortinet-fortios-interface-static-ip")
    assert "untagged" in cfg("dell-os9-access-port")
    assert "switchport access vlan" in cfg("dell-os10-access-port")


def test_broken_data_is_rejected(tmp_path):
    (tmp_path / "vendors").mkdir()
    (tmp_path / "catalog.yaml").write_text(
        "vendors: [{id: cisco, name: C, description: d, website_url: u}]\n"
        "platforms: [{id: ios, vendor: cisco, name: I, os_family: I, version_notes: n}]\n"
        "categories: [{id: vlan, name: V, description: d}]\n"
    )
    (tmp_path / "glossary.yaml").write_text("[]\n")
    (tmp_path / "vendors" / "bad.yaml").write_text(
        "vendor: cisco\nplatforms: [ios]\ncompatibility_note: x\ntemplates:\n"
        "  - {id: a, title: T, category: nope, task: t, summary: s, difficulty: beginner,\n"
        "     verification_status: unverified, added_at: 2026-01-01, template: 'x {{missing}}'}\n"
    )
    with pytest.raises(ContentError) as e:
        load_store(tmp_path)
    joined = "\n".join(e.value.problems)
    assert "undefined placeholders" in joined
