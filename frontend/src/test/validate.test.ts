import { describe, expect, it } from "vitest";
import { findPlaceholders, validateField } from "../lib/validate";
import type { Placeholder } from "../types";

const ph = (p: Partial<Placeholder> & { type: Placeholder["type"] }): Placeholder => p;

describe("validateField", () => {
  it("validates integers with range and multiple_of", () => {
    const p = ph({ type: "integer", min: 1, max: 4094 });
    expect(validateField(p, "10")).toBeNull();
    expect(validateField(p, "0")).toMatch(/between 1 and 4094/);
    expect(validateField(p, "4095")).not.toBeNull();
    expect(validateField(p, "abc")).toMatch(/whole number/);
    expect(validateField(p, "")).toMatch(/required/);
    expect(validateField(ph({ type: "integer", min: 0, max: 61440, multiple_of: 4096 }), "4097")).toMatch(/multiple/);
  });

  it("uses the default when the field is empty", () => {
    expect(validateField(ph({ type: "enum", options: ["a", "b"], default: "a" }), "")).toBeNull();
  });

  it("validates IPv4, masks, wildcards and CIDR", () => {
    expect(validateField(ph({ type: "ipv4" }), "192.168.1.1")).toBeNull();
    expect(validateField(ph({ type: "ipv4" }), "256.1.1.1")).not.toBeNull();
    expect(validateField(ph({ type: "ipv4" }), "01.2.3.4")).not.toBeNull();
    expect(validateField(ph({ type: "ipv4_netmask" }), "255.255.255.0")).toBeNull();
    expect(validateField(ph({ type: "ipv4_netmask" }), "255.0.255.0")).not.toBeNull();
    expect(validateField(ph({ type: "ipv4_wildcard" }), "0.0.0.255")).toBeNull();
    expect(validateField(ph({ type: "ipv4_wildcard" }), "0.0.255.0")).not.toBeNull();
    expect(validateField(ph({ type: "ipv4_cidr" }), "10.0.0.5/24")).toBeNull();
    expect(validateField(ph({ type: "ipv4_cidr" }), "10.0.0.5")).not.toBeNull();
    expect(validateField(ph({ type: "ipv4_cidr", allow_host_bits: false }), "10.0.0.5/24")).toMatch(/Host bits/);
    expect(validateField(ph({ type: "ipv4_cidr", allow_host_bits: false }), "10.0.0.0/24")).toBeNull();
  });

  it("validates VLAN lists", () => {
    const p = ph({ type: "vlan_list" });
    expect(validateField(p, "10,20,30-40")).toBeNull();
    expect(validateField(p, "0")).not.toBeNull();
    expect(validateField(p, "40-30")).not.toBeNull();
    expect(validateField(p, "10,,20")).not.toBeNull();
  });

  it("blocks injection characters in strings", () => {
    const p = ph({ type: "string" });
    expect(validateField(p, "USERS")).toBeNull();
    expect(validateField(p, 'a"b')).not.toBeNull();
    expect(validateField(p, "a\nb")).toMatch(/Line breaks/);
    expect(validateField(p, "a!b")).not.toBeNull();
    expect(validateField(ph({ type: "string", pattern: "[A-Z]+" }), "abc")).not.toBeNull();
    expect(validateField(ph({ type: "string", max_length: 3 }), "abcd")).toMatch(/at most/);
  });

  it("validates enums", () => {
    const p = ph({ type: "enum", options: ["active", "passive"] });
    expect(validateField(p, "active")).toBeNull();
    expect(validateField(p, "on")).toMatch(/one of/);
  });
});

describe("findPlaceholders", () => {
  it("finds unique names", () => {
    expect(findPlaceholders("a {{x}} b {{ y }} {{x}}").sort()).toEqual(["x", "y"]);
    expect(findPlaceholders("no placeholders")).toEqual([]);
  });
});
