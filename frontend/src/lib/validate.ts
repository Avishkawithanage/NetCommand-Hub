import type { Placeholder } from "../types";

/**
 * Client-side validation. It mirrors the server rules so users get instant feedback, but the
 * server is always authoritative and re-validates every value.
 */
// eslint-disable-next-line no-control-regex
const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029\\u0085]");
const DEFAULT_STRING = /^[A-Za-z0-9_.:/,()@#+ -]+$/;
const DOTTED = /^\d{1,3}(\.\d{1,3}){3}$/;

function ipv4ToInt(s: string): number | null {
  if (!DOTTED.test(s)) return null;
  const parts = s.split(".");
  let n = 0;
  for (const p of parts) {
    if (p.length > 1 && p.startsWith("0")) return null; // no leading zeros
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

/** Returns an error message, or null when the value is acceptable. */
export function validateField(ph: Placeholder, value: string): string | null {
  let raw = value;
  if (raw === "" && ph.default !== undefined && ph.default !== null) return null; // default is used
  if (CONTROL.test(raw)) return "Line breaks and control characters are not allowed";
  if (ph.type !== "string") raw = raw.trim();
  if (raw === "") return "This field is required";

  switch (ph.type) {
    case "integer": {
      if (!/^-?\d{1,12}$/.test(raw)) return "Enter a whole number";
      const n = Number(raw);
      if (ph.min != null && ph.max != null && (n < ph.min || n > ph.max))
        return `Must be between ${ph.min} and ${ph.max}`;
      if (ph.multiple_of && n % ph.multiple_of !== 0) return `Must be a multiple of ${ph.multiple_of}`;
      return null;
    }
    case "string": {
      const min = ph.min_length ?? 1;
      const max = ph.max_length ?? 64;
      if (raw.length < min) return `Must be at least ${min} character(s)`;
      if (raw.length > max) return `Must be at most ${max} characters`;
      if (raw !== raw.trim()) return "Must not start or end with spaces";
      if (ph.pattern) {
        try {
          if (!new RegExp(`^(?:${ph.pattern})$`).test(raw))
            return "Contains characters or a format that is not allowed for this field";
        } catch {
          return null; // pattern not expressible in JS: let the server decide
        }
      } else if (!DEFAULT_STRING.test(raw)) {
        return "Only letters, digits, spaces and . _ - : / , ( ) @ # + are allowed";
      }
      return null;
    }
    case "enum":
      return ph.options?.includes(raw) ? null : `Must be one of: ${(ph.options ?? []).join(", ")}`;
    case "ipv4":
      return ipv4ToInt(raw) === null ? "Enter an IPv4 address such as 192.168.1.10" : null;
    case "ipv4_netmask": {
      const n = ipv4ToInt(raw);
      if (n === null) return "Enter a subnet mask such as 255.255.255.0";
      const inv = (~n >>> 0) >>> 0;
      return (inv & ((inv + 1) >>> 0)) === 0 ? null : "Not a valid subnet mask (e.g. 255.255.255.0)";
    }
    case "ipv4_wildcard": {
      const n = ipv4ToInt(raw);
      if (n === null) return "Enter a wildcard mask such as 0.0.0.255";
      return (n & ((n + 1) >>> 0)) === 0 ? null : "Not a valid wildcard mask (e.g. 0.0.0.255)";
    }
    case "ipv4_cidr": {
      const m = /^([^/]+)\/(\d{1,2})$/.exec(raw);
      if (!m) return "Use CIDR form, e.g. 10.0.0.1/24";
      const ip = ipv4ToInt(m[1]);
      const prefix = Number(m[2]);
      if (ip === null) return "Not a valid IPv4 address";
      if (prefix > 32) return "Prefix length must be 0-32";
      if (ph.allow_host_bits === false) {
        const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
        if ((ip & mask) >>> 0 !== ip) return "Host bits are set; use the network address";
      }
      return null;
    }
    case "vlan_list": {
      const tokens = raw.split(",").map((t) => t.trim());
      if (tokens.length > 64 || tokens.some((t) => t === "")) return "Use a comma-separated list such as 10,20,30-40";
      for (const t of tokens) {
        const m = /^(\d{1,4})(?:-(\d{1,4}))?$/.exec(t);
        if (!m) return `'${t}' is not a VLAN ID or range`;
        const lo = Number(m[1]);
        const hi = m[2] ? Number(m[2]) : lo;
        if (lo < 1 || hi > 4094 || lo > 4094 || hi < 1) return "VLAN IDs must be between 1 and 4094";
        if (lo > hi) return `Range '${t}' must go from low to high`;
      }
      return null;
    }
  }
}

/** Field names referenced as {{name}} in text. */
export function findPlaceholders(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) out.add(m[1]);
  return [...out];
}
