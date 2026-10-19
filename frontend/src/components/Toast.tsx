import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastApi>({ show: () => undefined });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    setItems((cur) => [...cur.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4000);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span aria-hidden="true">{t.kind === "success" ? "✓" : t.kind === "error" ? "✕" : "ℹ"}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
