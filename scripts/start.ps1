# Start NetCommand Hub (production mode: one server serves the API and the built web app).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\start.ps1 [-Port 8000] [-NoBrowser]
param(
    [int]$Port = 8000,
    [switch]$NoBrowser
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$py = "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
    Write-Host "Python environment not found. Run setup.bat first." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "frontend\dist\index.html")) {
    Write-Host "The web app has not been built. Run setup.bat first (needs Node.js)." -ForegroundColor Red
    exit 1
}

# Refuse to start if the port is already in use.
$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    Write-Host "Port $Port is already in use. Close the other program or run: start.bat -Port 8010" -ForegroundColor Red
    exit 1
}

$url = "http://127.0.0.1:$Port"
Write-Host "NetCommand Hub is starting at $url  (press Ctrl+C to stop)" -ForegroundColor Green
if (-not $NoBrowser) {
    Start-Job -ScriptBlock { param($u) Start-Sleep -Seconds 3; Start-Process $u } -ArgumentList $url | Out-Null
}
Set-Location backend
& .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port $Port
