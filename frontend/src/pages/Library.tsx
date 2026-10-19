import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../components/Icon";
import { TemplateCard } from "../components/TemplateCard";
import { CardSkeletons, EmptyState, ErrorState, PageHeader } from "../components/ui";
import { categoryName, useCatalog } from "../lib/catalog";
import { useAsync, useDebounced, useDocumentTitle } from "../lib/hooks";
import { DIFFICULTY_LABEL, KIND_LABEL, STATUS_LABEL, platformName, vendorName } from "../lib/labels";

const PAGE_SIZE = 12;
const FILTER_KEYS = ["vendor", "platform", "category", "kind", "status", "difficulty", "version"] as const;
const SORTS = [
  ["relevance", "Relevance"],
  ["alphabetical", "Alphabetical"],
  ["reviewed", "Recently reviewed"],
  ["added", "Recently added"],
] as const;

export default function Library() {
  useDocumentTitle("Command Library");
  const [params, setParams] = useSearchParams();
  const { vendors, categories } = useCatalog();
  const [showFilters, setShowFilters] = useState(false);

  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  useEffect(() => setQ(urlQ), [urlQ]); // follow global-search navigation / back button
  const debounced = useDebounced(q, 300);

  const get = (k: string) => params.get(k) ?? "";
  const sort = get("sort") || "relevance";
  const page = Math.max(1, Number(get("page")) || 1);

  const update = (changes: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  // push debounced text into the URL
  useEffect(() => {
    if (debounced !== urlQ) update({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const key = params.toString();
  const res = useAsync(
    () =>
      api.search({
        q: get("q"),
        vendor: get("vendor"),
        platform: get("platform"),
        category: get("category"),
        kind: get("kind"),
        status: get("status"),
        difficulty: get("difficulty"),
        version: get("version"),
        sort,
        page,
        page_size: PAGE_SIZE,
      }),
    key,
  );

  const platforms = (vendors ?? []).filter((v) => !get("vendor") || v.id === get("vendor")).flatMap((v) => v.platforms);
  const active = FILTER_KEYS.filter((k) => get(k));
  const totalPages = res.data ? Math.max(1, Math.ceil(res.data.total / PAGE_SIZE)) : 1;
  const facet = (name: string, id: string) => res.data?.facets[name]?.[id];

  const chipLabel = (k: string, v: string) =>
    k === "vendor" ? vendorName(vendors, v)
    : k === "platform" ? platformName(vendors, v)
    : k === "category" ? categoryName(categories, v)
    : k === "kind" ? KIND_LABEL[v as keyof typeof KIND_LABEL] ?? v
    : k === "status" ? STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? v
    : k === "difficulty" ? DIFFICULTY_LABEL[v as keyof typeof DIFFICULTY_LABEL] ?? v
    : `version ${v}`;

  const clearAll = () => {
    setQ("");
    setParams(new URLSearchParams(), { replace: true });
  };

  const select = (k: string, label: string, options: [string, string][]) => (
    <div className="field">
      <label htmlFor={`f-${k}`}>{label}</label>
      <select
        id={`f-${k}`}
        value={get(k)}
        onChange={(e) => update(k === "vendor" ? { vendor: e.target.value, platform: "" } : { [k]: e.target.value })}
      >
        <option value="">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <PageHeader title="Command Library" description="Search every template by task, keyword, vendor, platform, category and verification status." />

      <div className="library-layout">
        <aside className={`filters${showFilters ? " is-open" : ""}`} aria-label="Filters">
          <div className="filters-head">
            <h2>Filters</h2>
            <button type="button" className="btn btn-sm only-mobile" onClick={() => setShowFilters(false)}>
              <Icon name="close" size={14} /> Close
            </button>
          </div>
          {select("vendor", "Vendor", (vendors ?? []).map((v) => [v.id, `${v.name}${facet("vendor", v.id) != null ? ` (${facet("vendor", v.id)})` : ""}`]))}
          {select("platform", "Platform / OS", platforms.map((p) => [p.id, `${p.name}${facet("platform", p.id) != null ? ` (${facet("platform", p.id)})` : ""}`]))}
          {select("category", "Category / task", (categories ?? []).map((c) => [c.id, `${c.name}${facet("category", c.id) != null ? ` (${facet("category", c.id)})` : ""}`]))}
          {select("kind", "Command type", Object.entries(KIND_LABEL))}
          {select("status", "Verification status", Object.entries(STATUS_LABEL))}
          {select("difficulty", "Difficulty", Object.entries(DIFFICULTY_LABEL))}
          <div className="field">
            <label htmlFor="f-version">Version compatibility</label>
            <input
              id="f-version"
              type="text"
              value={get("version")}
              maxLength={40}
              placeholder="e.g. 17.9 or 7.4"
              onChange={(e) => update({ version: e.target.value })}
              aria-describedby="f-version-hint"
            />
            <div className="hint" id="f-version-hint">
              Only entries with a recorded matching version are shown. Most entries have none yet.
            </div>
          </div>
          <button type="button" className="btn" onClick={clearAll} disabled={!active.length && !get("q")}>
            Clear all filters
          </button>
        </aside>

        <section aria-label="Results" className="results">
          <div className="toolbar">
            <div className="field grow">
              <label htmlFor="lib-q" className="sr-only">Search</label>
              <input
                id="lib-q"
                type="search"
                value={q}
                maxLength={200}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search, e.g. configure access VLAN, OSPF neighbor, Dell OS10 LAG"
              />
            </div>
            <div className="field">
              <label htmlFor="lib-sort" className="sr-only">Sort by</label>
              <select id="lib-sort" value={sort} onChange={(e) => update({ sort: e.target.value === "relevance" ? "" : e.target.value })}>
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>Sort: {l}</option>
                ))}
              </select>
            </div>
            <button type="button" className="btn only-mobile" onClick={() => setShowFilters(true)} aria-expanded={showFilters}>
              <Icon name="filter" size={15} /> Filters{active.length ? ` (${active.length})` : ""}
            </button>
          </div>

          {(active.length > 0 || get("q")) && (
            <div className="chips" aria-label="Active filters">
              {get("q") && (
                <button className="chip chip-removable" onClick={() => { setQ(""); update({ q: "" }); }}>
                  “{get("q")}” <span aria-hidden="true">✕</span><span className="sr-only">remove search text</span>
                </button>
              )}
              {active.map((k) => (
                <button key={k} className="chip chip-removable" onClick={() => update(k === "vendor" ? { vendor: "", platform: "" } : { [k]: "" })}>
                  {chipLabel(k, get(k))} <span aria-hidden="true">✕</span><span className="sr-only">remove filter</span>
                </button>
              ))}
              <button className="link-btn" onClick={clearAll}>Clear all</button>
            </div>
          )}

          <p className="muted small" role="status" aria-live="polite">
            {res.loading ? "Loading…" : res.data ? `${res.data.total} result${res.data.total === 1 ? "" : "s"}` : ""}
          </p>

          {res.loading && !res.data ? (
            <CardSkeletons count={6} />
          ) : res.error ? (
            <ErrorState error={res.error} onRetry={res.reload} />
          ) : res.data && res.data.items.length === 0 ? (
            <EmptyState
              title="No matching templates"
              action={<button className="btn" onClick={clearAll}>Reset filters</button>}
            >
              Try fewer words, check the spelling, or remove a filter. Searches match titles, tags, summaries, command
              text and explanations. A result for one platform is never shown under another, so also check the platform filter.
            </EmptyState>
          ) : (
            <>
              <div className="grid cards" style={{ opacity: res.loading ? 0.6 : 1 }}>
                {res.data?.items.map((t) => <TemplateCard key={t.id} t={t} />)}
              </div>
              {totalPages > 1 && (
                <nav className="pager" aria-label="Pagination">
                  <button className="btn" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>Previous</button>
                  <span>Page {page} of {totalPages}</span>
                  <button className="btn" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, false)}>Next</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
