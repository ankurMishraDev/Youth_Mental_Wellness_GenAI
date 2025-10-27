# Journal Metrics Extraction - Implementation Complete ✅

## Overview
Implemented AI-powered analytics extraction from journal entries to create a unified metrics system alongside AI session data.

## Architecture

```
Journal Entry Created
    ↓
Extract Plain Text from PortableText
    ↓
POST /api/journal (Next.js)
    ↓
Save Entry to Firestore ✅
    ↓
POST /extract-journal-metrics (Python AI Server - Port 8766)
    ↓
Gemini Analyzes:
  - Title
  - Mood emoji selection
  - Entry content (full text)
  - Reflection Q&A responses (future)
    ↓
Extract Metrics (same format as AI sessions)
    ↓
POST /save-journal-metrics (Express DB Server - Port 3000)
    ↓
Save to Firestore: users/{uid}/metrics/{jour_timestamp}
  - source: "journal_entry"
  - confidence: 0.65-0.85 (dynamic)
```

## Database Structure

### Unified Metrics Collection
```
users/{uid}/
  ├── metrics/
  │   ├── sess_1730000001 (AI session, confidence: 0.90)
  │   ├── jour_1730000002 (Journal entry, confidence: 0.75)
  │   ├── sess_1730000003 (AI session, confidence: 0.90)
  │   └── jour_1730000004 (Journal entry, confidence: 0.82)
  ├── summaries/
  │   └── sess_1730000001 (AI session text summaries only)
  ├── journalEntries/
  │   ├── entry_id_1
  │   └── entry_id_2
  └── latest/
      └── metrics (quick access cache)
```

### Metrics Document Structure
```javascript
{
  // Metadata
  timestamp: Firestore.Timestamp,
  metricId: "jour_1730000002",
  source: "journal_entry",  // or "ai_session"
  confidence: 0.75,          // 0.65-0.85 for journals, 0.90 for AI sessions
  entry_id: "entry_xyz",     // Reference to journal entry (journals only)
  
  // Core Metrics (0-100 scale)
  mood_percentage: 75,
  energy_level: 60,
  stress_level: 45,
  anxiety_level: 40,
  emotional_score: 70,
  cognitive_score: 65,
  
  // Behavioral Metrics
  sleep_quality: "Rested" | "Okay" | "Exhausted" | null,
  sleep_duration_hours: 7.5,
  social_connection_level: "Connected" | "Some Connection" | "Isolated" | null,
  physical_activity_minutes: 30,
  focus_level: "Focused" | "Distracted" | "Scattered" | null,
  
  // Emotional Granularity
  mood_stability: "stable" | "fluctuating" | "improving" | "declining" | null,
  mood_calmness: "calm" | "anxious" | "agitated" | "relaxed" | null,
  
  // Context Arrays
  main_topics: ["school stress", "friendship"],
  stressors: ["exams", "social pressure"],
  protective_factors: ["family support", "hobbies"],
  coping_strategies_discussed: ["meditation", "exercise"],
  goals_or_hopes: ["improve grades"],
  
  // Additional Context
  positive_event: "Had a great conversation with mom",
  sentiment: "positive" | "negative" | "mixed" | "neutral",
  
  // Risk Assessment
  risk_flags: {
    mentions_self_harm: false,
    mentions_harming_others: false,
    mentions_abuse_or_unsafe: false,
    urgent_support_recommended: false
  },
  
  // Analysis Metadata
  analyzed_at: "2025-10-27T10:30:00Z"
}
```

## Confidence Calculation System

### Dynamic Confidence (0.65 - 0.85)

**Base:** 0.70

**Boosts:**
- Content length > 500 chars: +0.05
- Content length > 300 chars: +0.03
- Reflection Q&A answered: +0.05
- Explicit emotions (3+ keywords): +0.03
- Explicit emotions (1+ keywords): +0.02
- Title provided: +0.02

**Cap:** Maximum 0.85 (never exceeds AI session confidence)

### Confidence Comparison

| Source | Confidence | Reasoning |
|--------|-----------|-----------|
| AI Session | 0.90 | Real-time conversation, follow-ups, tone analysis |
| Journal (Rich) | 0.85 | Long content + Q&A + emotions + title |
| Journal (Detailed) | 0.78 | Good length + explicit emotions |
| Journal (Standard) | 0.70 | Basic text entry |
| Journal (Brief) | 0.65 | Short, minimal content |
| Mood Log | 0.60 | Just emoji selection |

## Implementation Files

### 1. journal-ai-server.py
**New Functions:**
- `calculate_journal_confidence()` - Dynamic confidence calculation
- `extract_journal_metrics()` - AI-powered metrics extraction using Gemini
- `handle_extract_metrics()` - HTTP endpoint handler

**New Route:**
- `POST /extract-journal-metrics` (Port 8766)

### 2. scripts/db-server.js
**New Endpoint:**
- `POST /save-journal-metrics` - Save extracted metrics to Firestore

**Features:**
- Validates metrics bounds (0-100)
- Updates latest cache if mood data present
- Same structure as AI session metrics

### 3. app/api/journal/route.ts
**Updated POST Handler:**
- Extracts plain text from PortableText
- Calls Python AI server for metrics extraction
- Saves metrics via db-server
- Non-blocking (entry saved even if metrics fail)

## API Endpoints

### Python AI Server (Port 8766)

#### POST /extract-journal-metrics
**Request:**
```json
{
  "uid": "user_id",
  "entry": {
    "id": "entry_123",
    "title": "Today was tough",
    "mood": "sad",
    "content_text": "Full plain text content...",
    "reflection_qa": "Q&A responses (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "mood_percentage": 45,
    "energy_level": 30,
    "stress_level": 70,
    "anxiety_level": 60,
    "main_topics": ["school", "anxiety"],
    "stressors": ["exams"],
    "sentiment": "negative",
    "risk_flags": {...},
    "source": "journal_entry",
    "confidence": 0.75
  },
  "confidence": 0.75
}
```

### Express DB Server (Port 3000)

#### POST /save-journal-metrics
**Request:**
```json
{
  "uid": "user_id",
  "entryId": "entry_123",
  "metrics": {
    "mood_percentage": 45,
    "confidence": 0.75,
    ...
  }
}
```

**Response:**
```json
{
  "message": "Journal metrics saved successfully",
  "metricId": "jour_1730000002",
  "source": "journal_entry",
  "confidence": 0.75,
  "path": "users/user_id/metrics/jour_1730000002"
}
```

## Dashboard Integration (Future)

### Metric Reliability Analysis
```javascript
const RELIABILITY_RULES = {
  minimum_data_points: 5,      // Need 5+ sessions
  minimum_coverage: 40,         // 40%+ of sessions must have this metric
  minimum_confidence: 0.70,     // Average confidence > 70%
  
  preview_threshold: 3,         // Show preview at 3 points
  reliable_threshold: 5,        // Fully reliable at 5 points
  excellent_threshold: 10       // "Excellent data" badge at 10+
}
```

### Dashboard Display Logic
```javascript
// Fetch all metrics (AI sessions + journals)
const metrics = await getMetrics(userId);

// Analyze reliability
const reliability = analyzeMetricReliability(metrics);

// Show/hide metrics based on reliability
if (reliability.mood.reliable) {
  // Show beautiful chart with confidence badge
} else {
  // Show locked state: "Track 3 more times to unlock"
}
```

## Testing Steps

### 1. Start Servers
```bash
# Terminal 1 - Express DB Server
cd Youth_Mental_Wellness_GenAI/scripts
node db-server.js

# Terminal 2 - Python Journal AI Server
cd Youth_Mental_Wellness_GenAI
python journal-ai-server.py

# Terminal 3 - Next.js Frontend
cd Youth_Mental_Wellness_GenAI
npm run dev
```

### 2. Create Journal Entry
1. Navigate to `/journal/new`
2. Write entry with:
   - Title: "Stressful day at school"
   - Mood: Select "sad" emoji
   - Content: "Had three exams today and felt overwhelmed. Couldn't focus during math test. Came home exhausted and anxious about results..."
3. Save entry

### 3. Verify Metrics Extraction

**Check Console Logs:**
```
✅ Metrics extracted and saved for journal entry entry_123
```

**Check Firestore:**
```
users/{uid}/metrics/jour_1730000002
  - source: "journal_entry"
  - confidence: 0.78 (detailed content)
  - mood_percentage: ~40-50 (stressed mood)
  - stress_level: ~70-80
  - anxiety_level: ~65-75
  - main_topics: ["exams", "focus"]
  - stressors: ["tests", "academic pressure"]
```

### 4. Compare with AI Session
1. Start AI voice session
2. Discuss similar topics
3. Check metrics:
   - AI session: `sess_timestamp`, confidence: 0.90
   - Journal: `jour_timestamp`, confidence: 0.75-0.85

### 5. Dashboard View (Future)
```
Mood Trend Chart:
🎙️ Oct 27 10:00 AM: 75 (AI Session, High Confidence)
📔 Oct 27 09:00 AM: 45 (Journal Entry, Medium Confidence)
🎙️ Oct 26 08:00 PM: 65 (AI Session, High Confidence)
```

## Benefits

### 1. Unified Analytics
- Single collection for all metrics
- Easy to query and aggregate
- Consistent data structure

### 2. Multi-Source Insights
- Journals provide detailed written reflection
- AI sessions capture real-time emotional state
- Combined view shows comprehensive wellness picture

### 3. Quality Control
- Source tracking for transparency
- Confidence weighting for accurate aggregation
- Risk flag detection across all sources

### 4. Scalability
- Easy to add new sources (wearables, manual logs)
- Dashboard can filter by source/confidence
- Pattern detection across sources

## Future Enhancements

### 1. Reflection Q&A Integration
- Update `reflection_qa` field when user answers questions
- Boost confidence to 0.85 for entries with reflection
- Deeper emotional insights

### 2. Manual Mood Logs
```javascript
source: "manual_log",
confidence: 0.60,
mood_percentage: 70  // Quick check-in
```

### 3. Wearable Integration
```javascript
source: "wearable",
confidence: 0.88,
heart_rate_variability: 45,
sleep_duration_hours: 7.2,
physical_activity_minutes: 60
```

### 4. Cross-Source Pattern Detection
- "Journal mentions sleep issues → AI session shows low energy → Wearable confirms poor sleep"
- Alert: "Multiple sources indicate sleep concern - would you like sleep wellness tips?"

### 5. Dashboard Visualizations
- Combined charts with source icons
- Confidence badges (High/Medium/Low)
- Reliability indicators
- Locked states for insufficient data

## Notes

- Metrics extraction is **non-blocking** - journal entry saves even if extraction fails
- Gemini uses **temperature 0.3** for consistent metric extraction
- All metrics validated to **0-100 range**
- Risk flags detected automatically for safety
- Confidence calculated **dynamically** based on entry richness

---

**Status:** ✅ Implementation Complete  
**Next Step:** Test with real journal entries and verify Firestore structure
