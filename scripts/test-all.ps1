# Run every automated check: template validation, backend lint + tests, frontend lint + typecheck + tests + build.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$failed = @()
function Step($name, [scriptblock]$block) {
    Write-Host "`n==> $name" -ForegroundColor Cyan
    & $block
    if ($LASTEXITCODE -ne 0) { $script:failed += $name; Write-Host "FAILED: $name" -ForegroundColor Red }
}
$py = "$root\backend\.venv\Scripts\python.exe"
Step "Template validation"   { & $py scripts\validate_templates.py }
Step "Backend lint (ruff)"   { Push-Location backend; & $py -m ruff check app tests; $c = $LASTEXITCODE; Pop-Location; $global:LASTEXITCODE = $c }
Step "Backend tests"         { Push-Location backend; & $py -m pytest -q; $c = $LASTEXITCODE; Pop-Location; $global:LASTEXITCODE = $c }
Step "Frontend lint"         { Push-Location frontend; & npm run lint; $c = $LASTEXITCODE; Pop-Location; $global:LASTEXITCODE = $c }
Step "Frontend type check"   { Push-Location frontend; & npm run typecheck; $c = $LASTEXITCODE; Pop-Location; $global:LASTEXITCODE = $c }
Step "Frontend tests"        { Push-Location frontend; & npm test; $c = $LASTEXITCODE; Pop-Location; $global:LASTEXITCODE = $c }
Step "Frontend build"        { Push-Location frontend; & npm run build; $c = $LASTEXITCODE; Pop-Location; $global:LASTEXITCODE = $c }
if ($failed.Count) { Write-Host "`nFAILED steps: $($failed -join ', ')" -ForegroundColor Red; exit 1 }
Write-Host "`nAll checks passed." -ForegroundColor Green
