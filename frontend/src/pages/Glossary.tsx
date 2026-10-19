import { useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "../components/ui";
import { useAsync, useDebounced, useDocumentTitle } from "../lib/hooks";

export default function Glossary() {
  useDocumentTitle("Glossary");
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);
  const res = useAsync(() => api.glossary(dq), `gloss:${dq}`);
  return (
    <>
      <PageHeader title="Glossary" description="Plain-language, vendor-neutral explanations of common networking terms." />
      <div className="field">
        <label htmlFor="g-q" className="sr-only">Search glossary</label>
        <input id="g-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, e.g. LACP, trunk, wildcard" maxLength={100} />
      </div>
      {res.loading && !res.data ? (
        <Skeleton lines={6} />
      ) : res.error ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : res.data && res.data.length === 0 ? (
        <EmptyState title="No matching terms">Try a different word.</EmptyState>
      ) : (
        <dl className="glossary">
          {res.data?.map((g) => (
            <div className="card" key={g.term}>
              <dt>
                {g.term}
                {g.aka.length > 0 && <span className="muted small"> - also: {g.aka.join(", ")}</span>}
              </dt>
              <dd>{g.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
