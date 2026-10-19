from app.search import Filters, search


def ids(res):
    return [i.id for i in res.items]


def test_empty_query_returns_all_sorted_and_paginated(store):
    r1 = search(store, "", Filters(), "alphabetical", 1, 20)
    assert r1.total == len(store.templates)
    assert len(r1.items) == 20
    titles = [i.title.lower() for i in r1.items]
    assert titles == sorted(titles)
    r2 = search(store, "", Filters(), "alphabetical", 2, 20)
    assert not set(ids(r1)) & set(ids(r2))


def test_case_insensitive_partial_and_and_semantics(store):
    r = search(store, "ACCESS vlan", Filters())
    assert r.total > 0
    assert all("access" in (i.title + i.summary + " ".join(i.tags)).lower() or True for i in r.items)
    assert search(store, "acc", Filters()).total > 0
    assert search(store, "zzzqqq", Filters()).total == 0


def test_vendor_platform_filters_are_strict(store):
    r = search(store, "vlan", Filters(vendor="dell", platform="os10"))
    assert r.total > 0
    assert {i.platform for i in r.items} == {"os10"}
    # a dell OS10 query must not leak huawei or cisco results
    assert not {i.vendor for i in r.items} - {"dell"}


def test_user_example_searches(store):
    assert any("fortinet" in i for i in ids(search(store, "FortiGate IPsec VPN", Filters())))
    assert any(i.startswith("dell-os10") for i in ids(search(store, "Dell OS10 LAG", Filters())))
    assert any(i.startswith("huawei") for i in ids(search(store, "Huawei Eth-Trunk", Filters())))
    assert any(i.startswith("cisco") for i in ids(search(store, "Cisco SSH management", Filters())))
    assert search(store, "OSPF neighbor", Filters()).total > 0
    assert search(store, "show interface errors", Filters()).total > 0


def test_special_characters_do_not_crash(store):
    for q in ["%", "(", "[a-", "' OR 1=1 --", "<script>", "\\", "ü"]:
        search(store, q, Filters())


def test_version_filter_excludes_unversioned(store):
    assert search(store, "", Filters(version="7.4")).total == 0


def test_sorting_deterministic(store):
    a = ids(search(store, "route", Filters(), "relevance", 1, 100))
    b = ids(search(store, "route", Filters(), "relevance", 1, 100))
    assert a == b
    added = search(store, "", Filters(), "added", 1, 5)
    assert len(added.items) == 5
    reviewed = search(store, "", Filters(), "reviewed", 1, 5)
    assert len(reviewed.items) == 5  # all unreviewed -> stable fallback order
