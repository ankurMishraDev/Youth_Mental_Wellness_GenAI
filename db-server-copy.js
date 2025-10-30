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

// ==================== ANALYTICS HELPER FUNCTIONS ====================

/**
 * Get ISO week number from date
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

/**
 * Calculate incremental average
 */
function calculateIncrementalAverage(oldAvg, oldCount, newValue) {
  if (oldCount === 0) return newValue;
  return Math.round(((oldAvg * oldCount) + newValue) / (oldCount + 1));
}

/**
 * Update analytics summary (Embedded Windows Architecture - Layer 2)
 * This function implements the incremental update strategy for real-time analytics
 */
async function updateAnalyticsSummary(uid, newMetric) {
  try {
    console.log(`📊 Attempting to update analytics summary for user ${uid}...`);
    
    await db.runTransaction(async (transaction) => {
      const summaryRef = db.collection("users").doc(uid).collection("analytics").doc("summary");
      const summaryDoc = await transaction.get(summaryRef);
      
      const now = new Date();
      const currentWeek = `${now.getFullYear()}-W${String(getWeekNumber(now)).padStart(2, '0')}`;
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      let summary;
      
      if (!summaryDoc.exists) {
        // Initialize new summary with embedded windows structure
        summary = {
          current: {
            mood: { average: 0, min: 100, max: 0, data_points: 0, reliable: false },
            stress: { average: 0, min: 100, max: 0, data_points: 0, reliable: false },
            energy: { average: 0, min: 100, max: 0, data_points: 0, reliable: false },
            anxiety: { average: 0, data_points: 0, reliable: false },
            sleep: { average: 0, data_points: 0, reliable: false }
          },
          windows: {
            last_7_days: { mood_avg: null, stress_avg: null, energy_avg: null, entries_count: 0, updated_at: null },
            last_30_days: { mood_avg: null, stress_avg: null, energy_avg: null, entries_count: 0, updated_at: null },
            last_90_days: { mood_avg: null, stress_avg: null, energy_avg: null, entries_count: 0, updated_at: null }
          },
          weekly_history: [],
          monthly_history: [],
          breakdown: { ai_sessions: 0, journal_entries: 0, total: 0 },
          metadata: {
            total_lifetime_entries: 0,
            first_entry: now.toISOString(),
            last_entry: now.toISOString(),
            last_updated: admin.firestore.FieldValue.serverTimestamp()
          }
        };
      } else {
        summary = summaryDoc.data();
      }
      
      // Update current aggregates (incremental calculation - no need to re-read all metrics!)
      const metrics = ['mood_percentage', 'stress_level', 'energy_level', 'anxiety_level', 'sleep_quality'];
      const metricNames = ['mood', 'stress', 'energy', 'anxiety', 'sleep'];
      
      metrics.forEach((metricKey, idx) => {
        const value = newMetric[metricKey];
        if (value !== null && value !== undefined) {
          const name = metricNames[idx];
          const current = summary.current[name];
          
          const oldCount = current.data_points || 0;
          const oldAvg = current.average || 0;
          
          // Incremental average calculation
          current.average = calculateIncrementalAverage(oldAvg, oldCount, value);
          current.min = Math.min(current.min || 100, value);
          current.max = Math.max(current.max || 0, value);
          current.data_points = oldCount + 1;
          current.reliable = current.data_points >= 1; // Reliable from first entry
          current.last_updated = now.toISOString();
        }
      });
      
      // Update breakdown counts
      if (newMetric.source === 'ai_session') {
        summary.breakdown.ai_sessions = (summary.breakdown.ai_sessions || 0) + 1;
      } else if (newMetric.source === 'journal_entry') {
        summary.breakdown.journal_entries = (summary.breakdown.journal_entries || 0) + 1;
      }
      summary.breakdown.total = (summary.breakdown.total || 0) + 1;
      
      // Update rolling windows (aggregated stats only - no individual entries)
      summary.windows.last_7_days.mood_avg = summary.current.mood.average;
      summary.windows.last_7_days.stress_avg = summary.current.stress.average;
      summary.windows.last_7_days.energy_avg = summary.current.energy.average;
      summary.windows.last_7_days.entries_count = Math.min(summary.breakdown.total, 50); // Approximate
      summary.windows.last_7_days.updated_at = now.toISOString();
      
      summary.windows.last_30_days.mood_avg = summary.current.mood.average;
      summary.windows.last_30_days.stress_avg = summary.current.stress.average;
      summary.windows.last_30_days.energy_avg = summary.current.energy.average;
      summary.windows.last_30_days.entries_count = summary.breakdown.total;
      summary.windows.last_30_days.updated_at = now.toISOString();
      
      summary.windows.last_90_days.mood_avg = summary.current.mood.average;
      summary.windows.last_90_days.stress_avg = summary.current.stress.average;
      summary.windows.last_90_days.energy_avg = summary.current.energy.average;
      summary.windows.last_90_days.entries_count = summary.breakdown.total;
      summary.windows.last_90_days.updated_at = now.toISOString();
      
      // Update weekly history (snapshots for timeline charts)
      if (!summary.weekly_history) summary.weekly_history = [];
      
      const lastWeek = summary.weekly_history[0]?.week;
      if (lastWeek !== currentWeek) {
        // New week! Create snapshot
        const weekSnapshot = {
          week: currentWeek,
          year: now.getFullYear(),
          mood_avg: summary.current.mood.average || null,
          stress_avg: summary.current.stress.average || null,
          energy_avg: summary.current.energy.average || null,
          entries_count: summary.breakdown.total || 0,
          snapshot_taken_at: now.toISOString()
        };
        
        summary.weekly_history.unshift(weekSnapshot);
        
        if (summary.weekly_history.length > 12) {
          summary.weekly_history = summary.weekly_history.slice(0, 12);
        }
      } else if (summary.weekly_history.length > 0) {
        // Same week - update existing snapshot
        summary.weekly_history[0].mood_avg = summary.current.mood.average || null;
        summary.weekly_history[0].stress_avg = summary.current.stress.average || null;
        summary.weekly_history[0].energy_avg = summary.current.energy.average || null;
        summary.weekly_history[0].entries_count = summary.breakdown.total || 0;
        summary.weekly_history[0].snapshot_taken_at = now.toISOString();
      } else {
        // First entry ever
        const weekSnapshot = {
          week: currentWeek,
          year: now.getFullYear(),
          mood_avg: summary.current.mood.average || null,
          stress_avg: summary.current.stress.average || null,
          energy_avg: summary.current.energy.average || null,
          entries_count: summary.breakdown.total || 0,
          snapshot_taken_at: now.toISOString()
        };
        summary.weekly_history.push(weekSnapshot);
      }
      
      // Update monthly history
      if (!summary.monthly_history) summary.monthly_history = [];
      
      const lastMonth = summary.monthly_history[0]?.month;
      if (lastMonth !== currentMonth) {
        const monthSnapshot = {
          month: currentMonth,
          year: now.getFullYear(),
          mood_avg: summary.current.mood.average || null,
          stress_avg: summary.current.stress.average || null,
          energy_avg: summary.current.energy.average || null,
          entries_count: summary.breakdown.total || 0,
          snapshot_taken_at: now.toISOString()
        };
        
        summary.monthly_history.unshift(monthSnapshot);
        
        if (summary.monthly_history.length > 12) {
          summary.monthly_history = summary.monthly_history.slice(0, 12);
        }
      } else if (summary.monthly_history.length > 0) {
        summary.monthly_history[0].mood_avg = summary.current.mood.average || null;
        summary.monthly_history[0].stress_avg = summary.current.stress.average || null;
        summary.monthly_history[0].energy_avg = summary.current.energy.average || null;
        summary.monthly_history[0].entries_count = summary.breakdown.total || 0;
        summary.monthly_history[0].snapshot_taken_at = now.toISOString();
      } else {
        const monthSnapshot = {
          month: currentMonth,
          year: now.getFullYear(),
          mood_avg: summary.current.mood.average || null,
          stress_avg: summary.current.stress.average || null,
          energy_avg: summary.current.energy.average || null,
          entries_count: summary.breakdown.total || 0,
          snapshot_taken_at: now.toISOString()
        };
        summary.monthly_history.push(monthSnapshot);
      }
      
      // Update metadata
      summary.metadata.total_lifetime_entries = summary.breakdown.total;
      summary.metadata.last_entry = now.toISOString();
      summary.metadata.last_updated = admin.firestore.FieldValue.serverTimestamp();
      
      // Write updated summary
      transaction.set(summaryRef, summary);
      
      console.log(`✅ Analytics summary updated successfully`);
      console.log(`   - analytics/summary (updated with embedded windows)`);
    });
    
  } catch (error) {
    console.error(`❌ Analytics update failed:`, error);
    console.error(`   Stack:`, error.stack);
  }
}

// GET endpoint for fetching analytics summary
app.get("/get-analytics-summary/:uid", async (req, res) => {
  const { uid } = req.params;
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" });
  }
  
  try {
    const summaryDoc = await db.collection("users").doc(uid).collection("analytics").doc("summary").get();
    
    if (!summaryDoc.exists) {
      return res.status(200).send({ 
        exists: false,
        message: "No analytics data yet" 
      });
    }
    
    res.status(200).send({
      exists: true,
      summary: summaryDoc.data()
    });
    
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    res.status(500).send({ error: error.message });
  }
});

// ==================== END ANALYTICS FUNCTIONS ====================

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
    
    // 4. Update analytics summary (Embedded Windows System)
    await updateAnalyticsSummary(uid, metricsData);
    
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

    // Update analytics summary (Embedded Windows System)
    await updateAnalyticsSummary(uid, metricsData);

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

// Get weekly archives for a user
app.get("/get-weekly-archives/:uid", async (req, res) => {
  const { uid } = req.params
  const limit = parseInt(req.query.limit) || 4 // Default: last 4 weeks

  if (!uid) {
    return res.status(400).send({ error: "Missing uid." })
  }

  try {
    console.log(`📚 Fetching last ${limit} weekly archives for user ${uid}`)

    const archivesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("context_archives")
      .orderBy("week_start", "desc")
      .limit(limit)
      .get()

    if (archivesSnapshot.empty) {
      console.log(`  ℹ️  No archives found for user ${uid}`)
      return res.status(200).send({ 
        archives: [],
        total: 0
      })
    }

    const archives = archivesSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        week_number: data.week_number,
        year: data.year,
        week_start: data.week_start?.toDate()?.toISOString() || null,
        week_end: data.week_end?.toDate()?.toISOString() || null,
        created_at: data.created_at?.toDate()?.toISOString() || null,
        
        // Archive content
        narrative_summary: data.narrative_summary || "",
        dominant_themes: data.dominant_themes || [],
        emotional_trajectory: data.emotional_trajectory || "",
        
        // Metrics
        mood_avg: data.mood_avg || null,
        mood_range: data.mood_range || null,
        stress_avg: data.stress_avg || null,
        energy_avg: data.energy_avg || null,
        
        // Behavioral
        sleep_quality: data.sleep_quality || null,
        social_connection: data.social_connection || null,
        physical_activity: data.physical_activity || null,
        
        // Highlights
        significant_events: data.significant_events || [],
        coping_strategies: data.coping_strategies || [],
        goals_set: data.goals_set || [],
        progress_notes: data.progress_notes || "",
        
        // Risk & support
        risk_flags: data.risk_flags || { any_critical: false },
        protective_factors: data.protective_factors || [],
        
        // Patterns
        patterns_detected: data.patterns_detected || [],
        
        // Metadata
        summary_count: data.summary_count || { sessions: 0, journals: 0, total: 0 },
        included_summaries: data.included_summaries || []
      }
    })

    console.log(`  ✅ Retrieved ${archives.length} archives`)

    res.status(200).send({
      archives,
      total: archives.length
    })

  } catch (error) {
    console.error("Error fetching weekly archives:", error)
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
    
    const profile = profileDoc.data();
    
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
      return res.status(200).json({
        message: "Profile already exists",
        uid,
        profile: existingProfile.data()
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
    
    await db
      .collection("users")
      .doc(uid)
      .collection("user_profiling")
      .doc("user_details")
      .set(emptyProfile);
    
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
    
    // Build update object with dot notation
    const updateData = {};
    Object.keys(updatesWithTimestamp).forEach(key => {
      updateData[`${category}.${key}`] = updatesWithTimestamp[key];
    });
    
    // Increment total_updates counter
    updateData["metadata.total_updates"] = admin.firestore.FieldValue.increment(1);
    
    await db
      .collection("users")
      .doc(uid)
      .collection("user_profiling")
      .doc("user_details")
      .update(updateData);
    
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
