import type { GenerateResponse, TemplateDetail } from "../types";

export function safeFileName(name: string, ext: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "export";
  return `${base}.${ext}`;
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

const fence = (s: string) => "```text\n" + s.replace(/```/g, "'''") + "\n```";

/** Markdown export of a generated configuration, with metadata. */
export function generatedToMarkdown(g: GenerateResponse): string {
  const lines = [
    `# ${g.template_title}`,
    "",
    `- **Vendor / platform:** ${g.vendor} / ${g.platform}`,
    `- **Verification status:** ${g.verification_status}`,
    `- **Compatibility:** ${g.compatibility_note}`,
    `- **Template version:** ${g.template_version}`,
    `- **Generated at:** ${g.generated_at}`,
    "",
    `> ${g.notice}`,
    "",
    "## Generated text",
    "",
    fence(g.config),
  ];
  if (Object.keys(g.values).length) {
    lines.push("", "## Values used", "", ...Object.entries(g.values).map(([k, v]) => `- \`${k}\` = \`${v}\``));
  }
  if (g.verification_commands.length) lines.push("", "## Verification commands", "", fence(g.verification_commands.join("\n")));
  if (g.rollback_notes) lines.push("", "## Rollback notes", "", g.rollback_notes);
  if (g.warnings.length) lines.push("", "## Warnings", "", ...g.warnings.map((w) => `- ${w}`));
  return lines.join("\n") + "\n";
}

/** Markdown export of a library template (with placeholders still in place). */
export function templateToMarkdown(t: TemplateDetail): string {
  const lines = [
    `# ${t.title}`,
    "",
    t.summary,
    "",
    `- **Vendor / platform:** ${t.vendor} / ${t.platform}`,
    `- **Verification status:** ${t.verification_status}${t.reviewed_at ? ` (reviewed ${t.reviewed_at})` : ""}`,
    `- **Compatibility:** ${t.compatibility_note}`,
    `- **Template ID:** ${t.id}`,
  ];
  if (t.prerequisites.length) lines.push("", "## Prerequisites", "", ...t.prerequisites.map((p) => `- ${p}`));
  lines.push("", "## Template (placeholders in {{braces}})", "", fence(t.template));
  const ph = Object.entries(t.placeholders);
  if (ph.length) lines.push("", "## Placeholders", "", ...ph.map(([k, v]) => `- \`${k}\` (${v.type}): ${v.description || v.label || ""}`));
  if (t.explanation.length) lines.push("", "## Explanation", "", ...t.explanation.map((e) => `- \`${e.line}\` - ${e.text}`));
  if (t.expected_outcome) lines.push("", "## Expected outcome", "", t.expected_outcome);
  if (t.verification_commands.length) lines.push("", "## Verification commands", "", fence(t.verification_commands.join("\n")));
  if (t.rollback_notes) lines.push("", "## Rollback notes", "", t.rollback_notes);
  if (t.warnings.length) lines.push("", "## Warnings", "", ...t.warnings.map((w) => `- ${w}`));
  return lines.join("\n") + "\n";
}
