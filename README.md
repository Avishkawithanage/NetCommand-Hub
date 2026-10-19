# NetCommand Hub

A modern, searchable **network command library and configuration generator** for **Cisco, Dell, Huawei and Fortinet**.

Find the right command for the right vendor, platform and OS; read what it does; fill in your own values safely; copy or download the result; compare configurations; keep favourites and personal templates.

> **Phase 1 scope:** documentation and configuration *library* only. NetCommand Hub never connects to a device, runs commands, or stores device passwords. 118 of 122 bundled templates are labelled **Unverified**; 4 Cisco IOS-XE templates are **Reviewed** (documentation review only) - see [Known limitations](#known-limitations).

| Guide | Read it for |
|---|---|
| [docs/APP_START_GUIDE.md](docs/APP_START_GUIDE.md) | Install, start, stop, troubleshoot |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | How to use every page and task |
| [docs/FUNCTION_GUIDE.md](docs/FUNCTION_GUIDE.md) | What every API endpoint, module and function does |
| [docs/TEMPLATE_AUTHORING_GUIDE.md](docs/TEMPLATE_AUTHORING_GUIDE.md) | Adding or fixing templates |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Design and decisions |
| [docs/TESTING.md](docs/TESTING.md) | Automated and manual testing |
| [SECURITY.md](SECURITY.md) | Security model and responsible use |
| [docs/PROJECT_SPECIFICATION.md](docs/PROJECT_SPECIFICATION.md) | The original specification |

## Quick start (Windows)

1. Install **Python 3.11+** and **Node.js 20+**.
2. Double-click **`setup.bat`** (once).
3. Double-click **`start.bat`** - your browser opens at http://127.0.0.1:8000.

Details and Linux/macOS commands: [docs/APP_START_GUIDE.md](docs/APP_START_GUIDE.md).

## Features

- **Dashboard** with real counts from the loaded template files, vendor cards, categories, recently viewed/added.
- **Command Library**: case-insensitive partial search across title, summary, tags, command text and explanations; filters for vendor, platform/OS, category, command type, verification status, difficulty and version; four sort orders; URL-based filters; pagination; empty/loading/error states.
- **Command detail pages** in the specified order: compatibility, verification badge, prerequisites, snippet, placeholders, explanation, expected outcome, separate verification block, rollback, warnings, related, sources.
- **Configuration Builder**: forms generated from template metadata, inline validation (client and server), live-updating output, copy, `.txt` / `.cfg` / `.md` export, placeholder summary, pre-deployment checklist.
- **Configuration Diff**: line numbers, Added/Removed/Unchanged labels (not colour alone), counts, whitespace/blank-line options, swap, copy, `.txt`/`.md` export. Input is never modified.
- **Favourites** and **validated personal templates** (always Personal / Unverified), with JSON import/export that re-validates everything.
- **Glossary**, dark/light themes, responsive layout, keyboard navigation, visible focus, reduced-motion support.

## Coverage (122 templates: 4 Reviewed, 118 Unverified, 0 Lab-tested)

| Vendor | Platform | Templates |
|---|---|---|
| Cisco | IOS | 21 |
| Cisco | IOS-XE | 21 |
| Cisco | NX-OS | 10 |
| Dell | Networking OS6 | 9 |
| Dell | Networking OS9 | 12 |
| Dell | SmartFabric OS10 | 13 |
| Huawei | VRP | 17 |
| Fortinet | FortiGate / FortiOS | 19 |

Topics: device basics, VLANs, access/trunk ports, link aggregation (EtherChannel / LAG / Eth-Trunk), STP, IPv4 addressing, static routing, OSPF, BGP (Cisco IOS/IOS-XE and Huawei only), ACLs, NAT, DHCP, SSH/management, NTP and syslog, save/backup, show/verification, and for FortiOS: interfaces, VLAN interfaces, objects, firewall policy, IPsec, SD-WAN, security profiles and admin access. Not every topic exists for every platform - see the library for exact coverage.

## Technology

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, hand-written CSS with design tokens |
| Backend | Python, FastAPI, Pydantic v2, PyYAML |
| Content | Version-controlled YAML files validated at start-up |
| Storage | Templates loaded into memory; favourites/personal templates in browser local storage (no database, no accounts) |
| Tests | pytest (86 tests), Vitest + Testing Library (22 tests), template validation script |
| Tooling | ruff, ESLint, GitHub Actions workflow |

Why no database or login? Phase 1 is a solo/local tool; the spec says not to add accounts unless needed. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository layout

```text
backend/    FastAPI app, template engine, tests
frontend/   React app
data/       catalog.yaml, glossary.yaml, vendors/**.yaml  (the library content)
scripts/    setup/start/dev/test scripts, validate_templates.py
docs/       guides and specification
```

## How verification works

`draft`, `unverified`, `reviewed`, `lab-tested`, `needs-review`. A template may only be `reviewed` or `lab-tested` when it records a review date, written review evidence and source URLs - the loader refuses to start otherwise. "Reviewed" never means "guaranteed safe in production". See [docs/TEMPLATE_AUTHORING_GUIDE.md](docs/TEMPLATE_AUTHORING_GUIDE.md).

## Running the checks

```bash
powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
```

## Known limitations

- **Only 4 templates are Reviewed (Cisco IOS-XE VLAN, access port, trunk, SVI - against Catalyst 9300 17.9 docs), and none is lab-tested.** The rest: syntax was written from general knowledge of each platform's CLI and is labelled Unverified with no invented source links. Review against vendor documentation before relying on it; some commands (for example Dell OS10 LAG member steps, Dell OS6 VLAN creation, Huawei ACL traffic-filter, FortiOS IPsec/SD-WAN options) vary by release.
- No template records a verified OS version range, so the Version filter returns nothing.
- Cisco IOS and IOS-XE entries share the same text but are separate, equally unverified entries.
- Coverage is uneven. SNMP is not included for any vendor; Dell has no SSH, syslog, DHCP, NAT, BGP or ACL-on-OS6 templates yet; BGP exists only for Cisco IOS/IOS-XE and Huawei; Cisco NX-OS has no ACL, NAT, DHCP, BGP, NTP or syslog templates yet.
- Favourites and personal templates live in one browser; there is no sync or sharing. Clear browser data and they are gone (export first).
- The diff is plain text, not a semantic configuration comparison.
- Screenshots are not included in the repository yet.
- The licence has not been chosen; see below.

## Roadmap

More vendors and platform/version coverage, maintainer review workflow with documented evidence, link checking for source URLs, semantic configuration comparison, optional accounts and shared templates. Live device connectivity would be a separate, security-reviewed phase.

## Licence and attribution

No licence has been chosen yet (the specification asks that this be decided after considering code and content sources). Until a licence file is added, all rights are reserved by the project owner. Vendor and product names are trademarks of their owners and are used only to identify compatibility; the project is not affiliated with or endorsed by them. Explanations are original text; no vendor documentation has been copied.
