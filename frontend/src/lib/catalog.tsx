import { createContext, useContext, type ReactNode } from "react";
import { api } from "../api";
import type { CategoryInfo, VendorInfo } from "../types";
import { useAsync } from "./hooks";

interface CatalogValue {
  vendors: VendorInfo[] | null;
  categories: CategoryInfo[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const Ctx = createContext<CatalogValue>({ vendors: null, categories: null, loading: true, error: null, reload: () => undefined });
export const useCatalog = () => useContext(Ctx);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const v = useAsync(() => api.vendors(), "vendors");
  const c = useAsync(() => api.categories(), "categories");
  const value: CatalogValue = {
    vendors: v.data,
    categories: c.data,
    loading: v.loading || c.loading,
    error: v.error?.message ?? c.error?.message ?? null,
    reload: () => {
      v.reload();
      c.reload();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const categoryName = (cats: CategoryInfo[] | null, id: string) => cats?.find((c) => c.id === id)?.name ?? id;
