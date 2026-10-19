import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CodeBlock, highlightLine } from "../components/CodeBlock";
import { DiffViewer, diffToMarkdown, diffToText } from "../components/DiffViewer";
import { PlaceholderForm, validateAll } from "../components/PlaceholderForm";
import { ToastProvider } from "../components/Toast";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { VerificationBadge } from "../components/ui";
import { favouritesStore, toggleFavourite, pushRecent, recentStore, newPersonalId } from "../lib/store";
import type { DiffResult } from "../types";

const wrap = (ui: React.ReactElement) => render(<MemoryRouter><ToastProvider>{ui}</ToastProvider></MemoryRouter>);

describe("DiffViewer", () => {
  const result: DiffResult = {
    rows: [
      { type: "unchanged", old_line: 1, new_line: 1, text: "a" },
      { type: "removed", old_line: 2, new_line: null, text: "b" },
      { type: "added", old_line: null, new_line: 2, text: "c" },
    ],
    added: 1, removed: 1, unchanged: 1, identical: false, note: "plain text comparison",
  };
  it("labels added and removed lines with text, not only colour", () => {
    wrap(<DiffViewer result={result} />);
    expect(screen.getByText("1 added")).toBeInTheDocument();
    expect(screen.getByText("1 removed")).toBeInTheDocument();
    expect(screen.getAllByText("Added").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Removed").length).toBeGreaterThan(0);
  });
  it("exports text and markdown", () => {
    expect(diffToText(result)).toBe("  a\n- b\n+ c");
    expect(diffToMarkdown(result)).toContain("```diff");
  });
});

describe("CodeBlock", () => {
  it("renders every line with line numbers and a labelled kind", () => {
    wrap(<CodeBlock code={"vlan 10\n name USERS"} />);
    expect(screen.getByText("Configuration")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });
  it("labels verification blocks differently", () => {
    wrap(<CodeBlock code="show vlan" variant="verify" />);
    expect(screen.getByText("Verification")).toBeInTheDocument();
  });
  it("never renders markup from config text", () => {
    const { container } = wrap(<CodeBlock code={'<img src=x onerror="alert(1)">'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });
  it("highlights placeholders, IPs and comments", () => {
    const nodes = highlightLine("ip address {{ip}} 10.0.0.1/24");
    expect(nodes.length).toBeGreaterThan(2);
    expect(highlightLine("! comment")).toHaveLength(1);
  });
  it("copies text and reports success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    wrap(<CodeBlock code="vlan 10" />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("vlan 10");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
  it("shows an error toast when copying fails", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("no")) }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(false);
    wrap(<CodeBlock code="vlan 10" />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(await screen.findByText(/Copy failed/)).toBeInTheDocument();
  });
});

describe("PlaceholderForm", () => {
  const phs = { vlan_id: { type: "integer" as const, label: "VLAN ID", min: 1, max: 4094, example: "10" } };
  it("shows required fields and the inline error beside the field", () => {
    const errors = validateAll(phs, { vlan_id: "5000" });
    wrap(<PlaceholderForm idPrefix="t" placeholders={phs} values={{ vlan_id: "5000" }} errors={errors} onChange={() => undefined} />);
    expect(screen.getByLabelText("VLAN ID")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/between 1 and 4094/);
  });
  it("reports changes", async () => {
    const onChange = vi.fn();
    wrap(<PlaceholderForm idPrefix="t" placeholders={phs} values={{}} errors={{}} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("VLAN ID"), "1");
    expect(onChange).toHaveBeenCalledWith("vlan_id", "1");
  });
});

describe("VerificationBadge", () => {
  it("uses text and an icon for each status", () => {
    wrap(<VerificationBadge status="unverified" />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("focuses the safe action, cancels on Escape and confirms on click", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Delete?" message="sure" onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });
  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} title="x" message="y" onCancel={() => undefined} onConfirm={() => undefined} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("stores", () => {
  it("toggles favourites and keeps recent unique and capped", () => {
    favouritesStore.set([]);
    toggleFavourite("a");
    toggleFavourite("b");
    expect(favouritesStore.get()).toEqual(["a", "b"]);
    toggleFavourite("a");
    expect(favouritesStore.get()).toEqual(["b"]);
    recentStore.set([]);
    for (let i = 0; i < 12; i++) pushRecent(`t${i}`);
    pushRecent("t5");
    expect(recentStore.get()).toHaveLength(8);
    expect(recentStore.get()[0]).toBe("t5");
  });
  it("creates valid personal IDs", () => {
    expect(newPersonalId()).toMatch(/^personal-[a-z0-9]{12}$/);
  });
});
