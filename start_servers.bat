@echo off
echo Starting Packstack servers...
echo.

echo Starting Flask backend server on port 5001...
start cmd /k "cd server && python app.py"

echo.
echo Waiting for backend server to initialize...
timeout /t 3 /nobreak > nul

echo.
echo Starting React frontend server on port 5173...
start cmd /k "npm run dev"

echo.
echo Both servers are now running:
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:5001
echo.
echo Press any key to close this window (servers will continue running)
pause > nul
