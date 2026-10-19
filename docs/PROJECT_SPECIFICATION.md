# NetCommand Hub

## Complete Project Specification, Development Roadmap & UI/UX Instructions

**Project type:** Multi-vendor network command reference and
configuration generator\
**Initial vendors:** Cisco, Dell, Huawei, Fortinet\
**Primary purpose:** Help network engineers find, understand, customize,
validate, copy, save, and export network device command configurations
from one modern interface.\
**Initial release:** Documentation and configuration library only. Live
device connections and automatic command execution are **out of scope
for Phase 1**.

------------------------------------------------------------------------

# 1. Project Vision

NetCommand Hub is a modern, searchable knowledge base and configuration
builder for network engineers, students, and IT support teams. It brings
vendor-specific commands and reusable configuration templates into one
place.

The application must not pretend that commands are universal. Every
command/template must be linked to a vendor, product family, operating
system, and (where known) a supported version range. Cisco IOS-XE syntax
must not be presented as Cisco NX-OS syntax unless separately verified.
Dell OS6, OS9, OS10, and other families must be clearly distinguished.
Huawei VRP syntax and FortiOS syntax must also be separated by
platform/version where relevant.

## 1.1 Main goals

1.  Search commands by vendor, platform, OS, category, task, keyword,
    and difficulty.
2.  Read clear explanations of commands and configuration blocks.
3.  Generate configuration snippets from validated templates and
    user-provided values.
4.  Copy or download generated configurations.
5.  Save favourites and personal templates.
6.  Compare configuration examples and display highlighted differences.
7.  Show prerequisites, verification commands, warnings, and rollback
    guidance.
8.  Build a trustworthy, maintainable command database that can expand
    to additional vendors later.
9.  Provide a polished, responsive, professional interface suitable for
    a GitHub portfolio project.

## 1.2 Explicit Phase 1 exclusions

Do **not** implement these in Phase 1:

-   Direct SSH, Telnet, NETCONF, RESTCONF, SNMP, or vendor API
    connections to physical devices.
-   Running commands on devices.
-   Automatic configuration deployment, scheduled changes, or device
    discovery.
-   Storing production device passwords or secrets.
-   Claiming every vendor/model/OS version is supported.
-   Generating arbitrary unreviewed commands from AI and presenting them
    as verified.

The first version is a **command library and configuration generator**,
not a live network controller. Later device integration must be a
separate, security-reviewed phase.

------------------------------------------------------------------------

# 2. Initial Vendor and Platform Scope

Create a vendor catalogue with these initial entries.

## 2.1 Cisco

Possible platform families to catalogue separately:

-   Cisco IOS
-   Cisco IOS-XE
-   Cisco NX-OS

Initial categories:

-   Device basics and command modes
-   Interface configuration
-   VLANs
-   Access ports and trunk ports
-   EtherChannel / Port-Channel
-   STP
-   IPv4 addressing
-   Static routing
-   OSPF
-   BGP
-   ACL
-   NAT
-   DHCP
-   SSH and management access
-   NTP, syslog, and SNMP examples
-   Configuration save, show, and verification commands
-   Backup and recovery notes

## 2.2 Dell Networking

Platform families must remain distinct where syntax differs:

-   Dell Networking OS6
-   Dell Networking OS9
-   Dell SmartFabric OS10
-   Relevant N-Series / PowerSwitch product families, with platform
    compatibility recorded per entry

Initial categories:

-   Device basics
-   Interface configuration
-   VLANs and access/trunk membership
-   Link Aggregation Groups (LAG)
-   STP
-   IPv4 addressing
-   Static routing
-   OSPF and BGP where supported
-   ACL
-   DHCP relay / related networking features where supported
-   Management access
-   Show/verification commands
-   Save, backup, and recovery notes

Do not assume that all Dell switch models use the same operating system
or command syntax. Every template must state the applicable OS/platform.

## 2.3 Huawei

Initial platform family:

-   VRP-based switches and routers, with product/VRP version
    compatibility recorded where known

Initial categories:

-   Device basics
-   Interface configuration
-   VLANs
-   Access and trunk ports
-   Eth-Trunk
-   STP
-   IPv4 addressing
-   Static routing
-   OSPF
-   BGP
-   ACL
-   DHCP
-   NAT where supported
-   SSH and management
-   NTP, logging, and SNMP examples
-   Save, display, verification, and recovery commands

## 2.4 Fortinet

Initial platform family:

-   FortiGate / FortiOS, with version range and model applicability
    recorded for each template

Initial categories:

-   System basics
-   Interfaces and VLAN interfaces
-   Static routes
-   Firewall policies
-   Address objects and service objects
-   NAT
-   DHCP server/relay where applicable
-   IPsec VPN
-   SD-WAN
-   Security profiles
-   Administrative access and trusted hosts
-   Logging and monitoring
-   Configuration backup/restore guidance
-   Verification and troubleshooting commands

FortiOS CLI syntax can vary by version and feature. Mark model/version
assumptions clearly. Security-sensitive settings must include warnings
and safer alternatives where appropriate.

## 2.5 Compatibility principle

A vendor is not the same as a platform, and a platform is not the same
as an OS version. The data model must support:

`Vendor -> Product family -> Operating system -> Version range -> Command/configuration template`

If compatibility has not been verified, label it **Unverified** or
**Needs review**. Never silently claim compatibility.

------------------------------------------------------------------------

# 3. Core User Journeys

## Journey A: Find a command

1.  User opens the dashboard.
2.  User searches for a task, e.g. `configure access VLAN`.
3.  User filters by vendor, platform, OS version, category, and
    difficulty.
4.  Results show a short title, vendor/platform, summary, verification
    status, and last-reviewed date.
5.  User opens a result.
6.  Detail page displays the command, explanation, prerequisites,
    placeholders, verification steps, warnings, and source/review
    metadata.
7.  User copies the command or opens it in the configuration builder.

## Journey B: Generate a configuration

1.  User selects vendor and platform.
2.  User chooses a configuration task.
3.  The application displays the template's required fields.
4.  User enters values such as VLAN ID, VLAN name, interface name, IP
    address, or subnet mask.
5.  Validate all fields against their defined constraints.
6.  Generate configuration only from the selected, reviewed template.
7.  Display the generated output with syntax highlighting.
8.  Display relevant verification commands and a warning to review the
    output before applying it.
9.  User copies or exports the result.

## Journey C: Save a favourite

1.  User marks a command/template as favourite.
2.  The item appears on the Favourites page.
3.  User can search and filter favourites.
4.  In the initial local/demo mode, favourites may be stored locally or
    in the user database depending on the chosen authentication scope.
    Document the chosen implementation.

## Journey D: Create a personal template

1.  User creates a template with title, vendor/platform, category,
    description, and configuration body.
2.  User defines allowed placeholders and validation rules.
3.  The application validates required metadata and flags dangerous or
    unsupported content for review.
4.  User saves it as a **Personal / Unverified** template by default.
5.  Personal templates must not be labelled as officially verified.

## Journey E: Compare configurations

1.  User pastes or selects two configuration text blocks.
2.  User chooses an optional normalization mode, such as trimming
    trailing whitespace.
3.  The application shows added, removed, and unchanged lines.
4.  The original text must remain unchanged.
5.  Show a clear note that text diff is not a semantic network
    configuration validator.

------------------------------------------------------------------------

# 4. Required Features

## 4.1 Dashboard

Show:

-   Global command/template search
-   Vendor cards: Cisco, Dell, Huawei, Fortinet
-   Category shortcuts
-   Recently viewed items (if implemented)
-   Favourites count
-   Recently added or recently reviewed templates
-   Clear verification-status labels
-   Quick link to Configuration Builder
-   Quick link to Configuration Diff

Dashboard metrics must come from actual database records. Do not
hardcode misleading totals such as "10,000 commands" when that data does
not exist.

## 4.2 Vendor Explorer

-   Vendor selection
-   Platform/OS selection
-   Vendor-specific categories
-   Command/template count based on real records
-   Supported feature overview
-   Compatibility caveats
-   Link to documentation/source references

## 4.3 Command Library

Each result card should include:

-   Title
-   Vendor
-   Platform/OS
-   Category
-   Short description
-   Verification status
-   Compatibility/version information
-   Estimated difficulty (Beginner / Intermediate / Advanced)
-   Last reviewed date
-   Open details action

Required filters:

-   Vendor
-   Platform / OS
-   Category
-   Feature/task
-   Verification status
-   Difficulty
-   Version compatibility

Sorting:

-   Relevance
-   Alphabetical
-   Recently reviewed
-   Recently added

## 4.4 Command Detail Page

Display these sections in this order:

1.  Title and short purpose
2.  Vendor / platform / OS / version compatibility
3.  Verification badge and review date
4.  Prerequisites
5.  Configuration snippet
6.  Placeholder definitions
7.  Line-by-line or block-level explanation
8.  Expected outcome
9.  Verification commands
10. Rollback/recovery guidance, if applicable
11. Warnings and operational impact
12. Related commands
13. Documentation/source references
14. Copy, favourite, open in builder, and export actions

The interface must clearly separate configuration commands from
verification/show commands.

## 4.5 Configuration Builder

-   Vendor and platform selection
-   Template/task selection
-   Dynamic form fields based on template metadata
-   Inline field validation
-   Helpful examples and field descriptions
-   Generate, reset, copy, and export actions
-   Syntax-highlighted output
-   Placeholder summary
-   Pre-deployment checklist
-   Compatibility warning
-   Clear error messages

Use safe template substitution. Never build commands by concatenating
untrusted user input without validation and escaping/allow-list rules.

## 4.6 Configuration Diff Tool

-   Two editors: Original and Updated
-   Paste text or load a sample
-   Clear both editors
-   Swap inputs
-   Compare button
-   Added/removed/unchanged line highlighting
-   Line numbers
-   Summary counts
-   Copy result or export diff as text/Markdown
-   Optional ignore trailing whitespace
-   No silent modifications to the source text

## 4.7 Favourites and Personal Templates

-   Add/remove favourite
-   Search and filter saved items
-   Create/edit/delete personal templates
-   Import/export personal templates in a documented format
-   Validate imported data
-   Mark personal content as unverified
-   Avoid duplicate IDs and unsafe imports

## 4.8 Export

Support:

-   Copy to clipboard
-   Download `.txt`
-   Download `.cfg` or a clearly labelled vendor configuration text file
-   Export `.md` with metadata and explanations
-   Export diff as `.txt` or `.md`
-   Optional JSON/YAML template export

Do not label a plain text export as a device-ready backup unless it was
actually collected from that device.

## 4.9 Help and Glossary

Include simple explanations of terms such as:

-   VLAN
-   Trunk / access port
-   LAG / EtherChannel / Eth-Trunk
-   STP
-   Static route
-   OSPF
-   BGP
-   ACL
-   NAT
-   DHCP
-   SSH
-   Configuration mode
-   Commit / save
-   Rollback

Glossary entries must be technically reviewed and vendor-neutral where
possible.

------------------------------------------------------------------------

# 5. Modern UI/UX Design Specification

## 5.1 Design direction

Use a polished, modern network engineering dashboard:

-   Professional dark-first theme with a complete light theme
-   Deep charcoal/navy surfaces, restrained blue/cyan accent, readable
    neutral text
-   Clear typography and consistent spacing
-   Minimal decoration
-   Subtle borders and restrained shadows
-   Strong hierarchy between page title, description, controls, and
    results
-   High information density without visual clutter
-   Responsive layout for desktop, tablet, and mobile
-   No unnecessary gradients, excessive glow, or distracting animations

Use design tokens rather than scattered hardcoded colors.

Suggested tokens (adapt as needed):

-   App background: `#0B1020`
-   Main surface: `#111827`
-   Elevated surface: `#172033`
-   Border: `#263247`
-   Primary accent: `#38BDF8`
-   Secondary accent: `#818CF8`
-   Primary text: `#F3F4F6`
-   Secondary text: `#9CA3AF`
-   Success: `#22C55E`
-   Warning: `#F59E0B`
-   Error: `#EF4444`

Check contrast in both themes. Do not rely on colour alone to
communicate verification or error status.

## 5.2 Application shell

### Desktop

-   Left sidebar, approximately 240--264 px wide
-   Top header with page title/breadcrumb, global search, theme toggle,
    and profile/settings area if authentication exists
-   Main content with a consistent max-width or responsive grid
-   Sidebar collapses to icon mode where appropriate
-   Content panels use consistent padding and spacing

### Sidebar navigation

1.  Overview
2.  Command Library
3.  Vendors
4.  Configuration Builder
5.  Configuration Diff
6.  Favourites
7.  My Templates
8.  Glossary
9.  Settings / About

Do not show nonfunctional navigation links. If a feature is not
implemented, hide it or label it clearly as planned.

## 5.3 Dashboard layout

Suggested structure:

1.  Welcome/title area with one-sentence purpose
2.  Prominent search bar
3.  Four vendor cards
4.  Quick actions: Browse Commands, Build Configuration, Compare
    Configurations
5.  Popular categories
6.  Recently added/reviewed templates
7.  Small note explaining compatibility and verification labels

Use vendor icons or simple custom monograms if official logos cannot be
used appropriately. Do not rely on vendor logos for navigation clarity.

## 5.4 Command Library layout

Desktop:

-   Search/filter panel on the left or top
-   Results list/grid in the centre
-   Optional details panel only when it improves usability

Mobile:

-   Search at top
-   Filters in a collapsible drawer
-   Single-column result cards
-   Detail page opens as a normal page

Provide empty states, loading skeletons, error states, and clear
reset-filter controls.

## 5.5 Command detail layout

-   Title and compatibility metadata at the top
-   Main configuration editor in a large code panel
-   Copy button visibly placed near the code header
-   Explanation and prerequisites beside or below the code depending on
    viewport
-   Verification and rollback sections visually separated
-   Sources and review information at the bottom
-   Sticky action bar only if it does not obscure content

Code panel requirements:

-   Monospaced font
-   Line numbers when useful
-   Horizontal scrolling for long lines
-   Copy feedback
-   No accidental line wrapping that changes command readability
-   Accessible contrast
-   Clear labels for configuration vs verification commands

## 5.6 Configuration Builder layout

Use a two-panel desktop layout:

-   Left panel: vendor, platform, template and form fields
-   Right panel: generated configuration preview

On small screens, stack the form above the preview. Keep Generate and
Copy actions easy to find. Show validation errors beside the field that
caused them.

## 5.7 Configuration Diff layout

-   Two labelled text editors on desktop
-   Responsive stacked editors on mobile
-   Added lines: green-tinted background plus "Added" label/icon
-   Removed lines: red-tinted background plus "Removed" label/icon
-   Unchanged lines: neutral background
-   Summary bar with counts
-   Do not use colour as the only difference indicator

## 5.8 Component library

Build reusable components:

-   `AppShell`
-   `Sidebar`
-   `Topbar`
-   `GlobalSearch`
-   `VendorCard`
-   `CategoryCard`
-   `CommandCard`
-   `CompatibilityBadge`
-   `VerificationBadge`
-   `CodeBlock`
-   `CopyButton`
-   `FilterPanel`
-   `EmptyState`
-   `LoadingSkeleton`
-   `ErrorState`
-   `ConfirmDialog`
-   `Toast`
-   `FormField`
-   `DiffViewer`
-   `ThemeToggle`

Use a consistent component API and shared spacing, typography, and
colour tokens.

## 5.9 Accessibility and usability

-   Full keyboard navigation
-   Visible focus indicators
-   Semantic headings and form labels
-   Accessible names for icon-only buttons
-   Sufficient colour contrast
-   No hover-only interactions
-   Reduced-motion support
-   Useful validation messages
-   Confirmation for destructive actions
-   Responsive design at common mobile/tablet/desktop widths

------------------------------------------------------------------------

# 6. Recommended Technology Stack

## Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   A consistent accessible component library, such as shadcn/ui
-   Monaco Editor or CodeMirror for configuration text, if justified by
    bundle size
-   A diff library or a carefully tested text-diff implementation
-   React Router
-   A data-fetching/state library only where needed

## Backend

-   Python
-   FastAPI
-   Pydantic for request and template schema validation
-   SQLAlchemy or SQLModel
-   Alembic for database migrations
-   Pytest for tests

## Database

Recommended MVP choice:

-   SQLite for a simple local/demo deployment, or
-   PostgreSQL if multi-user deployment and concurrent use are planned
    from the start

Choose one as the primary development target and document the choice. Do
not maintain two implementations unnecessarily.

## Template data

-   YAML or JSON files for reviewed, version-controlled templates
-   Database tables for searchable metadata, favourites, and
    user-created templates where needed
-   Pydantic schema validation during import/startup or build
-   Stable IDs for vendors, platforms, categories, and templates

## Tooling

-   Git and GitHub
-   ESLint and Prettier
-   Ruff and Black (or one documented Python formatting approach)
-   pytest
-   Vitest and React Testing Library
-   Docker Compose for reproducible local setup
-   GitHub Actions for lint and test automation

------------------------------------------------------------------------

# 7. Proposed Repository Structure

Use a clear monorepo structure:

``` text
netcommand-hub/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── CHANGELOG.md
├── .gitignore
├── .editorconfig
├── .env.example
├── compose.yaml
├── Makefile
├── docs/
│   ├── PROJECT_SPECIFICATION.md
│   ├── ARCHITECTURE.md
│   ├── UI_UX_GUIDE.md
│   ├── DATA_MODEL.md
│   ├── TEMPLATE_AUTHORING_GUIDE.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── screenshots/
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── public/
│   └── src/
│       ├── app/
│       ├── routes/
│       ├── components/
│       │   ├── layout/
│       │   ├── commands/
│       │   ├── vendors/
│       │   ├── builder/
│       │   ├── diff/
│       │   └── common/
│       ├── features/
│       ├── hooks/
│       ├── lib/
│       ├── services/
│       ├── styles/
│       ├── types/
│       └── test/
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── api/
│   │   │   └── routes/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── search/
│   │   ├── template_engine/
│   │   └── db/
│   └── tests/
├── data/
│   ├── vendors/
│   │   ├── cisco/
│   │   │   ├── ios/
│   │   │   ├── ios-xe/
│   │   │   └── nx-os/
│   │   ├── dell/
│   │   │   ├── os6/
│   │   │   ├── os9/
│   │   │   └── os10/
│   │   ├── huawei/
│   │   │   └── vrp/
│   │   └── fortinet/
│   │       └── fortios/
│   ├── categories/
│   └── samples/
├── scripts/
│   ├── validate_templates.py
│   ├── import_templates.py
│   └── seed_database.py
└── .github/
    └── workflows/
        └── ci.yml
```

Adapt folders when implementation requires it, but preserve the
separation between UI, API, business logic, and vendor data. Do not
create empty folders solely to make the repository look large.

------------------------------------------------------------------------

# 8. Command and Template Data Schema

Every command or configuration template should have structured metadata.

Example YAML (illustrative schema only; verify the commands before
publishing):

``` yaml
id: cisco-iosxe-vlan-create-example
title: Create a VLAN
vendor: cisco
platform: ios-xe
os_versions:
  - "version range must be reviewed"
category: vlan
task: create_vlan
summary: Create a VLAN and assign a descriptive name.
difficulty: beginner
verification_status: unverified
reviewed_at: null
source_urls: []
prerequisites:
  - Confirm the device platform and OS version.
  - Confirm the VLAN ID is permitted by the network design.
placeholders:
  vlan_id:
    type: integer
    required: true
    min: 1
    max: 4094
  vlan_name:
    type: string
    required: true
    max_length: 32
template: |
  vlan {{ vlan_id }}
   name {{ vlan_name }}
verification_commands: []
rollback_notes: "Review the operational impact before removing a VLAN."
warnings:
  - "Illustrative template; verify syntax and platform compatibility before use."
tags:
  - vlan
  - switching
```

This example is a data-model illustration, not a verified universal
command. Before publishing any real template, replace placeholders and
compatibility metadata with reviewed values.

## 8.1 Required fields

-   `id`: unique stable identifier
-   `title`
-   `vendor`
-   `platform`
-   `os_versions` or explicit compatibility statement
-   `category`
-   `task`
-   `summary`
-   `difficulty`
-   `verification_status`
-   `reviewed_at`
-   `source_urls`
-   `prerequisites`
-   `placeholders`
-   `template`
-   `verification_commands`
-   `rollback_notes`
-   `warnings`
-   `tags`

## 8.2 Verification statuses

Use a defined set:

-   `draft`: not ready for general use
-   `unverified`: syntax/compatibility has not been confirmed
-   `reviewed`: checked by a project maintainer against cited
    documentation or an appropriate lab
-   `lab-tested`: tested in a named lab environment and platform/version
-   `needs-review`: review is outdated or a reported issue exists

Do not use "official" unless it is actually official vendor content and
the use is permitted. Do not equate "reviewed" with "guaranteed safe in
production."

## 8.3 Sources and copyright

Prefer vendor documentation and official configuration guides. Store
source URLs, document titles, relevant version information, and the date
reviewed. Respect vendor documentation copyright and licensing. Write
original explanations and avoid copying large copyrighted documentation
passages into the repository.

------------------------------------------------------------------------

# 9. Configuration Template Engine

The template engine must be deterministic and safe.

1.  Load only templates that pass schema validation.
2.  Resolve the vendor/platform/task selection to a specific template
    ID.
3.  Display required fields from the schema.
4.  Validate every field server-side and client-side.
5.  Enforce allow-lists for values such as interface names where a
    platform-specific rule is available.
6.  Reject unexpected fields.
7.  Prevent newlines or control characters in values that are not
    explicitly multiline.
8.  Generate output only by substituting validated values into the
    reviewed template.
9.  Display a preview and compatibility status.
10. Provide verification and rollback notes.
11. Record template version and generation timestamp when exporting, if
    applicable.
12. Never imply that generated configuration was applied to a device.

Do not allow a template to execute Python, shell commands, JavaScript,
or arbitrary code. Treat template files and user-imported templates as
untrusted input until validated.

------------------------------------------------------------------------

# 10. Search Design

Search should cover:

-   Title
-   Summary
-   Vendor/platform
-   Category/task
-   Tags
-   Command text
-   Explanation text

Expected behavior:

-   Case-insensitive matching
-   Partial keyword matching
-   Filter chips
-   Clear-all-filters action
-   Useful empty state with suggested query changes
-   Pagination or efficient incremental loading
-   Stable sorting and deterministic results

Examples of user searches:

-   `configure access VLAN`
-   `OSPF neighbor`
-   `FortiGate IPsec VPN`
-   `Dell OS10 LAG`
-   `Huawei Eth-Trunk`
-   `Cisco SSH management`
-   `show interface errors`

Search results must respect platform/version filters. A result from one
platform must not silently appear as compatible with another.

------------------------------------------------------------------------

# 11. API Design

Suggested REST API endpoints:

``` text
GET    /api/health
GET    /api/vendors
GET    /api/platforms?vendor=cisco
GET    /api/categories
GET    /api/templates
GET    /api/templates/{template_id}
GET    /api/search?q=...
POST   /api/templates/{template_id}/generate
POST   /api/diff
GET    /api/glossary
```

If user accounts are implemented:

``` text
GET    /api/me/favorites
POST   /api/me/favorites
DELETE /api/me/favorites/{template_id}
GET    /api/me/templates
POST   /api/me/templates
PUT    /api/me/templates/{template_id}
DELETE /api/me/templates/{template_id}
```

API requirements:

-   Pydantic request/response schemas
-   Consistent error response format
-   Input size limits
-   Pagination for list endpoints
-   Correct HTTP status codes
-   Validation errors that help the user fix the input
-   API documentation via FastAPI OpenAPI
-   No secrets in responses or logs
-   Rate limiting if exposed publicly
-   CORS configured for the intended frontend origin only

The API list is a proposal. Implement only endpoints used by the actual
application.

------------------------------------------------------------------------

# 12. Data Model

Suggested entities:

## Vendor

-   `id`
-   `name`
-   `slug`
-   `description`
-   `website_url`

## Platform

-   `id`
-   `vendor_id`
-   `name`
-   `os_family`
-   `version_notes`

## Category

-   `id`
-   `name`
-   `slug`
-   `description`

## Template

-   `id`
-   `title`
-   `vendor_id`
-   `platform_id`
-   `category_id`
-   `task`
-   `summary`
-   `template_body`
-   `schema_json`
-   `compatibility`
-   `verification_status`
-   `source_metadata`
-   `created_at`
-   `updated_at`
-   `reviewed_at`

## Favourite (optional for authenticated users)

-   `user_id`
-   `template_id`
-   `created_at`

## PersonalTemplate (optional)

-   `id`
-   `owner_id`
-   `title`
-   `template_body`
-   `schema_json`
-   `verification_status`
-   `created_at`
-   `updated_at`

Do not introduce a user table or authentication system unless the
project actually needs multiple users or protected personal content. For
a solo MVP, start without login or use a clearly documented local mode.

------------------------------------------------------------------------

# 13. Security and Safety Requirements

Although Phase 1 does not connect to devices, the project still needs
safe input handling and honest compatibility information.

-   Never store network device passwords in Phase 1.
-   Never commit `.env`, API keys, passwords, tokens, or private
    configuration files.
-   Provide `.env.example` containing placeholders only.
-   Validate all user inputs and imported templates.
-   Enforce request body and upload size limits.
-   Sanitize displayed text and avoid unsafe HTML rendering.
-   Treat configuration files as potentially sensitive user data.
-   Do not transmit pasted configurations to external services.
-   If telemetry is ever added, document it and obtain appropriate
    consent.
-   Include a clear notice that users must review commands in a lab and
    follow their organization's change-control process.
-   For future device execution, require a separate threat model,
    role-based permissions, encrypted secret storage, least-privilege
    accounts, approvals, audit logs, backups, and rollback controls.

------------------------------------------------------------------------

# 14. Testing Plan

## 14.1 Frontend tests

-   Dashboard renders vendor cards from real data.
-   Search and filters work together.
-   Filters can be cleared.
-   Command detail displays compatibility and verification status.
-   Copy button handles success and failure.
-   Builder displays required fields and validation errors.
-   Generated output updates when inputs change.
-   Diff tool correctly marks added and removed lines.
-   Favourites behave correctly.
-   Responsive navigation works.
-   Light and dark themes maintain readable contrast.
-   Keyboard navigation and focus states work.

## 14.2 Backend tests

-   Health endpoint responds correctly.
-   Vendor/platform/category endpoints return expected schemas.
-   Search handles empty, partial, and special-character queries.
-   Unknown template IDs return 404.
-   Invalid template data is rejected.
-   Required placeholders are enforced.
-   Invalid VLAN IDs and malformed IP values are rejected where the
    schema requires them.
-   Unexpected fields are rejected.
-   Multiline/control-character injection is rejected for single-line
    fields.
-   Diff output handles empty strings, Unicode, long lines, and newline
    differences.
-   Imported templates cannot bypass schema validation.
-   Error responses do not expose stack traces in production.

## 14.3 Content tests

-   Every published template has a unique ID.
-   Every template references an existing vendor/platform/category.
-   Required metadata is present.
-   `reviewed` and `lab-tested` entries have review evidence.
-   Compatibility claims include a platform/version basis.
-   Source links are recorded for reviewed entries.
-   No example is incorrectly labelled verified.
-   Templates are linted/validated by `scripts/validate_templates.py`.

## 14.4 End-to-end tests

Test the main user journeys:

1.  Search a command.
2.  Filter by vendor and platform.
3.  Open a command detail page.
4.  Generate a configuration.
5.  Copy/export generated output.
6.  Compare two configuration blocks.
7.  Add/remove a favourite.
8.  Create and export a personal template, if implemented.

------------------------------------------------------------------------

# 15. Development Steps: Start to Final Release

## Step 1 --- Create the repository

-   Create `netcommand-hub`.
-   Add README, license, `.gitignore`, `.editorconfig`, and this
    specification.
-   Decide the licence only after considering the code and content
    sources.
-   Create the folder structure.
-   Make the initial Git commit.

## Step 2 --- Define the MVP

The MVP must include:

-   Four vendor catalogues
-   Vendor/platform selection
-   Search and filters
-   Command detail page
-   Configuration generator with schema-based fields
-   Copy and text export
-   Configuration diff
-   Responsive dark/light UI
-   Template validation
-   Tests and documentation

Do not start live device execution.

## Step 3 --- Establish the design system

-   Define colour, typography, spacing, radius, and shadow tokens.
-   Build the app shell and responsive sidebar.
-   Build reusable buttons, cards, inputs, badges, dialogs, and toasts.
-   Implement dark and light themes.
-   Verify keyboard accessibility before building every page.

## Step 4 --- Build the frontend shell

-   Add routing.
-   Build dashboard and vendor explorer.
-   Add loading, error, and empty states.
-   Use typed sample data initially if necessary, clearly separated from
    production content.

## Step 5 --- Build backend and database

-   Create FastAPI application.
-   Add health endpoint.
-   Add models and database migrations.
-   Add vendor/platform/category/template endpoints.
-   Add schema validation and structured errors.
-   Add automated tests.

## Step 6 --- Build template storage and validation

-   Create vendor-specific directories.
-   Define the YAML/JSON schema.
-   Implement template loader and validator.
-   Seed a small, carefully reviewed sample set.
-   Keep unverified examples visibly labelled.
-   Add validation script to CI.

## Step 7 --- Implement search

-   Add search by title, summary, task, tags, and command text.
-   Add filters and sorting.
-   Add pagination or efficient loading.
-   Test that vendor/platform constraints are respected.

## Step 8 --- Implement configuration generator

-   Load the selected template and its schema.
-   Render dynamic fields.
-   Validate input.
-   Generate output.
-   Display warnings, verification instructions, and compatibility
    metadata.
-   Add copy and export.

## Step 9 --- Implement configuration diff

-   Add two text inputs/editors.
-   Implement stable line-based diff.
-   Show added/removed lines and summary counts.
-   Add reset, swap, copy, and export.
-   Test edge cases.

## Step 10 --- Add favourites and personal templates

-   Choose local persistence or user accounts and document the decision.
-   Implement favourite management.
-   Implement personal templates only after validation and import/export
    rules are ready.
-   Mark personal templates as unverified.

## Step 11 --- Populate the four vendor libraries

Work vendor by vendor:

1.  Cisco IOS/IOS-XE/NX-OS
2.  Dell OS6/OS9/OS10 and the applicable product families
3.  Huawei VRP platforms
4.  FortiGate/FortiOS versions

For each template:

-   Confirm the exact platform and OS version.
-   Consult appropriate vendor documentation.
-   Record prerequisites and assumptions.
-   Add validated placeholders.
-   Add verification commands.
-   Add rollback notes where applicable.
-   Record source metadata and review status.
-   Test syntax in a suitable lab when available.
-   Do not label a template lab-tested without actually testing it.

Prioritize quality and compatibility over a large unreviewed command
count.

## Step 12 --- Add CI and quality gates

GitHub Actions should run:

-   Frontend lint
-   Frontend tests
-   TypeScript build/type check
-   Backend lint
-   Backend tests
-   Template schema validation
-   Build verification

Pull requests should not pass if these checks fail.

## Step 13 --- Manual QA

Check:

-   All routes and navigation
-   Search and filters
-   Form validation
-   Copy and export
-   Diff results
-   Dark/light mode
-   Mobile layout
-   Empty/error/loading states
-   Accessibility and keyboard navigation
-   Broken links and incorrect compatibility claims
-   No secrets or sensitive configs in the repository

## Step 14 --- Documentation and screenshots

Complete:

-   README overview
-   Feature list
-   Installation instructions
-   Local development guide
-   Architecture diagram
-   Vendor/platform support matrix
-   Template contribution guide
-   Testing guide
-   Security policy
-   Screenshots of dashboard, command library, builder, and diff tool
-   Known limitations and future roadmap

Screenshots must show the actual application, not mockups presented as a
finished implementation.

## Step 15 --- Final release

-   Run all tests and validation scripts.
-   Build frontend and backend.
-   Test a clean install from the README.
-   Verify `.env.example` contains no secrets.
-   Review licence and content attributions.
-   Tag a release such as `v1.0.0` only when the acceptance criteria are
    met.
-   Publish a release note with implemented features and known
    limitations.
-   Pin the repository on GitHub.
-   Publish a short LinkedIn post with real screenshots and a link to
    the repository.

------------------------------------------------------------------------

# 16. Definition of Done / Acceptance Criteria

The project is ready for its first release only when:

-   [ ] Cisco, Dell, Huawei, and Fortinet are represented in the vendor
    catalogue.
-   [ ] Platform and OS distinctions are visible.
-   [ ] Search and filters work with real stored records.
-   [ ] Command details show compatibility and verification status.
-   [ ] Configuration generator validates fields and produces output
    from templates.
-   [ ] Copy and export work.
-   [ ] Configuration diff correctly highlights changes.
-   [ ] Favourites work if included in the MVP.
-   [ ] Personal templates are validated and labelled appropriately if
    included.
-   [ ] Dark and light themes work.
-   [ ] Layout is usable on desktop, tablet, and mobile.
-   [ ] Loading, error, and empty states are implemented.
-   [ ] Backend and frontend tests pass.
-   [ ] All bundled templates pass schema validation.
-   [ ] No secrets or production device configurations are committed.
-   [ ] README contains setup and usage instructions.
-   [ ] Screenshots show the real implementation.
-   [ ] Known limitations and unverified templates are clearly
    documented.
-   [ ] No feature is presented as complete if it is only a placeholder.

------------------------------------------------------------------------

# 17. README Content Outline

The repository README should include:

1.  Project name and short description
2.  Screenshots
3.  Features
4.  Initial vendor/platform coverage
5.  Architecture overview
6.  Technology stack
7.  Prerequisites
8.  Installation and local run instructions
9.  Environment variables
10. How to add a command template
11. How verification status works
12. Testing instructions
13. Security and responsible-use notes
14. Known limitations
15. Roadmap
16. Contribution guidelines
17. Licence and content attribution

Do not include commands such as `npm run dev` or `uvicorn ...` in the
README until they match the actual scripts and paths in the repository.

------------------------------------------------------------------------

# 18. Roadmap After Version 1.0

Possible later improvements:

-   More vendor families
-   More detailed platform/version coverage
-   Import of user-owned configuration files
-   Semantic configuration comparison
-   Lab integration for syntax testing
-   Team workspaces and shared templates
-   Authentication and role-based access
-   Template review workflow
-   Official documentation link checking
-   Offline/local deployment mode
-   Optional device connectivity as a separate, security-reviewed
    product phase

Live device changes must remain disabled until a separate implementation
includes authorization, least privilege, approvals, encrypted secrets,
auditability, backups, rollback, and lab validation.

------------------------------------------------------------------------

# 19. Master Instructions for an AI Coding Agent

Use this section as the main instruction prompt when implementing the
project with a coding agent such as Codex.

> You are a senior full-stack engineer and network automation
> specialist. Build **NetCommand Hub**, a production-minded,
> portfolio-quality multi-vendor network command reference and
> configuration generator for Cisco, Dell, Huawei, and Fortinet.
>
> Treat this specification as the source of truth. Before coding,
> inspect the existing repository and identify what already exists. Do
> not overwrite working files blindly. If the repository is empty,
> scaffold the structure described here.
>
> **Scope:** Phase 1 is a command/configuration library. Do not connect
> to real network devices or execute commands on them. Do not implement
> SSH deployment, automatic changes, or secret storage in this phase.
>
> **Architecture:** Use React + TypeScript + Vite for the frontend and
> Python + FastAPI for the backend. Use the database choice documented
> in the project. Keep frontend, backend, template data, validation,
> tests, and documentation separated. Use typed interfaces and reusable
> components.
>
> **Vendors:** Include Cisco IOS/IOS-XE/NX-OS, Dell OS6/OS9/OS10 where
> applicable, Huawei VRP, and FortiGate/FortiOS. Represent
> platform/version compatibility explicitly. Never treat vendor command
> syntax as interchangeable.
>
> **Features:** Implement dashboard, vendor explorer, command search and
> filtering, command detail pages, schema-driven configuration
> generation, copy/export, line-based configuration diff, favourites,
> and validated personal templates if included in the agreed MVP.
>
> **Data quality:** Store command/configuration templates as structured
> YAML or JSON with stable IDs, vendor, platform, OS/version
> compatibility, category, task, summary, prerequisites, placeholders,
> configuration body, verification commands, rollback notes, warnings,
> sources, and verification status. Do not invent sources or label
> commands as reviewed or lab-tested unless that review/testing has
> actually happened. Clearly label illustrative and unverified
> templates.
>
> **Safety:** Validate every placeholder. Reject unexpected fields and
> unsafe control characters. Do not execute imported templates. Do not
> store device credentials. Do not expose secrets in logs. Make clear
> that generated text must be reviewed before being used on a production
> network.
>
> **UI:** Deliver a modern, responsive, dark-first interface with a
> complete light theme. Use a consistent design system, clear
> typography, restrained blue/cyan accents, accessible contrast,
> keyboard navigation, visible focus states, reusable cards and badges,
> syntax-highlighted configuration panels, and proper
> loading/error/empty states. Avoid clutter and nonfunctional UI.
>
> **Quality:** Write maintainable code, meaningful comments where they
> help, type annotations, input validation, unit tests, integration
> tests, and template validation tests. Add GitHub Actions CI for
> linting, tests, type checks, builds, and template validation. Do not
> leave fake buttons, dead links, placeholder pages, or hardcoded fake
> metrics.
>
> **Workflow:** Work in small phases. First inspect the repository and
> present a concise implementation plan. Then scaffold the application,
> establish the design system, implement backend/data validation, build
> the core pages, add template data, test, document, and perform a final
> QA pass. After each phase, run the relevant tests and fix failures
> before continuing. Do not claim a test passed unless you actually ran
> it.
>
> **Final delivery:** Ensure the application can be installed and run
> from a clean checkout using the documented instructions. Update
> README, architecture docs, support matrix, screenshots from the actual
> app, known limitations, and release notes. Report completed features,
> commands used to run tests, test results, and any remaining gaps
> honestly.

------------------------------------------------------------------------

# 20. Final Implementation Principle

**Build a trustworthy configuration knowledge base first, not a fake
universal command executor.**

NetCommand Hub's value comes from finding the right command for the
right vendor, platform, and OS version, explaining it clearly,
generating it safely, and documenting its verification status. Accuracy,
compatibility metadata, usability, and maintainability matter more than
the raw number of commands.
