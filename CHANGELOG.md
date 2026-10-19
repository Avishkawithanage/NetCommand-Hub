# Changelog

## 1.0.0 - 2026-10-18 (first complete build, pre-release)

First implementation of the specification's Phase 1.

- FastAPI backend with schema-validated YAML content, safe template engine, search, diff and personal-template validation.
- React + TypeScript web app: overview, command library, command details, vendor explorer, configuration builder, configuration diff, favourites, personal templates, glossary, settings/about; dark and light themes; responsive layout.
- 122 templates for Cisco IOS / IOS-XE / NX-OS, Dell OS6 / OS9 / OS10, Huawei VRP and FortiGate FortiOS - **all Unverified**.
- User guide, app start guide, function guide, architecture, testing and authoring documentation.
- Windows launchers (`setup.bat`, `start.bat`, `start-dev.bat`), validation and test scripts, CI workflow.
- 86 backend tests and 22 frontend tests.

Review progress (2026-10-19): 4 Cisco IOS-XE templates (vlan-create, access-port, trunk-port, svi-ip) reviewed against Catalyst 9300 IOS XE 17.9 documentation; new `platform_overrides` template key. Partly checked but NOT promoted: ospf-basic (router-id not found in docs read), bgp-neighbor (4-byte AS / address-family unconfirmed), static-route (ip route syntax not found) - findings recorded in their compatibility notes.

Not yet done: further reviewed/lab-tested content, screenshots, licence selection, accessibility audit with assistive technology, cross-browser testing. See README "Known limitations".
