const express = require("express")
const admin = require("firebase-admin")
const cors = require("cors")

const serviceAccount = require("./admin-key.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()
const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("CureZ DB server is running!")
})

app.post("/signup", async (req, res) => {
  const { uid, email, name, age, gender, emailVerified } = req.body

  if (!uid || !email) {
    return res.status(400).send({ error: "Missing uid or email." })
  }

  try {
    let userRecord
    try {
      userRecord = await admin.auth().getUser(uid)
    } catch (error) {
      userRecord = await admin.auth().getUserByEmail(email)
    }

    const profileData = {
      email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    if (typeof emailVerified === "boolean") {
      profileData.emailVerified = emailVerified
    }

    if (name) {
      profileData.name = name
    }

    if (gender) {
      profileData.gender = gender
    }

    if (age !== undefined && age !== null && age !== "") {
      const numericAge = Number.parseInt(age, 10)
      if (!Number.isNaN(numericAge)) {
        profileData.age = numericAge
      }
    }

    // Store profile in new subcollection structure
    await db.collection("users").doc(userRecord.uid).collection("user_profiling").doc("profile").set(profileData, { merge: true })
    
    // Initialize metrics collection with empty moods array
    await db.collection("users").doc(userRecord.uid).collection("metrics").doc("mood_history").set({
      moods: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })

    if (name && userRecord.displayName !== name) {
      try {
        await admin.auth().updateUser(userRecord.uid, { displayName: name })
      } catch (error) {
        console.warn("Failed to update display name:", error.message)
      }
    }

    res.status(200).send({ uid: userRecord.uid })
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.post("/login", async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).send({ error: "Email is required." })
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email)

    if (!userRecord.emailVerified) {
      return res.status(403).send({ error: "Please verify your email before logging in." })
    }

    // Read from new user_profiling subcollection
    const profileDoc = await db.collection("users").doc(userRecord.uid).collection("user_profiling").doc("profile").get()
    const profile = profileDoc.exists ? profileDoc.data() : null

    res.status(200).send({ uid: userRecord.uid, profile })
  } catch (error) {
    res.status(401).send({ error: "Unable to locate account for the provided email." })
  }
})

app.post("/save-summary", async (req, res) => {
  const { uid, summary } = req.body
  if (!uid || !summary) {
    return res.status(400).send({ error: "Missing uid or summary" })
  }

  try {
    const { summary_data, meta } = summary
    const sessionId = meta?.session_id || `sess_${Date.now()}`
    const timestamp = admin.firestore.FieldValue.serverTimestamp()
    
    // 1. Save to metrics/{sessionId} (flat structure with source tracking)
    const metricsData = {
      timestamp,
      sessionId,
      source: "ai_session", // Track data source for multi-source analytics
      confidence: 0.90, // AI session confidence weight
      duration_minutes: meta?.duration_minutes || null,
      
      // Core numeric metrics
      mood_percentage: summary_data?.mood_percentage || 0,
      energy_level: summary_data?.energy_level || 0,
      stress_level: summary_data?.stress_level || 0,
      cognitive_score: summary_data?.cognitive_score || 0,
      emotional_score: summary_data?.emotional_score || 0,
      anxiety_level: summary_data?.anxiety_level || null,
      
      // Sleep metrics
      sleep_quality: summary_data?.sleep_quality || null,
      sleep_duration_hours: summary_data?.sleep_duration_hours || null,
      
      // Additional metrics
      mood_stability: summary_data?.mood_stability || null,
      mood_calmness: summary_data?.mood_calmness || null,
      social_connection_level: summary_data?.social_connection_level || null,
      physical_activity_minutes: summary_data?.physical_activity_minutes || null,
      focus_level: summary_data?.focus_level || null,
      
      // Arrays (short data)
      main_topics: summary_data?.main_points || summary_data?.main_topics || [],
      suggested_exercises: summary_data?.suggested_exercises || [],
      risk_flags: summary_data?.risk_flags || {},
      
      // Metadata
      language: summary_data?.language || "en",
      sentiment: summary_data?.mood || summary_data?.sentiment || "neutral",
    }
    
    await db.collection("users").doc(uid)
      .collection("metrics").doc(sessionId)
      .set(metricsData)
    
    // 2. Save to summaries subcollection (text data for AI context)
    const summaryData = {
      timestamp,
      sessionId,
      
      // Full text summary
      summary_text: summary_data?.summary || summary_data?.raw || "",
      
      // Key insights
      key_topics: summary_data?.main_points || summary_data?.main_topics || [],
      key_phrases: summary_data?.emotions_themes || [],
      
      // Conversation flow
      sentiment_trajectory: summary_data?.mood_stability || "",
      
      // Action items & strategies
      action_items: summary_data?.action_items_suggested || summary_data?.action_items || [],
      coping_strategies: summary_data?.coping_strategies_discussed || [],
      suggestions: summary_data?.suggestions_non_clinical || [],
      
      // Flags & concerns
      ongoing_concerns: summary_data?.stressors || [],
      risk_flags: summary_data?.risk_flags || {},
      urgency_level: summary_data?.urgency_level || "low",
      
      // Strengths & positives
      strengths_shown: summary_data?.protective_factors || [],
      positive_moments: summary_data?.positive_event || null,
      
      // Goals
      goals: summary_data?.goals_or_hopes || [],
      
      // Original meta
      meta: meta || {}
    }
    
    await db.collection("users").doc(uid)
      .collection("summaries").doc(sessionId)
      .set(summaryData)
    
    // 3. Update latest/metrics (cache for quick access)
    const latestCache = {
      sessionId,
      timestamp,
      source: "ai_session",
      confidence: 0.90,
      mood_percentage: summary_data?.mood_percentage || 0,
      energy_level: summary_data?.energy_level || 0,
      stress_level: summary_data?.stress_level || 0,
      sleep_quality: summary_data?.sleep_quality || null,
      cognitive_score: summary_data?.cognitive_score || 0,
      emotional_score: summary_data?.emotional_score || 0,
      main_topics: (summary_data?.main_points || summary_data?.main_topics || []).slice(0, 3),
      suggested_exercises: (summary_data?.suggested_exercises || []).slice(0, 3),
      risk_flags: summary_data?.risk_flags || {},
    }
    
    await db.collection("users").doc(uid)
      .collection("latest").doc("metrics")
      .set(latestCache)
    
    console.log(`✅ Summary saved for user ${uid} with flat metrics structure:`)
    console.log(`   - metrics/${sessionId} (source: ai_session, confidence: 90%)`)
    console.log(`   - summaries/${sessionId}`)
    console.log(`   - latest/metrics (cache updated)`)
    
    res.status(200).send({ 
      message: "Summary saved successfully with source tracking",
      sessionId,
      source: "ai_session",
      confidence: 0.90,
      paths: {
        metrics: `users/${uid}/metrics/${sessionId}`,
        summary: `users/${uid}/summaries/${sessionId}`,
        latest: `users/${uid}/latest/metrics`
      }
    })
  } catch (error) {
    console.error("Error saving summary:", error)
    res.status(500).send({ error: error.message })
  }
})

// Save journal entry metrics (extracted by AI)
app.post("/save-journal-metrics", async (req, res) => {
  const { uid, entryId, metrics } = req.body
  
  if (!uid || !entryId || !metrics) {
    return res.status(400).send({ error: "Missing uid, entryId, or metrics" })
  }

  try {
    const metricId = `jour_${Date.now()}`
    const timestamp = admin.firestore.FieldValue.serverTimestamp()

    // Build metrics data (same structure as AI sessions!)
    const metricsData = {
      timestamp,
      metricId,
      source: "journal_entry",
      confidence: metrics.confidence || 0.75,
      entry_id: entryId,
      
      // Core metrics (0-100 scale)
      mood_percentage: metrics.mood_percentage || null,
      energy_level: metrics.energy_level || null,
      stress_level: metrics.stress_level || null,
      anxiety_level: metrics.anxiety_level || null,
      emotional_score: metrics.emotional_score || null,
      cognitive_score: metrics.cognitive_score || null,
      
      // Behavioral metrics
      sleep_quality: metrics.sleep_quality || null,
      sleep_duration_hours: metrics.sleep_duration_hours || null,
      social_connection_level: metrics.social_connection_level || null,
      physical_activity_minutes: metrics.physical_activity_minutes || null,
      focus_level: metrics.focus_level || null,
      
      // Emotional granularity
      mood_stability: metrics.mood_stability || null,
      mood_calmness: metrics.mood_calmness || null,
      
      // Context arrays
      main_topics: metrics.main_topics || [],
      stressors: metrics.stressors || [],
      protective_factors: metrics.protective_factors || [],
      coping_strategies_discussed: metrics.coping_strategies_discussed || [],
      goals_or_hopes: metrics.goals_or_hopes || [],
      
      // Additional context
      positive_event: metrics.positive_event || null,
      sentiment: metrics.sentiment || "neutral",
      
      // Risk assessment
      risk_flags: metrics.risk_flags || {
        mentions_self_harm: false,
        mentions_harming_others: false,
        mentions_abuse_or_unsafe: false,
        urgent_support_recommended: false
      },
      
      // Metadata
      analyzed_at: metrics.analyzed_at || null
    }

    // Save to flat metrics structure
    await db.collection("users").doc(uid)
      .collection("metrics").doc(metricId)
      .set(metricsData)

    // Update latest cache if this has mood data
    if (metrics.mood_percentage !== null) {
      const latestCache = {
        metricId,
        timestamp,
        source: "journal_entry",
        confidence: metrics.confidence || 0.75,
        mood_percentage: metrics.mood_percentage,
        energy_level: metrics.energy_level || null,
        stress_level: metrics.stress_level || null,
        anxiety_level: metrics.anxiety_level || null,
        main_topics: (metrics.main_topics || []).slice(0, 3),
        sentiment: metrics.sentiment || "neutral",
        risk_flags: metrics.risk_flags || {}
      }
      
      await db.collection("users").doc(uid)
        .collection("latest").doc("metrics")
        .set(latestCache)
    }

    console.log(`✅ Journal metrics saved: users/${uid}/metrics/${metricId}`)
    console.log(`   Source: journal_entry, Confidence: ${Math.round((metrics.confidence || 0.75) * 100)}%`)
    console.log(`   Entry ID: ${entryId}`)

    res.status(200).send({
      message: "Journal metrics saved successfully",
      metricId,
      source: "journal_entry",
      confidence: metrics.confidence || 0.75,
      path: `users/${uid}/metrics/${metricId}`
    })

  } catch (error) {
    console.error("Error saving journal metrics:", error)
    res.status(500).send({ error: error.message })
  }
})

// Save journal entry summary (confidence-based storage)
app.post("/save-journal-summary", async (req, res) => {
  const { uid, entryId, summary } = req.body
  
  if (!uid || !entryId || !summary) {
    return res.status(400).send({ error: "Missing uid, entryId, or summary" })
  }

  try {
    // Check if summary should be stored (confidence >= 0.65)
    if (!summary.summary_generated || summary.confidence < 0.65) {
      console.log(`⏭️  Journal summary NOT stored (confidence: ${summary.confidence || 0}, reason: ${summary.reasoning || 'below threshold'})`)
      return res.status(200).send({
        message: "Summary not stored (below confidence threshold)",
        stored: false,
        confidence: summary.confidence,
        reasoning: summary.reasoning
      })
    }

    const summaryId = `jour_${Date.now()}`
    const timestamp = admin.firestore.FieldValue.serverTimestamp()

    // Build summary data for unified summaries collection
    const summaryData = {
      timestamp,
      summaryId,
      source: "journal_entry",
      entry_id: entryId,
      
      // AI-generated summary
      summary_text: summary.summary_text,
      
      // Context data
      key_topics: summary.key_topics || [],
      key_insights: summary.key_insights || [],
      emotional_themes: summary.emotional_themes || [],
      stressors: summary.stressors || [],
      goals: summary.goals || [],
      
      // User-provided data
      mood_emoji: summary.mood_emoji || null,
      title: summary.title || "Untitled",
      
      // Quality indicators
      confidence: summary.confidence,
      value_category: summary.value_category || "moderate"
    }

    // Save to unified summaries collection (same collection as AI sessions!)
    await db.collection("users").doc(uid)
      .collection("summaries").doc(summaryId)
      .set(summaryData)

    console.log(`✅ Journal summary saved: users/${uid}/summaries/${summaryId}`)
    console.log(`   Source: journal_entry, Confidence: ${Math.round(summary.confidence * 100)}%`)
    console.log(`   Category: ${summary.value_category}, Entry ID: ${entryId}`)

    res.status(200).send({
      message: "Journal summary saved successfully",
      summaryId,
      source: "journal_entry",
      confidence: summary.confidence,
      value_category: summary.value_category,
      stored: true,
      path: `users/${uid}/summaries/${summaryId}`
    })

  } catch (error) {
    console.error("Error saving journal summary:", error)
    res.status(500).send({ error: error.message })
  }
})

app.post("/save-name", async (req, res) => {
  const { uid, name } = req.body
  if (!uid || !name) {
    return res.status(400).send({ error: "Missing uid or name" })
  }

  try {
    // Update in user_profiling subcollection
    const profileRef = db.collection("users").doc(uid).collection("user_profiling").doc("profile")
    await profileRef.set({ name, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    res.status(200).send({ message: "Name saved successfully" })
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.post("/update-profile", async (req, res) => {
  const { uid, name, age, gender, emailVerified } = req.body
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" })
  }

  try {
    // Update in user_profiling subcollection
    const profileRef = db.collection("users").doc(uid).collection("user_profiling").doc("profile")
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    if (name !== undefined) updateData.name = name
    if (age !== undefined && age !== "") updateData.age = Number.parseInt(age, 10)
    if (gender !== undefined) updateData.gender = gender
    if (typeof emailVerified === "boolean") updateData.emailVerified = emailVerified

    await profileRef.set(updateData, { merge: true })
    res.status(200).send({ message: "Profile updated successfully" })
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.get("/get-summary/:uid", async (req, res) => {
  const { uid } = req.params
  try {
    // Read from new metrics/latest for quick access
    const latestRef = db.collection("users").doc(uid).collection("metrics").doc("latest")
    const doc = await latestRef.get()
    if (!doc.exists) {
      res.status(404).send({ error: "No summary found for this user." })
    } else {
      res.status(200).send(doc.data())
    }
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.get("/user/:uid", async (req, res) => {
  const { uid } = req.params
  try {
    // Read from new subcollections
    const profileRef = db.collection("users").doc(uid).collection("user_profiling").doc("profile")
    const latestMetricsRef = db.collection("users").doc(uid).collection("metrics").doc("latest")
    
    const [profileDoc, metricsDoc] = await Promise.all([
      profileRef.get(),
      latestMetricsRef.get()
    ])
    
    if (!profileDoc.exists) {
      return res.status(404).send({ error: "User not found" })
    }
    
    const userData = {
      uid,
      ...profileDoc.data()
    }
    
    // Add latestSummary (from metrics/latest) for backward compatibility
    if (metricsDoc.exists) {
      userData.latestSummary = {
        summary_data: metricsDoc.data()
      }
    }
    
    res.status(200).send(userData)
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

// Get user context for AI chat (journals + sessions)
app.post("/get-user-context", async (req, res) => {
  const { uid } = req.body
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" })
  }

  try {
    // Get user profile from new structure
    const profileDoc = await db.collection("users").doc(uid).collection("user_profiling").doc("profile").get()
    
    if (!profileDoc.exists) {
      return res.status(404).send({ error: "User not found" })
    }

    const userData = profileDoc.data()
    
    // Fetch recent journal entries from new subcollection (last 30 days)
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )
    
    const journalSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("journalEntries")
      .where("createdAt", ">=", thirtyDaysAgo)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get()

    // Generate summaries for AI context
    const journalSummaries = journalSnapshot.docs.map(doc => {
      const data = doc.data()
      
      // Extract plain text from content blocks
      const contentText = data.content
        ?.map(block => {
          if (block._type === 'block' && block.children) {
            return block.children.map(child => child.text).join(' ')
          }
          return ''
        })
        .join(' ')
        .substring(0, 200) || ''
      
      return {
        date: data.createdAt?.toDate()?.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        mood: data.mood,
        summary: contentText,
        title: data.title || 'Untitled'
      }
    })

    // Fetch recent chat sessions (if they exist)
    let sessionCount = 0
    let recentTopics = []
    try {
      const sessionsSnapshot = await db
        .collection("chatSessions")
        .where("userId", "==", uid)
        .orderBy("endedAt", "desc")
        .limit(5)
        .get()
      
      sessionCount = sessionsSnapshot.size
      recentTopics = sessionsSnapshot.docs
        .flatMap(doc => doc.data().topicsDiscussed || [])
        .filter((topic, index, self) => self.indexOf(topic) === index) // unique
        .slice(0, 5)
    } catch (error) {
      // Chat sessions collection might not exist yet, that's okay
      console.log("No chat sessions found (collection may not exist yet)")
    }

    // Build comprehensive response
    res.status(200).send({
      userData: {
        name: userData.name || 'User',
        age: userData.age,
        gender: userData.gender,
      },
      journalEntriesCount: journalSnapshot.size,
      journalSummaries,
      sessionCount,
      recentTopics,
      moodTrend: calculateMoodTrend(journalSnapshot.docs),
    })
    
  } catch (error) {
    console.error("Context retrieval error:", error)
    res.status(500).send({ error: error.message })
  }
})

// Get session summaries for AI context (last N summaries)
// DEPRECATED: Use /get-all-summaries instead for unified timeline
app.post("/get-session-summaries", async (req, res) => {
  const { uid, limit = 7 } = req.body
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" })
  }

  try {
    const summariesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("summaries")
      .where("source", "==", "ai_session")  // Filter for sessions only
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get()

    const summaries = summariesSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        sessionId: doc.id,
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
        summary_text: data.summary_text || "",
        key_topics: data.key_topics || [],
        sentiment: data.sentiment || "neutral",
        action_items: data.action_items || [],
        risk_flags: data.risk_flags || []
      }
    })

    res.status(200).send({ summaries, count: summaries.length })
  } catch (error) {
    console.error("Error fetching session summaries:", error)
    res.status(500).send({ error: error.message })
  }
})

// Get ALL summaries (sessions + journals) for AI context - UNIFIED TIMELINE
app.post("/get-all-summaries", async (req, res) => {
  const { uid, limit = 10 } = req.body
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" })
  }

  try {
    // Fetch all summaries (both ai_session and journal_entry) from unified collection
    const summariesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("summaries")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get()

    const summaries = summariesSnapshot.docs.map(doc => {
      const data = doc.data()
      const source = data.source || "unknown"
      
      // Build unified summary format
      const summary = {
        id: doc.id,
        source: source,  // "ai_session" or "journal_entry"
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
        summary_text: data.summary_text || "",
        key_topics: data.key_topics || [],
        
        // Common fields
        confidence: data.confidence || (source === "ai_session" ? 0.90 : 0.75),
      }
      
      // Add source-specific fields
      if (source === "ai_session") {
        summary.sessionId = data.sessionId || doc.id
        summary.sentiment = data.sentiment || "neutral"
        summary.action_items = data.action_items || []
        summary.coping_strategies = data.coping_strategies_discussed || []
        summary.ongoing_concerns = data.ongoing_concerns || []
        summary.strengths_shown = data.strengths_shown || []
      } else if (source === "journal_entry") {
        summary.entryId = data.entry_id || doc.id
        summary.mood_emoji = data.mood_emoji || null
        summary.title = data.title || "Untitled"
        summary.emotional_themes = data.emotional_themes || []
        summary.stressors = data.stressors || []
        summary.goals = data.goals || []
        summary.value_category = data.value_category || "moderate"
      }
      
      return summary
    })

    console.log(`📊 Fetched ${summaries.length} summaries (unified timeline) for user ${uid}`)
    
    // Count by source for logging
    const sessionCount = summaries.filter(s => s.source === "ai_session").length
    const journalCount = summaries.filter(s => s.source === "journal_entry").length
    console.log(`   - ${sessionCount} AI sessions, ${journalCount} journal entries`)

    res.status(200).send({
      summaries,
      total: summaries.length,
      breakdown: {
        ai_sessions: sessionCount,
        journal_entries: journalCount
      }
    })

  } catch (error) {
    console.error("Error fetching all summaries:", error)
    res.status(500).send({ error: error.message })
  }
})

// Helper function to calculate mood trend
function calculateMoodTrend(journalDocs) {
  if (journalDocs.length === 0) return 'unknown'
  
  const moodValues = {
    'very-sad': -2,
    'sad': -1,
    'neutral': 0,
    'happy': 1,
    'very-happy': 2
  }
  
  const moods = journalDocs
    .map(doc => doc.data().mood)
    .filter(mood => mood in moodValues)
    .map(mood => moodValues[mood])
  
  if (moods.length === 0) return 'unknown'
  
  // Compare first half to second half
  const mid = Math.floor(moods.length / 2)
  const firstHalf = moods.slice(0, mid)
  const secondHalf = moods.slice(mid)
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  
  const diff = secondAvg - firstAvg
  
  if (diff > 0.3) return 'improving'
  if (diff < -0.3) return 'declining'
  return 'stable'
}

// Save chat session summary
app.post("/save-session-summary", async (req, res) => {
  const { uid, summary, topics, moodShift, actionItems } = req.body
  
  if (!uid || !summary) {
    return res.status(400).send({ error: "Missing uid or summary" })
  }

  try {
    await db.collection("chatSessions").add({
      userId: uid,
      summary: summary,
      topicsDiscussed: topics || [],
      moodShift: moodShift || null,
      actionItems: actionItems || [],
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAt: admin.firestore.FieldValue.serverTimestamp(), // Would be set when session starts
    })
    
    res.status(200).send({ message: "Session summary saved successfully" })
  } catch (error) {
    console.error("Save session error:", error)
    res.status(500).send({ error: error.message })
  }
})

// Seed default categories
app.post("/seed-categories", async (req, res) => {
  try {
    console.log("🌱 Seeding default categories...");
    
    const { force } = req.query; // Allow force parameter

    const DEFAULT_CATEGORIES = [
      {
        title: 'Wellness',
        description: 'Physical and mental self-care, exercise, sleep, and healthy habits',
        color: '#10b981',
        userId: null,
        isDefault: true,
      },
      {
        title: 'Relationships',
        description: 'Friendships, social connections, conflicts, and meaningful interactions',
        color: '#ec4899',
        userId: null,
        isDefault: true,
      },
      {
        title: 'School',
        description: 'Academic life, classes, homework, exams, and learning experiences',
        color: '#3b82f6',
        userId: null,
        isDefault: true,
      },
      {
        title: 'Family',
        description: 'Family relationships, home life, and family activities',
        color: '#f59e0b',
        userId: null,
        isDefault: true,
      },
      {
        title: 'Personal Growth',
        description: 'Self-improvement, new skills, challenges, and personal development',
        color: '#8b5cf6',
        userId: null,
        isDefault: true,
      },
      {
        title: 'Hobbies & Interests',
        description: 'Creative activities, hobbies, passions, and things you enjoy',
        color: '#06b6d4',
        userId: null,
        isDefault: true,
      },
      {
        title: 'Mental Health',
        description: 'Emotions, anxiety, stress, coping strategies, and mental wellbeing',
        color: '#9333ea',
        userId: null,
        isDefault: true,
      },
      {
        title: 'Goals & Dreams',
        description: 'Future plans, aspirations, achievements, and things you want to accomplish',
        color: '#ef4444',
        userId: null,
        isDefault: true,
      },
      {
        title: 'Daily Reflections',
        description: 'Everyday thoughts, gratitude, observations, and general life updates',
        color: '#6b7280',
        userId: null,
        isDefault: true,
      }
    ];

    // Check if categories already exist
    const existingSnapshot = await db.collection("categories")
      .where("userId", "==", null)
      .get();

    if (!existingSnapshot.empty && !force) {
      const existingCategories = existingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return res.status(200).json({
        message: "Default categories already exist. Use ?force=true to add anyway.",
        count: existingSnapshot.size,
        categories: existingCategories
      });
    }

    // Create all categories
    const batch = db.batch();
    const createdIds = [];

    DEFAULT_CATEGORIES.forEach((category) => {
      const docRef = db.collection("categories").doc();
      batch.set(docRef, {
        ...category,
        createdAt: new Date().toISOString()
      });
      createdIds.push({ id: docRef.id, title: category.title });
    });

    await batch.commit();

    console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} categories`);

    res.status(200).json({
      message: "Categories seeded successfully",
      count: DEFAULT_CATEGORIES.length,
      categories: createdIds
    });

  } catch (error) {
    console.error("Error seeding categories:", error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})