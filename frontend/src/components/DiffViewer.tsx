import type { DiffResult } from "../types";

const LABEL = { added: "Added", removed: "Removed", unchanged: "Unchanged" } as const;
const MARK = { added: "+", removed: "−", unchanged: " " } as const;

export function diffToText(d: DiffResult): string {
  return d.rows.map((r) => `${r.type === "added" ? "+" : r.type === "removed" ? "-" : " "} ${r.text}`).join("\n");
}

export function diffToMarkdown(d: DiffResult): string {
  return [
    "# Configuration diff",
    "",
    `- Added: ${d.added}`,
    `- Removed: ${d.removed}`,
    `- Unchanged: ${d.unchanged}`,
    "",
    `> ${d.note}`,
    "",
    "```diff",
    diffToText(d).replace(/```/g, "'''"),
    "```",
    "",
  ].join("\n");
}

/** Added / removed lines carry a text label and a +/- marker as well as colour. */
export function DiffViewer({ result }: { result: DiffResult }) {
  return (
    <div className="diff" role="table" aria-label="Configuration differences">
      <div className="diff-summary" role="status">
        <span className="badge badge-added"><span aria-hidden="true">+</span> {result.added} added</span>
        <span className="badge badge-removed"><span aria-hidden="true">−</span> {result.removed} removed</span>
        <span className="badge badge-plain">{result.unchanged} unchanged</span>
        {result.identical && <strong>The two inputs are identical (after the selected options).</strong>}
      </div>
      <div className="diff-scroll">
        {result.rows.map((r, i) => (
          <div className={`diff-row diff-${r.type}`} role="row" key={i}>
            <span className="diff-ln" role="cell" aria-label="Original line">{r.old_line ?? ""}</span>
            <span className="diff-ln" role="cell" aria-label="Updated line">{r.new_line ?? ""}</span>
            <span className="diff-mark" role="cell" aria-label={LABEL[r.type]}>
              <span aria-hidden="true">{MARK[r.type]}</span>
            </span>
            <span className="diff-tag" role="cell">{LABEL[r.type]}</span>
            <span className="diff-text" role="cell">{r.text === "" ? " " : r.text}</span>
          </div>
        ))}
      </div>
      <p className="muted small">{result.note}</p>
    </div>
  );
}
