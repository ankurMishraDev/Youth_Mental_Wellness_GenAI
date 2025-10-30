// Load environment variables FIRST
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require("express")
const admin = require("firebase-admin")
const cors = require("cors")
const { encryptField, decryptField, encryptFields, decryptFields, encryptArray, decryptArray } = require("./encryption")
const { GoogleGenerativeAI } = require('@google/generative-ai')

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

    // Encrypt sensitive fields
    if (name) {
      profileData.name = encryptField(name, userRecord.uid)
    }

    if (gender) {
      profileData.gender = encryptField(gender, userRecord.uid)
    }

    if (age !== undefined && age !== null && age !== "") {
      const numericAge = Number.parseInt(age, 10)
      if (!Number.isNaN(numericAge)) {
        // Store age as encrypted string
        profileData.age = encryptField(numericAge.toString(), userRecord.uid)
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
    
    if (profileDoc.exists) {
      const encryptedProfile = profileDoc.data()
      
      // Decrypt sensitive fields before sending to client
      const profile = {
        ...encryptedProfile,
        name: encryptedProfile.name ? await decryptField(encryptedProfile.name, userRecord.uid) : null,
        gender: encryptedProfile.gender ? await decryptField(encryptedProfile.gender, userRecord.uid) : null,
        age: encryptedProfile.age ? parseInt(await decryptField(encryptedProfile.age, userRecord.uid), 10) : null,
      }
      
      res.status(200).send({ uid: userRecord.uid, profile })
    } else {
      res.status(200).send({ uid: userRecord.uid, profile: null })
    }
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
      
      // Arrays (short data) - ENCRYPTED
      main_topics: await encryptArray(summary_data?.main_points || summary_data?.main_topics || [], uid),
      suggested_exercises: summary_data?.suggested_exercises || [], // Exercises are generic, keep plain
      risk_flags: summary_data?.risk_flags || {},
      
      // Metadata
      language: summary_data?.language || "en",
      sentiment: summary_data?.mood || summary_data?.sentiment || "neutral",
    }
    
    await db.collection("users").doc(uid)
      .collection("metrics").doc(sessionId)
      .set(metricsData)
    
    // 2. Save to summaries subcollection (text data for AI context)
    // 🔐 ENCRYPT SENSITIVE TEXT FIELDS
    const summaryData = {
      timestamp,
      sessionId,
      
      // Full text summary - ENCRYPTED
      summary_text: summary_data?.summary || summary_data?.raw 
        ? await encryptField(summary_data?.summary || summary_data?.raw || "", uid)
        : "",
      
      // Key insights - ENCRYPTED ARRAYS
      key_topics: await encryptArray(summary_data?.main_points || summary_data?.main_topics || [], uid),
      key_phrases: await encryptArray(summary_data?.emotions_themes || [], uid),
      
      // Conversation flow - ENCRYPTED
      sentiment_trajectory: summary_data?.mood_stability 
        ? await encryptField(String(summary_data.mood_stability), uid)
        : "",
      
      // Action items & strategies - ENCRYPTED ARRAYS
      action_items: await encryptArray(summary_data?.action_items_suggested || summary_data?.action_items || [], uid),
      coping_strategies: await encryptArray(summary_data?.coping_strategies_discussed || [], uid),
      suggestions: await encryptArray(summary_data?.suggestions_non_clinical || [], uid),
      
      // Flags & concerns - ENCRYPTED ARRAYS
      ongoing_concerns: await encryptArray(summary_data?.stressors || [], uid),
      risk_flags: summary_data?.risk_flags || {}, // Keep as object for now (could encrypt values)
      urgency_level: summary_data?.urgency_level 
        ? await encryptField(String(summary_data.urgency_level), uid)
        : await encryptField("low", uid),
      
      // Strengths & positives - ENCRYPTED
      strengths_shown: await encryptArray(summary_data?.protective_factors || [], uid),
      positive_moments: summary_data?.positive_event 
        ? await encryptField(String(summary_data.positive_event), uid)
        : null,
      
      // Goals - ENCRYPTED ARRAY
      goals: await encryptArray(summary_data?.goals_or_hopes || [], uid),
      
      // Original meta (non-sensitive)
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
      // Encrypt top topics even in cache
      main_topics: await encryptArray((summary_data?.main_points || summary_data?.main_topics || []).slice(0, 3), uid),
      suggested_exercises: (summary_data?.suggested_exercises || []).slice(0, 3), // Generic exercises, keep plain
      risk_flags: summary_data?.risk_flags || {},
    }
    
    await db.collection("users").doc(uid)
      .collection("latest").doc("metrics")
      .set(latestCache)
    
    console.log(`✅ Summary saved for user ${uid} with flat metrics structure:`)
    console.log(`   - metrics/${sessionId} (source: ai_session, confidence: 90%)`)
    console.log(`   - summaries/${sessionId}`)
    console.log(`   - latest/metrics (cache updated)`)
    
    // ✅ COUNT-BASED ARCHIVING: Check if archiving is needed
    console.log(`📊 Checking if archiving is needed for user ${uid}...`)
    const archiveResult = await checkAndArchiveIfNeeded(uid)
    console.log(`📊 Archive check result:`, archiveResult)
    
    res.status(200).send({ 
      message: "Summary saved successfully with source tracking",
      sessionId,
      source: "ai_session",
      confidence: 0.90,
      paths: {
        metrics: `users/${uid}/metrics/${sessionId}`,
        summary: `users/${uid}/summaries/${sessionId}`,
        latest: `users/${uid}/latest/metrics`
      },
      archive_status: archiveResult  // Include archiving info in response
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
      
      // Context arrays - ENCRYPTED
      main_topics: await encryptArray(metrics.main_topics || [], uid),
      stressors: await encryptArray(metrics.stressors || [], uid),
      protective_factors: await encryptArray(metrics.protective_factors || [], uid),
      coping_strategies_discussed: await encryptArray(metrics.coping_strategies_discussed || [], uid),
      goals_or_hopes: await encryptArray(metrics.goals_or_hopes || [], uid),
      
      // Additional context - ENCRYPTED
      positive_event: metrics.positive_event 
        ? await encryptField(String(metrics.positive_event), uid)
        : null,
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
        // Encrypt topics even in cache
        main_topics: await encryptArray((metrics.main_topics || []).slice(0, 3), uid),
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
    // 🔐 ENCRYPT SENSITIVE TEXT FIELDS
    const summaryData = {
      timestamp,
      summaryId,
      source: "journal_entry",
      entry_id: entryId,
      
      // AI-generated summary - ENCRYPTED
      summary_text: await encryptField(summary.summary_text, uid),
      
      // Context data - ENCRYPTED ARRAYS
      key_topics: await encryptArray(summary.key_topics || [], uid),
      key_insights: await encryptArray(summary.key_insights || [], uid),
      emotional_themes: await encryptArray(summary.emotional_themes || [], uid),
      stressors: await encryptArray(summary.stressors || [], uid),
      goals: await encryptArray(summary.goals || [], uid),
      
      // User-provided data
      mood_emoji: summary.mood_emoji || null, // Emoji is low sensitivity
      title: await encryptField(summary.title || "Untitled", uid), // ENCRYPTED
      
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

    // Encrypt sensitive fields before storing
    if (name !== undefined) updateData.name = await encryptField(name, uid)
    if (age !== undefined && age !== "") {
      const ageNum = Number.parseInt(age, 10)
      updateData.age = await encryptField(ageNum.toString(), uid)
    }
    if (gender !== undefined) updateData.gender = await encryptField(gender, uid)
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
    
    const profileData = profileDoc.data()
    
    // Decrypt sensitive fields if they exist
    const userData = {
      uid,
      ...profileData,
      name: profileData.name ? await decryptField(profileData.name, uid) : undefined,
      age: profileData.age ? parseInt(await decryptField(profileData.age, uid), 10) : undefined,
      gender: profileData.gender ? await decryptField(profileData.gender, uid) : undefined
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
    
    // 🔐 DECRYPT PROFILE DATA
    const decryptedUserData = {
      name: userData.name ? await decryptField(userData.name, uid) : 'User',
      age: userData.age ? parseInt(await decryptField(userData.age, uid), 10) : null,
      gender: userData.gender ? await decryptField(userData.gender, uid) : null,
    }
    
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

    // Generate summaries for AI context - DECRYPT CONTENT
    const journalSummaries = await Promise.all(journalSnapshot.docs.map(async (doc) => {
      const data = doc.data()
      
      // Decrypt title
      const title = data.title ? await decryptField(data.title, uid) : 'Untitled'
      
      // Decrypt content - check if it's encrypted string or Portable Text blocks
      let contentText = ''
      if (data.content) {
        if (typeof data.content === 'string') {
          // Encrypted content
          try {
            const decrypted = await decryptField(data.content, uid)
            contentText = decrypted.substring(0, 200)
          } catch (err) {
            contentText = ''
          }
        } else if (Array.isArray(data.content)) {
          // Portable Text blocks (old format)
          contentText = data.content
            .map(block => {
              if (block._type === 'block' && block.children) {
                return block.children.map(child => child.text).join(' ')
              }
              return ''
            })
            .join(' ')
            .substring(0, 200)
        }
      }
      
      return {
        date: data.createdAt?.toDate()?.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        mood: data.mood,
        summary: contentText,
        title
      }
    }))

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
      userData: decryptedUserData,
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

    // 🔐 DECRYPT ENCRYPTED FIELDS
    const summaries = await Promise.all(summariesSnapshot.docs.map(async (doc) => {
      const data = doc.data()
      return {
        sessionId: doc.id,
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
        summary_text: data.summary_text ? await decryptField(data.summary_text, uid) : "",
        key_topics: await decryptArray(data.key_topics || [], uid),
        sentiment: data.sentiment || "neutral",
        action_items: await decryptArray(data.action_items || [], uid),
        risk_flags: data.risk_flags || []
      }
    }))

    res.status(200).send({ summaries, count: summaries.length })
  } catch (error) {
    console.error("Error fetching session summaries:", error)
    res.status(500).send({ error: error.message })
  }
})

// Get last 5 sessions + last 5 journals for AI context - OPTIMIZED STRATEGY
app.post("/get-recent-context", async (req, res) => {
  const { uid } = req.body
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" })
  }

  try {
    const startTime = Date.now()
    console.log(`📋 Fetching recent context for user ${uid}`)
    
    // ✅ Fetch last 5 summaries (AI receives only 5, not all 10)
    // Note: We keep 10 summaries as buffer, but AI only sees latest 5
    const sessionsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("summaries")
      .where("source", "==", "ai_session")
      .orderBy("timestamp", "desc")
      .limit(5)  // AI sees only 5 summaries
      .get()
    
    const journalsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("summaries")
      .where("source", "==", "journal_entry")
      .orderBy("timestamp", "desc")
      .limit(5)  // AI sees only 5 summaries
      .get()
    
    // Also fetch summaries without source field (legacy AI sessions)
    const legacySnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("summaries")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get()
    
    console.log(`  ⏱️  Firestore queries took ${Date.now() - startTime}ms`)
    
    // Filter for docs without source field
    const legacyDocs = legacySnapshot.docs.filter(doc => !doc.data().source)
    
    const sessionsDocs = [...sessionsSnapshot.docs, ...legacyDocs].slice(0, 5)  // Limit to 5
    const journalsDocs = journalsSnapshot.docs

    // Process summaries helper
    const decryptStart = Date.now()
    const processSummary = async (doc) => {
      const data = doc.data()
      const source = data.source || "ai_session"  // Default to ai_session for legacy summaries without source field
      
      // Build unified summary format
      const summary = {
        id: doc.id,
        source: source,
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
        summary_text: data.summary_text ? await decryptField(data.summary_text, uid) : "",
        key_topics: await decryptArray(data.key_topics || [], uid),
        confidence: data.confidence || (source === "ai_session" ? 0.90 : 0.75),
      }
      
      // Add source-specific fields
      if (source === "ai_session") {
        summary.sessionId = data.sessionId || doc.id
        summary.sentiment = data.sentiment || "neutral"
        summary.action_items = await decryptArray(data.action_items || [], uid)
        summary.coping_strategies = await decryptArray(data.coping_strategies || [], uid)
        summary.ongoing_concerns = await decryptArray(data.ongoing_concerns || [], uid)
        summary.strengths_shown = await decryptArray(data.strengths_shown || [], uid)
        summary.goals = await decryptArray(data.goals || [], uid)
        summary.urgency_level = data.urgency_level ? await decryptField(data.urgency_level, uid) : "low"
        summary.positive_moments = data.positive_moments ? await decryptField(data.positive_moments, uid) : null
      } else if (source === "journal_entry") {
        summary.entryId = data.entry_id || doc.id
        summary.mood_emoji = data.mood_emoji || null
        summary.title = data.title ? await decryptField(data.title, uid) : "Untitled"
        summary.key_insights = await decryptArray(data.key_insights || [], uid)
        summary.emotional_themes = await decryptArray(data.emotional_themes || [], uid)
        summary.stressors = await decryptArray(data.stressors || [], uid)
        summary.goals = await decryptArray(data.goals || [], uid)
        summary.value_category = data.value_category || "moderate"
      }
      
      return summary
    }

    // Process both types
    const sessions = await Promise.all(sessionsDocs.map(processSummary))
    const journals = await Promise.all(journalsDocs.map(processSummary))
    
    console.log(`  ⏱️  Decryption took ${Date.now() - decryptStart}ms`)
    
    // Combine and sort by timestamp (most recent first)
    const allSummaries = [...sessions, ...journals].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )

    console.log(`  ✅ Fetched ${sessions.length} sessions + ${journals.length} journals in ${Date.now() - startTime}ms total`)

    res.status(200).send({
      summaries: allSummaries,
      total: allSummaries.length,
      breakdown: {
        ai_sessions: sessions.length,
        journal_entries: journals.length
      },
      note: "Fetching last 5 summaries for AI (10 summaries kept as buffer before archiving)"
    })

  } catch (error) {
    console.error("❌ Error fetching recent context:", error)
    res.status(500).send({ error: "Failed to fetch recent context" })
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

    // 🔐 DECRYPT ENCRYPTED FIELDS
    const summaries = await Promise.all(summariesSnapshot.docs.map(async (doc) => {
      const data = doc.data()
      const source = data.source || "unknown"
      
      // Build unified summary format
      const summary = {
        id: doc.id,
        source: source,  // "ai_session" or "journal_entry"
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
        summary_text: data.summary_text ? await decryptField(data.summary_text, uid) : "",
        key_topics: await decryptArray(data.key_topics || [], uid),
        
        // Common fields
        confidence: data.confidence || (source === "ai_session" ? 0.90 : 0.75),
      }
      
      // Add source-specific fields - DECRYPT ARRAYS
      if (source === "ai_session") {
        summary.sessionId = data.sessionId || doc.id
        summary.sentiment = data.sentiment || "neutral"
        summary.action_items = await decryptArray(data.action_items || [], uid)
        summary.coping_strategies = await decryptArray(data.coping_strategies || [], uid)
        summary.ongoing_concerns = await decryptArray(data.ongoing_concerns || [], uid)
        summary.strengths_shown = await decryptArray(data.strengths_shown || [], uid)
        summary.goals = await decryptArray(data.goals || [], uid)
        summary.urgency_level = data.urgency_level ? await decryptField(data.urgency_level, uid) : "low"
        summary.positive_moments = data.positive_moments ? await decryptField(data.positive_moments, uid) : null
      } else if (source === "journal_entry") {
        summary.entryId = data.entry_id || doc.id
        summary.mood_emoji = data.mood_emoji || null
        summary.title = data.title ? await decryptField(data.title, uid) : "Untitled"
        summary.key_insights = await decryptArray(data.key_insights || [], uid)
        summary.emotional_themes = await decryptArray(data.emotional_themes || [], uid)
        summary.stressors = await decryptArray(data.stressors || [], uid)
        summary.goals = await decryptArray(data.goals || [], uid)
        summary.value_category = data.value_category || "moderate"
      }
      
      return summary
    }))

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

// Get weekly archives for a user
app.get("/get-weekly-archives/:uid", async (req, res) => {
  const { uid } = req.params
  const limit = parseInt(req.query.limit) || 4 // Default: last 4 weeks

  if (!uid) {
    return res.status(400).send({ error: "Missing uid." })
  }

  try {
    const startTime = Date.now()
    console.log(`📚 Fetching last ${limit} weekly archives for user ${uid}`)

    let archivesSnapshot
    
    // Try ordering by created_at first (for count-based archives)
    try {
      archivesSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("context_archives")
        .orderBy("created_at", "desc")
        .limit(limit)
        .get()
      console.log(`  ⏱️  Query took ${Date.now() - startTime}ms (using created_at)`)
    } catch (indexError) {
      // Fallback to week_start if created_at index doesn't exist (for old time-based archives)
      console.log(`  ℹ️  created_at index not found, falling back to week_start ordering`)
      archivesSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("context_archives")
        .orderBy("week_start", "desc")
        .limit(limit)
        .get()
      console.log(`  ⏱️  Query took ${Date.now() - startTime}ms (using week_start fallback)`)
    }

    if (archivesSnapshot.empty) {
      console.log(`  ℹ️  No archives found for user ${uid}`)
      return res.status(200).send({ 
        archives: [],
        total: 0
      })
    }

    // 🔐 DECRYPT ENCRYPTED ARCHIVE FIELDS
    const decryptStart = Date.now()
    const archives = await Promise.all(archivesSnapshot.docs.map(async (doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        week_number: data.week_number,
        year: data.year,
        week_start: data.week_start?.toDate()?.toISOString() || null,
        week_end: data.week_end?.toDate()?.toISOString() || null,
        created_at: data.created_at?.toDate()?.toISOString() || null,
        
        // Archive content - ENCRYPTED TEXT FIELDS
        narrative_summary: data.narrative_summary ? await decryptField(data.narrative_summary, uid) : "",
        dominant_themes: await decryptArray(data.dominant_themes || [], uid),
        emotional_trajectory: data.emotional_trajectory ? await decryptField(data.emotional_trajectory, uid) : "",
        
        // Metrics (numeric, keep plain)
        mood_avg: data.mood_avg || null,
        mood_range: data.mood_range || null,
        stress_avg: data.stress_avg || null,
        energy_avg: data.energy_avg || null,
        
        // Behavioral (numeric, keep plain)
        sleep_quality: data.sleep_quality || null,
        social_connection: data.social_connection || null,
        physical_activity: data.physical_activity || null,
        
        // Highlights - ENCRYPTED ARRAYS
        significant_events: await decryptArray(data.significant_events || [], uid),
        coping_strategies: await decryptArray(data.coping_strategies || [], uid),
        goals_set: await decryptArray(data.goals_set || [], uid),
        progress_notes: data.progress_notes ? await decryptField(data.progress_notes, uid) : "",
        
        // Risk & support - ENCRYPTED ARRAYS
        risk_flags: data.risk_flags || { any_critical: false },
        protective_factors: await decryptArray(data.protective_factors || [], uid),
        
        // Patterns - ENCRYPTED ARRAY
        patterns_detected: await decryptArray(data.patterns_detected || [], uid),
        
        // Metadata (non-sensitive, keep plain)
        summary_count: data.summary_count || { sessions: 0, journals: 0, total: 0 },
        included_summaries: data.included_summaries || []
      }
    }))

    console.log(`  ⏱️  Decryption took ${Date.now() - decryptStart}ms`)
    console.log(`  ✅ Retrieved ${archives.length} archives in ${Date.now() - startTime}ms total`)

    res.status(200).send({
      archives,
      total: archives.length
    })

  } catch (error) {
    console.error("❌ Error fetching weekly archives:", error)
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


// ============================================================================
// USER PROFILING ENDPOINTS
// ============================================================================

/**
 * GET /user-profile/:uid
 * Fetch user's complete profile for AI context
 */
app.get("/user-profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    
    const profileDoc = await db
      .collection("users")
      .doc(uid)
      .collection("user_profiling")
      .doc("user_details")
      .get();
    
    if (!profileDoc.exists) {
      // Profile doesn't exist yet - return null
      return res.status(404).json({
        exists: false,
        message: "Profile not initialized",
        uid
      });
    }
    
    const encryptedProfile = profileDoc.data();
    
    // 🔐 DECRYPT SENSITIVE PROFILE CATEGORIES
    // Each category is stored as encrypted JSON string, decrypt to object
    const profile = {};
    const categoriesToDecrypt = [
      'core_identity', 'communication_profile', 'psychological_profile',
      'life_context_profile', 'historical_profile', 'strengths_profile',
      'behavioral_profile', 'risk_profile', 'treatment_response_profile',
      'ai_interaction_patterns'
    ];
    
    for (const category of categoriesToDecrypt) {
      if (encryptedProfile[category]) {
        try {
          const decryptedStr = await decryptField(encryptedProfile[category], uid);
          profile[category] = JSON.parse(decryptedStr);
        } catch (err) {
          // If decryption fails, might be old unencrypted data
          profile[category] = encryptedProfile[category];
        }
      } else {
        profile[category] = null;
      }
    }
    
    // Copy non-encrypted metadata
    profile.createdAt = encryptedProfile.createdAt;
    profile.lastUpdated = encryptedProfile.lastUpdated;
    
    res.status(200).json({
      exists: true,
      uid,
      profile
    });
    
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /initialize-profile/:uid
 * Initialize empty profile for new user
 */
app.post("/initialize-profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Check if profile already exists
    const existingProfile = await db
      .collection("users")
      .doc(uid)
      .collection("user_profiling")
      .doc("user_details")
      .get();
    
    if (existingProfile.exists) {
      // Decrypt existing profile before returning
      const encryptedData = existingProfile.data();
      const profile = {};
      const categoriesToDecrypt = [
        'core_identity', 'communication_profile', 'psychological_profile',
        'life_context_profile', 'historical_profile', 'strengths_profile',
        'behavioral_profile', 'risk_profile', 'treatment_response_profile',
        'ai_interaction_patterns', 'cultural_profile'
      ];
      
      for (const category of categoriesToDecrypt) {
        if (encryptedData[category]) {
          try {
            const decryptedStr = await decryptField(encryptedData[category], uid);
            profile[category] = JSON.parse(decryptedStr);
          } catch (err) {
            profile[category] = encryptedData[category];
          }
        } else {
          profile[category] = null;
        }
      }
      profile.metadata = encryptedData.metadata;
      
      return res.status(200).json({
        message: "Profile already exists",
        uid,
        profile
      });
    }
    
    // Initialize empty profile with all fields as null
    const emptyProfile = {
      core_identity: {
        preferred_name: null,
        age_range: null,
        gender_identity: null,
        pronouns: null,
        primary_language: "English",
        language_preferences: null,
        cultural_background: null,
        region: null,
        last_updated: null
      },
      
      communication_profile: {
        verbal_expressiveness: null,
        emotional_vocabulary_range: null,
        typical_conversation_length: null,
        preferred_conversation_pace: null,
        uses_humor: null,
        uses_sarcasm: null,
        comfort_with_vulnerability: null,
        directness_level: null,
        code_switches: null,
        common_phrases: null,
        metaphors_used: null,
        asks_clarifying_questions: null,
        reflects_back_insights: null,
        follows_up_on_suggestions: null,
        engagement_trajectory: null,
        last_updated: null
      },
      
      psychological_profile: {
        typical_coping_mechanisms: null,
        healthy_coping_strategies: null,
        unhealthy_coping_patterns: null,
        emotional_regulation_capacity: null,
        thinking_styles: null,
        core_beliefs: null,
        stress_response_pattern: null,
        anxiety_triggers: null,
        anxiety_manifestations: null,
        baseline_mood_range: null,
        mood_stability: null,
        seasonal_patterns: null,
        time_of_day_patterns: null,
        last_updated: null
      },
      
      life_context_profile: {
        current_life_stage: null,
        academic_pressure_level: null,
        career_stressors: null,
        academic_performance_concerns: null,
        upcoming_major_events: null,
        living_situation: null,
        family_dynamics: null,
        family_relationship_quality: null,
        peer_relationships: null,
        romantic_relationship_status: null,
        social_support_level: null,
        financial_stressors: null,
        housing_stability: null,
        access_to_resources: null,
        last_updated: null
      },
      
      historical_profile: {
        childhood_experiences: null,
        significant_life_events: null,
        trauma_history: null,
        trauma_disclosed: false,
        safe_to_reference: false,
        previous_mental_health_experiences: null,
        prior_therapy_experience: null,
        medication_history: null,
        family_mental_health_history: null,
        recent_major_stressors: null,
        last_updated: null
      },
      
      strengths_profile: {
        character_strengths: null,
        skills_and_capabilities: null,
        interests_and_passions: null,
        past_successes: null,
        meaning_making_ability: null,
        growth_mindset_indicators: null,
        self_awareness_level: null,
        supportive_relationships: null,
        activities_that_help: null,
        values_and_motivations: null,
        last_updated: null
      },
      
      behavioral_profile: {
        sleep_patterns: null,
        physical_activity_habits: null,
        eating_patterns: null,
        substance_use: null,
        daily_routine_structure: null,
        productivity_patterns: null,
        procrastination_tendency: null,
        social_withdrawal_patterns: null,
        help_seeking_behavior: null,
        boundary_setting_ability: null,
        last_updated: null
      },
      
      risk_profile: {
        past_self_harm_behavior: false,
        past_suicidal_ideation: false,
        past_crisis_episodes: null,
        current_warning_signs: null,
        protective_factors_present: null,
        risk_escalation_pattern: null,
        identified_support_persons: null,
        coping_strategies_for_crisis: null,
        emergency_resources_awareness: null,
        last_risk_assessment: null,
        risk_level: null,
        last_updated: null
      },
      
      treatment_response_profile: {
        helpful_exercises: null,
        unhelpful_exercises: null,
        preferred_intervention_types: null,
        follows_through_on_suggestions: null,
        reports_back_on_progress: null,
        receptive_to_feedback: null,
        resistance_patterns: null,
        goals_identified: null,
        goals_achieved: null,
        barriers_to_progress: null,
        trajectory_over_time: null,
        last_updated: null
      },
      
      cultural_profile: {
        cultural_values: null,
        family_cultural_expectations: null,
        stigma_concerns: null,
        gender_related_stressors: null,
        safety_concerns: null,
        discrimination_experiences: null,
        traditional_support_systems: null,
        cultural_healing_practices: null,
        spirituality_role: null,
        family_mh_literacy: null,
        comfort_discussing_mh: null,
        last_updated: null
      },
      
      metadata: {
        profile_created_at: admin.firestore.FieldValue.serverTimestamp(),
        profile_version: "1.0",
        total_updates: 0,
        last_comprehensive_review: null,
        confidence_level: "low",
        data_sources: [],
        user_validated_fields: null,
        ai_inferred_fields: null
      }
    };
    
    // 🔐 ENCRYPT SENSITIVE CATEGORIES
    // Encrypt each category as JSON string for storage
    const encryptedProfile = {
      core_identity: encryptField(JSON.stringify(emptyProfile.core_identity), uid),
      communication_profile: encryptField(JSON.stringify(emptyProfile.communication_profile), uid),
      psychological_profile: encryptField(JSON.stringify(emptyProfile.psychological_profile), uid),
      life_context_profile: encryptField(JSON.stringify(emptyProfile.life_context_profile), uid),
      historical_profile: encryptField(JSON.stringify(emptyProfile.historical_profile), uid),
      strengths_profile: encryptField(JSON.stringify(emptyProfile.strengths_profile), uid),
      behavioral_profile: encryptField(JSON.stringify(emptyProfile.behavioral_profile), uid),
      risk_profile: encryptField(JSON.stringify(emptyProfile.risk_profile), uid),
      treatment_response_profile: encryptField(JSON.stringify(emptyProfile.treatment_response_profile), uid),
      ai_interaction_patterns: encryptField(JSON.stringify(emptyProfile.ai_interaction_patterns), uid),
      cultural_profile: encryptField(JSON.stringify(emptyProfile.cultural_profile), uid),
      metadata: emptyProfile.metadata // Keep metadata unencrypted for queries
    };
    
    await db
      .collection("users")
      .doc(uid)
      .collection("user_profiling")
      .doc("user_details")
      .set(encryptedProfile);
    
    console.log(`✅ Initialized profile for user: ${uid}`);
    
    res.status(201).json({
      message: "Profile initialized successfully",
      uid,
      profile: emptyProfile
    });
    
  } catch (error) {
    console.error("Error initializing profile:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /update-profile/:uid
 * Update specific fields in user profile
 * Body: { category: "core_identity", updates: { preferred_name: "Alex" } }
 */
app.patch("/update-profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { category, updates } = req.body;
    
    if (!category || !updates) {
      return res.status(400).json({
        error: "Missing required fields: category and updates"
      });
    }
    
    // Valid profile categories
    const validCategories = [
      "core_identity",
      "communication_profile",
      "psychological_profile",
      "life_context_profile",
      "historical_profile",
      "strengths_profile",
      "behavioral_profile",
      "risk_profile",
      "treatment_response_profile",
      "cultural_profile"
    ];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}`
      });
    }
    
    // Add last_updated timestamp to updates
    const updatesWithTimestamp = {
      ...updates,
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // 🔐 ENCRYPTED PROFILE UPDATE FLOW:
    // 1. Fetch current profile
    const profileRef = db
      .collection("users")
      .doc(uid)
      .collection("user_profiling")
      .doc("user_details");
    
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists) {
      return res.status(404).json({
        error: "Profile not found. Initialize profile first."
      });
    }
    
    const encryptedProfile = profileDoc.data();
    
    // 2. Decrypt the specific category
    let categoryData = {};
    if (encryptedProfile[category]) {
      try {
        const decryptedStr = await decryptField(encryptedProfile[category], uid);
        categoryData = JSON.parse(decryptedStr);
      } catch (err) {
        // Might be old unencrypted data
        categoryData = encryptedProfile[category] || {};
      }
    }
    
    // 3. Merge updates into category
    const updatedCategory = {
      ...categoryData,
      ...updatesWithTimestamp
    };
    
    // 4. Re-encrypt the category
    const updateData = {
      [category]: encryptField(JSON.stringify(updatedCategory), uid),
      "metadata.total_updates": admin.firestore.FieldValue.increment(1)
    };
    
    await profileRef.update(updateData);
    
    console.log(`✅ Updated ${category} for user: ${uid}`);
    
    res.status(200).json({
      message: "Profile updated successfully",
      uid,
      category,
      updated_fields: Object.keys(updates)
    });
    
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COUNT-BASED ARCHIVING SYSTEM
// ============================================================================

/**
 * ARCHIVING STRATEGY:
 * - Keep maximum 10 summaries as buffer before archiving
 * - When count reaches 10, archive oldest 5 summaries
 * - After archiving: 5 summaries remain (10 - 5 = 5)
 * - AI receives: Only latest 5 summaries (not all 10)
 * 
 * Example flow:
 *   Summaries 1-9:  No action
 *   Summary 10:     Archive oldest 5 → Delete them → Keep newest 5
 *   Summaries 11-14: No action (count grows 5→9)
 *   Summary 15:     Archive oldest 5 again → Keep newest 5
 */

/**
 * Archive oldest 5 summaries when count reaches 10
 * Keeps last 5 summaries after archiving
 */
async function archiveOldestFive(uid) {
  console.log(`\n🗄️  Starting count-based archiving for user: ${uid}`);
  
  try {
    // 1. Fetch oldest 5 summaries (FIFO - First In, First Out)
    const oldestFiveSnapshot = await db.collection('users').doc(uid)
      .collection('summaries')
      .orderBy('timestamp', 'asc')  // Oldest first
      .limit(5)  // Changed from 7 to 5
      .get();
    
    if (oldestFiveSnapshot.empty) {
      console.log('⚠️  No summaries found to archive');
      return { success: false, message: 'No summaries to archive' };
    }
    
    const summariesToArchive = oldestFiveSnapshot.docs;
    console.log(`📦 Found ${summariesToArchive.length} summaries to archive`);
    
    // 2. Decrypt all summaries for AI processing
    const decryptedSummaries = [];
    for (const doc of summariesToArchive) {
      const data = doc.data();
      const source = data.source || 'ai_session';  // Default to ai_session
      
      const decrypted = {
        id: doc.id,
        source: source,
        timestamp: data.timestamp,
        summary_text: data.summary_text ? await decryptField(data.summary_text, uid) : '',
        key_topics: await decryptArray(data.key_topics || [], uid),
        mood_percentage: data.mood_percentage,
        stress_level: data.stress_level,
        energy_level: data.energy_level,
        mood_emoji: data.mood_emoji
      };
      
      // Add source-specific fields
      if (source === 'ai_session') {
        decrypted.action_items = await decryptArray(data.action_items || [], uid);
        decrypted.coping_strategies = await decryptArray(data.coping_strategies || [], uid);
      }
      
      decryptedSummaries.push(decrypted);
    }
    
    console.log(`🔓 Decrypted ${decryptedSummaries.length} summaries`);
    
    // 3. Generate AI archive summary
    console.log('🤖 Generating AI archive summary...');
    const archive = await generateArchiveSummary(decryptedSummaries, uid);
    
    if (!archive) {
      console.error('❌ Failed to generate archive');
      return { success: false, message: 'Archive generation failed' };
    }
    
    // 4. Encrypt archive fields before saving
    console.log('🔐 Encrypting archive...');
    const encryptedArchive = {
      narrative_summary: archive.narrative_summary ? await encryptField(archive.narrative_summary, uid) : null,
      emotional_trajectory: archive.emotional_trajectory ? await encryptField(archive.emotional_trajectory, uid) : null,
      sleep_quality: archive.sleep_quality ? await encryptField(archive.sleep_quality, uid) : null,
      social_connection: archive.social_connection ? await encryptField(archive.social_connection, uid) : null,
      physical_activity: archive.physical_activity ? await encryptField(archive.physical_activity, uid) : null,
      progress_notes: archive.progress_notes ? await encryptField(archive.progress_notes, uid) : null,
      
      // Encrypt arrays
      dominant_themes: await encryptArray(archive.dominant_themes || [], uid),
      significant_events: await encryptArray(archive.significant_events || [], uid),
      coping_strategies: await encryptArray(archive.coping_strategies || [], uid),
      goals_set: await encryptArray(archive.goals_set || [], uid),
      protective_factors: await encryptArray(archive.protective_factors || [], uid),
      patterns_detected: await encryptArray(archive.patterns_detected || [], uid),
      
      // Keep numeric values unencrypted (for analytics)
      mood_avg: archive.mood_avg,
      mood_range: archive.mood_range,
      stress_avg: archive.stress_avg,
      energy_avg: archive.energy_avg,
      risk_flags: archive.risk_flags,
      summary_count: archive.summary_count
    };
    
    // 5. Save archive to users/{uid}/context_archives (matching Cloud Function structure)
    const archiveId = `archive_${Date.now()}`;
    const archiveData = {
      ...encryptedArchive,
      uid: uid,
      archive_id: archiveId,
      summaries_archived: summariesToArchive.map(d => d.id),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      // Add date range for reference
      oldest_summary: summariesToArchive[0].data().timestamp,
      newest_summary: summariesToArchive[summariesToArchive.length - 1].data().timestamp,
      // Mark as count-based (vs time-based)
      archive_type: 'count_based'
    };
    
    await db.collection('users').doc(uid)
      .collection('context_archives').doc(archiveId)
      .set(archiveData);
    console.log(`✅ Archive saved: users/${uid}/context_archives/${archiveId}`);
    
    // 6. DELETE the oldest 5 summaries (free up storage)
    console.log('🗑️  Deleting archived summaries...');
    const batch = db.batch();
    summariesToArchive.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    console.log(`✅ Deleted ${summariesToArchive.length} summaries`);
    console.log(`✅ Count-based archiving complete for user ${uid}\n`);
    
    return {
      success: true,
      archive_id: archiveId,
      summaries_archived: summariesToArchive.length,
      summaries_remaining: 5  // 10 - 5 = 5
    };
    
  } catch (error) {
    console.error('❌ Error in count-based archiving:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate AI archive summary from decrypted summaries
 * Uses Gemini AI to compress 5 summaries into one comprehensive archive
 */
async function generateArchiveSummary(summaries, uid) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  // Prepare summaries text
  const summariesText = summaries.map((s, i) => {
    const source = s.source === 'ai_session' ? '🎙️ AI Session' : '📔 Journal';
    const date = s.timestamp ? new Date(s.timestamp.toDate ? s.timestamp.toDate() : s.timestamp).toLocaleDateString('en-IN') : 'Unknown';
    
    return `
${i + 1}. ${source} - ${date}
Summary: ${s.summary_text || 'No summary'}
Key topics: ${s.key_topics?.join(', ') || 'N/A'}
Mood: ${s.mood_emoji || 'N/A'} (${s.mood_percentage || 'N/A'}%)
Stress: ${s.stress_level || 'N/A'}/100
Energy: ${s.energy_level || 'N/A'}/100
${s.action_items?.length ? `Action items: ${s.action_items.join(', ')}` : ''}
    `.trim();
  }).join('\n\n---\n\n');
  
  const prompt = `
You are a mental wellness AI assistant analyzing recent mental health activity summaries.

NUMBER OF ENTRIES: ${summaries.length}

SUMMARIES:
${summariesText}

Create a comprehensive archive that compresses these ${summaries.length} summaries while preserving important mental health context.

Return a JSON object with these exact fields:

{
  "narrative_summary": "2-3 paragraph narrative describing the user's recent journey - emotional state, key events, progress or setbacks",
  "dominant_themes": ["theme1", "theme2", "theme3"],
  "emotional_trajectory": "One sentence describing mood changes across these sessions",
  "mood_avg": <number 0-100>,
  "mood_range": { "min": <number>, "max": <number> },
  "stress_avg": <number 0-100>,
  "energy_avg": <number 0-100>,
  "sleep_quality": "Brief description of sleep patterns if mentioned",
  "social_connection": "Brief description of social interactions if mentioned",
  "physical_activity": "Brief description of activity levels if mentioned",
  "significant_events": ["event1", "event2"],
  "coping_strategies": ["strategy1", "strategy2"],
  "goals_set": ["goal1", "goal2"],
  "progress_notes": "What progress or challenges occurred",
  "risk_flags": { "any_critical": true/false, "isolation_mentioned": true/false, "self_harm_mentioned": true/false },
  "protective_factors": ["factor1", "factor2"],
  "patterns_detected": ["pattern1 - e.g., 'Stress peaks on Mondays'", "pattern2"]
}

IMPORTANT:
- Focus on patterns across these ${summaries.length} entries
- Note correlations (e.g., "poor sleep → lower mood")
- Highlight coping strategies that worked or didn't work
- Flag any risk indicators
- Identify protective factors
- Be concise but preserve important context

Return ONLY valid JSON, no markdown formatting.
  `.trim();
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }
    
    const archive = JSON.parse(jsonText);
    
    // Add metadata
    archive.summary_count = {
      sessions: summaries.filter(s => s.source === 'ai_session').length,
      journals: summaries.filter(s => s.source === 'journal_entry').length,
      total: summaries.length
    };
    
    return archive;
    
  } catch (error) {
    console.error('Failed to generate archive with AI:', error);
    
    // Fallback: Create basic archive
    const moods = summaries.map(s => s.mood_percentage).filter(m => m != null);
    const stressLevels = summaries.map(s => s.stress_level).filter(s => s != null);
    const energyLevels = summaries.map(s => s.energy_level).filter(e => e != null);
    
    return {
      narrative_summary: `Archive of ${summaries.length} entries. Generated without AI compression.`,
      dominant_themes: [],
      emotional_trajectory: "Data archived",
      mood_avg: moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : null,
      mood_range: moods.length ? { min: Math.min(...moods), max: Math.max(...moods) } : null,
      stress_avg: stressLevels.length ? Math.round(stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length) : null,
      energy_avg: energyLevels.length ? Math.round(energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length) : null,
      sleep_quality: null,
      social_connection: null,
      physical_activity: null,
      significant_events: [],
      coping_strategies: [],
      goals_set: [],
      progress_notes: "Basic archive created",
      risk_flags: { any_critical: false, isolation_mentioned: false, self_harm_mentioned: false },
      protective_factors: [],
      patterns_detected: [],
      summary_count: {
        sessions: summaries.filter(s => s.source === 'ai_session').length,
        journals: summaries.filter(s => s.source === 'journal_entry').length,
        total: summaries.length
      }
    };
  }
}

/**
 * Check if archiving is needed after summary creation
 * Triggers when user has >= 10 summaries
 */
async function checkAndArchiveIfNeeded(uid) {
  try {
    // Count total summaries for this user
    const summariesSnapshot = await db.collection('users').doc(uid)
      .collection('summaries')
      .get();
    
    const count = summariesSnapshot.size;
    console.log(`📊 User ${uid} has ${count} summaries`);
    
    // Trigger archiving if count >= 10
    if (count >= 10) {
      console.log(`🎯 Triggering archiving (count: ${count} >= 10)`);
      const result = await archiveOldestFive(uid);
      return result;
    } else {
      console.log(`✅ No archiving needed (count: ${count} < 10)`);
      return { success: true, message: `Count ${count} < 10, no archiving needed`, count };
    }
    
  } catch (error) {
    console.error('Error checking archive status:', error);
    return { success: false, error: error.message };
  }
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})