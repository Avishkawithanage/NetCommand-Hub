"""Validate the catalogue, glossary and every template. Exit code 1 on any problem.

Usage (from the repository root):
    backend/.venv/Scripts/python scripts/validate_templates.py      (Windows)
    backend/.venv/bin/python scripts/validate_templates.py          (Linux / macOS)
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.loader import ContentError, load_store  # noqa: E402


def main() -> int:
    try:
        store = load_store(ROOT / "data")
    except ContentError as exc:
        print("TEMPLATE VALIDATION FAILED")
        for p in exc.problems:
            print(f" - {p}")
        return 1
    by_status: dict[str, int] = {}
    for t in store.templates.values():
        by_status[t.verification_status] = by_status.get(t.verification_status, 0) + 1
    print(f"OK: {len(store.templates)} templates, {len(store.catalog.platforms)} platforms, "
          f"{len(store.glossary)} glossary entries")
    print("Status breakdown:", ", ".join(f"{k}={v}" for k, v in sorted(by_status.items())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
