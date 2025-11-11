# Session Timer Debug Guide

## Problem
The session timer is showing "00:00" instead of incrementing during active AI sessions.

## What We Fixed

### 1. Check-in Deduplication ✅
**File**: `scripts/db-server.js` (lines 139-231)
- Rewrote `generateCheckin()` to be an activity log generator
- Added deduplication: Checks if activity already logged today for same source
- Now creates simple activity logs: "Completed AI Session" or "Wrote Journal Entry"

### 2. Simplified Check-in Calls ✅
**Files**: 
- `scripts/db-server.js` (POST /save-summary, line 1240)
- `scripts/db-server.js` (POST /save-journal-metrics, line 1360)
- Now only passes `source` parameter: 'ai_session' or 'journal_entry'

### 3. Updated UI Display ✅
**File**: `components/sections/ModernHomeSection.tsx` (lines 459-530)
- Changed check-in display to activity log format
- Icon mapping: session (MessageCircle), journal (BookOpen)
- Display: "{message}" + "{date_display} • {time_display}"

### 4. Journal Metrics Tracking ✅
**File**: `journal-ai-server.py` (lines 930-960)
- Added POST to `/save-journal-metrics` after metrics extraction
- Sends: `{uid, entryId, metrics: metrics_result}`
- Now journal entries are tracked in analytics

### 5. Session Timer Investigation 🔍 (IN PROGRESS)
**File**: `hooks/useSession.ts`

**Added Enhanced Debugging:**
- Line 13-16: Logs when `sessionActive` state changes
- Line 23-46: Detailed timer logging:
  - Start: "🕐 Timer started - sessionActive is true"
  - Stop: "⏸️ Timer stopped - sessionActive is false"
  - Ticks: "⏱️ Timer tick: X seconds" (every 5 seconds)
  - Cleanup: "🛑 Timer interval cleared"
- Line 72-74: Enhanced onReady callback logging:
  - "✅ Audio client ready - Setting sessionActive to TRUE"
  - Current sessionSeconds value

## How Timer Should Work

### Flow:
1. User starts AI session
2. `useSession` hook initializes audio client
3. Audio client connects to WebSocket (server.py on ws://localhost:8000)
4. Server sends `{"type": "ready"}` message
5. audio-client.js receives it and calls `this.onReady()`
6. useSession.ts `audioClient.onReady` callback executes:
   - Sets `sessionActive = true`
   - Adds welcome message
7. useEffect with `[sessionActive]` dependency triggers
8. setInterval increments `sessionSeconds` every 1000ms
9. UI displays `formatTime(sessionSeconds)` → "MM:SS"

### Expected Console Logs:
```
✅ Audio client ready - Setting sessionActive to TRUE
📊 Current sessionSeconds: 0
🔄 sessionActive changed to: true
🕐 Timer started - sessionActive is true
⏱️ Timer tick: 5 seconds
⏱️ Timer tick: 10 seconds
⏱️ Timer tick: 15 seconds
...
```

## Testing Steps

### 1. Restart Both Servers
```powershell
# Terminal 1: Node.js backend
cd "d:\Programming Folder\Tutorials\genAIlocal\mvp2.0(CureZ)\curezApp\Youth_Mental_Wellness_GenAI\scripts"
node db-server.js

# Terminal 2: Python WebSocket server
cd "d:\Programming Folder\Tutorials\genAIlocal\mvp2.0(CureZ)\curezApp\Youth_Mental_Wellness_GenAI"
python server.py

# Terminal 3: Next.js frontend (if not running)
cd "d:\Programming Folder\Tutorials\genAIlocal\mvp2.0(CureZ)\curezApp\Youth_Mental_Wellness_GenAI"
pnpm dev
```

### 2. Test Timer
1. Open browser to http://localhost:3001
2. Navigate to Sessions page
3. Open browser console (F12)
4. Click "Start Session"
5. **Watch console for logs:**
   - Should see "✅ Audio client ready"
   - Should see "🔄 sessionActive changed to: true"
   - Should see "🕐 Timer started"
   - Should see "⏱️ Timer tick" every 5 seconds

### 3. Check UI
- Look at the Duration card (should show MM:SS format)
- Verify timer increments every second
- Check progress bar fills up

### 4. Test Activity Logs
1. Complete AI session (talk for 1+ minute, then end)
2. Navigate to Dashboard
3. **Expected**: See "Completed AI Session" with timestamp
4. Start another session same day
5. **Expected**: Should NOT create duplicate activity log

### 5. Test Journal Metrics
1. Navigate to Journal page
2. Create a new journal entry
3. Fill in mood, write text, submit
4. Navigate to Dashboard
5. **Expected**: See "Wrote Journal Entry" activity log
6. Check if metrics reflected in developed areas

## Troubleshooting

### If Timer Still Shows 00:00

**Check Console Logs:**
- If no "✅ Audio client ready" → WebSocket not connecting
  - Verify server.py is running on port 8000
  - Check NEXT_PUBLIC_WS_PATH in .env
  
- If "✅ Audio client ready" but no "🔄 sessionActive changed" → State not updating
  - React state update issue
  - Check for multiple instances of useSession hook
  
- If "🔄 sessionActive changed to: true" but no "🕐 Timer started" → useEffect not triggering
  - Dependency array issue
  - Component unmounting/remounting
  
- If "🕐 Timer started" but no "⏱️ Timer tick" → setInterval not running
  - Check sessionTimerRef
  - Verify cleanup not being called prematurely

### If Activity Logs Duplicating

**Check Firestore:**
```
users/{uid}/dashboard/checkins/items/{checkin_id}
```
- Look for `activity_date` field
- Verify `source` is 'ai_session' or 'journal_entry'
- Check if multiple items have same activity_date + source

**Check db-server.js logs:**
- Should see: "Activity already logged today for source: ai_session, skipping"
- Or: "Created activity log for source: ai_session"

### If Average Duration Shows 0m

**Depends on timer working + Python sending duration:**
1. Verify timer increments during session
2. Check server.py logs after session ends
3. Should POST to /save-summary with `meta.duration_minutes`
4. Check Firestore: `users/{uid}/summaries/{summary_id}` → meta.duration_minutes

## Files Modified

1. **scripts/db-server.js**
   - generateCheckin() function (lines 139-231)
   - POST /save-summary (line 1240)
   - POST /save-journal-metrics (line 1360)

2. **journal-ai-server.py**
   - Added POST to /save-journal-metrics (lines 930-960)

3. **components/sections/ModernHomeSection.tsx**
   - Activity log display (lines 459-530)

4. **hooks/useSession.ts**
   - Added debug logging throughout
   - sessionActive change tracking (lines 13-16)
   - Timer logging (lines 23-46)
   - onReady callback logging (lines 72-74)

## Next Steps

1. **Test the timer** with new logging
2. **Share console output** if still not working
3. **Check WebSocket connection** in Network tab (WS filter)
4. **Verify server.py** is sending "ready" message
5. **Test full flow**: Session → Timer → Duration saved → Avg duration updates