import type { Difficulty, Kind, VendorInfo, VerificationStatus } from "../types";

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  draft: "Draft",
  unverified: "Unverified",
  reviewed: "Reviewed",
  "lab-tested": "Lab-tested",
  "needs-review": "Needs review",
};

export const STATUS_HELP: Record<VerificationStatus, string> = {
  draft: "Not ready for general use.",
  unverified: "Syntax and compatibility have NOT been confirmed by a reviewer or lab test.",
  reviewed: "Checked by a maintainer against cited documentation. Not a guarantee of production safety.",
  "lab-tested": "Tested in a named lab environment on a stated platform and version.",
  "needs-review": "A review is outdated or an issue has been reported.",
};

export const STATUS_ICON: Record<VerificationStatus, string> = {
  draft: "✎",
  unverified: "?",
  reviewed: "✓",
  "lab-tested": "✓✓",
  "needs-review": "!",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const KIND_LABEL: Record<Kind, string> = {
  config: "Configuration",
  show: "Verification / show",
  operational: "Operational (exec)",
};

export const vendorName = (vendors: VendorInfo[] | null | undefined, id: string) =>
  vendors?.find((v) => v.id === id)?.name ?? id;

export const platformName = (vendors: VendorInfo[] | null | undefined, id: string) => {
  for (const v of vendors ?? []) {
    const p = v.platforms.find((x) => x.id === id);
    if (p) return p.name;
  }
  return id;
};

export const fmtDate = (d: string | null) => (d ? d : "Not reviewed");
