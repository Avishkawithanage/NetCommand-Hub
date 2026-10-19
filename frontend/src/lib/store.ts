import { useSyncExternalStore } from "react";
import type { StoredPersonalTemplate } from "../types";

/**
 * Tiny persisted store on top of localStorage. Every read/write is wrapped in try/catch because
 * storage can be blocked (private windows, policies); the app keeps working in memory.
 */
function createStore<T>(key: string, fallback: T, sanitize: (raw: unknown) => T) {
  const subs = new Set<() => void>();
  const load = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? sanitize(JSON.parse(raw)) : fallback;
    } catch {
      return fallback;
    }
  };
  let value = load();
  const notify = () => subs.forEach((f) => f());
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        value = load();
        notify();
      }
    });
  }
  return {
    get: () => value,
    set(next: T) {
      value = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable: keep in memory only */
      }
      notify();
    },
    reload() {
      value = load();
      notify();
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

const stringList = (raw: unknown, max: number): string[] =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, max) : [];

export const favouritesStore = createStore<string[]>("nch.favourites", [], (r) => stringList(r, 1000));
export const recentStore = createStore<string[]>("nch.recent", [], (r) => stringList(r, 20));
export const themeStore = createStore<"dark" | "light">("nch.theme", "dark", (r) =>
  r === "light" ? "light" : "dark",
);
export const sidebarStore = createStore<boolean>("nch.sidebarCollapsed", false, (r) => r === true);
export const personalStore = createStore<StoredPersonalTemplate[]>("nch.personalTemplates", [], (r) =>
  Array.isArray(r)
    ? (r.filter(
        (x) =>
          x &&
          typeof x === "object" &&
          typeof (x as StoredPersonalTemplate).id === "string" &&
          typeof (x as StoredPersonalTemplate).template === "string",
      ) as StoredPersonalTemplate[]).slice(0, 500)
    : [],
);

type Store<T> = ReturnType<typeof createStore<T>>;
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}

// ---- helpers
export const toggleFavourite = (id: string) => {
  const cur = favouritesStore.get();
  favouritesStore.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
};

export const pushRecent = (id: string) => {
  const cur = recentStore.get().filter((x) => x !== id);
  recentStore.set([id, ...cur].slice(0, 8));
};

export function newPersonalId(): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14).padEnd(12, "0");
  return `personal-${rnd}`;
}
