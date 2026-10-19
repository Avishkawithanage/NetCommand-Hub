import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState, FormField, PageHeader, VerificationBadge } from "../components/ui";
import { categoryName, useCatalog } from "../lib/catalog";
import { downloadText } from "../lib/files";
import { useDocumentTitle } from "../lib/hooks";
import { newPersonalId, personalStore, useStore } from "../lib/store";
import { findPlaceholders } from "../lib/validate";
import type { Difficulty, Placeholder, PlaceholderType, StoredPersonalTemplate } from "../types";

const EXPORT_FORMAT = "netcommand-hub-personal-templates";
const MAX_IMPORT_BYTES = 1_000_000;
const TYPES: PlaceholderType[] = ["string", "integer", "enum", "ipv4", "ipv4_netmask", "ipv4_wildcard", "ipv4_cidr", "vlan_list"];

interface PhRow {
  name: string;
  type: PlaceholderType;
  label: string;
  example: string;
  min: string;
  max: string;
  maxLength: string;
  pattern: string;
  options: string;
}

const blankRow = (name: string): PhRow => ({ name, type: "string", label: "", example: "", min: "", max: "", maxLength: "", pattern: "", options: "" });

const rowToPlaceholder = (r: PhRow): Placeholder => {
  const p: Placeholder = { type: r.type };
  if (r.label) p.label = r.label;
  if (r.example) p.example = r.example;
  if (r.type === "integer") {
    p.min = Number(r.min);
    p.max = Number(r.max);
  }
  if (r.type === "string") {
    if (r.maxLength) p.max_length = Number(r.maxLength);
    if (r.pattern) p.pattern = r.pattern;
  }
  if (r.type === "enum") p.options = r.options.split(",").map((s) => s.trim()).filter(Boolean);
  return p;
};

const placeholderToRow = (name: string, p: Placeholder): PhRow => ({
  name,
  type: p.type,
  label: p.label ?? "",
  example: p.example ?? "",
  min: p.min != null ? String(p.min) : "",
  max: p.max != null ? String(p.max) : "",
  maxLength: p.max_length != null ? String(p.max_length) : "",
  pattern: p.pattern ?? "",
  options: (p.options ?? []).join(", "),
});

interface Draft {
  id: string;
  title: string;
  vendor: string;
  platform: string;
  category: string;
  summary: string;
  difficulty: Difficulty;
  template: string;
  rows: PhRow[];
  verification: string;
  warnings: string;
  tags: string;
}

const emptyDraft = (): Draft => ({
  id: newPersonalId(), title: "", vendor: "", platform: "", category: "", summary: "", difficulty: "intermediate",
  template: "", rows: [], verification: "", warnings: "", tags: "",
});

const toDraft = (p: StoredPersonalTemplate): Draft => ({
  id: p.id, title: p.title, vendor: p.vendor, platform: p.platform, category: p.category, summary: p.summary,
  difficulty: p.difficulty, template: p.template,
  rows: Object.entries(p.placeholders).map(([n, ph]) => placeholderToRow(n, ph)),
  verification: p.verification_commands.join("\n"), warnings: p.warnings.join("\n"), tags: p.tags.join(", "),
});

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function toStored(d: Draft): StoredPersonalTemplate {
  const placeholders: Record<string, Placeholder> = {};
  for (const r of d.rows) placeholders[r.name] = rowToPlaceholder(r);
  return {
    id: d.id, title: d.title.trim(), vendor: d.vendor, platform: d.platform, category: d.category,
    summary: d.summary.trim(), difficulty: d.difficulty, template: d.template.replace(/\r\n/g, "\n"),
    placeholders, verification_commands: lines(d.verification), warnings: lines(d.warnings),
    tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean), updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const forApi = ({ updated_at, ...rest }: StoredPersonalTemplate) => rest;

export default function MyTemplates() {
  useDocumentTitle("My Templates");
  const list = useStore(personalStore);
  const { vendors, categories } = useCatalog();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<StoredPersonalTemplate | null>(null);
  const [importReport, setImportReport] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const platforms = vendors?.find((v) => v.id === draft?.vendor)?.platforms ?? [];

  const syncRows = () => {
    if (!draft) return;
    const found = findPlaceholders(draft.template);
    const existing = new Map(draft.rows.map((r) => [r.name, r]));
    set("rows", found.map((n) => existing.get(n) ?? blankRow(n)));
  };

  const updateRow = (i: number, patch: Partial<PhRow>) =>
    setDraft((d) => (d ? { ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) } : d));

  const save = async () => {
    if (!draft) return;
    const errs: Record<string, string> = {};
    if (draft.title.trim().length < 3) errs.title = "Enter a title (at least 3 characters)";
    if (!draft.vendor) errs.vendor = "Choose a vendor";
    if (!draft.platform) errs.platform = "Choose a platform";
    if (!draft.category) errs.category = "Choose a category";
    if (draft.summary.trim().length < 3) errs.summary = "Add a short description";
    if (!draft.template.trim()) errs.template = "Enter the configuration body";
    draft.rows.forEach((r, i) => {
      if (r.type === "integer" && (r.min === "" || r.max === "" || isNaN(Number(r.min)) || isNaN(Number(r.max)))) errs[`row${i}`] = "Integer fields need numeric min and max";
      if (r.type === "enum" && !r.options.trim()) errs[`row${i}`] = "Enum fields need a comma-separated option list";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const stored = toStored(draft);
    setBusy(true);
    try {
      const res = await api.validatePersonal(forApi(stored));
      setWarnings(res.warnings);
      const cur = personalStore.get();
      const exists = cur.some((x) => x.id === stored.id);
      personalStore.set(exists ? cur.map((x) => (x.id === stored.id ? stored : x)) : [stored, ...cur]);
      toast.show(res.warnings.length ? "Saved with warnings - please review them" : "Saved as Personal / Unverified", res.warnings.length ? "info" : "success");
      if (!res.warnings.length) setDraft(null);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors({ ...e.fields, form: e.message });
      } else setErrors({ form: "Validation failed" });
    } finally {
      setBusy(false);
    }
  };

  const exportAll = () => {
    const payload = { format: EXPORT_FORMAT, version: 1, exported_at: new Date().toISOString(), templates: list };
    downloadText("netcommand-hub-my-templates.json", JSON.stringify(payload, null, 2) + "\n", "application/json");
  };

  const importFile = async (file: File) => {
    const report: string[] = [];
    if (file.size > MAX_IMPORT_BYTES) {
      setImportReport([`File is larger than ${MAX_IMPORT_BYTES / 1000} KB and was rejected.`]);
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setImportReport(["That file is not valid JSON."]);
      return;
    }
    const doc = data as { format?: unknown; version?: unknown; templates?: unknown };
    if (doc?.format !== EXPORT_FORMAT || doc.version !== 1 || !Array.isArray(doc.templates)) {
      setImportReport([`Not a NetCommand Hub export (expected format "${EXPORT_FORMAT}" version 1).`]);
      return;
    }
    const known = new Set(personalStore.get().map((t) => t.id));
    const added: StoredPersonalTemplate[] = [];
    for (const [i, raw] of doc.templates.slice(0, 200).entries()) {
      // Never trust imported data: rebuild the object from known fields, then let the server validate it.
      const r = raw as Partial<StoredPersonalTemplate>;
      const candidate = {
        id: typeof r.id === "string" ? r.id : "",
        title: String(r.title ?? ""), vendor: String(r.vendor ?? ""), platform: String(r.platform ?? ""),
        category: String(r.category ?? ""), summary: String(r.summary ?? ""),
        difficulty: (["beginner", "intermediate", "advanced"].includes(String(r.difficulty)) ? r.difficulty : "intermediate") as Difficulty,
        template: String(r.template ?? ""),
        placeholders: (r.placeholders && typeof r.placeholders === "object" ? r.placeholders : {}) as Record<string, Placeholder>,
        verification_commands: Array.isArray(r.verification_commands) ? r.verification_commands.map(String) : [],
        warnings: Array.isArray(r.warnings) ? r.warnings.map(String) : [],
        tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
      };
      // avoid duplicate / unsafe IDs: always assign a fresh ID when missing, malformed or already used
      if (!/^personal-[a-z0-9-]{4,60}$/.test(candidate.id) || known.has(candidate.id)) candidate.id = newPersonalId();
      try {
        await api.validatePersonal(candidate);
        known.add(candidate.id);
        added.push({ ...candidate, updated_at: new Date().toISOString() });
      } catch (e) {
        const detail = e instanceof ApiError ? [e.message, ...Object.entries(e.fields).map(([k, v]) => `${k}: ${v}`)].join("; ") : "invalid";
        report.push(`Template ${i + 1} ("${candidate.title || "untitled"}") skipped - ${detail}`);
      }
    }
    if (added.length) personalStore.set([...added, ...personalStore.get()]);
    setImportReport([`Imported ${added.length} template(s) as Personal / Unverified.`, ...report]);
  };

  return (
    <>
      <PageHeader
        title="My Templates"
        description="Create your own templates. They are saved in this browser, checked by the same validator as library templates, and always labelled Personal / Unverified."
        actions={
          <>
            <button className="btn btn-primary" onClick={() => { setDraft(emptyDraft()); setErrors({}); setWarnings([]); }}>
              <Icon name="plus" size={15} /> New template
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Import</button>
            <button className="btn" onClick={exportAll} disabled={!list.length}><Icon name="download" size={15} /> Export all</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importFile(f);
              }}
              aria-label="Import templates JSON file"
            />
          </>
        }
      />

      {importReport && (
        <div className="callout callout-warn" role="status">
          <button className="icon-btn float-right" aria-label="Dismiss import report" onClick={() => setImportReport(null)}><Icon name="close" /></button>
          <ul className="list">{importReport.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}

      {draft && (
        <section className="panel" aria-label="Template editor">
          <h2>{list.some((x) => x.id === draft.id) ? "Edit template" : "New template"}</h2>
          {errors.form && <div className="error-state" role="alert"><p>{errors.form}</p></div>}
          <div className="form-grid">
            <FormField id="mt-title" label="Title" error={errors.title}>
              <input id="mt-title" value={draft.title} maxLength={120} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <FormField id="mt-difficulty" label="Difficulty">
              <select id="mt-difficulty" value={draft.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
            </FormField>
            <FormField id="mt-vendor" label="Vendor" error={errors.vendor}>
              <select id="mt-vendor" value={draft.vendor} onChange={(e) => { set("vendor", e.target.value); set("platform", ""); }}>
                <option value="">Select…</option>
                {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </FormField>
            <FormField id="mt-platform" label="Platform / OS" error={errors.platform}>
              <select id="mt-platform" value={draft.platform} disabled={!draft.vendor} onChange={(e) => set("platform", e.target.value)}>
                <option value="">Select…</option>
                {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField id="mt-category" label="Category" error={errors.category}>
              <select id="mt-category" value={draft.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Select…</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField id="mt-tags" label="Tags" hint="Comma separated">
              <input id="mt-tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} />
            </FormField>
          </div>
          <FormField id="mt-summary" label="Description" error={errors.summary}>
            <input id="mt-summary" value={draft.summary} maxLength={500} onChange={(e) => set("summary", e.target.value)} />
          </FormField>
          <FormField id="mt-body" label="Configuration body" hint="Use {{name}} for values the user fills in. No code is ever executed." error={errors.template}>
            <textarea id="mt-body" className="mono" rows={10} wrap="off" spellCheck={false} value={draft.template} onChange={(e) => set("template", e.target.value)} />
          </FormField>

          <div className="row between wrap">
            <h3 className="h4">Placeholders</h3>
            <button className="btn btn-sm" onClick={syncRows}>Detect from body</button>
          </div>
          {draft.rows.length === 0 && <p className="muted small">No placeholders. Press “Detect from body” after typing {"{{names}}"}.</p>}
          {draft.rows.map((r, i) => (
            <fieldset className="ph-row" key={r.name}>
              <legend><code>{`{{${r.name}}}`}</code></legend>
              <div className="form-grid">
                <FormField id={`mt-r${i}-type`} label="Type">
                  <select id={`mt-r${i}-type`} value={r.type} onChange={(e) => updateRow(i, { type: e.target.value as PlaceholderType })}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField id={`mt-r${i}-label`} label="Label"><input id={`mt-r${i}-label`} value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })} /></FormField>
                <FormField id={`mt-r${i}-ex`} label="Example"><input id={`mt-r${i}-ex`} value={r.example} onChange={(e) => updateRow(i, { example: e.target.value })} /></FormField>
                {r.type === "integer" && (
                  <>
                    <FormField id={`mt-r${i}-min`} label="Min"><input id={`mt-r${i}-min`} inputMode="numeric" value={r.min} onChange={(e) => updateRow(i, { min: e.target.value })} /></FormField>
                    <FormField id={`mt-r${i}-max`} label="Max"><input id={`mt-r${i}-max`} inputMode="numeric" value={r.max} onChange={(e) => updateRow(i, { max: e.target.value })} /></FormField>
                  </>
                )}
                {r.type === "string" && (
                  <>
                    <FormField id={`mt-r${i}-ml`} label="Max length"><input id={`mt-r${i}-ml`} inputMode="numeric" value={r.maxLength} onChange={(e) => updateRow(i, { maxLength: e.target.value })} /></FormField>
                    <FormField id={`mt-r${i}-pat`} label="Allowed pattern (regex)"><input id={`mt-r${i}-pat`} className="mono" value={r.pattern} onChange={(e) => updateRow(i, { pattern: e.target.value })} /></FormField>
                  </>
                )}
                {r.type === "enum" && (
                  <FormField id={`mt-r${i}-opt`} label="Options (comma separated)"><input id={`mt-r${i}-opt`} value={r.options} onChange={(e) => updateRow(i, { options: e.target.value })} /></FormField>
                )}
              </div>
              {errors[`row${i}`] && <div className="error-msg" role="alert">{errors[`row${i}`]}</div>}
            </fieldset>
          ))}

          <div className="form-grid">
            <FormField id="mt-ver" label="Verification commands" hint="One per line. May use {{name}}.">
              <textarea id="mt-ver" className="mono" rows={3} wrap="off" value={draft.verification} onChange={(e) => set("verification", e.target.value)} />
            </FormField>
            <FormField id="mt-warn" label="Warnings" hint="One per line.">
              <textarea id="mt-warn" rows={3} value={draft.warnings} onChange={(e) => set("warnings", e.target.value)} />
            </FormField>
          </div>

          {warnings.length > 0 && (
            <div className="callout callout-warn" role="status">
              <h3 className="h4">Review these warnings</h3>
              <ul className="list">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              <button className="btn btn-sm" onClick={() => { setDraft(null); setWarnings([]); }}>I reviewed them - close editor</button>
            </div>
          )}

          <div className="row gap-s wrap form-actions">
            <button className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy ? "Validating…" : "Validate and save"}</button>
            <button className="btn" onClick={() => { setDraft(null); setWarnings([]); }}>Cancel</button>
          </div>
          <p className="muted small">Saved templates are always <strong>Personal / Unverified</strong>. You cannot mark your own template as reviewed.</p>
        </section>
      )}

      <section className="section" aria-labelledby="h-mine">
        <h2 id="h-mine">Your templates ({list.length})</h2>
        {list.length === 0 ? (
          <EmptyState title="No personal templates yet">Create one, or import a file exported from NetCommand Hub.</EmptyState>
        ) : (
          <div className="grid cards">
            {list.map((p) => (
              <article className="card" key={p.id}>
                <h3 className="card-title">{p.title}</h3>
                <p className="card-text">{p.summary}</p>
                <div className="row gap-s wrap">
                  <VerificationBadge status="unverified" />
                  <span className="badge badge-plain">Personal</span>
                  <span className="badge badge-plain">{p.vendor} / {p.platform}</span>
                  <span className="badge badge-plain">{categoryName(categories, p.category)}</span>
                </div>
                <div className="row gap-s wrap card-foot">
                  <Link className="btn btn-sm btn-primary" to={`/builder?personal=${encodeURIComponent(p.id)}`}>Use in builder</Link>
                  <button className="btn btn-sm" onClick={() => { setDraft(toDraft(p)); setErrors({}); setWarnings([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Icon name="edit" size={14} /> Edit</button>
                  <button className="btn btn-sm" onClick={() => downloadText(`${p.id}.json`, JSON.stringify({ format: EXPORT_FORMAT, version: 1, exported_at: new Date().toISOString(), templates: [p] }, null, 2) + "\n", "application/json")}><Icon name="download" size={14} /> Export</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setToDelete(p)}><Icon name="trash" size={14} /> Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this template?"
        message={`“${toDelete?.title ?? ""}” will be removed from this browser. Export it first if you may need it again.`}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) personalStore.set(personalStore.get().filter((x) => x.id !== toDelete.id));
          setToDelete(null);
          toast.show("Template deleted", "info");
        }}
      />
    </>
  );
}
