import pytest

from app.engine import (
    FieldError,
    ValidationFailed,
    check_personal_body,
    render,
    substitute,
    validate_value,
    validate_values,
)
from app.schemas import Placeholder, Template


def ph(**kw):
    return Placeholder(**kw)


# ----------------------------------------------------------------------------- field validators
@pytest.mark.parametrize("val,ok", [("10", True), (10, True), ("4094", True), ("0", False), ("4095", False), ("1.5", False), ("abc", False), ("", False), (True, False)])
def test_integer(val, ok):
    p = ph(type="integer", min=1, max=4094)
    if ok:
        assert validate_value(p, val) == str(int(val))
    else:
        with pytest.raises(FieldError):
            validate_value(p, val)


def test_integer_multiple_of():
    p = ph(type="integer", min=0, max=61440, multiple_of=4096)
    assert validate_value(p, 4096) == "4096"
    with pytest.raises(FieldError):
        validate_value(p, 4097)


@pytest.mark.parametrize("val,ok", [("192.168.1.1", True), ("0.0.0.0", True), ("256.1.1.1", False), ("1.2.3", False), ("01.2.3.4", False), ("1.2.3.4/24", False), ("a.b.c.d", False)])
def test_ipv4(val, ok):
    p = ph(type="ipv4")
    if ok:
        assert validate_value(p, val) == val
    else:
        with pytest.raises(FieldError):
            validate_value(p, val)


@pytest.mark.parametrize("val,ok", [("255.255.255.0", True), ("255.255.255.255", True), ("0.0.0.0", True), ("255.255.0.255", False), ("255.0.255.0", False)])
def test_netmask(val, ok):
    p = ph(type="ipv4_netmask")
    if ok:
        assert validate_value(p, val) == val
    else:
        with pytest.raises(FieldError):
            validate_value(p, val)


@pytest.mark.parametrize("val,ok", [("0.0.0.255", True), ("0.0.0.0", True), ("255.255.255.255", True), ("0.0.255.0", False), ("255.0.0.255", False)])
def test_wildcard(val, ok):
    p = ph(type="ipv4_wildcard")
    if ok:
        assert validate_value(p, val) == val
    else:
        with pytest.raises(FieldError):
            validate_value(p, val)


def test_cidr():
    assert validate_value(ph(type="ipv4_cidr"), "10.0.0.5/24") == "10.0.0.5/24"
    with pytest.raises(FieldError):
        validate_value(ph(type="ipv4_cidr"), "10.0.0.5")
    with pytest.raises(FieldError):
        validate_value(ph(type="ipv4_cidr"), "10.0.0.5/33")
    strict = ph(type="ipv4_cidr", allow_host_bits=False)
    assert validate_value(strict, "10.0.0.0/24") == "10.0.0.0/24"
    with pytest.raises(FieldError):
        validate_value(strict, "10.0.0.5/24")


def test_vlan_list_comma_and_space_styles():
    assert validate_value(ph(type="vlan_list"), "10, 20,30-40") == "10,20,30-40"
    assert validate_value(ph(type="vlan_list", output_style="space-to"), "10,20,30-40") == "10 20 30 to 40"
    for bad in ["0", "4095", "10,,20", "20-10", "a", "10;20", "1-2-3"]:
        with pytest.raises(FieldError):
            validate_value(ph(type="vlan_list"), bad)


def test_enum():
    p = ph(type="enum", options=["active", "passive"])
    assert validate_value(p, "active") == "active"
    with pytest.raises(FieldError):
        validate_value(p, "on")


@pytest.mark.parametrize("bad", ["a\nb", "a\rb", "a\x00b", "a\tb", 'say "hi"', "a!b", "a?b", "a|b", "a;b", "a`b", "a$b", "a b"])
def test_string_rejects_injection(bad):
    with pytest.raises(FieldError):
        validate_value(ph(type="string"), bad)


def test_string_limits_and_pattern():
    assert validate_value(ph(type="string", max_length=5), "abcde") == "abcde"
    with pytest.raises(FieldError):
        validate_value(ph(type="string", max_length=5), "abcdef")
    with pytest.raises(FieldError):
        validate_value(ph(type="string", pattern=r"^[A-Z]+$"), "abc")
    with pytest.raises(FieldError):  # pattern is fullmatch, trailing newline cannot slip through
        validate_value(ph(type="string", pattern=r"^[A-Z]+$"), "ABC\n")


def test_unexpected_and_missing_fields():
    phs = {"a": ph(type="integer", min=1, max=5), "b": ph(type="string", default="x")}
    with pytest.raises(ValidationFailed) as e:
        validate_values(phs, {"zzz": "1"})
    assert e.value.errors["zzz"] == "Unexpected field"
    assert e.value.errors["a"] == "This field is required"
    assert validate_values(phs, {"a": 2}) == {"a": "2", "b": "x"}


def test_substitution_is_single_pass():
    # a value that itself looks like a placeholder must not be re-expanded
    out = substitute("x {{a}} {{b}}", {"a": "{{b}}", "b": "B"})
    assert out == "x {{b}} B"


def _t(**over):
    base = dict(
        id="x-y-z", title="T", vendor="cisco", platform="ios", compatibility_note="n", category="vlan",
        task="t", summary="s", difficulty="beginner", verification_status="unverified", added_at="2026-01-01",
        template="vlan {{vlan_id}}", placeholders={"vlan_id": {"type": "integer", "min": 1, "max": 4094}},
        verification_commands=["show vlan id {{vlan_id}}"],
    )
    base.update(over)
    return Template.model_validate(base)


def test_render_and_metadata():
    r = render(_t(), {"vlan_id": 20})
    assert r.config == "vlan 20"
    assert r.verification_commands == ["show vlan id 20"]
    assert "NOT been applied" in r.notice
    assert len(r.template_version) == 12 and r.generated_at.endswith("Z")


def test_template_rejects_undefined_unused_and_fake_review():
    with pytest.raises(ValueError):
        _t(template="vlan {{oops}}")
    with pytest.raises(ValueError):
        _t(placeholders={"vlan_id": {"type": "integer", "min": 1, "max": 5}, "extra": {"type": "ipv4"}})
    with pytest.raises(ValueError):
        _t(verification_status="reviewed")  # no evidence
    with pytest.raises(ValueError):
        _t(verification_status="lab-tested", reviewed_at="2026-01-01")
    with pytest.raises(ValueError):
        _t(unknown_field=1)


def test_personal_body_checks():
    assert check_personal_body("vlan 10") == []
    assert check_personal_body("<script>alert(1)</script>")
    assert check_personal_body("enable secret MySecret123")
    with pytest.raises(ValueError):
        check_personal_body("a\x00b")
