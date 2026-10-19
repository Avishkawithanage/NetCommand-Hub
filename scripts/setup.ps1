# One-time setup: Python virtual environment, backend packages, frontend packages and production build.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Need($cmd, $hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' was not found. $hint" -ForegroundColor Red
        exit 1
    }
}
Need "python" "Install Python 3.11 or newer from https://www.python.org/downloads/ (tick 'Add python.exe to PATH')."
Need "node" "Install Node.js 20 or newer (LTS) from https://nodejs.org/."
Need "npm" "npm ships with Node.js - reinstall Node.js."

$pyOk = & python -c "import sys; print(int(sys.version_info >= (3, 11)))"
if ($pyOk.Trim() -ne "1") { Write-Host "ERROR: Python 3.11 or newer is required." -ForegroundColor Red; exit 1 }

Write-Host "==> [1/4] Creating Python virtual environment (backend\.venv)" -ForegroundColor Cyan
if (-not (Test-Path "backend\.venv\Scripts\python.exe")) { & python -m venv backend\.venv; if ($LASTEXITCODE) { exit 1 } }

Write-Host "==> [2/4] Installing backend packages" -ForegroundColor Cyan
& backend\.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r backend\requirements-dev.txt
if ($LASTEXITCODE) { exit 1 }

Write-Host "==> [3/4] Installing frontend packages" -ForegroundColor Cyan
Push-Location frontend
& npm install --no-audit --no-fund
if ($LASTEXITCODE) { Pop-Location; exit 1 }

Write-Host "==> [4/4] Building the frontend" -ForegroundColor Cyan
& npm run build
if ($LASTEXITCODE) { Pop-Location; exit 1 }
Pop-Location

Write-Host "==> Validating template data" -ForegroundColor Cyan
& backend\.venv\Scripts\python.exe scripts\validate_templates.py
if ($LASTEXITCODE) { exit 1 }

Write-Host ""
Write-Host "Setup complete. Start the app with start.bat (or scripts\start.ps1)." -ForegroundColor Green
