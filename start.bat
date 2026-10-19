@echo off
rem Start NetCommand Hub (Windows). Double-click to run. Optional: start.bat -Port 8010 -NoBrowser
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*
pause
