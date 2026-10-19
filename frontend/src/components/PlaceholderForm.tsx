import { validateField } from "../lib/validate";
import type { Placeholder } from "../types";
import { FormField } from "./ui";

interface Props {
  idPrefix: string;
  placeholders: Record<string, Placeholder>;
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

const typeHint = (p: Placeholder): string => {
  switch (p.type) {
    case "integer":
      return `Whole number ${p.min}-${p.max}${p.multiple_of ? `, multiple of ${p.multiple_of}` : ""}`;
    case "ipv4":
      return "IPv4 address";
    case "ipv4_netmask":
      return "Subnet mask, e.g. 255.255.255.0";
    case "ipv4_wildcard":
      return "Wildcard mask, e.g. 0.0.0.255";
    case "ipv4_cidr":
      return p.allow_host_bits === false ? "Network in CIDR form (host bits must be 0)" : "Address in CIDR form, e.g. 10.0.0.1/24";
    case "vlan_list":
      return "VLAN IDs and ranges, comma separated (1-4094)";
    case "enum":
      return "Choose one";
    default:
      return `Up to ${p.max_length ?? 64} characters`;
  }
};

/** Dynamic form generated from template placeholder metadata, with inline validation. */
export function PlaceholderForm({ idPrefix, placeholders, values, errors, onChange }: Props) {
  const names = Object.keys(placeholders);
  if (!names.length) return <p className="muted">This template has no fields to fill in.</p>;
  return (
    <div className="form-grid">
      {names.map((name) => {
        const p = placeholders[name];
        const id = `${idPrefix}-${name}`;
        const err = errors[name] ?? null;
        const hint = [p.description, p.example ? `Example: ${p.example}` : "", typeHint(p)].filter(Boolean).join(" · ");
        const common = {
          id,
          "aria-invalid": err ? true : undefined,
          "aria-describedby": err ? `${id}-err` : `${id}-hint`,
        } as const;
        return (
          <FormField key={name} id={id} label={p.label || name} hint={hint} error={err}>
            {p.type === "enum" ? (
              <select {...common} value={values[name] ?? ""} onChange={(e) => onChange(name, e.target.value)}>
                <option value="">Select…</option>
                {(p.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type="text"
                value={values[name] ?? ""}
                placeholder={p.default != null ? String(p.default) : (p.example ?? "")}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => onChange(name, e.target.value)}
              />
            )}
          </FormField>
        );
      })}
    </div>
  );
}

/** Validate every field; returns a map of errors (empty when OK). */
export function validateAll(placeholders: Record<string, Placeholder>, values: Record<string, string>) {
  const errs: Record<string, string> = {};
  for (const [n, p] of Object.entries(placeholders)) {
    const e = validateField(p, values[n] ?? "");
    if (e) errs[n] = e;
  }
  return errs;
}
