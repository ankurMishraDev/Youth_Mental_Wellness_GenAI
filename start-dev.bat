@echo off
echo 🚀 Starting Youth Guide AI Mentor Development Environment
echo ==========================================================

echo.
echo 🔍 Checking if required files exist...

if exist "db_server.js" (
    echo ✅ Firebase Backend: db_server.js found
) else (
    echo ❌ Firebase Backend: db_server.js not found
)

if exist "server.py" (
    echo ✅ AI Server: server.py found
) else (
    echo ❌ AI Server: server.py not found
)

if exist "admin-key.json" (
    echo ✅ Firebase Admin Key: admin-key.json found
) else (
    echo ❌ Firebase Admin Key: admin-key.json not found
)

if exist "service-account.json" (
    echo ✅ Google Cloud Service Account: service-account.json found
) else (
    echo ❌ Google Cloud Service Account: service-account.json not found
)

echo.
echo 📋 To start the complete application, run these commands in separate terminals:
echo ===============================================================================

echo.
echo 1. Start Firebase Backend ^(Node.js^):
echo    cd "%cd%"
echo    npm install firebase-admin express cors nodemon
echo    node db_server.js
echo.

echo 2. Start AI WebSocket Server ^(Python^):
echo    cd "%cd%"
echo    pip install google-genai websockets requests google-oauth2
echo    python server.py
echo.

echo 3. Start Frontend Development Server ^(Vite^):
echo    cd "%cd%"
echo    npm install
echo    npm run dev
echo.

echo 🌐 URLs:
echo ========
echo • Frontend:         http://localhost:5173
echo • Firebase Backend: http://localhost:3000
echo • AI WebSocket:     ws://localhost:8765
echo.

echo 💡 Tips:
echo ========
echo • Use Ctrl+C to stop any server
echo • Keep all three terminals open while developing
echo • Check the browser console for any connection errors
echo • Make sure all required files exist before starting

echo.
echo ✅ Setup information displayed!
echo 🔧 Start each service in a separate PowerShell/CMD window.

pause
