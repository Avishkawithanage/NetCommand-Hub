import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { TemplateCard } from "../components/TemplateCard";
import { CardSkeletons, EmptyState, ErrorState, PageHeader } from "../components/ui";
import { categoryName, useCatalog } from "../lib/catalog";
import { useAsync, useDocumentTitle } from "../lib/hooks";

export function VendorList() {
  useDocumentTitle("Vendors");
  const { vendors, error } = useCatalog();
  return (
    <>
      <PageHeader title="Vendor Explorer" description="Pick a vendor to see its platforms, categories and templates. Each platform has its own syntax." />
      {error && <p className="error-msg">{error}</p>}
      {!vendors ? (
        <CardSkeletons count={4} />
      ) : (
        <div className="grid cards-2">
          {vendors.map((v) => (
            <Link key={v.id} to={`/vendors/${v.id}`} className="card vendor-card">
              <h2 className="card-title">{v.name}</h2>
              <p className="card-text">{v.description}</p>
              <ul className="list small">
                {v.platforms.map((p) => (
                  <li key={p.id}>{p.name} - {p.template_count} templates</li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function VendorDetail() {
  const { vendorId = "" } = useParams();
  const { vendors, categories } = useCatalog();
  const vendor = vendors?.find((v) => v.id === vendorId);
  useDocumentTitle(vendor?.name ?? "Vendor");
  const res = useAsync(() => api.search({ vendor: vendorId, page_size: 100, sort: "alphabetical" }), `vendor:${vendorId}`);

  if (!vendors) return <CardSkeletons count={2} />;
  if (!vendor)
    return (
      <EmptyState title="Vendor not found" action={<Link className="btn" to="/vendors">All vendors</Link>}>
        There is no vendor called “{vendorId}”.
      </EmptyState>
    );

  const catFacet = res.data?.facets.category ?? {};
  const featureCats = Object.entries(catFacet).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/vendors">Vendors</Link> <span aria-hidden="true">/</span> <span>{vendor.name}</span>
      </nav>
      <PageHeader
        title={vendor.name}
        description={vendor.description}
        actions={<a className="btn" href={vendor.website_url} target="_blank" rel="noopener noreferrer">Vendor website ↗</a>}
      />

      <section className="section" aria-labelledby="h-plat">
        <h2 id="h-plat">Platforms and operating systems</h2>
        <div className="grid cards-3">
          {vendor.platforms.map((p) => (
            <div className="card" key={p.id}>
              <h3 className="card-title">{p.name}</h3>
              <p className="muted small">OS family: {p.os_family}</p>
              <p className="card-text">{p.version_notes}</p>
              <p><strong>{p.template_count}</strong> templates</p>
              <Link className="btn btn-sm" to={`/library?vendor=${vendor.id}&platform=${p.id}`}>Browse {p.name}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section note-box" aria-labelledby="h-caveat">
        <h2 id="h-caveat">Compatibility caveats</h2>
        <p>
          Syntax differs between the platforms above. Always pick the template for your exact platform, and confirm the
          release on your device before applying anything. Entries are <strong>Unverified</strong> until a reviewer or lab test is recorded.
        </p>
      </section>

      <section className="section" aria-labelledby="h-feat">
        <h2 id="h-feat">Supported feature overview</h2>
        {res.loading ? (
          <CardSkeletons count={2} />
        ) : res.error ? (
          <ErrorState error={res.error} onRetry={res.reload} />
        ) : (
          <div className="chips">
            {featureCats.map(([id, n]) => (
              <Link key={id} className="chip" to={`/library?vendor=${vendor.id}&category=${id}`}>
                {categoryName(categories, id)} <span className="muted">({n})</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="h-all">
        <h2 id="h-all">Templates</h2>
        {res.data && (
          <div className="grid cards">{res.data.items.slice(0, 12).map((t) => <TemplateCard key={t.id} t={t} />)}</div>
        )}
        {res.data && res.data.total > 12 && (
          <p><Link className="btn" to={`/library?vendor=${vendor.id}`}>See all {res.data.total} {vendor.name} templates</Link></p>
        )}
      </section>
    </>
  );
}
