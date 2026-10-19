import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api";

export interface Async<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** Runs `fn` whenever `key` changes; ignores stale responses. */
export function useAsync<T>(fn: () => Promise<T>, key: string): Async<T> {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            data: null,
            error: e instanceof ApiError ? e : new ApiError(0, "unknown", "Something went wrong"),
            loading: false,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Debounce a changing value. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - NetCommand Hub` : "NetCommand Hub";
  }, [title]);
}
