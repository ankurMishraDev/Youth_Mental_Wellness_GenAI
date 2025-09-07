# Youth Guide AI Mentor - Server.py Configuration

This frontend application is configured to work with the `server.py` WebSocket server that uses Google's Gemini Live API directly.

## Configuration Overview

The application now uses environment variables to match the `server.py` configuration:

### Environment Variables (.env)

```env
# WebSocket Server Configuration
VITE_WS_URL=ws://localhost:8765

# Audio Configuration (matches server.py)
VITE_SEND_SAMPLE_RATE=16000
VITE_RECEIVE_SAMPLE_RATE=24000

# Server Configuration (matches server.py)
VITE_SERVER_MODEL=gemini-live-2.5-flash-preview-native-audio
VITE_SERVER_VOICE=Puck

# Backend API Configuration
VITE_BACKEND_URL=http://localhost:3000

# Application Configuration
VITE_APP_NAME=Youth Guide AI Mentor
```

## Server.py Configuration Alignment

The frontend is now aligned with `server.py` in the following ways:

### 1. **WebSocket Connection**
- **Frontend**: Connects to `ws://localhost:8765`
- **Server**: Runs WebSocket server on port `8765`

### 2. **Audio Configuration**
- **Send Sample Rate**: `16000 Hz` (for sending audio to server)
- **Receive Sample Rate**: `24000 Hz` (for receiving audio from server)
- **Audio Channels**: `1` (mono)
- **Buffer Size**: `4096` samples

### 3. **Model Configuration (Server-side)**
- **Model**: `gemini-live-2.5-flash-preview-native-audio`
- **Voice**: `Puck`
- **Project ID**: `gen-ai-hack2skill-470416`
- **Location**: `us-central1`

### 4. **Message Types**
Both frontend and backend use the same message types:
- `audio` - Audio data (base64 encoded)
- `text` - Text messages
- `user_id` - User identification
- `end` - End of session signal
- `ready` - Connection ready
- `session_id` - Session identifier
- `turn_complete` - AI response complete
- `interrupted` - Response interrupted
- `error` - Error messages
- `summary_saved` - Summary saved confirmation

## Architecture

```
Frontend (React/TypeScript)
    ↓ WebSocket (ws://localhost:8765)
Server.py (Python)
    ↓ Google Generative AI API
Gemini Live API
    ↓ HTTP API
Backend (Node.js - port 3000)
    ↓ Database
Data Storage
```

## Setup Instructions

### 1. **Backend Server (Node.js)**
```bash
# Start the Node.js backend on port 3000
cd backend
npm install
npm start
```

### 2. **Python WebSocket Server**
```bash
# Navigate to the Python server directory
cd mvpGenAI/Youth_Mental_Wellness_GenAI

# Install dependencies
pip install -r requirements.txt

# Ensure service-account.json is present
# Run the server
python server.py
```

### 3. **Frontend Application**
```bash
# Navigate to frontend directory
cd youthguide-ai-mentor

# Install dependencies
npm install

# Start development server
npm run dev
```

## Key Differences from Previous Setup

1. **Direct Gemini Integration**: Uses Google's Gemini Live API directly instead of through intermediary services
2. **Service Account Authentication**: Server handles authentication with Google Cloud credentials
3. **Native Audio Processing**: Uses native audio streams instead of converting between formats
4. **Session Management**: Built-in session resumption and management
5. **Real-time Transcription**: Automatic speech-to-text and text-to-speech
6. **Summary Generation**: Automatic conversation summarization and progress tracking

## Benefits of Server.py Configuration

1. **Better Audio Quality**: Direct audio streaming without conversion overhead
2. **Lower Latency**: Direct connection to Gemini Live API
3. **Real-time Features**: Live transcription and interruption handling
4. **Session Continuity**: Session resumption capabilities
5. **Automatic Summarization**: Built-in conversation analysis and progress tracking
6. **Mental Health Focus**: Specialized prompts and safety detection for youth wellness

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure `server.py` is running on port 8765
   - Check firewall settings
   - Verify the WebSocket URL in `.env`

2. **Audio Not Working**
   - Check microphone permissions in browser
   - Verify sample rates match server configuration
   - Ensure audio context is properly initialized

3. **Authentication Errors**
   - Verify `service-account.json` exists and has correct permissions
   - Check Google Cloud project settings
   - Ensure Vertex AI API is enabled

4. **Summary Not Saving**
   - Verify Node.js backend is running on port 3000
   - Check backend API endpoints
   - Ensure user ID is properly sent

## Configuration Files

- **Frontend Config**: `src/config/config.ts`
- **Environment**: `.env`
- **Python Server**: `server.py`
- **Service Account**: `service-account.json` (required for server.py)
