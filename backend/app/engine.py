"""Deterministic, safe template engine.

* Only ``{{ name }}`` substitution - no expressions, loops, filters, code or shell execution.
* Every value is validated against its placeholder definition before substitution.
* Substitution is a single pass: substituted values are never re-scanned.
* Unknown / unexpected fields are rejected.
"""

from __future__ import annotations

import hashlib
import ipaddress
import re
from datetime import UTC, datetime

from .schemas import (
    PLACEHOLDER_REF_RE,
    GenerateResponse,
    Placeholder,
    Template,
)

NOTICE = (
    "Generated text only. It has NOT been applied to any device. Review it, test it in a lab, "
    "and follow your organisation's change-control process before using it on a live network."
)

# Characters allowed in a free-text string when no explicit pattern is given.
# Deliberately excludes quotes, backslash, ! ? | ; & $ ` < > { } so a value cannot close a quoted
# CLI argument, start a comment, trigger CLI help or inject markup.
DEFAULT_STRING_RE = re.compile(r"^[A-Za-z0-9_.:/,()@#+ \-]+$")
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f  \u0085]")
_DOTTED_RE = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
_INT_RE = re.compile(r"^-?\d{1,12}$")
MAX_VLAN_TOKENS = 64


class FieldError(ValueError):
    """A single field failed validation."""


class ValidationFailed(Exception):
    def __init__(self, errors: dict[str, str]):
        super().__init__("validation failed")
        self.errors = errors


# ----------------------------------------------------------------------------- validators
def _ipv4(s: str) -> ipaddress.IPv4Address:
    if not _DOTTED_RE.match(s):
        raise FieldError("Enter an IPv4 address in dotted form, e.g. 192.168.1.10")
    try:
        return ipaddress.IPv4Address(s)
    except ValueError as exc:
        raise FieldError("Not a valid IPv4 address (octets must be 0-255, no leading zeros)") from exc


def _validate_integer(ph: Placeholder, raw: str) -> str:
    if not _INT_RE.match(raw):
        raise FieldError("Enter a whole number")
    n = int(raw)
    assert ph.min is not None and ph.max is not None
    if n < ph.min or n > ph.max:
        raise FieldError(f"Must be between {ph.min} and {ph.max}")
    if ph.multiple_of and n % ph.multiple_of != 0:
        raise FieldError(f"Must be a multiple of {ph.multiple_of}")
    return str(n)


def _validate_string(ph: Placeholder, raw: str) -> str:
    min_len = ph.min_length if ph.min_length is not None else 1
    max_len = ph.max_length if ph.max_length is not None else 64
    if len(raw) < min_len:
        raise FieldError(f"Must be at least {min_len} character(s)")
    if len(raw) > max_len:
        raise FieldError(f"Must be at most {max_len} characters")
    if raw != raw.strip():
        raise FieldError("Must not start or end with spaces")
    if ph.pattern is not None:
        if not re.fullmatch(ph.pattern, raw):
            raise FieldError("Contains characters or a format that is not allowed for this field")
    elif not DEFAULT_STRING_RE.match(raw):
        raise FieldError(
            "Only letters, digits, spaces and . _ - : / , ( ) @ # + are allowed "
            "(quotes and special CLI characters are blocked)"
        )
    return raw


def _validate_enum(ph: Placeholder, raw: str) -> str:
    assert ph.options is not None
    if raw not in ph.options:
        raise FieldError("Must be one of: " + ", ".join(ph.options))
    return raw


def _validate_netmask(raw: str) -> str:
    addr = _ipv4(raw)
    n = int(addr)
    inverted = (~n) & 0xFFFFFFFF
    if inverted & (inverted + 1) != 0:
        raise FieldError("Not a valid subnet mask (e.g. 255.255.255.0)")
    return str(addr)


def _validate_wildcard(raw: str) -> str:
    addr = _ipv4(raw)
    n = int(addr)
    if n & (n + 1) & 0xFFFFFFFF != 0:
        raise FieldError("Not a valid wildcard mask (e.g. 0.0.0.255)")
    return str(addr)


def _validate_cidr(ph: Placeholder, raw: str) -> str:
    if "/" not in raw:
        raise FieldError("Use CIDR form, e.g. 10.0.0.1/24")
    addr_part, _, prefix = raw.partition("/")
    _ipv4(addr_part)
    if not prefix.isdigit() or not (0 <= int(prefix) <= 32):
        raise FieldError("Prefix length must be 0-32")
    iface = ipaddress.IPv4Interface(f"{addr_part}/{prefix}")
    if not ph.allow_host_bits and iface.ip != iface.network.network_address:
        raise FieldError(f"Host bits are set; use the network address {iface.network}")
    return f"{iface.ip}/{iface.network.prefixlen}"


def _parse_vlan_list(raw: str) -> list[tuple[int, int]]:
    tokens = [t.strip() for t in raw.split(",")]
    if not tokens or any(t == "" for t in tokens):
        raise FieldError("Use a comma-separated list such as 10,20,30-40")
    if len(tokens) > MAX_VLAN_TOKENS:
        raise FieldError(f"At most {MAX_VLAN_TOKENS} entries")
    out: list[tuple[int, int]] = []
    for t in tokens:
        m = re.fullmatch(r"(\d{1,4})(?:-(\d{1,4}))?", t)
        if not m:
            raise FieldError(f"'{t}' is not a VLAN ID or range")
        lo = int(m.group(1))
        hi = int(m.group(2)) if m.group(2) else lo
        if not (1 <= lo <= 4094 and 1 <= hi <= 4094):
            raise FieldError("VLAN IDs must be between 1 and 4094")
        if lo > hi:
            raise FieldError(f"Range '{t}' must go from low to high")
        out.append((lo, hi))
    return out


def _validate_vlan_list(ph: Placeholder, raw: str) -> str:
    ranges = _parse_vlan_list(raw)
    if ph.output_style == "space-to":
        parts = [str(lo) if lo == hi else f"{lo} to {hi}" for lo, hi in ranges]
        return " ".join(parts)
    parts = [str(lo) if lo == hi else f"{lo}-{hi}" for lo, hi in ranges]
    return ",".join(parts)


def validate_value(ph: Placeholder, value: str | int) -> str:
    """Validate one value and return its normalised string form. Raises FieldError."""
    if isinstance(value, bool):
        raise FieldError("Invalid value type")
    raw = str(value)
    if _CONTROL_RE.search(raw):
        raise FieldError("Line breaks and control characters are not allowed")
    if ph.type != "string":
        raw = raw.strip()
    if raw == "":
        raise FieldError("This field is required")
    if ph.type == "integer":
        return _validate_integer(ph, raw)
    if ph.type == "string":
        return _validate_string(ph, raw)
    if ph.type == "enum":
        return _validate_enum(ph, raw)
    if ph.type == "ipv4":
        return str(_ipv4(raw))
    if ph.type == "ipv4_netmask":
        return _validate_netmask(raw)
    if ph.type == "ipv4_wildcard":
        return _validate_wildcard(raw)
    if ph.type == "ipv4_cidr":
        return _validate_cidr(ph, raw)
    if ph.type == "vlan_list":
        return _validate_vlan_list(ph, raw)
    raise FieldError("Unsupported placeholder type")  # pragma: no cover


def validate_values(
    placeholders: dict[str, Placeholder], values: dict[str, str | int]
) -> dict[str, str]:
    """Validate all values; raise ValidationFailed with per-field messages."""
    errors: dict[str, str] = {}
    clean: dict[str, str] = {}
    for name in values:
        if name not in placeholders:
            errors[name] = "Unexpected field"
    for name, ph in placeholders.items():
        if name in values and values[name] is not None and str(values[name]) != "":
            supplied: str | int | None = values[name]
        else:
            supplied = ph.default
        if supplied is None:
            errors.setdefault(name, "This field is required")
            continue
        try:
            clean[name] = validate_value(ph, supplied)
        except FieldError as exc:
            errors[name] = str(exc)
    if errors:
        raise ValidationFailed(errors)
    return clean


# ----------------------------------------------------------------------------- rendering
def substitute(text: str, values: dict[str, str]) -> str:
    return PLACEHOLDER_REF_RE.sub(lambda m: values[m.group(1)], text)


def template_version(t: Template) -> str:
    h = hashlib.sha256()
    h.update(t.template.encode())
    for c in t.verification_commands:
        h.update(c.encode())
    return h.hexdigest()[:12]


def render(t: Template, values: dict[str, str | int]) -> GenerateResponse:
    clean = validate_values(t.placeholders, values)
    return GenerateResponse(
        template_id=t.id,
        template_title=t.title,
        vendor=t.vendor,
        platform=t.platform,
        kind=t.kind,
        verification_status=t.verification_status,
        compatibility_note=t.compatibility_note,
        template_version=template_version(t),
        generated_at=datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        config=substitute(t.template.rstrip("\n"), clean),
        verification_commands=[substitute(c, clean) for c in t.verification_commands],
        warnings=list(t.warnings),
        rollback_notes=t.rollback_notes,
        values=clean,
        notice=NOTICE,
    )


# ----------------------------------------------------------------------------- personal checks
_BODY_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_SUSPICIOUS = [
    (re.compile(r"<\s*/?\s*(script|iframe|img|svg|object)\b", re.I), "contains HTML/script-like markup"),
    (re.compile(r"\$\(|`"), "contains shell-style substitution characters"),
    (re.compile(r"(?i)\b(password|secret|community|psksecret|key)\s+(?!<)\S{4,}"), "may contain a literal secret - use a placeholder or set secrets interactively"),
]


def check_personal_body(body: str) -> list[str]:
    """Hard errors raise ValueError; soft findings are returned as warnings."""
    if _BODY_CONTROL_RE.search(body):
        raise ValueError("Template body contains control characters")
    if body.count("\n") > 500:
        raise ValueError("Template body is limited to 500 lines")
    return [msg for rx, msg in _SUSPICIOUS if rx.search(body)]
