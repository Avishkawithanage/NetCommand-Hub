"""Pydantic schemas: the single source of truth for catalogue, template and API shapes.

Every model forbids unknown fields so that malformed or hostile template/import data is
rejected instead of being silently ignored.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TEMPLATE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9\-]{1,119}$")
PLACEHOLDER_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
# {{ name }} - the only substitution syntax. No expressions, filters or logic.
PLACEHOLDER_REF_RE = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}")

Difficulty = Literal["beginner", "intermediate", "advanced"]
VerificationStatus = Literal["draft", "unverified", "reviewed", "lab-tested", "needs-review"]
# config      = commands that change device configuration
# show        = read-only verification / troubleshooting commands
# operational = exec-mode actions (save, backup, ...) that are neither config nor show
Kind = Literal["config", "show", "operational"]
PlaceholderType = Literal[
    "integer", "string", "enum", "ipv4", "ipv4_netmask", "ipv4_wildcard", "ipv4_cidr", "vlan_list"
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --------------------------------------------------------------------------- catalogue
class Vendor(Strict):
    id: str
    name: str
    description: str
    website_url: str


class Platform(Strict):
    id: str
    vendor: str
    name: str
    os_family: str
    version_notes: str


class Category(Strict):
    id: str
    name: str
    description: str


class Catalog(Strict):
    vendors: list[Vendor]
    platforms: list[Platform]
    categories: list[Category]


class GlossaryEntry(Strict):
    term: str
    aka: list[str] = Field(default_factory=list)
    definition: str


# --------------------------------------------------------------------------- templates
class Placeholder(Strict):
    type: PlaceholderType
    label: str | None = None
    description: str = ""
    example: str | None = None
    default: str | int | None = None
    # integer
    min: int | None = None
    max: int | None = None
    multiple_of: int | None = None
    # string
    min_length: int | None = None
    max_length: int | None = None
    pattern: str | None = None
    # enum
    options: list[str] | None = None
    # ipv4_cidr: require a network address (host bits zero)
    allow_host_bits: bool = True
    # vlan_list rendering: "comma" -> 10,20,30-40 ; "space-to" -> 10 20 30 to 40
    output_style: Literal["comma", "space-to"] = "comma"

    @model_validator(mode="after")
    def _check_params(self) -> Placeholder:
        if self.type == "enum" and not self.options:
            raise ValueError("enum placeholders need a non-empty 'options' list")
        if self.type != "enum" and self.options is not None:
            raise ValueError("'options' is only valid for enum placeholders")
        if self.type == "integer" and (self.min is None or self.max is None):
            raise ValueError("integer placeholders must define 'min' and 'max'")
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("'min' must not exceed 'max'")
        if self.type != "integer" and (
            self.min is not None or self.max is not None or self.multiple_of is not None
        ):
            raise ValueError("'min'/'max'/'multiple_of' are only valid for integer placeholders")
        if self.type != "string" and (
            self.min_length is not None or self.max_length is not None or self.pattern is not None
        ):
            raise ValueError("'min_length'/'max_length'/'pattern' are only valid for string placeholders")
        if self.pattern is not None:
            try:
                re.compile(self.pattern)
            except re.error as exc:
                raise ValueError(f"invalid regex pattern: {exc}") from exc
        return self


class ExplanationItem(Strict):
    line: str
    text: str


class Template(Strict):
    id: str
    title: str
    vendor: str
    platform: str
    os_versions: list[str] = Field(default_factory=list)
    compatibility_note: str
    category: str
    task: str
    kind: Kind = "config"
    summary: str
    difficulty: Difficulty
    verification_status: VerificationStatus
    reviewed_at: date | None = None
    review_evidence: str | None = None
    added_at: date
    source_urls: list[str] = Field(default_factory=list)
    prerequisites: list[str] = Field(default_factory=list)
    placeholders: dict[str, Placeholder] = Field(default_factory=dict)
    template: str
    explanation: list[ExplanationItem] = Field(default_factory=list)
    expected_outcome: str = ""
    verification_commands: list[str] = Field(default_factory=list)
    rollback_notes: str = ""
    warnings: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    related: list[str] = Field(default_factory=list)

    @field_validator("id")
    @classmethod
    def _id_ok(cls, v: str) -> str:
        if not TEMPLATE_ID_RE.match(v):
            raise ValueError("id must be lowercase letters, digits and hyphens (2-120 chars)")
        return v

    @field_validator("placeholders")
    @classmethod
    def _names_ok(cls, v: dict[str, Placeholder]) -> dict[str, Placeholder]:
        for name in v:
            if not PLACEHOLDER_NAME_RE.match(name):
                raise ValueError(f"invalid placeholder name {name!r} (use lowercase, digits, underscore)")
        return v

    @model_validator(mode="after")
    def _check_template(self) -> Template:
        used = referenced_placeholders(self.template, *self.verification_commands)
        unknown = used - set(self.placeholders)
        if unknown:
            raise ValueError(f"template references undefined placeholders: {sorted(unknown)}")
        unused = set(self.placeholders) - used
        if unused:
            raise ValueError(f"placeholders defined but never used: {sorted(unused)}")
        if not self.template.strip():
            raise ValueError("template body must not be empty")
        if self.verification_status in ("reviewed", "lab-tested"):
            if not (self.reviewed_at and self.review_evidence and self.source_urls):
                raise ValueError(
                    f"status '{self.verification_status}' requires reviewed_at, review_evidence and source_urls"
                )
        return self


def referenced_placeholders(*texts: str) -> set[str]:
    out: set[str] = set()
    for t in texts:
        out.update(PLACEHOLDER_REF_RE.findall(t))
    return out


# --------------------------------------------------------------------------- personal templates
class PersonalTemplate(Strict):
    """What a user may author. Always stored/served as personal + unverified."""

    id: str = Field(pattern=r"^personal-[a-z0-9\-]{4,60}$")
    title: str = Field(min_length=3, max_length=120)
    vendor: str
    platform: str
    category: str
    summary: str = Field(min_length=3, max_length=500)
    difficulty: Difficulty = "intermediate"
    template: str = Field(min_length=1, max_length=20000)
    placeholders: dict[str, Placeholder] = Field(default_factory=dict)
    verification_commands: list[str] = Field(default_factory=list, max_length=50)
    warnings: list[str] = Field(default_factory=list, max_length=20)
    tags: list[str] = Field(default_factory=list, max_length=20)


# --------------------------------------------------------------------------- API shapes
class TemplateSummary(BaseModel):
    id: str
    title: str
    vendor: str
    platform: str
    os_versions: list[str]
    category: str
    task: str
    kind: Kind
    summary: str
    difficulty: Difficulty
    verification_status: VerificationStatus
    reviewed_at: date | None
    added_at: date
    tags: list[str]


class SearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[TemplateSummary]
    facets: dict[str, dict[str, int]]


class GenerateRequest(Strict):
    values: dict[str, str | int] = Field(default_factory=dict)


class GenerateResponse(BaseModel):
    template_id: str
    template_title: str
    vendor: str
    platform: str
    kind: Kind
    verification_status: VerificationStatus
    compatibility_note: str
    template_version: str
    generated_at: str
    config: str
    verification_commands: list[str]
    warnings: list[str]
    rollback_notes: str
    values: dict[str, str]
    notice: str


class PersonalGenerateRequest(Strict):
    template: PersonalTemplate
    values: dict[str, str | int] = Field(default_factory=dict)


class PersonalValidateResponse(BaseModel):
    ok: bool
    warnings: list[str]
    verification_status: Literal["unverified"] = "unverified"


class DiffRequest(Strict):
    original: str = Field(max_length=200_000)
    updated: str = Field(max_length=200_000)
    ignore_trailing_whitespace: bool = False
    ignore_blank_lines: bool = False


class DiffRow(BaseModel):
    type: Literal["added", "removed", "unchanged"]
    old_line: int | None
    new_line: int | None
    text: str


class DiffResponse(BaseModel):
    rows: list[DiffRow]
    added: int
    removed: int
    unchanged: int
    identical: bool
    note: str
