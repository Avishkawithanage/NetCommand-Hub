import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { CodeBlock } from "../components/CodeBlock";
import { Icon } from "../components/Icon";
import { FavouriteButton } from "../components/TemplateCard";
import { CardSkeletons, CompatibilityBadge, Disclaimer, DifficultyBadge, EmptyState, ErrorState, KindBadge, PageHeader, VerificationBadge } from "../components/ui";
import { categoryName, useCatalog } from "../lib/catalog";
import { downloadText, safeFileName, templateToMarkdown } from "../lib/files";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { fmtDate, STATUS_HELP } from "../lib/labels";
import { pushRecent } from "../lib/store";
import { TemplateCard } from "../components/TemplateCard";

export default function TemplateDetail() {
  const { id = "" } = useParams();
  const { categories } = useCatalog();
  const res = useAsync(() => api.template(id), `tpl:${id}`);
  const t = res.data;
  useDocumentTitle(t?.title ?? "Template");
  useEffect(() => {
    if (t) pushRecent(t.id);
  }, [t]);

  if (res.loading && !t) return <CardSkeletons count={2} />;
  if (res.error?.status === 404)
    return (
      <EmptyState title="Template not found" action={<Link className="btn" to="/library">Back to library</Link>}>
        No template has the ID “{id}”. It may have been renamed or removed.
      </EmptyState>
    );
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!t) return null;

  const phs = Object.entries(t.placeholders);
  const isConfig = t.kind === "config" || t.kind === "operational";

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/library">Command Library</Link> <span aria-hidden="true">/</span> <span>{t.title}</span>
      </nav>

      {/* 1. Title and purpose */}
      <PageHeader title={t.title} description={t.summary} />

      {/* 2-3. Compatibility, verification, review date */}
      <section className="meta-box" aria-label="Compatibility and verification">
        <div className="row gap-s wrap">
          <CompatibilityBadge vendor={t.vendor} platform={t.platform} versions={t.os_versions} />
          <VerificationBadge status={t.verification_status} reviewedAt={t.reviewed_at} />
          <KindBadge kind={t.kind} />
          <DifficultyBadge level={t.difficulty} />
          <span className="badge badge-plain">{categoryName(categories, t.category)}</span>
        </div>
        <p><strong>Compatibility:</strong> {t.compatibility_note}</p>
        <p><strong>Verification:</strong> {STATUS_HELP[t.verification_status]} <span className="muted">Last reviewed: {fmtDate(t.reviewed_at)}.</span></p>
      </section>

      {/* 14. Actions (placed early so they are easy to find; also repeated nowhere else) */}
      <div className="row gap-s wrap actions-bar">
        <FavouriteButton id={t.id} title={t.title} />
        {isConfig && (
          <Link className="btn btn-primary" to={`/builder?template=${encodeURIComponent(t.id)}`}>
            <Icon name="builder" size={15} /> Open in builder
          </Link>
        )}
        {!isConfig && Object.keys(t.placeholders).length > 0 && (
          <Link className="btn btn-primary" to={`/builder?template=${encodeURIComponent(t.id)}`}>
            <Icon name="builder" size={15} /> Fill in values
          </Link>
        )}
        <button className="btn" onClick={() => downloadText(safeFileName(t.id, "md"), templateToMarkdown(t), "text/markdown")}>
          <Icon name="download" size={15} /> Export .md
        </button>
        <button className="btn" onClick={() => downloadText(safeFileName(t.id, "txt"), t.template, "text/plain")}>
          <Icon name="download" size={15} /> Export .txt
        </button>
      </div>

      {/* 4. Prerequisites */}
      {t.prerequisites.length > 0 && (
        <section className="section" aria-labelledby="h-pre">
          <h2 id="h-pre">Prerequisites</h2>
          <ul className="list">{t.prerequisites.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </section>
      )}

      {/* 5. Snippet */}
      <section className="section" aria-labelledby="h-snip">
        <h2 id="h-snip">{t.kind === "show" ? "Show / diagnostic commands" : "Configuration snippet"}</h2>
        <p className="muted small">
          Text in <span className="tok-ph">{"{{braces}}"}</span> is a placeholder. Use the builder to fill in validated values.
        </p>
        <CodeBlock
          code={t.template}
          variant={t.kind === "show" ? "verify" : "config"}
          title={`${t.vendor} / ${t.platform}`}
          copyLabel="Copy template"
        />
      </section>

      {/* 6. Placeholders */}
      {phs.length > 0 && (
        <section className="section" aria-labelledby="h-ph">
          <h2 id="h-ph">Placeholders</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Type</th><th>Rules</th><th>Example</th></tr>
              </thead>
              <tbody>
                {phs.map(([name, p]) => (
                  <tr key={name}>
                    <td><code>{`{{${name}}}`}</code><div className="muted small">{p.label}</div></td>
                    <td>{p.type}</td>
                    <td>
                      {p.description}
                      {p.type === "integer" && ` Range ${p.min}-${p.max}${p.multiple_of ? `, multiple of ${p.multiple_of}` : ""}.`}
                      {p.type === "enum" && ` One of: ${p.options?.join(", ")}.`}
                      {p.type === "string" && p.max_length ? ` Max ${p.max_length} chars.` : ""}
                    </td>
                    <td><code>{p.example ?? (p.default != null ? String(p.default) : "")}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. Explanation */}
      {t.explanation.length > 0 && (
        <section className="section" aria-labelledby="h-exp">
          <h2 id="h-exp">Explanation</h2>
          <dl className="explain">
            {t.explanation.map((e, i) => (
              <div key={i}>
                <dt><code>{e.line}</code></dt>
                <dd>{e.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 8. Expected outcome */}
      {t.expected_outcome && (
        <section className="section" aria-labelledby="h-out">
          <h2 id="h-out">Expected outcome</h2>
          <p>{t.expected_outcome}</p>
        </section>
      )}

      {/* 9. Verification commands (visually separate from configuration) */}
      {t.verification_commands.length > 0 && (
        <section className="section" aria-labelledby="h-ver">
          <h2 id="h-ver">Verification commands</h2>
          <p className="muted small">Read-only commands to run after the change. Placeholders show where your values go.</p>
          <CodeBlock code={t.verification_commands.join("\n")} variant="verify" title="show / display / get" lineNumbers={false} />
        </section>
      )}

      {/* 10. Rollback */}
      {t.rollback_notes && (
        <section className="section callout callout-rollback" aria-labelledby="h-rb">
          <h2 id="h-rb">Rollback / recovery</h2>
          <p>{t.rollback_notes}</p>
        </section>
      )}

      {/* 11. Warnings */}
      {t.warnings.length > 0 && (
        <section className="section callout callout-warn" aria-labelledby="h-warn">
          <h2 id="h-warn"><Icon name="warning" size={18} /> Warnings and operational impact</h2>
          <ul className="list">{t.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </section>
      )}

      {/* 12. Related */}
      {t.related_templates.length > 0 && (
        <section className="section" aria-labelledby="h-rel">
          <h2 id="h-rel">Related commands</h2>
          <div className="grid cards">{t.related_templates.map((r) => <TemplateCard key={r.id} t={r} />)}</div>
        </section>
      )}

      {/* 13. Sources */}
      <section className="section" aria-labelledby="h-src">
        <h2 id="h-src">Documentation and review</h2>
        {t.source_urls.length ? (
          <ul className="list">
            {t.source_urls.map((u) => (
              <li key={u}>{/^https?:\/\//.test(u) ? <a href={u} target="_blank" rel="noopener noreferrer">{u}</a> : u}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No documentation source has been recorded for this entry. Check the vendor's configuration guide for your exact version.</p>
        )}
        {t.review_evidence && <p><strong>Review evidence:</strong> {t.review_evidence}</p>}
        <p className="muted small">Template ID: <code>{t.id}</code> · Added {t.added_at}</p>
      </section>

      <Disclaimer />
    </>
  );
}
