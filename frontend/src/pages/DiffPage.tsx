import { useState } from "react";
import { api, ApiError } from "../api";
import { DiffViewer, diffToMarkdown, diffToText } from "../components/DiffViewer";
import { Icon } from "../components/Icon";
import { CopyButton } from "../components/CopyButton";
import { PageHeader } from "../components/ui";
import { downloadText } from "../lib/files";
import { useDocumentTitle } from "../lib/hooks";
import type { DiffResult } from "../types";

// Illustrative sample only (documentation addresses); not a recommended configuration.
const SAMPLE_A = `hostname SW-ACCESS-01
!
vlan 10
 name USERS
vlan 20
 name VOICE
!
interface GigabitEthernet1/0/1
 switchport mode access
 switchport access vlan 10
!
ip route 0.0.0.0 0.0.0.0 192.0.2.1`;

const SAMPLE_B = `hostname SW-ACCESS-01
!
vlan 10
 name USERS
vlan 30
 name GUEST
!
interface GigabitEthernet1/0/1
 switchport mode access
 switchport access vlan 30
!
ip route 0.0.0.0 0.0.0.0 192.0.2.254`;

const MAX = 200_000;

export default function DiffPage() {
  useDocumentTitle("Configuration Diff");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [ws, setWs] = useState(false);
  const [blank, setBlank] = useState(false);
  const [res, setRes] = useState<DiffResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooLong = a.length > MAX || b.length > MAX;

  const compare = async () => {
    setErr(null);
    if (tooLong) {
      setErr(`Each input is limited to ${MAX.toLocaleString()} characters.`);
      return;
    }
    setBusy(true);
    try {
      setRes(await api.diff(a, b, ws, blank));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Comparison failed");
      setRes(null);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setA("");
    setB("");
    setRes(null);
    setErr(null);
  };

  return (
    <>
      <PageHeader
        title="Configuration Diff"
        description="Compare two configuration text blocks line by line. Your text is processed by your own local NetCommand Hub server and is never sent anywhere else."
      />

      <div className="callout callout-warn compact" role="note">
        This is a plain text comparison, not a semantic network configuration validator. Reordered but equivalent
        configuration will appear as changed. Pasted configurations may contain secrets - remove them first.
      </div>

      <div className="diff-inputs">
        <div className="field">
          <label htmlFor="diff-a">Original <span className="muted small">({a.length.toLocaleString()} chars)</span></label>
          <textarea id="diff-a" value={a} onChange={(e) => setA(e.target.value)} spellCheck={false} rows={14} wrap="off" placeholder="Paste the original configuration here" />
        </div>
        <div className="field">
          <label htmlFor="diff-b">Updated <span className="muted small">({b.length.toLocaleString()} chars)</span></label>
          <textarea id="diff-b" value={b} onChange={(e) => setB(e.target.value)} spellCheck={false} rows={14} wrap="off" placeholder="Paste the updated configuration here" />
        </div>
      </div>

      <div className="row gap-s wrap form-actions">
        <button className="btn btn-primary" onClick={compare} disabled={busy || (a === "" && b === "")}>
          {busy ? "Comparing…" : "Compare"}
        </button>
        <button className="btn" onClick={() => { const t = a; setA(b); setB(t); setRes(null); }}>
          <Icon name="swap" size={15} /> Swap
        </button>
        <button className="btn" onClick={() => { setA(SAMPLE_A); setB(SAMPLE_B); setRes(null); }}>Load sample</button>
        <button className="btn" onClick={clear}>Clear both</button>
        <label className="check inline">
          <input type="checkbox" checked={ws} onChange={(e) => setWs(e.target.checked)} />
          <span>Ignore trailing whitespace</span>
        </label>
        <label className="check inline">
          <input type="checkbox" checked={blank} onChange={(e) => setBlank(e.target.checked)} />
          <span>Ignore blank lines</span>
        </label>
      </div>
      <p className="muted small">Options affect only how lines are compared. Your original text is never modified.</p>

      {err && <div className="error-state" role="alert"><p>{err}</p></div>}

      {res && (
        <section className="section" aria-label="Result">
          <div className="row between wrap">
            <h2>Result</h2>
            <div className="row gap-s wrap">
              <CopyButton text={diffToText(res)} label="Copy diff" />
              <button className="btn btn-sm" onClick={() => downloadText("diff.txt", diffToText(res) + "\n")}>
                <Icon name="download" size={14} /> .txt
              </button>
              <button className="btn btn-sm" onClick={() => downloadText("diff.md", diffToMarkdown(res), "text/markdown")}>
                <Icon name="download" size={14} /> .md
              </button>
            </div>
          </div>
          <DiffViewer result={res} />
        </section>
      )}
    </>
  );
}
