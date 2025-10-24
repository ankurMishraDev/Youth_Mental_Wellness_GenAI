# AI Reflection Questions Feature - Setup Guide

## 🎯 What This Does

The AI Reflection Questions feature generates personalized, thoughtful questions to help users explore their journal entries more deeply. It uses:

- **Gemini AI** (via Vertex AI) to analyze journal content
- **User's journal history** for personalized context
- **Recent conversation summaries** from voice chat
- **Cross-context awareness** to connect different aspects of their wellness journey

---

## 📁 Files Created/Modified

### New Files:
1. **`journal-ai-server.py`** - HTTP server for AI journal features (runs on port 8766)
2. **`app/api/journal/reflect/route.ts`** - Next.js API endpoint for reflection questions
3. **`components/journal/ReflectionQuestions.tsx`** - UI component for displaying AI questions
4. **`AI-REFLECTION-SETUP.md`** - This file

### Modified Files:
1. **`components/journal/JournalEntryForm.tsx`** - Added reflection questions integration

---

## 🚀 How to Run

### Step 1: Install Python Dependencies

The journal AI server uses `aiohttp`:

```bash
cd Youth_Mental_Wellness_GenAI
pip install aiohttp google-genai google-auth requests
```

### Step 2: Start the Journal AI Server

Open a **NEW terminal** and run:

```bash
cd Youth_Mental_Wellness_GenAI
python journal-ai-server.py
```

You should see:
```
INFO:__main__:Starting Journal AI HTTP Server on http://0.0.0.0:8766
```

### Step 3: Keep Other Servers Running

You need **3 servers** running simultaneously:

1. **Journal AI Server** (Port 8766) - `python journal-ai-server.py`
2. **Node.js Backend** (Port 3000) - `cd scripts && node db-server.js`
3. **Next.js Frontend** (Port 3001) - `npm run dev`
4. **WebSocket Voice Server** (Port 8765) - `python server.py` (optional, for voice chat)

---

## 🧪 How to Test

### 1. Create a New Journal Entry

1. Go to **http://localhost:3001/journal/new**
2. Select a mood
3. Write some content (at least a few sentences)
4. The **"Get AI Reflection Questions"** button will appear

### 2. Generate Reflection Questions

1. Click **"Get AI Reflection Questions"**
2. Wait ~2-5 seconds for AI to generate questions
3. You'll see 2-3 personalized questions based on:
   - Your current entry
   - Your recent journal entries
   - Your conversation history (if any)

### 3. Answer Questions

1. Click **"Answer this question →"** under any question
2. Type your answer in the text box
3. Click **"Add to Entry"**
4. The question & answer will be appended to your journal content

### 4. Save the Entry

1. Click **"Save Entry"**
2. Your entry (with reflections) is saved to Firestore

---

## 🔍 How It Works (Technical Flow)

```
┌─────────────────┐
│ User writes     │
│ journal entry   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Frontend: JournalEntryForm.tsx          │
│ - User clicks "Get AI Questions"        │
│ - Sends entry to /api/journal/reflect   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Next.js API: /api/journal/reflect       │
│ - Receives entry + userId                │
│ - Forwards to Python server (port 8766) │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ Python: journal-ai-server.py                        │
│ 1. Fetch user context from db-server (port 3000):  │
│    - User profile                                    │
│    - Recent journal entries (last 5)                │
│    - Latest conversation summary                    │
│                                                      │
│ 2. Build AI prompt with context                     │
│                                                      │
│ 3. Call Vertex AI (Gemini 2.0 Flash)               │
│    - Temperature: 0.8 (creative)                    │
│    - Generate 2-3 personalized questions            │
│                                                      │
│ 4. Parse JSON response                              │
│    {                                                 │
│      "questions": ["Q1", "Q2", "Q3"],              │
│      "insight": "Brief observation..."              │
│    }                                                 │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Backend Returns Questions to Frontend   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Frontend: ReflectionQuestions Component │
│ - Displays questions beautifully        │
│ - User can answer questions             │
│ - Answers added to journal content      │
└─────────────────────────────────────────┘
```

---

## 🎨 UI Features

### Before Questions Generated:
- Purple gradient card with "AI Reflection Assistant"
- "Generate Reflection Questions" button
- Info about the feature

### While Loading:
- Spinner with "Generating personalized questions..."

### After Questions Generated:
- Shows insight/observation about the entry
- Context info (e.g., "Personalized using 3 recent entries")
- List of 2-3 questions
- Each question has "Answer this question →" button
- Refresh button to generate new questions

### Answering Questions:
- Textarea appears under selected question
- "Add to Entry" and "Cancel" buttons
- Answer gets formatted and appended to journal content

---

## 🔧 Configuration

### Environment Variables (Optional)

Add to `.env.local`:

```bash
JOURNAL_AI_SERVER_URL=http://localhost:8766
```

### Customize AI Behavior

Edit `journal-ai-server.py`:

```python
# Change temperature (0.7-1.0 for more creativity)
temperature=0.8

# Change model
MODEL = "gemini-2.0-flash-exp"  # or "gemini-1.5-flash"

# Change number of recent entries used for context
for entry in entries[:5]:  # Change 5 to any number
```

---

## 🐛 Troubleshooting

### "Connection refused" error
**Problem:** Journal AI server not running
**Solution:** Start `python journal-ai-server.py` in a separate terminal

### "Failed to fetch user data" in logs
**Problem:** db-server.js not running
**Solution:** Start `cd scripts && node db-server.js`

### Questions are generic/not personalized
**Problem:** User has no journal history yet
**Expected:** First entry gets generic questions, subsequent entries are personalized

### AI server crashes
**Problem:** Missing dependencies or service account
**Solution:** 
- Check `service-account.json` exists
- Run `pip install aiohttp google-genai google-auth requests`
- Check GCP project permissions

---

## 📊 What Makes Questions Personalized?

The AI considers:

1. **Current Entry:**
   - Title, content, mood
   - Themes and topics

2. **Recent Journal History:**
   - Last 5 entries
   - Recurring themes
   - Mood patterns

3. **Conversation Context:**
   - Latest voice chat summary
   - Topics discussed
   - Concerns mentioned

4. **AI Instructions:**
   - Be gentle and supportive
   - Reference specific experiences
   - Connect past and present
   - Promote growth and healing

---

## 🎯 Example Questions

**Generic (no history):**
- "What feelings came up for you as you wrote this?"
- "How does this experience connect to other aspects of your life?"

**Personalized (with history):**
- "You mentioned feeling stressed about school 3 days ago. How has that situation evolved?"
- "In our last conversation, you talked about social anxiety. Do you think today's argument with your friend is connected to those feelings?"
- "I notice you've been writing more about family lately. What's changing in those relationships?"

---

## ✅ Success Checklist

- [ ] journal-ai-server.py running on port 8766
- [ ] db-server.js running on port 3000
- [ ] Next.js app running on port 3001
- [ ] Firestore indexes created
- [ ] Firebase Storage rules updated
- [ ] Can create journal entry
- [ ] "Get AI Reflection Questions" button appears
- [ ] Questions generate successfully
- [ ] Can answer questions
- [ ] Answers append to entry
- [ ] Entry saves successfully

---

## 🚀 Next Features to Add

1. **Save Questions for Later** - Let users bookmark questions
2. **Question History** - Track which questions were asked
3. **Custom Prompts** - Let users request specific types of questions
4. **Guided Journaling** - AI suggests journal prompts at start of session
5. **Progress Insights** - AI analyzes patterns over weeks/months

---

## 📝 Notes

- Questions are generated fresh each time (not cached)
- Each request costs ~$0.0001-0.0003 (very cheap!)
- Context includes max 5 recent entries to stay within token limits
- Fallback questions provided if AI service fails
- All user data stays in your Firestore (privacy-first)

---

Need help? Check:
- Python server logs: Terminal running `journal-ai-server.py`
- Next.js logs: Browser console + terminal running `npm run dev`
- Node.js logs: Terminal running `db-server.js`