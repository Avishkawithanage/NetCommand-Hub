# Template Authoring Guide

How to add or change library content. Everything the app shows comes from YAML files in `data/`; there is no database to edit.

> **Golden rules**
> 1. Never label a template `reviewed` or `lab-tested` unless that review/test really happened and you can record the evidence.
> 2. Never invent source URLs.
> 3. Never mix platforms: Cisco IOS-XE ≠ NX-OS, Dell OS6 ≠ OS9 ≠ OS10.
> 4. No passwords, keys, SNMP communities or real device configurations - use placeholders or interactive prompts.
> 5. Write original explanations; do not paste vendor documentation.

---

## 1. File layout

```text
data/
├─ catalog.yaml                      vendors, platforms (OS families), categories
├─ glossary.yaml                     glossary terms
└─ vendors/<vendor>/<anything>.yaml  template files (all *.yaml under vendors/ are loaded)
```

### Adding a vendor / platform / category
Edit `data/catalog.yaml`. IDs are lowercase with hyphens. A platform must reference an existing vendor; every template's category must exist.

```yaml
platforms:
  - id: junos
    vendor: juniper            # vendor must exist under "vendors:"
    name: Juniper Junos
    os_family: Junos
    version_notes: What is known/unknown about versions.
```

### A template file

```yaml
vendor: cisco
platforms: [ios, ios-xe]          # the file is expanded once per platform listed
os_versions: []                   # default for templates in this file ([] = not verified)
compatibility_note: >-            # REQUIRED statement of what is and is not verified
  Written to common IOS / IOS-XE conventions. Exact release support has NOT been verified.
templates:
  - id: vlan-create               # final ID becomes cisco-ios-xe-vlan-create (<vendor>-<platform>-<id>)
    title: Create a VLAN
    category: vlan                # must exist in catalog.yaml
    task: create_vlan
    kind: config                  # config | show | operational   (default config)
    summary: Create a VLAN and give it a descriptive name.
    difficulty: beginner          # beginner | intermediate | advanced
    verification_status: unverified
    added_at: 2026-10-18
    prerequisites:
      - Confirm the VLAN ID is allowed by the network design.
    placeholders:
      vlan_id:
        type: integer
        label: VLAN ID
        min: 1
        max: 4094
        example: "10"
    template: |
      vlan {{vlan_id}}
       name {{vlan_name}}
    explanation:
      - { line: "vlan {{vlan_id}}", text: "Creates the VLAN and enters VLAN configuration mode." }
    expected_outcome: The VLAN exists with the chosen name.
    verification_commands:
      - show vlan id {{vlan_id}}
    rollback_notes: How to undo it, and what to check first.
    warnings:
      - Operational impact or risk.
    tags: [vlan, switching]
    related: [access-port]        # local IDs, resolved on the same platform
```

(The placeholder `vlan_name` above must also be defined, otherwise loading fails - the validator catches that.)

### Field reference

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Lowercase letters, digits, hyphens. Unique after expansion |
| `title`, `summary`, `task` | yes | |
| `category` | yes | Must exist in `catalog.yaml` |
| `kind` | no | `config` (default), `show` (read-only commands), `operational` (exec actions such as save/backup) |
| `difficulty` | yes | |
| `verification_status` | yes | See section 3 |
| `added_at` | yes | `YYYY-MM-DD`; drives "Recently added" |
| `reviewed_at`, `review_evidence` | for reviewed/lab-tested | |
| `os_versions` | no | List of version strings **actually verified**. Empty = not verified |
| `compatibility_note` | yes (per template or file default) | |
| `source_urls` | for reviewed/lab-tested | Real, checked links only |
| `prerequisites`, `warnings`, `tags`, `related` | no | |
| `placeholders` | no | See section 2 |
| `template` | yes | The body; `{{name}}` is the only substitution syntax |
| `explanation` | no | List of `{line, text}` |
| `expected_outcome`, `rollback_notes` | no | |
| `verification_commands` | no | Read-only commands; may use placeholders |

Unknown fields are rejected, so typos fail loudly.

---

## 2. Placeholders

Defined under `placeholders:`. Every placeholder must be used in `template` or `verification_commands`, and every `{{name}}` used must be defined. Names: lowercase letters, digits, underscore.

| `type` | Settings | Example |
|---|---|---|
| `integer` | `min`, `max` (both required), `multiple_of` | `type: integer, min: 1, max: 4094` |
| `string` | `max_length`, `min_length`, `pattern` | `pattern: '^[A-Za-z0-9_\-]{1,32}$'` |
| `enum` | `options` | `options: [active, passive]` |
| `ipv4` | | |
| `ipv4_netmask` | | `255.255.255.0` |
| `ipv4_wildcard` | | `0.0.0.255` |
| `ipv4_cidr` | `allow_host_bits: false` for network prefixes | `10.0.0.0/24` |
| `vlan_list` | `output_style: comma` (default) or `space-to` (Huawei style) | `10,20,30-40` |

Common to all: `label`, `description`, `example`, `default`.

Tips:

- **Always give a `pattern` for names and interface names** that matches the platform's real rules (length limits, allowed characters). A pattern must match the whole value.
- Without a pattern, strings are limited to letters, digits, space and `. _ - : / , ( ) @ # +` and 64 characters.
- Use `example` values that are valid - a test renders every template with its own examples.
- Put quotes in the **template**, not in values: `set hostname "{{hostname}}"`. Values can never contain quotes.
- Use documentation address ranges in examples (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) or private ranges, never real customer addresses.
- Do not create password/secret placeholders. Document in `prerequisites` that credentials are created separately.

---

## 3. Verification statuses

| Status | When to use | Requirements enforced by the loader |
|---|---|---|
| `draft` | Not ready | - |
| `unverified` | Written but not checked (default for new work) | - |
| `reviewed` | A maintainer checked it against cited documentation | `reviewed_at`, `review_evidence`, at least one real `source_urls` entry |
| `lab-tested` | Run on a named lab platform/version | same as reviewed; describe the lab in `review_evidence` and list the tested version in `os_versions` |
| `needs-review` | Review outdated or an issue was reported | - |

Example of a reviewed entry:

```yaml
    verification_status: reviewed
    reviewed_at: 2026-11-02
    review_evidence: "Checked against the vendor configuration guide for IOS-XE 17.9, VLAN chapter (jane.doe)."
    source_urls: ["https://<real link you opened>"]
    os_versions: ["17.9"]
```

To review only one platform of a file shared by several (e.g. IOS-XE but not IOS), add `platform_overrides:` to the template with that platform's `verification_status`, `reviewed_at`, `os_versions`, `compatibility_note`, `review_evidence`, `source_urls` (see the Cisco `vlan-create` entry). A test (`test_reviewed_templates_are_documentation_reviews_only`) lists the reviewed IDs and forbids `lab-tested`; **update its list whenever you review more templates**.

---

## 4. Writing quality checklist

- [ ] Exact platform (and, if known, version range) stated; `compatibility_note` honest.
- [ ] Syntax checked against vendor documentation or a lab (then update the status accordingly).
- [ ] Prerequisites and assumptions listed (mode, features that must be enabled, licences).
- [ ] Every value validated by a suitable type/pattern.
- [ ] `verification_commands` (or a `show` template) provided.
- [ ] `rollback_notes` for anything that can interrupt traffic or remove access.
- [ ] `warnings` for lock-out, outage or security impact (for example "REPLACES the previous list").
- [ ] Explanations are original, short and accurate.
- [ ] No secrets, no real addresses or host names from a production network.

---

## 5. Validate and test

```bash
backend\.venv\Scripts\python scripts\validate_templates.py       # Windows
cd backend && .venv\Scripts\python -m pytest -q                  # content + engine tests
```

`validate_templates.py` prints every problem (file, template ID, field) or `OK: N templates ...`. The server also refuses to start with invalid content, so mistakes cannot reach users.

Automated content tests check: unique IDs, valid vendor/platform/category/related references, compatibility note present, honest status, **every template renders with its own examples and leaves no unreplaced `{{...}}`**, and spot checks that platform syntax was not mixed up.

---

## 6. Personal templates vs library templates

Library templates (this guide) live in files and can be `reviewed`. Personal templates are created in the app (**My Templates**), stay in the user's browser, and are always `Personal / Unverified`. The same schema and safety checks apply to both.
