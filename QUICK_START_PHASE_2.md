# CureZ Phase 2 - Quick Setup Guide

## 🚀 Quick Start (5 Minutes)

### 1. Install Functions Dependencies
```powershell
cd functions
npm install
cd ..
```

### 2. Configure API Key
```powershell
# Create .env file in functions/
cd functions
Copy-Item .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_key
cd ..
```

### 3. Test Locally
```powershell
# Start Firebase Emulators
firebase emulators:start
```

Wait for:
```
✔  All emulators ready!
┌─────────────┬────────────────┬─────────────────────────────────┐
│ Emulator    │ Host:Port      │ View in Emulator UI             │
├─────────────┼────────────────┼─────────────────────────────────┤
│ Functions   │ localhost:5001 │ http://localhost:4000/functions │
│ Firestore   │ localhost:8080 │ http://localhost:4000/firestore │
└─────────────┴────────────────┴─────────────────────────────────┘
```

### 4. Trigger Test Archive
```powershell
# In new terminal
curl http://localhost:5001/gen-ai-hack2skill-470416/asia-south1/triggerWeeklyArchive
```

### 5. Check Firestore
Open: http://localhost:4000/firestore

Look for: `users/{uid}/context_archives/week_XX_2025`

### 6. Start App Servers
```powershell
# Terminal 1: db-server
cd scripts
node db-server.js

# Terminal 2: AI server
cd ..
python server.py

# Terminal 3: Next.js
npm run dev
```

### 7. Test AI Context
- Have an AI session
- Check server.py logs for: "Included X weekly archives"
- Verify AI mentions historical events

---

## 🎯 What to Look For

### ✅ Success Indicators:
1. Emulators start without errors
2. Manual trigger returns: `{"success": true}`
3. Archives appear in Firestore
4. Archives contain `narrative_summary`, `patterns_detected`
5. AI logs show "Included X weekly archives"
6. AI references past events in conversation

### ❌ Common Issues:

**Issue:** Firebase emulator won't start
```powershell
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login
```

**Issue:** Gemini API error
- Check `.env` file has correct key
- Verify no extra spaces/quotes

**Issue:** Archives empty
- Need existing summaries from 8-14 days ago
- Create test data or wait for real usage

---

## 📦 Deploy to Production

```powershell
# Set production API key
firebase functions:config:set gemini.api_key="YOUR_KEY"

# Deploy
firebase deploy --only functions

# Check logs
firebase functions:log
```

---

## 🔧 Testing Tips

### Create Test Archives Manually:
```javascript
// In Firestore Console, create:
users/{test_uid}/summaries/{summary_id}
// With timestamp from 10 days ago

// Then trigger archive
```

### View Archive in AI Context:
```powershell
# Check endpoint directly
curl "http://localhost:3000/get-weekly-archives/YOUR_UID?limit=4"
```

---

## 📞 Need Help?

1. Check `functions/README.md` - Complete guide
2. Check `PHASE_2_IMPLEMENTATION.md` - Full details
3. Review Firebase Console logs
4. Check Firestore data structure

---

**Ready to test?** Start with Step 1! 🚀
