@echo off
echo Starting Degree Defenders Development Environment...

REM Start backend in a new window
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0 && npm install && npm run dev"

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend in a new window
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo Both servers are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to continue...
pause >nul
