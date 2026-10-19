@echo off
rem One-time setup for NetCommand Hub (Windows). Double-click to run.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
if errorlevel 1 (
  echo.
  echo Setup did not finish. Read the message above, fix it, then run setup.bat again.
)
pause
