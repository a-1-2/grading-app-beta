@echo off
cd /d "%~dp0"
echo Starting Grading App Local JSON Server...
echo Data will be saved in: %USERPROFILE%\Documents\GradingAppData
echo.
echo Open this link if the browser does not open automatically:
echo http://127.0.0.1:3000
echo.
start http://127.0.0.1:3000
node script.js
pause
