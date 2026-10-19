"""Loads and validates the catalogue, glossary and template YAML files.

Template files live under ``data/vendors/**.yaml`` and have the shape::

    vendor: cisco
    platforms: [ios, ios-xe]          # each template is expanded once per platform
    os_versions: []                   # default for every template in the file
    compatibility_note: "..."         # default for every template in the file
    templates:
      - id: vlan-create               # final id = <vendor>-<platform>-<id>
        ...

Loading is strict: any problem raises ``ContentError`` listing every issue found.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from .schemas import Catalog, GlossaryEntry, Template

FILE_KEYS = {"vendor", "platforms", "os_versions", "compatibility_note", "templates"}
MAX_FILE_BYTES = 2_000_000


class ContentError(Exception):
    def __init__(self, problems: list[str]):
        super().__init__("\n".join(problems))
        self.problems = problems


@dataclass
class Store:
    catalog: Catalog
    glossary: list[GlossaryEntry]
    templates: dict[str, Template]
    order: list[str] = field(default_factory=list)

    def vendor_name(self, vendor_id: str) -> str:
        return next((v.name for v in self.catalog.vendors if v.id == vendor_id), vendor_id)

    def platform(self, platform_id: str):
        return next((p for p in self.catalog.platforms if p.id == platform_id), None)

    def category_name(self, cat_id: str) -> str:
        return next((c.name for c in self.catalog.categories if c.id == cat_id), cat_id)


def _read_yaml(path: Path) -> Any:
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ContentError([f"{path}: file too large"])
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)  # safe_load: never constructs arbitrary Python objects


def _fmt_validation(path: Path, ident: str, exc: ValidationError) -> list[str]:
    out = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"])
        out.append(f"{path.name}: {ident}: {loc}: {err['msg']}")
    return out


def load_store(data_dir: Path) -> Store:
    problems: list[str] = []

    try:
        catalog = Catalog.model_validate(_read_yaml(data_dir / "catalog.yaml"))
    except (ValidationError, OSError, yaml.YAMLError, ContentError) as exc:
        raise ContentError([f"catalog.yaml: {exc}"]) from exc

    vendor_ids = {v.id for v in catalog.vendors}
    platform_vendor = {p.id: p.vendor for p in catalog.platforms}
    category_ids = {c.id for c in catalog.categories}
    for p in catalog.platforms:
        if p.vendor not in vendor_ids:
            problems.append(f"catalog.yaml: platform {p.id} references unknown vendor {p.vendor}")
    for name, items in (("vendor", catalog.vendors), ("platform", catalog.platforms), ("category", catalog.categories)):
        ids = [i.id for i in items]
        if len(ids) != len(set(ids)):
            problems.append(f"catalog.yaml: duplicate {name} ids")

    try:
        raw_gloss = _read_yaml(data_dir / "glossary.yaml") or []
        glossary = [GlossaryEntry.model_validate(g) for g in raw_gloss]
    except (ValidationError, OSError, yaml.YAMLError, ContentError) as exc:
        raise ContentError([f"glossary.yaml: {exc}"]) from exc

    templates: dict[str, Template] = {}
    order: list[str] = []
    vendors_dir = data_dir / "vendors"
    files = sorted(vendors_dir.rglob("*.yaml")) if vendors_dir.exists() else []
    if not files:
        problems.append("no template files found under data/vendors")

    for path in files:
        try:
            doc = _read_yaml(path)
        except (OSError, yaml.YAMLError, ContentError) as exc:
            problems.append(f"{path.name}: cannot read: {exc}")
            continue
        if not isinstance(doc, dict):
            problems.append(f"{path.name}: top level must be a mapping")
            continue
        extra = set(doc) - FILE_KEYS
        if extra:
            problems.append(f"{path.name}: unknown top-level keys {sorted(extra)}")
            continue
        vendor = doc.get("vendor")
        platforms = doc.get("platforms") or []
        if vendor not in vendor_ids:
            problems.append(f"{path.name}: unknown vendor {vendor!r}")
            continue
        for plat in platforms:
            if platform_vendor.get(plat) != vendor:
                problems.append(f"{path.name}: platform {plat!r} does not belong to vendor {vendor!r}")
        for raw in doc.get("templates") or []:
            local_id = str(raw.get("id")) if isinstance(raw, dict) else "?"
            for plat in platforms:
                if platform_vendor.get(plat) != vendor:
                    continue
                merged = dict(raw)
                # Per-platform overrides let one shared template carry review evidence for only the
                # platform that was actually checked (e.g. IOS-XE reviewed, IOS still unverified).
                overrides = (merged.pop("platform_overrides", None) or {}).get(plat, {})
                merged.update(overrides)
                merged["id"] = f"{vendor}-{plat}-{local_id}"
                merged["vendor"] = vendor
                merged["platform"] = plat
                merged.setdefault("os_versions", doc.get("os_versions", []))
                merged.setdefault("compatibility_note", doc.get("compatibility_note", ""))
                merged["related"] = [f"{vendor}-{plat}-{r}" for r in raw.get("related", [])]
                try:
                    t = Template.model_validate(merged)
                except ValidationError as exc:
                    problems.extend(_fmt_validation(path, merged["id"], exc))
                    continue
                if t.id in templates:
                    problems.append(f"{path.name}: duplicate template id {t.id}")
                    continue
                if t.category not in category_ids:
                    problems.append(f"{path.name}: {t.id}: unknown category {t.category!r}")
                if not t.compatibility_note.strip():
                    problems.append(f"{path.name}: {t.id}: compatibility_note is required")
                templates[t.id] = t
                order.append(t.id)

    for t in templates.values():
        for r in t.related:
            if r not in templates:
                problems.append(f"{t.id}: related template {r} does not exist")

    if problems:
        raise ContentError(problems)
    return Store(catalog=catalog, glossary=glossary, templates=templates, order=order)
