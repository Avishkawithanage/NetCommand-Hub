import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { CodeBlock } from "../components/CodeBlock";
import { Icon } from "../components/Icon";
import { PlaceholderForm, validateAll } from "../components/PlaceholderForm";
import { useToast } from "../components/Toast";
import { Disclaimer, EmptyState, ErrorState, Skeleton, VerificationBadge } from "../components/ui";
import { useCatalog } from "../lib/catalog";
import { downloadText, generatedToMarkdown, safeFileName } from "../lib/files";
import { useAsync, useDebounced, useDocumentTitle } from "../lib/hooks";
import { personalStore, useStore } from "../lib/store";
import type { GenerateResponse, Placeholder, StoredPersonalTemplate, TemplateDetail } from "../types";

interface Working {
  id: string;
  title: string;
  vendor: string;
  platform: string;
  placeholders: Record<string, Placeholder>;
  compat: string;
  status: GenerateResponse["verification_status"];
  prerequisites: string[];
  personal?: StoredPersonalTemplate;
}

const CHECKLIST = [
  "I confirmed the device model, platform and OS version match this template.",
  "I reviewed every generated line and understand its effect.",
  "I tested the change in a lab or have a rollback plan.",
  "I have a current configuration backup.",
  "The change is approved under my organisation's change-control process.",
];

const fromDetail = (t: TemplateDetail): Working => ({
  id: t.id,
  title: t.title,
  vendor: t.vendor,
  platform: t.platform,
  placeholders: t.placeholders,
  compat: t.compatibility_note,
  status: t.verification_status,
  prerequisites: t.prerequisites,
});

const fromPersonal = (p: StoredPersonalTemplate): Working => ({
  id: p.id,
  title: p.title,
  vendor: p.vendor,
  platform: p.platform,
  placeholders: p.placeholders,
  compat: "Personal template - compatibility has not been verified.",
  status: "unverified",
  prerequisites: [],
  personal: p,
});

/** Strip local-only fields before sending a personal template to the API. */
const toApiPersonal = (p: StoredPersonalTemplate) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updated_at, ...rest } = p;
  return rest;
};

export default function Builder() {
  useDocumentTitle("Configuration Builder");
  const [params, setParams] = useSearchParams();
  const { vendors } = useCatalog();
  const personalList = useStore(personalStore);
  const toast = useToast();

  const tplParam = params.get("template") ?? "";
  const personalParam = params.get("personal") ?? "";
  const source: "library" | "personal" = personalParam || params.get("source") === "personal" ? "personal" : "library";

  const [vendor, setVendor] = useState(params.get("vendor") ?? "");
  const [platform, setPlatform] = useState(params.get("platform") ?? "");

  // Template chosen via URL (deep link from the library or details page)
  const detail = useAsync(
    () => (tplParam ? api.template(tplParam) : Promise.resolve(null)),
    `builder-tpl:${tplParam}`,
  );
  // Templates available for the chosen vendor/platform
  const list = useAsync(
    () =>
      source === "library" && vendor && platform
        ? api.search({ vendor, platform, page_size: 100, sort: "alphabetical" })
        : Promise.resolve(null),
    `builder-list:${source}:${vendor}:${platform}`,
  );

  const working: Working | null = useMemo(() => {
    if (source === "personal") {
      const p = personalList.find((x) => x.id === personalParam);
      return p ? fromPersonal(p) : null;
    }
    return detail.data ? fromDetail(detail.data) : null;
  }, [source, personalParam, personalList, detail.data]);

  // keep vendor/platform selectors in sync with a deep-linked template
  useEffect(() => {
    if (source === "library" && detail.data) {
      setVendor(detail.data.vendor);
      setPlatform(detail.data.platform);
    }
  }, [source, detail.data]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const workingId = working?.id ?? "";

  // new template => clear form + output
  useEffect(() => {
    setValues({});
    setErrors({});
    setResult(null);
    setStale(false);
    setApiError(null);
    setChecked(CHECKLIST.map(() => false));
  }, [workingId]);

  const reqSeq = useRef(0);
  const run = async (w: Working, v: Record<string, string>, silent = false) => {
    const errs = validateAll(w.placeholders, v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (!silent) {
        const first = Object.keys(errs)[0];
        document.getElementById(`bld-${first}`)?.focus();
      }
      setStale(result !== null);
      return;
    }
    const seq = ++reqSeq.current;
    setBusy(true);
    setApiError(null);
    try {
      const out = w.personal ? await api.generatePersonal(toApiPersonal(w.personal), v) : await api.generate(w.id, v);
      if (seq !== reqSeq.current) return;
      setResult(out);
      setStale(false);
    } catch (e) {
      if (seq !== reqSeq.current) return;
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      setApiError(e instanceof ApiError ? e.message : "Generation failed");
      if (!silent) toast.show("Could not generate - check the highlighted fields", "error");
    } finally {
      if (seq === reqSeq.current) setBusy(false);
    }
  };

  // After the first generation, keep the output in step with the inputs.
  const debouncedValues = useDebounced(values, 450);
  useEffect(() => {
    if (working && result) void run(working, debouncedValues, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValues]);

  const onChange = (name: string, value: string) => {
    setValues((cur) => ({ ...cur, [name]: value }));
    setErrors((cur) => {
      if (!cur[name]) return cur;
      const rest = { ...cur };
      delete rest[name];
      return rest;
    });
    if (result) setStale(true);
  };

  const reset = () => {
    setValues({});
    setErrors({});
    setResult(null);
    setStale(false);
    setApiError(null);
  };

  const pickTemplate = (id: string) => {
    const next = new URLSearchParams();
    if (id) next.set("template", id);
    setParams(next, { replace: true });
  };

  const setSource = (s: "library" | "personal") => {
    const next = new URLSearchParams();
    if (s === "personal") next.set("source", "personal");
    setParams(next, { replace: true });
  };

  const platformsForVendor = vendors?.find((v) => v.id === vendor)?.platforms ?? [];
  const personalForPick = personalList;
  const exportName = result ? result.template_id : "config";

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Configuration Builder</h1>
          <p className="lead">
            Choose a template, fill in the fields and generate text from the reviewed template. Values are validated
            on your device and again on the server. Nothing is sent to a network device.
          </p>
        </div>
      </header>

      <div className="builder">
        <section className="panel" aria-label="Template and values">
          <div className="tabs" role="tablist" aria-label="Template source">
            <button role="tab" aria-selected={source === "library"} className={`tab${source === "library" ? " active" : ""}`} onClick={() => setSource("library")}>
              Library templates
            </button>
            <button role="tab" aria-selected={source === "personal"} className={`tab${source === "personal" ? " active" : ""}`} onClick={() => setSource("personal")}>
              My templates ({personalList.length})
            </button>
          </div>

          {source === "library" ? (
            <>
              <div className="field">
                <label htmlFor="bld-sel-vendor">Vendor</label>
                <select
                  id="bld-sel-vendor"
                  value={vendor}
                  onChange={(e) => {
                    setVendor(e.target.value);
                    setPlatform("");
                    pickTemplate("");
                  }}
                >
                  <option value="">Select a vendor...</option>
                  {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bld-sel-platform">Platform / OS</label>
                <select
                  id="bld-sel-platform"
                  value={platform}
                  disabled={!vendor}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    pickTemplate("");
                  }}
                >
                  <option value="">{vendor ? "Select a platform..." : "Choose a vendor first"}</option>
                  {platformsForVendor.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bld-sel-template">Template / task</label>
                <select id="bld-sel-template" value={tplParam} disabled={!platform} onChange={(e) => pickTemplate(e.target.value)}>
                  <option value="">{platform ? "Select a template..." : "Choose a platform first"}</option>
                  {list.data?.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}{t.kind === "show" ? " (show)" : t.kind === "operational" ? " (exec)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="field">
              <label htmlFor="bld-sel-personal">My template</label>
              <select
                id="bld-sel-personal"
                value={personalParam}
                onChange={(e) => {
                  const next = new URLSearchParams({ source: "personal" });
                  if (e.target.value) next.set("personal", e.target.value);
                  setParams(next, { replace: true });
                }}
              >
                <option value="">{personalForPick.length ? "Select a template..." : "You have no personal templates yet"}</option>
                {personalForPick.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              {!personalForPick.length && <p className="hint"><Link to="/my-templates">Create one in My Templates</Link>.</p>}
            </div>
          )}

          {detail.loading && tplParam && !working && <Skeleton lines={4} />}
          {detail.error && source === "library" && <ErrorState error={detail.error} onRetry={detail.reload} />}

          {working ? (
            <>
              <hr />
              <h2 className="h3">{working.title}</h2>
              <div className="row gap-s wrap">
                <VerificationBadge status={working.status} />
              </div>
              <div className="callout callout-warn compact" role="note">
                <Icon name="warning" size={16} /> <strong>Compatibility:</strong> {working.compat}
              </div>
              {working.prerequisites.length > 0 && (
                <details className="details">
                  <summary>Prerequisites ({working.prerequisites.length})</summary>
                  <ul className="list">{working.prerequisites.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </details>
              )}
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(working, values);
                }}
              >
                <PlaceholderForm idPrefix="bld" placeholders={working.placeholders} values={values} errors={errors} onChange={onChange} />
                <div className="row gap-s wrap form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? "Generating..." : "Generate"}
                  </button>
                  <button type="button" className="btn" onClick={reset}>Reset</button>
                </div>
              </form>
            </>
          ) : (
            !detail.loading && (
              <EmptyState title="No template selected">
                Pick a vendor, platform and template above, or open a template from the Command Library.
              </EmptyState>
            )
          )}
        </section>

        <section className="panel" aria-label="Generated output" aria-live="polite">
          <h2 className="h3">Generated output</h2>
          {!result && !apiError && <p className="muted">Output appears here after you press <strong>Generate</strong>. It will then update as you edit the fields.</p>}
          {apiError && <div className="error-state" role="alert"><p>{apiError}</p></div>}
          {result && (
            <div className={stale ? "is-stale" : ""}>
              {stale && <p className="badge badge-needs-review" role="status">Fields changed - fix any errors to refresh this output</p>}
              <div className="row gap-s wrap">
                <VerificationBadge status={result.verification_status} />
                <span className="badge badge-plain">Template version {result.template_version}</span>
              </div>
              <CodeBlock
                code={result.config}
                variant={result.kind === "show" ? "verify" : "config"}
                title="Generated text - not applied to any device"
                actions={
                  <>
                    <button className="btn btn-sm" onClick={() => downloadText(safeFileName(exportName, "txt"), result.config + "\n")}>
                      <Icon name="download" size={14} /> .txt
                    </button>
                    <button className="btn btn-sm" title="Plain text with a .cfg extension. It is NOT a device backup." onClick={() => downloadText(safeFileName(exportName, "cfg"), result.config + "\n")}>
                      <Icon name="download" size={14} /> .cfg
                    </button>
                    <button className="btn btn-sm" onClick={() => downloadText(safeFileName(exportName, "md"), generatedToMarkdown(result), "text/markdown")}>
                      <Icon name="download" size={14} /> .md
                    </button>
                  </>
                }
              />
              {result.verification_commands.length > 0 && (
                <>
                  <h3 className="h4">Verification commands</h3>
                  <CodeBlock code={result.verification_commands.join("\n")} variant="verify" lineNumbers={false} title="Run after the change" />
                </>
              )}
              {Object.keys(result.values).length > 0 && (
                <details className="details">
                  <summary>Placeholder summary</summary>
                  <table className="table">
                    <thead><tr><th>Placeholder</th><th>Value used</th></tr></thead>
                    <tbody>
                      {Object.entries(result.values).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td><code>{v}</code></td></tr>)}
                    </tbody>
                  </table>
                </details>
              )}
              {result.warnings.length > 0 && (
                <div className="callout callout-warn">
                  <h3 className="h4"><Icon name="warning" size={16} /> Warnings</h3>
                  <ul className="list">{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              {result.rollback_notes && (
                <div className="callout callout-rollback"><h3 className="h4">Rollback</h3><p>{result.rollback_notes}</p></div>
              )}
              <fieldset className="checklist">
                <legend>Pre-deployment checklist</legend>
                {CHECKLIST.map((c, i) => (
                  <label key={c} className="check">
                    <input type="checkbox" checked={checked[i]} onChange={(e) => setChecked((cur) => cur.map((x, j) => (j === i ? e.target.checked : x)))} />
                    <span>{c}</span>
                  </label>
                ))}
                <p className="small muted">{checked.every(Boolean) ? "Checklist complete." : `${checked.filter(Boolean).length} of ${CHECKLIST.length} confirmed.`}</p>
              </fieldset>
              <p className="muted small">Generated {result.generated_at}. {result.notice}</p>
            </div>
          )}
          <Disclaimer />
        </section>
      </div>
    </>
  );
}

