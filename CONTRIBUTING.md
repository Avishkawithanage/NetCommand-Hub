# Contributing

Thanks for helping. The most valuable contributions are **accurate, sourced, tested templates** - quality and compatibility matter more than quantity.

## Ground rules

1. Do not mark a template `reviewed` or `lab-tested` without real evidence (see [docs/TEMPLATE_AUTHORING_GUIDE.md](docs/TEMPLATE_AUTHORING_GUIDE.md)).
2. Do not invent source links or copy vendor documentation.
3. Keep platforms separate; state compatibility honestly.
4. No secrets, credentials or production configurations in commits.
5. Do not add live-device features to this phase.

## Workflow

1. Run `setup.bat` (or the commands in [docs/APP_START_GUIDE.md](docs/APP_START_GUIDE.md)).
2. Make a small, focused change on a branch.
3. Run `scripts\test-all.ps1` - everything must pass.
4. For content changes also run `backend\.venv\Scripts\python scripts\validate_templates.py`.
5. Open a pull request describing what changed, how you verified it, and (for templates) the platform/version and evidence.

## Code style

- Python: ruff (`ruff check`, config in `backend/pyproject.toml`), type hints, small functions.
- TypeScript/React: ESLint (`npm run lint`), strict TypeScript, no `any`, accessible markup (labels, roles, keyboard support).
- Tests accompany behaviour changes.
- Comments only where the reason is not obvious from the code.
