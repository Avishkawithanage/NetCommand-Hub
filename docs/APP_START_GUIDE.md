# NetCommand Hub - App Start Guide

How to install, start, stop, update and troubleshoot NetCommand Hub on Windows.
(Linux/macOS commands are given at the end.)

---

## 1. What you need first

| Requirement | Version | How to check | Where to get it |
|---|---|---|---|
| Python | 3.11 or newer | `python --version` | https://www.python.org/downloads/ - tick **Add python.exe to PATH** |
| Node.js (includes npm) | 20 or newer (LTS) | `node -v` and `npm -v` | https://nodejs.org/ |
| A web browser | Any current Chrome / Edge / Firefox | - | - |

You do **not** need a database, Docker, an account or an Internet connection after setup.
The app only listens on your own computer (`127.0.0.1`).

> Tested during development with Python 3.14, Node.js 24 and npm 11 on Windows 10.

---

## 2. First-time setup (once)

Open the project folder (`NetCommand Hub`) in File Explorer and **double-click `setup.bat`**.

It does five things and stops with a clear message if anything fails:

1. Checks that Python (3.11+), Node.js and npm are installed.
2. Creates a private Python environment in `backend\.venv`.
3. Installs the backend packages (FastAPI, Uvicorn, Pydantic, PyYAML, pytest, httpx, ruff).
4. Installs the frontend packages and builds the web app into `frontend\dist`.
5. Validates every template file (`scripts\validate_templates.py`).

When you see **"Setup complete."** you are ready. Setup takes about 1-3 minutes.

Prefer a terminal? From the project folder:

```bash
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

---

## 3. Start the app (every time)

**Double-click `start.bat`.**

- A console window opens and prints `NetCommand Hub is starting at http://127.0.0.1:8000`.
- Your browser opens automatically after about 3 seconds. If it does not, open **http://127.0.0.1:8000** yourself.
- **Keep the console window open** while you use the app.

Options (run from a terminal in the project folder):

```bash
start.bat -Port 8010          # use a different port
start.bat -NoBrowser          # do not open the browser automatically
```

### Stop the app

Click the console window and press **Ctrl + C** (answer `Y` if asked), or just close the window.

---

## 4. Development mode (optional, for changing the code)

**Double-click `start-dev.bat`.**

| Part | Address | Notes |
|---|---|---|
| Web app (hot reload) | http://localhost:5173 | Use this while editing files in `frontend\src` |
| API (auto-reload) | http://127.0.0.1:8000 | Interactive API docs at http://127.0.0.1:8000/docs |

Closing the script stops both. In dev mode the web app on port 5173 forwards `/api` calls to port 8000.

After finishing frontend changes, rebuild the production version used by `start.bat`:

```bash
cd frontend
npm run build
```

---

## 5. Check everything works (optional)

```bash
powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
```

This runs, in order: template validation, backend lint, backend tests, frontend lint, type check, frontend tests and the production build. It ends with **All checks passed.** or lists the failing steps.

Quick health check while the app is running: open http://127.0.0.1:8000/api/health - you should see `{"status":"ok","templates":122}` (the number is however many templates are loaded).

---

## 6. Where things are

```text
NetCommand Hub/
├─ setup.bat / start.bat / start-dev.bat   double-click launchers
├─ backend/        FastAPI server, template engine, tests   (Python)
├─ frontend/       React + TypeScript web app               (Node)
├─ data/           catalogue, glossary and template YAML files  <- the library content
├─ scripts/        PowerShell scripts + validate_templates.py
└─ docs/           guides and specification
```

Your own favourites and personal templates are **not** in these folders - they live in your browser's local storage.

---

## 7. Settings (all optional)

Set these environment variables before starting if you need to change defaults:

| Variable | Default | Meaning |
|---|---|---|
| `NCH_DATA_DIR` | `<project>\data` | Folder containing `catalog.yaml`, `glossary.yaml`, `vendors\` |
| `NCH_FRONTEND_DIST` | `<project>\frontend\dist` | Built web app served by the backend |
| `NCH_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins for the API (comma separated) |
| `NCH_MAX_BODY_BYTES` | `1000000` | Largest accepted request body |

Example (PowerShell): `$env:NCH_MAX_BODY_BYTES = "2000000"; .\start.bat`

No secrets are required. See `.env.example`.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `'python' was not found` during setup | Python not installed or not on PATH | Reinstall Python and tick **Add python.exe to PATH**, then reopen the window |
| `Python 3.11 or newer is required` | Old Python | Install a newer Python |
| `'node' was not found` | Node.js missing | Install Node.js LTS |
| `Python environment not found. Run setup.bat first.` | You started before setup | Run `setup.bat` |
| `The web app has not been built` | `frontend\dist` missing | Run `setup.bat`, or `cd frontend && npm run build` |
| `Port 8000 is already in use` | Another program (or a second copy of this app) uses the port | Close it, or run `start.bat -Port 8010` |
| Page says "Cannot reach the NetCommand Hub server" | Server window was closed or crashed | Start again with `start.bat` and press **Try again** |
| Server exits at start with template errors | A template file in `data\` is invalid | Run `backend\.venv\Scripts\python scripts\validate_templates.py`; each problem is listed with file and template ID. Fix it and start again |
| PowerShell says scripts are disabled | Execution policy | The `.bat` files already pass `-ExecutionPolicy Bypass`. If running `.ps1` manually, use `powershell -ExecutionPolicy Bypass -File ...` |
| Favourites disappeared | Browser site data was cleared, or you opened the app on a different address/port | Browser storage is per address. Always use the same URL; export My Templates as a backup |
| Blank page after an update | Old files cached | Hard refresh (Ctrl + F5), and rebuild with `npm run build` |
| Copy button says "Copy failed" | Browser blocked clipboard access | Use `http://127.0.0.1` or `http://localhost` (allowed), or select the text and press Ctrl + C |
| `npm install` errors behind a proxy | Network policy | Configure npm's proxy (`npm config set proxy ...`) or run setup on an unrestricted network |

If something else fails, run `scripts\test-all.ps1` and read the first failing step.

---

## 9. Updating

1. Replace the project files with the new version (keep your `data\` folder if you added templates).
2. Double-click `setup.bat` again - it reuses the existing environment and only installs what changed.
3. Start with `start.bat`.

## 10. Uninstalling

Delete the project folder. To also remove saved favourites/personal templates, clear the site data for `127.0.0.1:8000` in your browser (or use **Settings / About -> Clear all saved data** first).

---

## 11. Linux / macOS

```bash
# one-time setup
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
(cd frontend && npm install && npm run build)
backend/.venv/bin/python scripts/validate_templates.py

# start (production mode) - then open http://127.0.0.1:8000
cd backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# development mode (two terminals)
cd backend && .venv/bin/python -m uvicorn app.main:app --reload       # API   :8000
cd frontend && npm run dev                                            # UI    :5173

# all checks
backend/.venv/bin/python scripts/validate_templates.py
(cd backend && .venv/bin/ruff check app tests && .venv/bin/python -m pytest -q)
(cd frontend && npm run lint && npm run typecheck && npm test && npm run build)
```

The `.bat`/`.ps1` launchers are Windows-only.

## 12. Security note

The server binds to `127.0.0.1` only, so other computers cannot reach it. Do **not** change the host to `0.0.0.0` or expose the port to a network without adding authentication and rate limiting (see `SECURITY.md`).
