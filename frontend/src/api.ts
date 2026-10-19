import type {
  CategoryInfo,
  DiffResult,
  GenerateResponse,
  GlossaryEntry,
  PersonalTemplate,
  PlatformInfo,
  SearchResponse,
  Stats,
  TemplateDetail,
  VendorInfo,
} from "./types";

/** Error from the API. `fields` holds per-field messages for validation errors. */
export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;
  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, "network", "Cannot reach the NetCommand Hub server. Is it running?");
  }
  if (!res.ok) {
    let code = "http_error";
    let message = `Request failed (${res.status})`;
    const fields: Record<string, string> = {};
    try {
      const body = await res.json();
      const err = body?.error;
      if (err) {
        code = err.code ?? code;
        message = err.message ?? message;
        if (Array.isArray(err.details)) {
          for (const d of err.details) if (d?.field) fields[d.field] = d.message;
        } else if (err.details && typeof err.details === "object") {
          Object.assign(fields, err.details);
        }
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code, message, fields);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export type SearchParams = Partial<{
  q: string;
  vendor: string;
  platform: string;
  category: string;
  status: string;
  difficulty: string;
  kind: string;
  version: string;
  sort: string;
  page: number;
  page_size: number;
  ids: string;
}>;

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
};

export const api = {
  vendors: () => request<VendorInfo[]>("/api/vendors"),
  platforms: (vendor?: string) => request<PlatformInfo[]>(`/api/platforms${qs({ vendor })}`),
  categories: () => request<CategoryInfo[]>("/api/categories"),
  stats: () => request<Stats>("/api/stats"),
  search: (p: SearchParams) => request<SearchResponse>(`/api/templates${qs(p)}`),
  template: (id: string) => request<TemplateDetail>(`/api/templates/${encodeURIComponent(id)}`),
  generate: (id: string, values: Record<string, string | number>) =>
    post<GenerateResponse>(`/api/templates/${encodeURIComponent(id)}/generate`, { values }),
  generatePersonal: (template: PersonalTemplate, values: Record<string, string | number>) =>
    post<GenerateResponse>("/api/personal/generate", { template, values }),
  validatePersonal: (template: PersonalTemplate) =>
    post<{ ok: boolean; warnings: string[] }>("/api/personal/validate", template),
  diff: (original: string, updated: string, ignoreWs: boolean, ignoreBlank: boolean) =>
    post<DiffResult>("/api/diff", {
      original,
      updated,
      ignore_trailing_whitespace: ignoreWs,
      ignore_blank_lines: ignoreBlank,
    }),
  glossary: (q = "") => request<GlossaryEntry[]>(`/api/glossary${qs({ q })}`),
};
