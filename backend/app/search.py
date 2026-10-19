"""Deterministic in-memory search, filtering, sorting and pagination."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

from .loader import Store
from .schemas import SearchResponse, Template, TemplateSummary

SORTS = ("relevance", "alphabetical", "reviewed", "added")
_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9\-_./]*", re.I)


@dataclass
class Filters:
    vendor: str | None = None
    platform: str | None = None
    category: str | None = None
    status: str | None = None
    difficulty: str | None = None
    kind: str | None = None
    version: str | None = None


def tokenize(q: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(q)][:12]


def _fields(store: Store, t: Template) -> list[tuple[int, str]]:
    """(weight, lowercase text) pairs searched for each template."""
    plat = store.platform(t.platform)
    return [
        (6, t.title.lower()),
        (4, " ".join(t.tags).lower()),
        (4, t.task.replace("_", " ").lower()),
        (3, t.summary.lower()),
        (3, f"{store.vendor_name(t.vendor)} {plat.name if plat else t.platform} {t.platform}".lower()),
        (2, store.category_name(t.category).lower()),
        (1, t.template.lower()),
        (1, " ".join(t.verification_commands).lower()),
        (1, " ".join(f"{e.line} {e.text}" for e in t.explanation).lower()),
    ]


def score(store: Store, t: Template, tokens: list[str]) -> int:
    """Every token must appear in at least one field (AND); score is the weighted sum."""
    if not tokens:
        return 0
    fields = _fields(store, t)
    total = 0
    for tok in tokens:
        best = 0
        for weight, text in fields:
            if tok in text:
                best = max(best, weight)
        if best == 0:
            return -1
        total += best
    return total


def matches_filters(t: Template, f: Filters) -> bool:
    if f.vendor and t.vendor != f.vendor:
        return False
    if f.platform and t.platform != f.platform:
        return False
    if f.category and t.category != f.category:
        return False
    if f.status and t.verification_status != f.status:
        return False
    if f.difficulty and t.difficulty != f.difficulty:
        return False
    if f.kind and t.kind != f.kind:
        return False
    if f.version:
        # Version filter is strict: templates with no recorded versions never match.
        needle = f.version.lower()
        if not any(needle in v.lower() for v in t.os_versions):
            return False
    return True


def summarize(t: Template) -> TemplateSummary:
    return TemplateSummary(
        id=t.id, title=t.title, vendor=t.vendor, platform=t.platform, os_versions=t.os_versions,
        category=t.category, task=t.task, kind=t.kind, summary=t.summary, difficulty=t.difficulty,
        verification_status=t.verification_status, reviewed_at=t.reviewed_at, added_at=t.added_at,
        tags=t.tags,
    )


def search(
    store: Store, q: str, f: Filters, sort: str = "relevance", page: int = 1, page_size: int = 20
) -> SearchResponse:
    tokens = tokenize(q)
    scored: list[tuple[int, Template]] = []
    for tid in store.order:
        t = store.templates[tid]
        if not matches_filters(t, f):
            continue
        s = score(store, t, tokens)
        if tokens and s < 0:
            continue
        scored.append((max(s, 0), t))

    if sort == "alphabetical":
        scored.sort(key=lambda x: (x[1].title.lower(), x[1].vendor, x[1].platform, x[1].id))
    elif sort == "reviewed":
        # newest review first; never-reviewed items last; ties stable by title/id
        scored.sort(key=lambda x: (x[1].reviewed_at is None, -(x[1].reviewed_at.toordinal() if x[1].reviewed_at else 0), x[1].title.lower(), x[1].id))
    elif sort == "added":
        scored.sort(key=lambda x: (-x[1].added_at.toordinal(), x[1].title.lower(), x[1].id))
    else:
        scored.sort(key=lambda x: (-x[0], x[1].title.lower(), x[1].id))

    facets = {
        "vendor": dict(Counter(t.vendor for _, t in scored)),
        "platform": dict(Counter(t.platform for _, t in scored)),
        "category": dict(Counter(t.category for _, t in scored)),
        "verification_status": dict(Counter(t.verification_status for _, t in scored)),
        "difficulty": dict(Counter(t.difficulty for _, t in scored)),
        "kind": dict(Counter(t.kind for _, t in scored)),
    }
    start = (page - 1) * page_size
    items = [summarize(t) for _, t in scored[start : start + page_size]]
    return SearchResponse(total=len(scored), page=page, page_size=page_size, items=items, facets=facets)
