# Development mode: API with auto-reload on :8000 and the Vite dev server (hot reload) on :5173.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path "backend\.venv\Scripts\python.exe") -or -not (Test-Path "frontend\node_modules")) {
    Write-Host "Run setup.bat first." -ForegroundColor Red
    exit 1
}

$api = Start-Process -PassThru -WindowStyle Minimized -WorkingDirectory "$root\backend" `
    -FilePath "$root\backend\.venv\Scripts\python.exe" `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"
Write-Host "API started (PID $($api.Id)) on http://127.0.0.1:8000  - interactive docs at /docs" -ForegroundColor Green
try {
    Set-Location frontend
    Write-Host "Web app: http://localhost:5173  (Ctrl+C stops both)" -ForegroundColor Green
    & npm run dev -- --open
} finally {
    if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force }
}
