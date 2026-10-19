import type { ReactNode } from "react";
import { CopyButton } from "./CopyButton";

/**
 * Lightweight highlighter. It produces React nodes (never raw HTML), so config text can never
 * inject markup. Long lines scroll horizontally instead of wrapping.
 */
const TOKEN =
  /(\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\})|("[^"]*")|(\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b)|(\b\d+\b)/g;

export function highlightLine(line: string): ReactNode[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("!") || trimmed.startsWith("#")) {
    return [<span key="c" className="tok-comment">{line}</span>];
  }
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(line.slice(last, idx));
    const cls = m[1] ? "tok-ph" : m[2] ? "tok-str" : m[3] ? "tok-ip" : "tok-num";
    out.push(
      <span key={`t${i++}`} className={cls}>
        {m[0]}
      </span>,
    );
    last = idx + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

interface Props {
  code: string;
  title?: string;
  variant?: "config" | "verify";
  lineNumbers?: boolean;
  copyLabel?: string;
  actions?: ReactNode;
}

export function CodeBlock({ code, title, variant = "config", lineNumbers = true, copyLabel = "Copy", actions }: Props) {
  const lines = code === "" ? [] : code.split("\n");
  return (
    <figure className={`code code-${variant}`}>
      <figcaption className="code-head">
        <span className="code-title">
          <span className={`pill pill-${variant}`}>{variant === "config" ? "Configuration" : "Verification"}</span>
          {title && <span className="muted">{title}</span>}
        </span>
        <span className="row gap-s">
          {actions}
          <CopyButton text={code} label={copyLabel} />
        </span>
      </figcaption>
      <pre className="code-body" tabIndex={0} aria-label={title ?? `${variant} commands`}>
        <code>
          {lines.map((ln, i) => (
            <div className="code-line" key={i}>
              {lineNumbers && <span className="code-ln" aria-hidden="true">{i + 1}</span>}
              <span className="code-text">{ln === "" ? " " : highlightLine(ln)}</span>
            </div>
          ))}
        </code>
      </pre>
    </figure>
  );
}
