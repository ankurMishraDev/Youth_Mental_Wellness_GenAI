# Youth Guide AI Mentor - Firebase Integration

This application now uses Firebase for authentication and data storage, integrated with Google Gemini AI for conversational capabilities.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Firebase        │    │  Google AI      │
│   (React/Vite)  │◄──►│  Backend         │◄──►│  WebSocket      │
│   Port: 5173    │    │  (Node.js)       │    │  Server         │
│                 │    │  Port: 3000      │    │  Port: 8765     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
    User Interface        Firebase Services       Gemini Live API
    - Authentication      - Firestore DB          - Real-time Voice
    - Audio Interface     - User Management       - AI Conversations
    - Chat Display        - Data Storage          - Text Processing
```

## Required Files

Your project should have these files in the root directory:

- ✅ `server.py` - Google AI WebSocket server
- ✅ `db_server.js` - Firebase backend server  
- ✅ `service-account.json` - Google Cloud credentials
- ✅ `admin-key.json` - Firebase Admin credentials
- ✅ `system_instruction.txt` - AI personality configuration
- ✅ `.env` - Environment configuration

## Setup Instructions

### 1. Install Dependencies

#### Backend (Node.js) Dependencies:
```bash
npm run install:backend
# or manually:
npm install firebase-admin express cors nodemon
```

#### Python Dependencies:
```bash
npm run install:python
# or manually:
pip install google-genai websockets requests google-oauth2
```

#### Frontend Dependencies:
```bash
npm install
```

### 2. Configure Environment Variables

Update your `.env` file with the Firebase configuration:

```env
# WebSocket and AI Configuration
VITE_WS_URL=ws://localhost:8765
VITE_BACKEND_URL=http://localhost:3000

# Audio Configuration
VITE_SEND_SAMPLE_RATE=16000
VITE_RECEIVE_SAMPLE_RATE=24000

# Optional: Firebase Client-side Config (if using Firebase SDK directly)
# VITE_FIREBASE_API_KEY=your_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 3. Start the Development Environment

#### Option A: Manual Start (Recommended)

Open 3 separate terminals and run:

**Terminal 1 - Firebase Backend:**
```bash
npm run start:backend
# or: node db_server.js
```

**Terminal 2 - AI WebSocket Server:**
```bash
npm run start:ai
# or: python server.py
```

**Terminal 3 - Frontend:**
```bash
npm run dev
```

#### Option B: Using Startup Scripts

**Windows:**
```bash
start-dev.bat
```

**Linux/Mac:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

## Firebase Services Used

### Authentication
- **Signup**: `POST /signup` - Create new user accounts
- **Login**: `POST /login` - Authenticate existing users
- **User Management**: Automatic user ID handling

### Firestore Database
- **User Profiles**: Store user information and preferences
- **Conversation Summaries**: Store AI conversation summaries
- **Session Data**: Track user sessions and progress

### API Endpoints

```javascript
// Authentication
POST /signup        - Create new user
POST /login         - Authenticate user

// User Data
POST /save-name     - Save user's name
GET /get-summary/:uid - Get user's latest summary
POST /save-summary  - Save conversation summary
```

## Frontend Integration

### Authentication Hook
```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, login, signup, logout, isAuthenticated } = useAuth();
  
  // Use authentication state...
}
```

### Audio Client with Auto User ID
```typescript
import { useAudioClient } from './hooks/useAudioClient';

function VoiceChat() {
  const { initializeAudioClient, isConnected } = useAudioClient();
  
  // User ID is automatically sent when connected and authenticated
}
```

## Data Flow

1. **User Authentication**:
   - User signs up/logs in through frontend
   - Firebase Admin creates/verifies user
   - Frontend stores user session

2. **AI Conversation**:
   - User connects to WebSocket AI server
   - User ID automatically sent to server
   - Conversation transcripts stored locally
   - Summaries generated and saved to Firebase

3. **Data Persistence**:
   - User profiles stored in Firestore
   - Conversation summaries stored with user ID
   - Progress tracking and analytics

## Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```bash
   # Check what's using the port
   netstat -an | findstr :3000
   netstat -an | findstr :8765
   
   # Kill the process or use different ports
   ```

2. **Firebase Credentials**:
   - Ensure `admin-key.json` exists and is valid
   - Check Firebase project settings
   - Verify service account permissions

3. **Google AI Credentials**:
   - Ensure `service-account.json` exists and is valid
   - Check Google Cloud project settings
   - Verify Vertex AI API is enabled

4. **WebSocket Connection**:
   - Ensure AI server is running on port 8765
   - Check firewall settings
   - Verify environment variables

### Logs and Debugging

- **Backend Logs**: Check terminal running `db_server.js`
- **AI Server Logs**: Check terminal running `server.py`
- **Frontend Logs**: Check browser console (F12)

## Security Notes

- `admin-key.json` and `service-account.json` contain sensitive credentials
- Never commit these files to version control
- Use environment variables for production deployments
- Implement proper authentication flow for production

## URLs and Ports

- **Frontend**: http://localhost:5173
- **Firebase Backend**: http://localhost:3000
- **AI WebSocket**: ws://localhost:8765

## Next Steps

1. Implement user profile management UI
2. Add conversation history viewing
3. Enhance authentication with email verification
4. Add progress tracking and analytics
5. Implement user preferences and settings
