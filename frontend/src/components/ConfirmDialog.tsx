import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation for destructive actions. Esc cancels; focus starts on the safe button. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const prev = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    prev.current = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab") {
        const f = document.querySelectorAll<HTMLElement>(".dialog button");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (prev.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
        <h2 id="dlg-title">{title}</h2>
        <p id="dlg-msg">{message}</p>
        <div className="row end">
          <button ref={cancelRef} className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
