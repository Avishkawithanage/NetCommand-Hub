import type { ReactNode } from "react";
import type { ApiError } from "../api";
import { useCatalog } from "../lib/catalog";
import { DIFFICULTY_LABEL, KIND_LABEL, STATUS_HELP, STATUS_ICON, STATUS_LABEL, platformName, vendorName } from "../lib/labels";
import type { Difficulty, Kind, VerificationStatus } from "../types";

/** Verification badge: text + icon + colour, so status never relies on colour alone. */
export function VerificationBadge({ status, reviewedAt }: { status: VerificationStatus; reviewedAt?: string | null }) {
  const help = STATUS_HELP[status];
  return (
    <span className={`badge badge-${status}`} title={help}>
      <span aria-hidden="true" className="badge-ico">{STATUS_ICON[status]}</span>
      {STATUS_LABEL[status]}
      {reviewedAt ? <span className="sr-only"> (reviewed {reviewedAt})</span> : null}
    </span>
  );
}

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return <span className={`badge badge-diff-${level}`}>{DIFFICULTY_LABEL[level]}</span>;
}

export function KindBadge({ kind }: { kind: Kind }) {
  return <span className={`badge badge-kind-${kind}`}>{KIND_LABEL[kind]}</span>;
}

/** Vendor / platform / versions. Unrecorded versions are stated explicitly, never implied. */
export function CompatibilityBadge({ vendor, platform, versions }: { vendor: string; platform: string; versions: string[] }) {
  const { vendors } = useCatalog();
  return (
    <span className="badge badge-compat">
      {vendorName(vendors, vendor)} · {platformName(vendors, platform)}
      <span className="muted"> · {versions.length ? versions.join(", ") : "version not verified"}</span>
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {description && <p className="lead">{description}</p>}
      </div>
      {actions && <div className="row gap-s wrap">{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <h3>Something went wrong</h3>
      <p>{error.message}</p>
      {error.code === "network" && (
        <p className="muted">Start the server with the start script described in the App Start Guide, then retry.</p>
      )}
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ lines = 3, height = 16 }: { lines?: number; height?: number }) {
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, width: `${100 - (i % 3) * 12}%` }} />
      ))}
    </div>
  );
}

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid cards" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <div className="card" key={i}>
          <Skeleton lines={4} />
        </div>
      ))}
    </div>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && (
        <div className="hint" id={`${id}-hint`}>
          {hint}
        </div>
      )}
      {error && (
        <div className="error-msg" id={`${id}-err`} role="alert">
          <span aria-hidden="true">✕ </span>
          {error}
        </div>
      )}
    </div>
  );
}

export const Disclaimer = () => (
  <p className="disclaimer" role="note">
    <strong>Review before use.</strong> Generated and library text is for reference only. Test in a lab and follow your
    organisation's change-control process. Nothing here is sent to or applied on any device.
  </p>
);
