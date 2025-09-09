#!/bin/bash

# Youth Guide AI Mentor - Development Startup Script
# This script starts all required services in the correct order

echo "🚀 Starting Youth Guide AI Mentor Development Environment"
echo "=========================================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    local service=$2
    if netstat -an | grep ":$port.*LISTEN" > /dev/null 2>&1; then
        echo "⚠️  Port $port is already in use (expected for $service)"
        return 0
    else
        echo "✅ Port $port is available for $service"
        return 1
    fi
}

# Check ports
echo "🔍 Checking ports..."
check_port 3000 "Firebase Backend"
check_port 8765 "AI WebSocket Server"
check_port 5173 "Frontend Dev Server"
echo ""

# Start Firebase Backend (Node.js)
echo "🔥 Starting Firebase Backend Server..."
echo "Installing Node.js dependencies..."
if [ -f "backend-package.json" ]; then
    npm install --package-lock firebase-admin express cors
    echo "Starting backend server on port 3000..."
    echo "Command: node db_server.js"
    echo "💡 Run in a separate terminal: npm run start:backend"
else
    echo "⚠️  backend-package.json not found. Please install dependencies manually:"
    echo "   npm install firebase-admin express cors"
    echo "   node db_server.js"
fi
echo ""

# Start AI WebSocket Server (Python)
echo "🤖 Starting AI WebSocket Server..."
echo "Make sure you have Python dependencies installed:"
echo "   pip install google-genai websockets requests google-oauth2"
echo ""
echo "Starting WebSocket server on port 8765..."
echo "Command: python server.py"
echo "💡 Run in a separate terminal: python server.py"
echo ""

# Start Frontend (Vite)
echo "⚛️  Starting Frontend Development Server..."
echo "Command: npm run dev"
echo "💡 Run in a separate terminal: npm run dev"
echo ""

echo "📋 Summary of Services to Start:"
echo "================================"
echo "1. Firebase Backend:    node db_server.js           (Port 3000)"
echo "2. AI WebSocket Server: python server.py            (Port 8765)"
echo "3. Frontend Dev Server: npm run dev                 (Port 5173)"
echo ""

echo "🌐 URLs:"
echo "========"
echo "• Frontend:         http://localhost:5173"
echo "• Firebase Backend: http://localhost:3000"
echo "• AI WebSocket:     ws://localhost:8765"
echo ""

echo "✅ Startup script completed!"
echo "🔧 Start each service in a separate terminal using the commands above."