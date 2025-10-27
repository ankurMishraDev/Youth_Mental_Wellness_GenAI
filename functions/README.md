# CureZ Cloud Functions

Firebase Cloud Functions for automated weekly archiving and context management.

## Overview

This Cloud Functions project handles:
- **Weekly Archive Generation**: Automatically compresses user summaries into weekly archives every Sunday
- **AI-Powered Compression**: Uses Gemini to create intelligent compressed summaries
- **Storage Optimization**: Deletes old summaries after archiving to save Firestore storage

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment

#### For Local Development (Emulator):
Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_gemini_api_key
```

#### For Production (Firebase):
Set the config in Firebase:
```bash
firebase functions:config:set gemini.api_key="your_actual_gemini_api_key"
```

### 3. Initialize Firebase (First Time Only)

If you haven't already:
```bash
# Login to Firebase
firebase login

# Initialize project (if not done)
firebase init functions
```

## Local Testing

### Start Firebase Emulators

```bash
# From the Youth_Mental_Wellness_GenAI directory
firebase emulators:start
```

This will start:
- Functions emulator on `http://localhost:5001`
- Firestore emulator on `http://localhost:8080`
- Emulator UI on `http://localhost:4000`

### Manual Test Trigger

While emulators are running, trigger the archive function manually:

```bash
# Using curl
curl http://localhost:5001/gen-ai-hack2skill-470416/us-central1/triggerWeeklyArchive

# Or visit in browser
http://localhost:5001/gen-ai-hack2skill-470416/us-central1/triggerWeeklyArchive
```

## Deployment

### Deploy to Firebase

```bash
# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:weeklyArchive
```

### Verify Deployment

```bash
# Check function logs
firebase functions:log

# Check scheduled functions
firebase functions:list
```

## Functions

### `weeklyArchive`
**Type:** Scheduled (Cron)  
**Schedule:** Every Sunday at 11:59 PM IST  
**Trigger:** `59 23 * * 0` (cron expression)

**What it does:**
1. Fetches all users from Firestore
2. For each user:
   - Gets summaries from 8-14 days ago (past the 7-day recent window)
   - Uses Gemini AI to compress into a weekly archive
   - Saves archive to `users/{uid}/context_archives/`
   - Deletes old summaries (older than 7 days) to save storage
3. Logs success/skip/error counts

**Archive Structure:**
```javascript
users/{uid}/context_archives/week_01_2025: {
  week_number: 1,
  year: 2025,
  week_start: Timestamp,
  week_end: Timestamp,
  
  // AI-generated content
  narrative_summary: "2-3 paragraphs...",
  dominant_themes: ["theme1", "theme2"],
  emotional_trajectory: "Started anxious → Improving",
  
  // Metrics
  mood_avg: 65,
  stress_avg: 70,
  energy_avg: 55,
  
  // Behavioral
  sleep_quality: "Variable...",
  social_connection: "Limited...",
  physical_activity: "Minimal...",
  
  // Highlights
  significant_events: ["event1", "event2"],
  coping_strategies: ["strategy1", "strategy2"],
  patterns_detected: ["pattern1", "pattern2"],
  
  // Metadata
  summary_count: { sessions: 3, journals: 5, total: 8 },
  included_summaries: ["sess_123", "jour_456"]
}
```

### `triggerWeeklyArchive`
**Type:** HTTP Callable  
**URL:** `https://us-central1-gen-ai-hack2skill-470416.cloudfunctions.net/triggerWeeklyArchive`

**Purpose:** Manual trigger for testing or emergency archiving

**Usage:**
```bash
curl https://us-central1-gen-ai-hack2skill-470416.cloudfunctions.net/triggerWeeklyArchive
```

## How Weekly Archives Work

### Timeline

```
Today (Oct 28):
├── Last 7 days (Oct 21-27): Stored in summaries/ (full detail)
├── Days 8-14 ago (Oct 14-20): Archived on Sunday, Oct 27
├── Days 15-21 ago (Oct 7-13): Archived on Sunday, Oct 20
└── Days 22-28 ago (Sept 30 - Oct 6): Archived on Sunday, Oct 13
```

### Archive Generation Process

Every Sunday at 11:59 PM:
1. **Identify Week**: Calculate week boundaries (e.g., Oct 14-20)
2. **Fetch Summaries**: Get all summaries from that week (both sessions + journals)
3. **AI Compression**: Send to Gemini for intelligent compression
4. **Save Archive**: Store in `context_archives/week_XX_YYYY`
5. **Delete Old Summaries**: Remove summaries older than 7 days

### Why This Approach?

✅ **Storage Efficient**: 10 summaries (~50KB) → 1 archive (~5KB)  
✅ **Scalable**: Works for 1 user or 100,000 users  
✅ **Automated**: No manual intervention needed  
✅ **Long-term Memory**: AI can reference weeks/months of history  
✅ **Pattern Detection**: Gemini identifies patterns across time

## Monitoring

### Check Logs

```bash
# Real-time logs
firebase functions:log --only weeklyArchive

# Filter by severity
firebase functions:log --only weeklyArchive --severity INFO
```

### Key Metrics

Monitor these in logs:
- **Success Count**: Users successfully archived
- **Skipped Count**: Users with no data to archive
- **Error Count**: Failed archives (investigate!)
- **Archive Size**: Should be ~5KB per archive
- **Processing Time**: Should complete in <1 min per user

### Expected Log Output

```
=== Starting Weekly Archive Job ===
Archiving week 43 of 2025 (Oct 21-27)
Found 150 users to process
Processing user: user_abc123
  📦 Found 8 summaries to archive
  ✅ Archive created: users/user_abc123/context_archives/week_43_2025
  🗑️  Deleted 8 archived summaries (older than 7 days)
=== Weekly Archive Complete ===
✅ Success: 142
⏭️  Skipped: 7 (no data)
❌ Errors: 1
```

## Troubleshooting

### Function Not Running

Check cron schedule:
```bash
firebase functions:list
```

Verify timezone is set to `Asia/Kolkata`.

### Gemini API Errors

**Error:** `API key not found`
```bash
# Set it again
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase deploy --only functions
```

**Error:** `Rate limit exceeded`
- Gemini has rate limits
- Consider adding retry logic or batching users

### Storage Quota Exceeded

Archives use minimal storage, but monitor:
```bash
# Check Firestore usage in Firebase Console
# Settings → Usage and billing → Firestore
```

### Archive Not Appearing in Context

1. Check if archive was created:
   - Go to Firestore Console
   - Navigate to `users/{uid}/context_archives`
   - Verify `week_XX_YYYY` document exists

2. Check db-server endpoint:
   ```bash
   curl http://localhost:3000/get-weekly-archives/USER_UID?limit=4
   ```

3. Check server.py logs for "Included X weekly archives"

## Cost Estimates

### Cloud Functions
- **Invocations**: 1/week = 52/year
- **Compute Time**: ~5 sec/user × 1000 users = 5000 sec/week
- **Cost**: ~$0.01/week = **$0.52/year** ✅

### Gemini API
- **Compression**: ~5,000 input tokens + 1,000 output tokens per user/week
- **Cost per user**: ~$0.001/week
- **1000 users**: ~$1/week = **$52/year** ✅

### Firestore Storage
- **Before**: 10 summaries × 5KB = 50KB/user/week
- **After**: 1 archive × 5KB = 5KB/user/week
- **Savings**: 90% storage reduction ✅

**Total Cost for 1000 Active Users: ~$53/year** 🎉

## Future Enhancements

- [ ] Add significant events detection and storage
- [ ] Implement multi-tier archives (days 15-30, 31+)
- [ ] Add archive re-generation on demand
- [ ] Create archive search/query functions
- [ ] Add email notifications for failed archives
- [ ] Implement archive versioning (keep history)

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review Firestore data structure
3. Test with `triggerWeeklyArchive` endpoint
4. Contact development team

---

**Last Updated:** October 28, 2025  
**Version:** 1.0.0
