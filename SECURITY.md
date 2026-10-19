# Security Policy

## Scope of Phase 1

NetCommand Hub is a local command library and text generator. It does **not**:

- connect to devices (no SSH, Telnet, NETCONF, RESTCONF, SNMP or vendor APIs),
- execute commands anywhere,
- store device passwords, keys or tokens,
- send telemetry or transmit pasted configuration to external services.

## Controls in place

| Area | Control |
|---|---|
| Template safety | Placeholder substitution only (`{{name}}`); no code, shell or expression execution; YAML loaded with `yaml.safe_load`; all content schema-validated at start-up (server refuses to start otherwise) |
| Input validation | Per-type allow-lists; control characters and line breaks always rejected; strings cannot contain quotes or CLI-special characters unless a template defines a stricter explicit pattern; unknown fields rejected; single-pass substitution |
| Personal / imported templates | Same schema and engine; forced `unverified`; cannot self-certify; hard errors for control characters, > 500 lines, undefined/unused placeholders; warnings for HTML-like text, shell substitution characters and probable literal secrets; imports rebuilt from known fields, size-limited (1 MB, 200 templates) and re-validated server-side |
| Rendering | Config text rendered as React text nodes (no `dangerouslySetInnerHTML` anywhere); source links open with `rel="noopener noreferrer"` and only for `http(s)` URLs |
| API | Request body limit (default 1 MB), field/length limits, pagination caps, generic 500 responses (stack traces only in the server log), CORS restricted to configured origins with GET/POST only |
| Headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Content-Security-Policy` (`default-src 'self'`) for the web app - the theme bootstrap script is an external file so no inline script is needed |
| Network exposure | The provided scripts bind to `127.0.0.1` only |
| Repository hygiene | `.gitignore` excludes `.env`, virtual environments and build output; `.env.example` contains placeholders only |

## Not provided (do not rely on)

- **Authentication, authorisation, rate limiting and TLS.** Do not expose the server beyond localhost. If you deploy it for several users you must add TLS, authentication, rate limiting and review CORS first.
- Protection of data in the browser: favourites and personal templates are stored unencrypted in local storage and are readable by anyone with access to that browser profile.
- Dependency vulnerability scanning is not automated yet; run `npm audit` and `pip list --outdated` periodically.

## Responsible use

Generated text is **unverified** unless a template says otherwise and even then is not a guarantee of safety. Always review commands, test in a lab, take a backup and follow your organisation's change-control process. Treat configuration files as sensitive: they often contain secrets - remove them before pasting into any tool.

## Future device execution

Any future feature that touches live devices requires a separate threat model, role-based permissions, encrypted secret storage, least-privilege accounts, approvals, audit logs, backups and rollback controls before it is built.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the project owner (do not open a public issue with exploit details). Include the version/commit, steps to reproduce and impact. A contact address has not been published yet - the owner should add one here before the project is made public.
