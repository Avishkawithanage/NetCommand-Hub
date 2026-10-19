export type PlaceholderType =
  | "integer"
  | "string"
  | "enum"
  | "ipv4"
  | "ipv4_netmask"
  | "ipv4_wildcard"
  | "ipv4_cidr"
  | "vlan_list";

export type VerificationStatus = "draft" | "unverified" | "reviewed" | "lab-tested" | "needs-review";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Kind = "config" | "show" | "operational";

export interface Placeholder {
  type: PlaceholderType;
  label?: string | null;
  description?: string;
  example?: string | null;
  default?: string | number | null;
  min?: number | null;
  max?: number | null;
  multiple_of?: number | null;
  min_length?: number | null;
  max_length?: number | null;
  pattern?: string | null;
  options?: string[] | null;
  allow_host_bits?: boolean;
  output_style?: "comma" | "space-to";
}

export interface TemplateSummary {
  id: string;
  title: string;
  vendor: string;
  platform: string;
  os_versions: string[];
  category: string;
  task: string;
  kind: Kind;
  summary: string;
  difficulty: Difficulty;
  verification_status: VerificationStatus;
  reviewed_at: string | null;
  added_at: string;
  tags: string[];
}

export interface TemplateDetail extends TemplateSummary {
  compatibility_note: string;
  review_evidence: string | null;
  source_urls: string[];
  prerequisites: string[];
  placeholders: Record<string, Placeholder>;
  template: string;
  explanation: { line: string; text: string }[];
  expected_outcome: string;
  verification_commands: string[];
  rollback_notes: string;
  warnings: string[];
  related: string[];
  related_templates: TemplateSummary[];
}

export interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  items: TemplateSummary[];
  facets: Record<string, Record<string, number>>;
}

export interface PlatformInfo {
  id: string;
  vendor: string;
  name: string;
  os_family: string;
  version_notes: string;
  template_count?: number;
}

export interface VendorInfo {
  id: string;
  name: string;
  description: string;
  website_url: string;
  platforms: PlatformInfo[];
  template_count: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  template_count: number;
}

export interface Stats {
  templates: number;
  vendors: number;
  platforms: number;
  by_status: Record<string, number>;
  recent: TemplateSummary[];
}

export interface GenerateResponse {
  template_id: string;
  template_title: string;
  vendor: string;
  platform: string;
  kind: Kind;
  verification_status: VerificationStatus;
  compatibility_note: string;
  template_version: string;
  generated_at: string;
  config: string;
  verification_commands: string[];
  warnings: string[];
  rollback_notes: string;
  values: Record<string, string>;
  notice: string;
}

export interface PersonalTemplate {
  id: string;
  title: string;
  vendor: string;
  platform: string;
  category: string;
  summary: string;
  difficulty: Difficulty;
  template: string;
  placeholders: Record<string, Placeholder>;
  verification_commands: string[];
  warnings: string[];
  tags: string[];
}

/** What is kept in the browser: the API shape plus a local timestamp. */
export interface StoredPersonalTemplate extends PersonalTemplate {
  updated_at: string;
}

export interface DiffRow {
  type: "added" | "removed" | "unchanged";
  old_line: number | null;
  new_line: number | null;
  text: string;
}

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
  unchanged: number;
  identical: boolean;
  note: string;
}

export interface GlossaryEntry {
  term: string;
  aka: string[];
  definition: string;
}
