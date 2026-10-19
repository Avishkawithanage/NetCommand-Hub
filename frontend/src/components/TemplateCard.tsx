import { Link } from "react-router-dom";
import { categoryName, useCatalog } from "../lib/catalog";
import { fmtDate } from "../lib/labels";
import { favouritesStore, toggleFavourite, useStore } from "../lib/store";
import type { TemplateSummary } from "../types";
import { Icon } from "./Icon";
import { CompatibilityBadge, DifficultyBadge, KindBadge, VerificationBadge } from "./ui";

export function FavouriteButton({ id, title }: { id: string; title: string }) {
  const favs = useStore(favouritesStore);
  const on = favs.includes(id);
  return (
    <button
      type="button"
      className={`icon-btn${on ? " is-on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      title={on ? "Remove from favourites" : "Add to favourites"}
      onClick={() => toggleFavourite(id)}
    >
      <Icon name="star" filled={on} />
    </button>
  );
}

export function TemplateCard({ t }: { t: TemplateSummary }) {
  const { categories } = useCatalog();
  return (
    <article className="card template-card">
      <div className="row between start">
        <h3 className="card-title">
          <Link to={`/library/${encodeURIComponent(t.id)}`}>{t.title}</Link>
        </h3>
        <FavouriteButton id={t.id} title={t.title} />
      </div>
      <div className="row gap-s wrap">
        <CompatibilityBadge vendor={t.vendor} platform={t.platform} versions={t.os_versions} />
      </div>
      <p className="card-text">{t.summary}</p>
      <div className="row gap-s wrap">
        <VerificationBadge status={t.verification_status} reviewedAt={t.reviewed_at} />
        <KindBadge kind={t.kind} />
        <DifficultyBadge level={t.difficulty} />
        <span className="badge badge-plain">{categoryName(categories, t.category)}</span>
      </div>
      <div className="row between card-foot">
        <span className="muted small">Last reviewed: {fmtDate(t.reviewed_at)}</span>
        <Link className="btn btn-sm" to={`/library/${encodeURIComponent(t.id)}`}>
          Open details
        </Link>
      </div>
    </article>
  );
}
