from app.diffing import diff_text


def types(r):
    return [row.type for row in r.rows]


def test_basic_add_remove():
    r = diff_text("a\nb\nc", "a\nc\nd")
    assert (r.added, r.removed, r.unchanged) == (1, 1, 2)
    assert [row.text for row in r.rows if row.type == "removed"] == ["b"]
    assert [row.text for row in r.rows if row.type == "added"] == ["d"]
    assert not r.identical


def test_identical_and_empty():
    assert diff_text("", "").identical
    r = diff_text("", "x")
    assert (r.added, r.removed) == (1, 0)
    r = diff_text("x", "")
    assert (r.added, r.removed) == (0, 1)


def test_line_numbers():
    r = diff_text("a\nb", "a\nB")
    removed = next(x for x in r.rows if x.type == "removed")
    added = next(x for x in r.rows if x.type == "added")
    assert (removed.old_line, removed.new_line) == (2, None)
    assert (added.old_line, added.new_line) == (None, 2)


def test_crlf_equals_lf():
    assert diff_text("a\r\nb\r\n", "a\nb\n").identical


def test_ignore_trailing_whitespace_keeps_original_text():
    r = diff_text("a  \nb", "a\nb", ignore_ws=True)
    assert r.identical
    assert diff_text("a  \nb", "a\nb").added == 1


def test_ignore_blank_lines():
    assert diff_text("a\n\nb", "a\nb", ignore_blank=True).identical
    assert not diff_text("a\n\nb", "a\nb").identical


def test_unicode_and_long_lines():
    long = "x" * 50_000
    r = diff_text(f"héllo\n{long}", f"héllo\n{long}y")
    assert (r.added, r.removed, r.unchanged) == (1, 1, 1)


def test_note_present():
    assert "not a semantic" in diff_text("a", "b").note
