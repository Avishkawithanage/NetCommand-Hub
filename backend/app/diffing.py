"""Line-based text diff. Inputs are never modified; normalisation only affects comparison."""

from __future__ import annotations

import difflib

from .schemas import DiffResponse, DiffRow

NOTE = (
    "This is a plain line-by-line text comparison. It is not a semantic network "
    "configuration validator: reordered but equivalent configuration is shown as changed."
)


def _split(text: str) -> list[str]:
    # splitlines() would also split on \x0b, \x0c, \x1c.. and U+2028; only treat real newlines as breaks.
    if text == "":
        return []
    return text.replace("\r\n", "\n").replace("\r", "\n").split("\n")


def diff_text(original: str, updated: str, ignore_ws: bool = False, ignore_blank: bool = False) -> DiffResponse:
    a = _split(original)
    b = _split(updated)
    if ignore_blank:
        a_idx = [i for i, ln in enumerate(a) if ln.strip() != ""]
        b_idx = [i for i, ln in enumerate(b) if ln.strip() != ""]
    else:
        a_idx = list(range(len(a)))
        b_idx = list(range(len(b)))

    def key(s: str) -> str:
        return s.rstrip() if ignore_ws else s

    ka = [key(a[i]) for i in a_idx]
    kb = [key(b[i]) for i in b_idx]
    sm = difflib.SequenceMatcher(a=ka, b=kb, autojunk=False)

    rows: list[DiffRow] = []
    added = removed = unchanged = 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                ai, bi = a_idx[i1 + k], b_idx[j1 + k]
                rows.append(DiffRow(type="unchanged", old_line=ai + 1, new_line=bi + 1, text=b[bi]))
                unchanged += 1
            continue
        for k in range(i1, i2):
            rows.append(DiffRow(type="removed", old_line=a_idx[k] + 1, new_line=None, text=a[a_idx[k]]))
            removed += 1
        for k in range(j1, j2):
            rows.append(DiffRow(type="added", old_line=None, new_line=b_idx[k] + 1, text=b[b_idx[k]]))
            added += 1
    return DiffResponse(
        rows=rows, added=added, removed=removed, unchanged=unchanged,
        identical=(added == 0 and removed == 0), note=NOTE,
    )
