@echo off
rem Development mode with hot reload (API :8000, web app :5173).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1"
pause
