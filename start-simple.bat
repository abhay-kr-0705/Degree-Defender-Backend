@echo off
echo Starting Degree Defenders Platform...
echo.

echo Installing backend dependencies...
cd /d "c:\Users\abhay\OneDrive\Desktop\Degree Defenders"
call npm install

echo.
echo Installing frontend dependencies...
cd /d "c:\Users\abhay\OneDrive\Desktop\Degree Defenders\frontend"
call npm install

echo.
echo Starting backend server on port 3001...
cd /d "c:\Users\abhay\OneDrive\Desktop\Degree Defenders"
start "Backend Server" cmd /k "npm run dev"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting frontend server on port 3000...
cd /d "c:\Users\abhay\OneDrive\Desktop\Degree Defenders\frontend"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul
