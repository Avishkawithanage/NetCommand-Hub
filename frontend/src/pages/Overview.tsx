import { Link } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../components/Icon";
import { TemplateCard } from "../components/TemplateCard";
import { CardSkeletons, Disclaimer, ErrorState, PageHeader, Skeleton } from "../components/ui";
import { useCatalog } from "../lib/catalog";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { STATUS_HELP, STATUS_LABEL } from "../lib/labels";
import { favouritesStore, recentStore, useStore } from "../lib/store";
import type { VerificationStatus } from "../types";
import { GlobalSearch } from "../components/AppShell";

const MONO: Record<string, string> = { cisco: "Ci", dell: "De", huawei: "Hu", fortinet: "Fo" };

export default function Overview() {
  useDocumentTitle("Overview");
  const { vendors, categories, error: catError } = useCatalog();
  const stats = useAsync(() => api.stats(), "stats");
  const favs = useStore(favouritesStore);
  const recentIds = useStore(recentStore);
  const recent = useAsync(
    () => (recentIds.length ? api.search({ ids: recentIds.join(","), page_size: 100 }) : Promise.resolve(null)),
    `recent:${recentIds.join(",")}`,
  );
  const topCats = [...(categories ?? [])].filter((c) => c.template_count > 0).sort((a, b) => b.template_count - a.template_count).slice(0, 8);
  const recentItems = recent.data
    ? recentIds.map((id) => recent.data!.items.find((i) => i.id === id)).filter((x): x is NonNullable<typeof x> => !!x)
    : [];

  return (
    <>
      <PageHeader
        title="NetCommand Hub"
        description="Find, understand and generate network configuration for Cisco, Dell, Huawei and Fortinet - with the platform and verification status always visible."
      />
      <div className="hero-search">
        <GlobalSearch />
      </div>

      {catError && <ErrorState error={{ message: catError, code: "network", status: 0, fields: {}, name: "ApiError" }} />}

      <section aria-labelledby="h-vendors" className="section">
        <h2 id="h-vendors">Vendors</h2>
        {!vendors ? (
          <CardSkeletons count={4} />
        ) : (
          <div className="grid cards-4">
            {vendors.map((v) => (
              <Link key={v.id} to={`/vendors/${v.id}`} className="card vendor-card">
                <span className="monogram" aria-hidden="true">{MONO[v.id] ?? v.name.slice(0, 2)}</span>
                <h3 className="card-title">{v.name}</h3>
                <p className="card-text">{v.description}</p>
                <p className="small muted">
                  {v.platforms.map((p) => p.name.replace(`${v.name} `, "")).join(" · ")}
                </p>
                <p className="vendor-count">
                  <strong>{v.template_count}</strong> templates
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="h-quick" className="section">
        <h2 id="h-quick">Quick actions</h2>
        <div className="grid cards-3">
          <Link className="card action-card" to="/library">
            <Icon name="library" size={22} />
            <div><h3 className="card-title">Browse commands</h3><p className="muted">Search and filter the library.</p></div>
          </Link>
          <Link className="card action-card" to="/builder">
            <Icon name="builder" size={22} />
            <div><h3 className="card-title">Build configuration</h3><p className="muted">Fill in values, get validated output.</p></div>
          </Link>
          <Link className="card action-card" to="/diff">
            <Icon name="diff" size={22} />
            <div><h3 className="card-title">Compare configurations</h3><p className="muted">Line-by-line text diff.</p></div>
          </Link>
        </div>
      </section>

      <section aria-labelledby="h-stats" className="section">
        <h2 id="h-stats">Library at a glance</h2>
        {stats.loading ? (
          <Skeleton lines={2} />
        ) : stats.error ? (
          <ErrorState error={stats.error} onRetry={stats.reload} />
        ) : stats.data ? (
          <div className="stat-row">
            <div className="stat"><strong>{stats.data.templates}</strong><span>templates</span></div>
            <div className="stat"><strong>{stats.data.platforms}</strong><span>platforms</span></div>
            <div className="stat"><strong>{favs.length}</strong><span>favourites</span></div>
            {Object.entries(stats.data.by_status).map(([s, n]) => (
              <div className="stat" key={s} title={STATUS_HELP[s as VerificationStatus]}>
                <strong>{n}</strong>
                <span>{STATUS_LABEL[s as VerificationStatus] ?? s}</span>
              </div>
            ))}
          </div>
        ) : null}
        <p className="muted small">All figures are counted from the template files actually loaded by the server.</p>
      </section>

      <section aria-labelledby="h-cats" className="section">
        <h2 id="h-cats">Popular categories</h2>
        <div className="chips">
          {topCats.map((c) => (
            <Link key={c.id} className="chip" to={`/library?category=${c.id}`}>
              {c.name} <span className="muted">({c.template_count})</span>
            </Link>
          ))}
        </div>
      </section>

      {recentItems.length > 0 && (
        <section aria-labelledby="h-recent" className="section">
          <h2 id="h-recent">Recently viewed</h2>
          <div className="grid cards">{recentItems.slice(0, 4).map((t) => <TemplateCard key={t.id} t={t} />)}</div>
        </section>
      )}

      <section aria-labelledby="h-new" className="section">
        <h2 id="h-new">Recently added</h2>
        {stats.data ? (
          <div className="grid cards">{stats.data.recent.slice(0, 6).map((t) => <TemplateCard key={t.id} t={t} />)}</div>
        ) : null}
      </section>

      <section aria-labelledby="h-labels" className="section note-box">
        <h2 id="h-labels">How to read compatibility and verification labels</h2>
        <p>
          Every entry names its vendor, platform (OS family) and, when known, the version range. A command for one
          platform is <strong>never</strong> shown as compatible with another unless it has been listed for that platform.
          Entries marked <strong>Unverified</strong> have not been checked by a reviewer or tested in a lab.
        </p>
        <Disclaimer />
      </section>
    </>
  );
}
