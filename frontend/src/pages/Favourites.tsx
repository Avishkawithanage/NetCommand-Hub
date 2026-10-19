import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { TemplateCard } from "../components/TemplateCard";
import { CardSkeletons, EmptyState, ErrorState, PageHeader } from "../components/ui";
import { useCatalog } from "../lib/catalog";
import { useAsync, useDebounced, useDocumentTitle } from "../lib/hooks";
import { favouritesStore, useStore } from "../lib/store";

export default function Favourites() {
  useDocumentTitle("Favourites");
  const favs = useStore(favouritesStore);
  const { vendors } = useCatalog();
  const [q, setQ] = useState("");
  const [vendor, setVendor] = useState("");
  const dq = useDebounced(q, 250);

  const res = useAsync(
    () => (favs.length ? api.search({ ids: favs.join(","), q: dq, vendor, sort: "alphabetical" }) : Promise.resolve(null)),
    `favs:${favs.join(",")}:${dq}:${vendor}`,
  );

  return (
    <>
      <PageHeader
        title="Favourites"
        description="Templates you starred. Favourites are saved in this browser only (see About for details)."
      />
      {favs.length === 0 ? (
        <EmptyState title="No favourites yet" action={<Link className="btn" to="/library">Browse the library</Link>}>
          Use the star on any template card or details page to keep it here.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <div className="field grow">
              <label htmlFor="fav-q" className="sr-only">Search favourites</label>
              <input id="fav-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search favourites" maxLength={200} />
            </div>
            <div className="field">
              <label htmlFor="fav-v" className="sr-only">Vendor</label>
              <select id="fav-v" value={vendor} onChange={(e) => setVendor(e.target.value)}>
                <option value="">All vendors</option>
                {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          {res.loading && !res.data ? (
            <CardSkeletons count={3} />
          ) : res.error ? (
            <ErrorState error={res.error} onRetry={res.reload} />
          ) : res.data && res.data.items.length === 0 ? (
            <EmptyState title="No favourites match">Change the search text or vendor filter.</EmptyState>
          ) : (
            <div className="grid cards">{res.data?.items.map((t) => <TemplateCard key={t.id} t={t} />)}</div>
          )}
          {res.data && res.data.total < favs.length && (
            <p className="muted small">
              {favs.length - res.data.total} favourite(s) are hidden by your filters or no longer exist in the library.
            </p>
          )}
        </>
      )}
    </>
  );
}
