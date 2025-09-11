# YouthGuide Setup Instructions

## Backend Setup

### 1. Database Server (Node.js + Firebase)
\`\`\`bash
cd scripts
npm install
# Add your Firebase admin-key.json file to the scripts folder
npm start
\`\`\`

### 2. AI WebSocket Server (Python)
\`\`\`bash
# Install Python dependencies
pip install -r requirements.txt

# Create .env file with your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Run the WebSocket server (your existing server.py)
python server.py
\`\`\`

### 3. Frontend (Next.js)
The frontend is already configured and ready to run in the v0 environment.

## Configuration Files Needed

1. **scripts/admin-key.json** - Firebase Admin SDK credentials
2. **scripts/.env** - Environment variables for Python server:
   \`\`\`
   GEMINI_API_KEY=your_gemini_api_key
   \`\`\`

## Features Implemented

✅ Youth-friendly orange color theme
✅ Enhanced signup with name, age, gender fields  
✅ Session persistence (users stay logged in)
✅ Multiple dashboard pages (Home, Sessions, Resources, Community, Profile)
✅ Audio client integration with WebSocket server
✅ Real-time AI conversations with streaming text
✅ Modern, responsive design with smooth animations
✅ Enhanced database server to handle user profiles

## Usage

1. Start the database server: `npm start` in scripts folder
2. Start your existing Python WebSocket server
3. Open the Next.js app and create an account
4. Navigate through the dashboard and start AI sessions
