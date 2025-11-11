// Load environment variables FIRST
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require("express")
const admin = require("firebase-admin")
const cors = require("cors")
const { encryptField, decryptField, encryptFields, decryptFields, encryptArray, decryptArray } = require("./encryption")
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createEvent } = require('ics')

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
      profileData.name = await encryptField(name, userRecord.uid)
    }

    if (gender) {
      profileData.gender = await encryptField(gender, userRecord.uid)
    }

    if (age !== undefined && age !== null && age !== "") {
      const numericAge = Number.parseInt(age, 10)
      if (!Number.isNaN(numericAge)) {
        // Store age as encrypted string
        profileData.age = await encryptField(numericAge.toString(), userRecord.uid)
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

    // Decrypt profile data if it exists
    if (profile) {
      if (profile.name) {
        profile.name = await decryptField(profile.name, userRecord.uid)
      }
      
      if (profile.gender) {
        profile.gender = await decryptField(profile.gender, userRecord.uid)
      }
      
      if (profile.age) {
        const decryptedAge = await decryptField(profile.age, userRecord.uid)
        profile.age = Number.parseInt(decryptedAge, 10)
      }
    }

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
 * Generate activity log entry (NOT follow-up questions)
 * Creates simple activity tracking entries for dashboard timeline
 */
async function generateCheckin(uid, activityData) {
  try {
    const { source } = activityData;
    
    // Get current time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    console.log(`🔍 [CHECK-IN] Checking for recent ${source} activity...`);
    
    // Query with orderBy to get most recent check-ins (composite index required!)
    const recentCheckinsSnapshot = await db.collection("users").doc(uid)
      .collection("dashboard").doc("checkins")
      .collection("items")
      .where("source", "==", source)
      .orderBy("created_at", "desc")
      .limit(10)
      .get();
    
    console.log(`📊 [CHECK-IN] Found ${recentCheckinsSnapshot.size} recent ${source} check-ins`);
    
    console.log(`📊 [CHECK-IN] Found ${recentCheckinsSnapshot.size} recent ${source} check-ins`);
    
    // Filter in memory for last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentActivity = recentCheckinsSnapshot.docs.find(doc => {
      const data = doc.data();
      const createdAt = data.created_at?.toDate();
      if (createdAt) {
        const isRecent = createdAt >= oneHourAgo;
        console.log(`  - Check-in ${doc.id}: ${createdAt.toLocaleTimeString()} (${isRecent ? 'RECENT' : 'OLD'})`);
      }
      return createdAt && createdAt >= oneHourAgo;
    });
    
    if (recentActivity) {
      const lastTime = recentActivity.data().created_at?.toDate();
      const minutesSince = Math.floor((Date.now() - lastTime.getTime()) / 60000);
      console.log(`⏭️  [CHECK-IN] Activity log skipped: ${source} already logged ${minutesSince} minutes ago`);
      return recentActivity.id;
    }
    
    console.log(`✅ [CHECK-IN] No recent activity found, creating new check-in...`);
    
    // Create activity log message (NOT a question!)
    const activityMessages = {
      ai_session: `Completed AI Session`,
      journal_entry: `Wrote Journal Entry`
    };
    
    const typeIcons = {
      ai_session: "session",
      journal_entry: "journal"
    };
    
    const checkinId = `checkin_${Date.now()}`;
    const checkinData = {
      id: checkinId,
      message: activityMessages[source] || "Completed Activity",
      type: typeIcons[source] || "general",
      source: source,
      activity_date: today,
      time_display: timeStr,
      date_display: dateStr,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      completed: true, // Activity logs are always "completed"
      completed_at: admin.firestore.FieldValue.serverTimestamp(),
      response: null
    };
    
    // Save to dashboard/checkins/items subcollection
    await db.collection("users").doc(uid)
      .collection("dashboard").doc("checkins")
      .collection("items").doc(checkinId)
      .set(checkinData);
    
    console.log(`✅ [CHECK-IN] Activity log created for user ${uid}: ${activityMessages[source]} at ${timeStr}`);
    console.log(`📍 [CHECK-IN] Path: users/${uid}/dashboard/checkins/items/${checkinId}`);
    return checkinId;
    
  } catch (error) {
    console.error("❌ [CHECK-IN] Error generating activity log:", error);
    console.error("Stack trace:", error.stack);
    return null; // Don't fail the whole operation if check-in creation fails
  }
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
      const currentDay = now.toISOString().split('T')[0]; // YYYY-MM-DD
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
          daily_history: [], // NEW: For daily timeline chart
          weekly_history: [],
          monthly_history: [],
          breakdown: { ai_sessions: 0, journal_entries: 0, total: 0 },
          // NEW: Session analytics with streak tracking
          session_analytics: {
            total_sessions: 0,
            sessions_this_week: 0,
            total_duration_minutes: 0,
            avg_duration_minutes: 0,
            current_week: currentWeek,
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null
          },
          // NEW: Developed areas tracking (15 predefined areas)
          developed_areas: {
            self_awareness: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            emotional_regulation: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            stress_management: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            anxiety_coping: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            social_skills: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            academic_stress: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            family_relationships: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            peer_relationships: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            self_esteem: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            goal_setting: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            decision_making: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            conflict_resolution: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            time_management: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            healthy_habits: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            resilience: { count: 0, confidence_sum: 0, avg_confidence: 0 }
          },
          metadata: {
            total_lifetime_entries: 0,
            first_entry: now.toISOString(),
            last_entry: now.toISOString(),
            last_updated: admin.firestore.FieldValue.serverTimestamp()
          }
        };
      } else {
        summary = summaryDoc.data();
        
        // Ensure new fields exist for older documents
        if (!summary.session_analytics) {
          summary.session_analytics = {
            total_sessions: 0,
            sessions_this_week: 0,
            total_duration_minutes: 0,
            avg_duration_minutes: 0,
            current_week: currentWeek,
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null
          };
        }
        
        if (!summary.developed_areas) {
          summary.developed_areas = {
            self_awareness: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            emotional_regulation: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            stress_management: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            anxiety_coping: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            social_skills: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            academic_stress: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            family_relationships: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            peer_relationships: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            self_esteem: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            goal_setting: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            decision_making: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            conflict_resolution: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            time_management: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            healthy_habits: { count: 0, confidence_sum: 0, avg_confidence: 0 },
            resilience: { count: 0, confidence_sum: 0, avg_confidence: 0 }
          };
        }
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
      
      // Update session analytics (for AI sessions only)
      if (newMetric.source === 'ai_session') {
        summary.session_analytics.total_sessions = (summary.session_analytics.total_sessions || 0) + 1;
        
        // Reset sessions_this_week if new week started
        if (summary.session_analytics.current_week !== currentWeek) {
          summary.session_analytics.sessions_this_week = 1;
          summary.session_analytics.current_week = currentWeek;
        } else {
          summary.session_analytics.sessions_this_week = (summary.session_analytics.sessions_this_week || 0) + 1;
        }
        
        // Update duration tracking
        const sessionDuration = newMetric.duration_minutes || 0;
        summary.session_analytics.total_duration_minutes = (summary.session_analytics.total_duration_minutes || 0) + sessionDuration;
        summary.session_analytics.avg_duration_minutes = summary.session_analytics.total_duration_minutes / summary.session_analytics.total_sessions;
      }
      
      // Update streak tracking (for both AI sessions and journal entries)
      const activityDate = currentDay; // YYYY-MM-DD format
      const lastActivityDate = summary.session_analytics.last_activity_date;
      
      if (!lastActivityDate) {
        // First activity ever
        summary.session_analytics.current_streak = 1;
        summary.session_analytics.longest_streak = 1;
        summary.session_analytics.last_activity_date = activityDate;
      } else if (lastActivityDate === activityDate) {
        // Same day - streak continues (no change)
        summary.session_analytics.last_activity_date = activityDate;
      } else {
        // Different day - check if consecutive
        const lastDate = new Date(lastActivityDate);
        const currentDate = new Date(activityDate);
        const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day - increment streak
          summary.session_analytics.current_streak = (summary.session_analytics.current_streak || 0) + 1;
          summary.session_analytics.longest_streak = Math.max(
            summary.session_analytics.longest_streak || 0,
            summary.session_analytics.current_streak
          );
        } else {
          // Streak broken - reset to 1
          summary.session_analytics.current_streak = 1;
        }
        
        summary.session_analytics.last_activity_date = activityDate;
      }
      
      // Update developed areas (if confidence data exists and > 0.6)
      if (newMetric.developed_areas && Array.isArray(newMetric.developed_areas)) {
        newMetric.developed_areas.forEach(area => {
          const areaName = area.name; // e.g., "stress_management"
          const confidence = area.confidence || 0;
          
          if (confidence > 0.6 && summary.developed_areas[areaName]) {
            summary.developed_areas[areaName].count = (summary.developed_areas[areaName].count || 0) + 1;
            summary.developed_areas[areaName].confidence_sum = (summary.developed_areas[areaName].confidence_sum || 0) + confidence;
            summary.developed_areas[areaName].avg_confidence = summary.developed_areas[areaName].confidence_sum / summary.developed_areas[areaName].count;
          }
        });
      }
      
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
      
      // Update daily history (for fine-grained timeline)
      if (!summary.daily_history) summary.daily_history = [];
      
      const lastDay = summary.daily_history[0]?.date;
      
      if (lastDay !== currentDay) {
        // New day, create a new snapshot
        const daySnapshot = {
          date: currentDay,
          mood_avg: newMetric.mood_percentage || null,
          stress_avg: newMetric.stress_level || null,
          energy_avg: newMetric.energy_level || null,
          entries_count: 1,
          snapshot_taken_at: now.toISOString()
        };
        summary.daily_history.unshift(daySnapshot);
        
        // Keep last 90 days
        if (summary.daily_history.length > 90) {
          summary.daily_history = summary.daily_history.slice(0, 90);
        }
      } else if (summary.daily_history.length > 0) {
        // Same day, update existing snapshot
        const today = summary.daily_history[0];
        const oldCount = today.entries_count || 0;
        
        if (newMetric.mood_percentage !== null) {
          today.mood_avg = calculateIncrementalAverage(today.mood_avg || 0, oldCount, newMetric.mood_percentage);
        }
        if (newMetric.stress_level !== null) {
          today.stress_avg = calculateIncrementalAverage(today.stress_avg || 0, oldCount, newMetric.stress_level);
        }
        if (newMetric.energy_level !== null) {
          today.energy_avg = calculateIncrementalAverage(today.energy_avg || 0, oldCount, newMetric.energy_level);
        }
        
        today.entries_count = oldCount + 1;
        today.snapshot_taken_at = now.toISOString();
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

/**
 * GET /session-analytics/:uid
 * Optimized endpoint for session statistics (total, this week, avg duration, streak)
 * Uses pre-aggregated data from analytics/summary - NO raw metrics reading!
 */
app.get("/session-analytics/:uid", async (req, res) => {
  const { uid } = req.params;
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" });
  }
  
  try {
    const summaryDoc = await db.collection("users").doc(uid).collection("analytics").doc("summary").get();
    
    if (!summaryDoc.exists) {
      return res.status(200).send({
        exists: false,
        data: {
          total_sessions: 0,
          sessions_this_week: 0,
          avg_duration_minutes: 0,
          current_streak: 0,
          longest_streak: 0
        }
      });
    }
    
    const summary = summaryDoc.data();
    const sessionAnalytics = summary.session_analytics || {};
    
    res.status(200).send({
      exists: true,
      data: {
        total_sessions: sessionAnalytics.total_sessions || 0,
        sessions_this_week: sessionAnalytics.sessions_this_week || 0,
        avg_duration_minutes: Math.round(sessionAnalytics.avg_duration_minutes || 0),
        total_duration_minutes: sessionAnalytics.total_duration_minutes || 0,
        current_streak: sessionAnalytics.current_streak || 0,
        longest_streak: sessionAnalytics.longest_streak || 0,
        last_activity_date: sessionAnalytics.last_activity_date || null
      }
    });
    
  } catch (error) {
    console.error("Error fetching session analytics:", error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * GET /dashboard-summary/:uid
 * Optimized endpoint for dashboard data (developed areas, streak, check-ins)
 * Uses pre-aggregated data from analytics/summary
 */
app.get("/dashboard-summary/:uid", async (req, res) => {
  const { uid } = req.params;
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" });
  }
  
  try {
    const summaryDoc = await db.collection("users").doc(uid).collection("analytics").doc("summary").get();
    
    if (!summaryDoc.exists) {
      return res.status(200).send({
        exists: false,
        data: {
          developed_areas: [],
          streak: 0,
          checkins: []
        }
      });
    }
    
    const summary = summaryDoc.data();
    const developedAreas = summary.developed_areas || {};
    
    // Get top 3 developed areas by avg_confidence
    const areasArray = Object.entries(developedAreas)
      .filter(([_, data]) => data.count > 0)
      .map(([name, data]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format: "Stress Management"
        count: data.count,
        avg_confidence: Math.round(data.avg_confidence * 100) // Convert to percentage
      }))
      .sort((a, b) => b.avg_confidence - a.avg_confidence)
      .slice(0, 3);
    
    // Fetch recent check-ins (last 3)
    const checkinsSnapshot = await db.collection("users").doc(uid).collection("dashboard")
      .doc("checkins").collection("items")
      .orderBy("created_at", "desc")
      .limit(3)
      .get();
    
    const checkins = checkinsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).send({
      exists: true,
      data: {
        developed_areas: areasArray,
        streak: summary.session_analytics?.current_streak || 0,
        checkins: checkins
      }
    });
    
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * POST /dashboard/complete-checkin
 * Mark a check-in as completed with user response
 */
app.post("/dashboard/complete-checkin", async (req, res) => {
  const { uid, checkinId, response } = req.body;
  
  if (!uid || !checkinId) {
    return res.status(400).send({ error: "Missing uid or checkinId" });
  }
  
  try {
    const checkinRef = db.collection("users").doc(uid)
      .collection("dashboard").doc("checkins")
      .collection("items").doc(checkinId);
    
    await checkinRef.update({
      completed: true,
      completed_at: admin.firestore.FieldValue.serverTimestamp(),
      response: response || null
    });
    
    console.log(`✅ Check-in completed: ${checkinId} for user ${uid}`);
    
    res.status(200).send({
      message: "Check-in completed successfully",
      checkinId
    });
    
  } catch (error) {
    console.error("Error completing check-in:", error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * GET /get-raw-metrics/:uid
 * Fetch raw metrics directly from users/{uid}/metrics/ collection
 * Supports optional ?days=7 parameter for date filtering (default: all)
 */
app.get("/get-raw-metrics/:uid", async (req, res) => {
  const { uid } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  const days = parseInt(req.query.days) || null; // NEW: Optional days filter
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" });
  }
  
  try {
    console.log(`[RAW METRICS] Fetching metrics for user: ${uid}, limit: ${limit}, days: ${days || 'all'}`);
    
    // Build query with optional date filter
    let query = db
      .collection("users")
      .doc(uid)
      .collection("metrics")
      .orderBy("timestamp", "desc");
    
    // Apply date filter if days parameter provided
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.where("timestamp", ">=", cutoffDate);
    }
    
    query = query.limit(limit);
    
    const metricsSnapshot = await query.get();
    
    if (metricsSnapshot.empty) {
      return res.status(200).send({
        metrics: [],
        total: 0,
        aggregates: null,
        message: "No metrics found"
      });
    }
    
    // Map documents to metric objects
    const metrics = [];
    metricsSnapshot.forEach(doc => {
      const data = doc.data();
      metrics.push({
        id: doc.id,
        timestamp: data.timestamp?._seconds 
          ? new Date(data.timestamp._seconds * 1000).toISOString()
          : data.timestamp || new Date().toISOString(),
        source: data.source || "unknown",
        confidence: data.confidence || 0,
        mood_percentage: data.mood_percentage !== null ? data.mood_percentage : null,
        stress_level: data.stress_level !== null ? data.stress_level : null,
        energy_level: data.energy_level !== null ? data.energy_level : null,
        anxiety_level: data.anxiety_level !== null ? data.anxiety_level : null,
        sleep_quality: data.sleep_quality !== null ? data.sleep_quality : null,
        cognitive_score: data.cognitive_score !== null ? data.cognitive_score : null,
        emotional_score: data.emotional_score !== null ? data.emotional_score : null,
        main_topics: data.main_topics || [],
        risk_flags: data.risk_flags || {}
      });
    });
    
    // Calculate aggregates from raw data
    const validMetrics = {
      mood: metrics.filter(m => m.mood_percentage !== null).map(m => m.mood_percentage),
      stress: metrics.filter(m => m.stress_level !== null).map(m => m.stress_level),
      energy: metrics.filter(m => m.energy_level !== null).map(m => m.energy_level),
      anxiety: metrics.filter(m => m.anxiety_level !== null).map(m => m.anxiety_level),
      sleep: metrics.filter(m => m.sleep_quality !== null).map(m => m.sleep_quality)
    };
    
    const calculateStats = (values) => {
      if (values.length === 0) return null;
      const sum = values.reduce((a, b) => a + b, 0);
      return {
        average: Math.round(sum / values.length),
        min: Math.min(...values),
        max: Math.max(...values),
        data_points: values.length
      };
    };
    
    const aggregates = {
      mood: calculateStats(validMetrics.mood),
      stress: calculateStats(validMetrics.stress),
      energy: calculateStats(validMetrics.energy),
      anxiety: calculateStats(validMetrics.anxiety),
      sleep: calculateStats(validMetrics.sleep),
      total_entries: metrics.length,
      breakdown: {
        ai_sessions: metrics.filter(m => m.source === "ai_session").length,
        journal_entries: metrics.filter(m => m.source === "journal_entry").length
      }
    };
    
    console.log(`[RAW METRICS] Found ${metrics.length} metrics`);
    console.log(`[RAW METRICS] Breakdown: ${aggregates.breakdown.ai_sessions} sessions, ${aggregates.breakdown.journal_entries} journals`);
    
    res.status(200).send({
      metrics,
      total: metrics.length,
      aggregates
    });
    
  } catch (error) {
    console.error("[RAW METRICS] Error fetching metrics:", error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * GET /dashboard-stats/:uid
 * Fetch dashboard statistics: session count, journal count, latest mood/energy
 */
app.get("/dashboard-stats/:uid", async (req, res) => {
  const { uid } = req.params;
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" });
  }
  
  try {
    console.log(`📊 [DASHBOARD STATS] Fetching stats for user: ${uid}`);
    
    // Fetch metrics to get counts and latest values
    const metricsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("metrics")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();
    
    if (metricsSnapshot.empty) {
      return res.status(200).send({
        sessionCount: 0,
        journalCount: 0,
        latestMood: null,
        latestEnergy: null,
        totalMetrics: 0
      });
    }
    
    const metrics = metricsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Count by source
    const sessionCount = metrics.filter(m => m.source === 'ai_session').length;
    const journalCount = metrics.filter(m => m.source === 'journal_entry').length;
    
    // Get latest mood and energy (from most recent metric)
    const latestMetric = metrics[0]; // Already sorted by timestamp desc
    const latestMood = latestMetric?.mood_percentage || null;
    const latestEnergy = latestMetric?.energy_level || null;
    
    console.log(`✅ [DASHBOARD STATS] Stats: ${sessionCount} sessions, ${journalCount} journals, mood: ${latestMood}, energy: ${latestEnergy}`);
    
    res.status(200).send({
      sessionCount,
      journalCount,
      latestMood: latestMood ? Math.round(latestMood) : null,
      latestEnergy: latestEnergy ? Math.round(latestEnergy) : null,
      totalMetrics: metrics.length
    });
    
  } catch (error) {
    console.error("[DASHBOARD STATS] Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ==================== END ANALYTICS FUNCTIONS ====================// ==================== COUNT-BASED ARCHIVING FUNCTIONS ====================

/**
 * Check if archiving is needed and execute if summaries count >= 10
 * Archives the oldest 5 summaries when threshold is reached
 */
async function checkAndArchiveIfNeeded(uid) {
  try {
    // Get all summaries ordered by timestamp
    const summariesSnapshot = await db.collection("users").doc(uid)
      .collection("summaries")
      .orderBy("timestamp", "asc")
      .get();

    const summaryCount = summariesSnapshot.size;
    console.log(`📊 User ${uid} has ${summaryCount} summaries`);

    // Archive if we have 10 or more summaries
    if (summaryCount >= 10) {
      console.log(`🗂️ Archiving triggered for user ${uid} (threshold: 10, current: ${summaryCount})`);
      
      // Get oldest 5 summaries
      const oldestFive = summariesSnapshot.docs.slice(0, 5);
      await archiveOldestSummaries(uid, oldestFive);
      
      return { archived: true, count: 5 };
    }

    return { archived: false, count: 0 };
  } catch (error) {
    console.error(`❌ Error checking archive status for ${uid}:`, error);
    throw error;
  }
}

/**
 * Archive the oldest 5 summaries:
 * 1. Decrypt summaries
 * 2. Generate AI-compressed archive summary
 * 3. Encrypt and save archive
 * 4. Delete original summaries
 */
async function archiveOldestSummaries(uid, summaryDocs) {
  try {
    console.log(`📦 Archiving ${summaryDocs.length} summaries for user ${uid}...`);

    // 1. Decrypt all summaries
    const decryptedSummaries = await Promise.all(
      summaryDocs.map(async (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp,
          summary_text: data.summary_text ? await decryptField(data.summary_text, uid) : "",
          key_topics: data.key_topics || [],
          action_items: data.action_items || [],
          risk_flags: data.risk_flags || {},
          sentiment: data.sentiment || "neutral"
        };
      })
    );

    // 2. Generate compressed archive using Gemini AI
    const archiveText = await generateArchiveSummary(decryptedSummaries);

    // 3. Encrypt the archive summary
    const encryptedArchive = await encryptField(archiveText, uid);

    // 4. Save encrypted archive
    const archiveId = `arch_${Date.now()}`;
    const firstTimestamp = decryptedSummaries[0].timestamp;
    const lastTimestamp = decryptedSummaries[decryptedSummaries.length - 1].timestamp;

    await db.collection("users").doc(uid)
      .collection("archives").doc(archiveId)
      .set({
        archive_id: archiveId,
        summary_count: summaryDocs.length,
        period_start: firstTimestamp,
        period_end: lastTimestamp,
        compressed_summary: encryptedArchive, // Encrypted
        archived_at: admin.firestore.FieldValue.serverTimestamp(),
        summary_ids: summaryDocs.map(doc => doc.id)
      });

    // 5. Delete original summaries
    const batch = db.batch();
    summaryDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`✅ Archived ${summaryDocs.length} summaries into ${archiveId} (encrypted)`);
    
    return archiveId;
  } catch (error) {
    console.error(`❌ Error archiving summaries for ${uid}:`, error);
    throw error;
  }
}

/**
 * Use Gemini AI to compress multiple summaries into a single archive summary
 */
async function generateArchiveSummary(summaries) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const summaryTexts = summaries.map((s, i) => 
    `[Summary ${i + 1}]\n${s.summary_text || "No text"}\nTopics: ${s.key_topics.join(", ")}`
  ).join("\n\n");

  const prompt = `You are a mental health data archival system. Compress the following ${summaries.length} session summaries into a single, concise archive summary (max 500 words).

Focus on:
- Recurring themes and patterns
- Key emotional trajectories
- Important action items and coping strategies
- Any risk flags or concerns
- Overall progress indicators

Summaries to compress:
${summaryTexts}

Compressed Archive Summary:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("❌ Gemini AI archive generation failed:", error);
    // Fallback: simple concatenation
    return `Archive of ${summaries.length} summaries. Key topics: ${
      [...new Set(summaries.flatMap(s => s.key_topics))].join(", ")
    }`;
  }
}

// ==================== END ARCHIVING FUNCTIONS ====================

app.post("/save-summary", async (req, res) => {
  const { uid, summary } = req.body
  if (!uid || !summary) {
    return res.status(400).send({ error: "Missing uid or summary" })
  }

  try {
    const { summary_data, meta } = summary
    const sessionId = meta?.session_id || `sess_${Date.now()}`
    const timestamp = admin.firestore.FieldValue.serverTimestamp()
    
    // 1. Save to metrics/{sessionId} (flat structure with source tracking) - NO ENCRYPTION for numeric metrics
    const metricsData = {
      timestamp,
      sessionId,
      source: "ai_session", // Track data source for multi-source analytics
      confidence: 0.90, // AI session confidence weight
      duration_minutes: meta?.duration_minutes || null,
      
      // Core numeric metrics (NOT encrypted - used for analytics)
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
      
      // Arrays (short data) - NOT encrypted
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
    
    // 2. Save to summaries subcollection (text data for AI context) - ENCRYPT TEXT FIELDS
    const summaryData = {
      timestamp,
      sessionId,
      
      // Full text summary (ENCRYPTED)
      summary_text: summary_data?.summary || summary_data?.raw 
        ? await encryptField(summary_data?.summary || summary_data?.raw || "", uid)
        : "",
      
      // Key insights (arrays, not encrypted for now - consider encrypting if sensitive)
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

    // 5. Generate activity log entry (deduplication handled inside)
    const checkinId = await generateCheckin(uid, {
      source: 'ai_session'
    });

    // 6. Check and trigger count-based archiving (archive oldest 5 when count >= 10)
    const archiveResult = await checkAndArchiveIfNeeded(uid);
    
    console.log(`✅ Summary saved for user ${uid} with encryption:`)
    console.log(`   - metrics/${sessionId} (source: ai_session, confidence: 90%, NOT encrypted)`)
    console.log(`   - summaries/${sessionId} (text encrypted)`)
    console.log(`   - latest/metrics (cache updated)`)
    console.log(`   - dashboard/checkins/items/${checkinId} (activity log created)`)
    if (archiveResult.archived) {
      console.log(`   - ♻️ Archived ${archiveResult.count} oldest summaries`)
    }
    
    res.status(200).send({ 
      message: "Summary saved successfully with encryption and source tracking",
      sessionId,
      source: "ai_session",
      confidence: 0.90,
      checkinId,
      archived: archiveResult.archived,
      archived_count: archiveResult.count,
      paths: {
        metrics: `users/${uid}/metrics/${sessionId}`,
        summary: `users/${uid}/summaries/${sessionId}`,
        latest: `users/${uid}/latest/metrics`,
        checkin: `users/${uid}/dashboard/checkins/items/${checkinId}`
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
  
  console.log(`📝 [JOURNAL METRICS] Received request for user ${uid}, entry ${entryId}`);
  
  if (!uid || !entryId || !metrics) {
    console.error(`❌ [JOURNAL METRICS] Missing required fields - uid: ${!!uid}, entryId: ${!!entryId}, metrics: ${!!metrics}`);
    return res.status(400).send({ error: "Missing uid, entryId, or metrics" })
  }

  try {
    console.log(`📊 [JOURNAL METRICS] Processing metrics:`, {
      mood: metrics.mood_percentage,
      energy: metrics.energy_level,
      stress: metrics.stress_level,
      confidence: metrics.confidence
    });
    
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
    console.log(`📈 [JOURNAL METRICS] Updating analytics summary...`);
    await updateAnalyticsSummary(uid, metricsData);
    console.log(`✅ [JOURNAL METRICS] Analytics summary updated`);
    
    // Generate activity log entry (deduplication handled inside)
    console.log(`📋 [JOURNAL METRICS] Creating activity log check-in...`);
    const checkinId = await generateCheckin(uid, {
      source: 'journal_entry'
    });
    console.log(`✅ [JOURNAL METRICS] Activity log check-in created: ${checkinId}`);

    console.log(`✅ Journal metrics saved: users/${uid}/metrics/${metricId}`)
    console.log(`   Source: journal_entry, Confidence: ${Math.round((metrics.confidence || 0.75) * 100)}%`)
    console.log(`   Entry ID: ${entryId}`)
    console.log(`   Activity log: ${checkinId}`)

    res.status(200).send({
      message: "Journal metrics saved successfully",
      metricId,
      source: "journal_entry",
      confidence: metrics.confidence || 0.75,
      checkinId,
      path: `users/${uid}/metrics/${metricId}`,
      checkin_path: `users/${uid}/dashboard/checkins/items/${checkinId}`
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

    // Build summary data for unified summaries collection (ENCRYPT TEXT)
    const summaryData = {
      timestamp,
      summaryId,
      source: "journal_entry",
      entry_id: entryId,
      
      // AI-generated summary (ENCRYPTED)
      summary_text: summary.summary_text 
        ? await encryptField(summary.summary_text, uid)
        : "",
      
      // Context data (arrays - not encrypted for now)
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

    // Check and trigger count-based archiving (archive oldest 5 when count >= 10)
    const archiveResult = await checkAndArchiveIfNeeded(uid);

    console.log(`✅ Journal summary saved: users/${uid}/summaries/${summaryId} (text encrypted)`)
    console.log(`   Source: journal_entry, Confidence: ${Math.round(summary.confidence * 100)}%`)
    console.log(`   Category: ${summary.value_category}, Entry ID: ${entryId}`)
    if (archiveResult.archived) {
      console.log(`   - ♻️ Archived ${archiveResult.count} oldest summaries`)
    }

    res.status(200).send({
      message: "Journal summary saved successfully with encryption",
      summaryId,
      source: "journal_entry",
      confidence: summary.confidence,
      value_category: summary.value_category,
      stored: true,
      archived: archiveResult.archived,
      archived_count: archiveResult.count,
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
    // Encrypt name before storing
    const encryptedName = await encryptField(name, uid)
    
    // Update in user_profiling subcollection
    const profileRef = db.collection("users").doc(uid).collection("user_profiling").doc("profile")
    await profileRef.set({ 
      name: encryptedName, 
      updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true })
    
    res.status(200).send({ message: "Name saved successfully (encrypted)" })
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
    if (name !== undefined) {
      updateData.name = await encryptField(name, uid)
    }
    
    if (age !== undefined && age !== "") {
      const ageStr = Number.parseInt(age, 10).toString()
      updateData.age = await encryptField(ageStr, uid)
    }
    
    if (gender !== undefined) {
      updateData.gender = await encryptField(gender, uid)
    }
    
    if (typeof emailVerified === "boolean") {
      updateData.emailVerified = emailVerified
    }

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
  console.log(`👤 [USER DATA] Fetching user data for uid: ${uid}`)
  
  try {
    // Read from new subcollections
    const profileRef = db.collection("users").doc(uid).collection("user_profiling").doc("profile")
    const latestMetricsRef = db.collection("users").doc(uid).collection("metrics").doc("latest")
    
    const [profileDoc, metricsDoc] = await Promise.all([
      profileRef.get(),
      latestMetricsRef.get()
    ])
    
    console.log(`📄 [USER DATA] Profile exists: ${profileDoc.exists}`)
    
    if (!profileDoc.exists) {
      console.log(`❌ [USER DATA] Profile not found for uid: ${uid}`)
      return res.status(404).send({ error: "User not found" })
    }
    
    const userData = {
      uid,
      ...profileDoc.data()
    }
    
    console.log(`🔐 [USER DATA] Raw profile data:`, {
      hasName: !!userData.name,
      hasGender: !!userData.gender,
      hasAge: !!userData.age,
      hasEmail: !!userData.email
    })

    // Decrypt sensitive profile fields
    if (userData.name) {
      userData.name = await decryptField(userData.name, uid)
      console.log(`✅ [USER DATA] Decrypted name: ${userData.name}`)
    }
    
    if (userData.gender) {
      userData.gender = await decryptField(userData.gender, uid)
      console.log(`✅ [USER DATA] Decrypted gender: ${userData.gender}`)
    }
    
    if (userData.age) {
      const decryptedAge = await decryptField(userData.age, uid)
      userData.age = Number.parseInt(decryptedAge, 10)
      console.log(`✅ [USER DATA] Decrypted age: ${userData.age}`)
    }
    
    // Add latestSummary (from metrics/latest) for backward compatibility
    if (metricsDoc.exists) {
      userData.latestSummary = {
        summary_data: metricsDoc.data()
      }
    }
    
    console.log(`✅ [USER DATA] Sending user data:`, {
      uid: userData.uid,
      name: userData.name,
      gender: userData.gender,
      age: userData.age,
      hasLatestSummary: !!userData.latestSummary
    })
    
    res.status(200).send(userData)
  } catch (error) {
    console.error(`❌ [USER DATA] Error fetching user: ${error.message}`)
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

// ==================== ENCRYPTED CONTEXT RETRIEVAL ENDPOINTS ====================

/**
 * Get user context with decrypted summaries for AI
 * Returns recent summaries and user profile with decrypted sensitive fields
 */
app.get("/get-user-context/:uid", async (req, res) => {
  const { uid } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  try {
    // Get recent summaries
    const summariesSnapshot = await db.collection("users").doc(uid)
      .collection("summaries")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    // Decrypt summary texts
    const decryptedSummaries = await Promise.all(
      summariesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp,
          source: data.source,
          summary_text: data.summary_text 
            ? await decryptField(data.summary_text, uid)
            : "",
          key_topics: data.key_topics || [],
          sentiment: data.sentiment || "neutral"
        };
      })
    );

    // Get user profile
    const profileDoc = await db.collection("users").doc(uid)
      .collection("user_profiling").doc("profile").get();
    
    let decryptedProfile = null;
    if (profileDoc.exists) {
      const profileData = profileDoc.data();
      decryptedProfile = {
        name: profileData.name ? await decryptField(profileData.name, uid) : null,
        age: profileData.age ? parseInt(await decryptField(profileData.age, uid), 10) : null,
        gender: profileData.gender ? await decryptField(profileData.gender, uid) : null,
        emailVerified: profileData.emailVerified || false
      };
    }

    res.status(200).json({
      success: true,
      profile: decryptedProfile,
      recent_summaries: decryptedSummaries,
      count: decryptedSummaries.length
    });

  } catch (error) {
    console.error("Error fetching user context:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all summaries with decryption (for context window)
 */
app.get("/get-all-summaries/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const summariesSnapshot = await db.collection("users").doc(uid)
      .collection("summaries")
      .orderBy("timestamp", "desc")
      .get();

    const decryptedSummaries = await Promise.all(
      summariesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp,
          source: data.source,
          sessionId: data.sessionId || data.summaryId,
          summary_text: data.summary_text 
            ? await decryptField(data.summary_text, uid)
            : "",
          key_topics: data.key_topics || [],
          action_items: data.action_items || [],
          risk_flags: data.risk_flags || {},
          confidence: data.confidence || 0.90
        };
      })
    );

    res.status(200).json({
      success: true,
      summaries: decryptedSummaries,
      count: decryptedSummaries.length
    });

  } catch (error) {
    console.error("Error fetching all summaries:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get archives with decryption
 */
app.get("/get-archives/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const archivesSnapshot = await db.collection("users").doc(uid)
      .collection("archives")
      .orderBy("archived_at", "desc")
      .get();

    const decryptedArchives = await Promise.all(
      archivesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          archive_id: data.archive_id,
          summary_count: data.summary_count,
          period_start: data.period_start,
          period_end: data.period_end,
          archived_at: data.archived_at,
          compressed_summary: data.compressed_summary 
            ? await decryptField(data.compressed_summary, uid)
            : "",
          summary_ids: data.summary_ids || []
        };
      })
    );

    res.status(200).json({
      success: true,
      archives: decryptedArchives,
      count: decryptedArchives.length
    });

  } catch (error) {
    console.error("Error fetching archives:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== END ENCRYPTED CONTEXT ENDPOINTS ====================

// ==================== USER DATA EXPORT & DELETION ====================

// Helper function to filter out null/undefined values recursively
function removeEmptyFields(obj) {
  if (Array.isArray(obj)) {
    return obj
      .map(item => removeEmptyFields(item))
      .filter(item => item !== null && item !== undefined && item !== '');
  }
  
  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip null, undefined, empty strings, and empty arrays
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        continue;
      }
      
      // Recursively clean nested objects
      if (typeof value === 'object' && !value._seconds) {
        const cleanedValue = removeEmptyFields(value);
        if (Object.keys(cleanedValue).length > 0 || Array.isArray(cleanedValue)) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  
  return obj;
}

// Helper to format objects recursively
function formatObject(obj, indent = 0) {
  let text = '';
  const indentation = '  '.repeat(indent);
  
  for (const [key, value] of Object.entries(obj)) {
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !value._seconds) {
      text += `${indentation}${formattedKey}:\n`;
      text += formatObject(value, indent + 1);
    } else if (Array.isArray(value)) {
      text += `${indentation}${formattedKey}:\n`;
      value.forEach((item, i) => {
        if (typeof item === 'object') {
          text += `${indentation}  [${i + 1}]\n`;
          text += formatObject(item, indent + 2);
        } else {
          text += `${indentation}  - ${item}\n`;
        }
      });
    } else if (value && value._seconds) {
      // Firestore timestamp
      text += `${indentation}${formattedKey}: ${new Date(value._seconds * 1000).toLocaleString()}\n`;
    } else {
      text += `${indentation}${formattedKey}: ${value}\n`;
    }
  }
  
  return text;
}

// Helper function to format data as readable text
function formatDataAsText(data) {
  let text = '='.repeat(80) + '\n';
  text += 'CureZ - Youth Mental Wellness - User Data Export\n';
  text += '='.repeat(80) + '\n\n';
  text += `Export Date: ${new Date().toLocaleString()}\n`;
  text += `User ID: ${data.uid || 'N/A'}\n\n`;

  // Profile Information
  if (data.profile && Object.keys(data.profile).length > 0) {
    text += '\n' + '='.repeat(80) + '\n';
    text += 'PROFILE INFORMATION\n';
    text += '='.repeat(80) + '\n\n';
    
    if (data.profile.name) text += `Name: ${data.profile.name}\n`;
    if (data.profile.email) text += `Email: ${data.profile.email}\n`;
    if (data.profile.age) text += `Age: ${data.profile.age}\n`;
    if (data.profile.gender) text += `Gender: ${data.profile.gender}\n`;
    if (data.profile.photoURL) text += `Profile Photo: Available\n`;
    if (data.profile.createdAt && data.profile.createdAt._seconds) {
      text += `Account Created: ${new Date(data.profile.createdAt._seconds * 1000).toLocaleString()}\n`;
    }
  }

  // User Profiling Details
  if (data.user_profiling && Object.keys(data.user_profiling).length > 0) {
    text += '\n' + '='.repeat(80) + '\n';
    text += 'PSYCHOLOGICAL PROFILING\n';
    text += '='.repeat(80) + '\n\n';

    const profiling = data.user_profiling;

    // Core Identity
    if (profiling.core_identity && Object.keys(profiling.core_identity).length > 0) {
      text += '\n--- Core Identity ---\n';
      text += formatObject(profiling.core_identity, 1);
    }

    // Communication Profile
    if (profiling.communication_profile && Object.keys(profiling.communication_profile).length > 0) {
      text += '\n--- Communication Patterns ---\n';
      text += formatObject(profiling.communication_profile, 1);
    }

    // Psychological Profile
    if (profiling.psychological_profile && Object.keys(profiling.psychological_profile).length > 0) {
      text += '\n--- Psychological Patterns ---\n';
      text += formatObject(profiling.psychological_profile, 1);
    }

    // Life Context
    if (profiling.life_context_profile && Object.keys(profiling.life_context_profile).length > 0) {
      text += '\n--- Life Context ---\n';
      text += formatObject(profiling.life_context_profile, 1);
    }

    // Historical Profile
    if (profiling.historical_profile && Object.keys(profiling.historical_profile).length > 0) {
      text += '\n--- Historical Factors ---\n';
      text += formatObject(profiling.historical_profile, 1);
    }

    // Strengths Profile
    if (profiling.strengths_profile && Object.keys(profiling.strengths_profile).length > 0) {
      text += '\n--- Strengths & Protective Factors ---\n';
      text += formatObject(profiling.strengths_profile, 1);
    }

    // Behavioral Profile
    if (profiling.behavioral_profile && Object.keys(profiling.behavioral_profile).length > 0) {
      text += '\n--- Behavioral Patterns ---\n';
      text += formatObject(profiling.behavioral_profile, 1);
    }

    // Risk Profile
    if (profiling.risk_profile && Object.keys(profiling.risk_profile).length > 0) {
      text += '\n--- Risk Factors ---\n';
      text += formatObject(profiling.risk_profile, 1);
    }

    // Treatment Response
    if (profiling.treatment_response_profile && Object.keys(profiling.treatment_response_profile).length > 0) {
      text += '\n--- Treatment Response ---\n';
      text += formatObject(profiling.treatment_response_profile, 1);
    }
  }

  text += '\n' + '='.repeat(80) + '\n';
  text += 'END OF EXPORT\n';
  text += '='.repeat(80) + '\n';
  text += '\nNote: Only fields with actual data are included in this export.\n';
  text += 'Wellness analytics and activity summaries are available in the app dashboard.\n';

  return text;
}

/**
 * Export user data (for backup before account deletion)
 * GET /export-user-data/:uid?format=text|json
 */
app.get("/export-user-data/:uid", async (req, res) => {
  const { uid } = req.params;
  const format = req.query.format || 'text'; // 'text' or 'json'

  if (!uid) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    console.log(`[EXPORT] Starting data export for user: ${uid}, format: ${format}`);

    // 1. Get profile data
    const profileRef = db.collection("users").doc(uid).collection("user_profiling").doc("profile");
    const profileDoc = await profileRef.get();
    
    let profileData = null;
    if (profileDoc.exists) {
      const rawProfile = profileDoc.data();
      profileData = {
        name: rawProfile.name ? decryptField(rawProfile.name, uid) : null,
        email: rawProfile.email ? decryptField(rawProfile.email, uid) : null,
        age: rawProfile.age ? decryptField(rawProfile.age, uid) : null,
        gender: rawProfile.gender ? decryptField(rawProfile.gender, uid) : null,
        photoURL: rawProfile.photoURL || null,
        createdAt: rawProfile.createdAt || null,
      };
    }

    // 2. Get user profiling details
    const userDetailsRef = db.collection("users").doc(uid).collection("user_profiling").doc("user_details");
    const userDetailsDoc = await userDetailsRef.get();
    let userDetailsData = {};
    
    if (userDetailsDoc.exists) {
      const rawDetails = userDetailsDoc.data();
      // Decrypt each profiling section
      const sections = [
        'core_identity',
        'communication_profile',
        'psychological_profile',
        'life_context_profile',
        'historical_profile',
        'strengths_profile',
        'behavioral_profile',
        'risk_profile',
        'treatment_response_profile',
      ];

      sections.forEach(section => {
        if (rawDetails[section]) {
          try {
            userDetailsData[section] = decryptFields(rawDetails[section], uid);
          } catch (error) {
            console.error(`Error decrypting ${section}:`, error);
            userDetailsData[section] = rawDetails[section];
          }
        }
      });
    }

    // 5. Prepare export data (only profile and profiling data)
    const exportData = {
      uid,
      export_date: new Date().toISOString(),
      profile: profileData,
      user_profiling: userDetailsData,
    };

    // Remove null/empty fields
    const cleanedData = removeEmptyFields(exportData);

    console.log(`[EXPORT] Data export completed for user: ${uid}`);
    console.log(`[EXPORT] Format: ${format}`);
    console.log(`[EXPORT] Cleaned data keys:`, Object.keys(cleanedData));

    // Return in requested format
    if (format === 'json') {
      console.log('[EXPORT] Returning JSON format');
      res.status(200).json({ success: true, data: cleanedData });
    } else {
      // Return as formatted text
      console.log('[EXPORT] Formatting data as text...');
      const textData = formatDataAsText(cleanedData);
      console.log('[EXPORT] Text data type:', typeof textData);
      console.log('[EXPORT] Text data length:', textData.length);
      console.log('[EXPORT] Text data preview:', textData.substring(0, 200));
      res.status(200).json({ success: true, data: textData, format: 'text' });
    }
  } catch (error) {
    console.error("[EXPORT] Error exporting user data:", error);
    res.status(500).json({ error: "Failed to export user data", details: error.message });
  }
});

/**
 * Delete user account and all associated data (HARD DELETE)
 * DELETE /delete-user-account/:uid
 */
app.delete("/delete-user-account/:uid", async (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    console.log(`Starting account deletion for user: ${uid}`);

    // Helper function to delete a collection
    async function deleteCollection(collectionRef, batchSize = 100) {
      const query = collectionRef.limit(batchSize);
      return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
      });
    }

    async function deleteQueryBatch(query, resolve, reject) {
      query.get()
        .then((snapshot) => {
          if (snapshot.size === 0) {
            return 0;
          }

          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          return batch.commit().then(() => {
            return snapshot.size;
          });
        })
        .then((numDeleted) => {
          if (numDeleted === 0) {
            resolve();
            return;
          }
          process.nextTick(() => {
            deleteQueryBatch(query, resolve, reject);
          });
        })
        .catch(reject);
    }

    // Delete in order: subcollections first, then parent documents

    // 1. Delete journal entries
    console.log(`Deleting journal entries for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("journalEntries")
    );

    // 2. Delete metrics
    console.log(`Deleting metrics for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("metrics")
    );

    // 3. Delete summaries
    console.log(`Deleting summaries for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("summaries")
    );

    // 4. Delete archives
    console.log(`Deleting archives for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("archives")
    );

    // 5. Delete context archives
    console.log(`Deleting context archives for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("context_archives")
    );

    // 6. Delete analytics
    console.log(`Deleting analytics for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("analytics")
    );

    // 7. Delete latest metrics
    console.log(`Deleting latest metrics for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("latest")
    );

    // 8. Delete user profiling
    console.log(`Deleting user profiling for ${uid}...`);
    await deleteCollection(
      db.collection("users").doc(uid).collection("user_profiling")
    );

    // 9. Delete user-specific categories (if any)
    console.log(`Deleting user categories for ${uid}...`);
    const categoriesSnapshot = await db
      .collection("categories")
      .where("userId", "==", uid)
      .get();
    
    if (!categoriesSnapshot.empty) {
      const batch = db.batch();
      categoriesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // 10. Delete user root document
    console.log(`Deleting user root document for ${uid}...`);
    await db.collection("users").doc(uid).delete();

    // 11. Delete Firebase Auth user
    console.log(`Deleting Firebase Auth user ${uid}...`);
    await admin.auth().deleteUser(uid);

    console.log(`Account deletion completed for user: ${uid}`);

    res.status(200).json({
      success: true,
      message: "Account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).json({
      error: "Failed to delete account. Please contact support.",
      details: error.message,
    });
  }
});

// ==================== END USER DATA EXPORT & DELETION ====================

// ==================== CONSULTANT SYSTEM ====================

/**
 * Get all active consultants
 * GET /consultants
 */
app.get("/consultants", async (req, res) => {
  try {
    const consultantsRef = db.collection("consultants").where("is_active", "==", true);
    const snapshot = await consultantsRef.get();
    
    const consultants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).json({ success: true, consultants });
  } catch (error) {
    console.error("Error fetching consultants:", error);
    res.status(500).json({ error: "Failed to fetch consultants" });
  }
});

/**
 * Get consultant recommendations for a specific user
 * GET /consultants/recommendations/:uid
 */
app.get("/consultants/recommendations/:uid", async (req, res) => {
  const { uid } = req.params;
  
  try {
    // Get active recommendations for user
    const recommendationsRef = db
      .collection("users")
      .doc(uid)
      .collection("consultants")
      .where("status", "==", "pending");
    
    const snapshot = await recommendationsRef.get();
    
    if (snapshot.empty) {
      return res.status(200).json({ 
        success: true, 
        has_recommendations: false,
        recommendations: [] 
      });
    }
    
    // Get consultant details for each recommendation
    const recommendations = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const recData = doc.data();
        const consultantDoc = await db.collection("consultants").doc(recData.consultant_id).get();
        
        return {
          id: doc.id,
          ...recData,
          consultant: consultantDoc.exists ? { id: consultantDoc.id, ...consultantDoc.data() } : null
        };
      })
    );
    
    // Sort in memory instead (descending - newest first)
    recommendations.sort((a, b) => {
      const aTime = a.recommended_at?._seconds || 0;
      const bTime = b.recommended_at?._seconds || 0;
      return bTime - aTime;
    });
    
    res.status(200).json({ 
      success: true, 
      has_recommendations: true,
      recommendations 
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch recommendations" 
    });
  }
});

/**
 * Create consultant recommendation (called by AI when concern detected)
 * POST /consultants/recommend
 */
app.post("/consultants/recommend", async (req, res) => {
  const { uid, consultant_id, reason, urgency, trigger_source, session_ids } = req.body;
  
  if (!uid || !consultant_id || !reason) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    // Check if user already has active recommendation for this consultant
    const existingRef = db
      .collection("users")
      .doc(uid)
      .collection("consultants")
      .where("consultant_id", "==", consultant_id)
      .where("status", "==", "pending");
    
    const existing = await existingRef.get();
    
    if (!existing.empty) {
      return res.status(200).json({ 
        success: true, 
        message: "Recommendation already exists",
        recommendation_id: existing.docs[0].id
      });
    }
    
    // Create new recommendation
    const recommendationRef = await db
      .collection("users")
      .doc(uid)
      .collection("consultants")
      .add({
        consultant_id,
        recommended_at: admin.firestore.FieldValue.serverTimestamp(),
        recommendation_reason: reason,
        urgency_level: urgency || "moderate",
        status: "pending",
        trigger_source: trigger_source || "ai_session",
        related_session_ids: session_ids || [],
        user_viewed_at: null,
        user_action: null
      });
    
    console.log(`[CONSULTANT] Created recommendation ${recommendationRef.id} for user ${uid}`);
    
    res.status(200).json({ 
      success: true, 
      recommendation_id: recommendationRef.id 
    });
  } catch (error) {
    console.error("Error creating recommendation:", error);
    res.status(500).json({ error: "Failed to create recommendation" });
  }
});

/**
 * Dismiss consultant recommendation (user action)
 * PATCH /consultants/dismiss-recommendation
 */
app.patch("/consultants/dismiss-recommendation", async (req, res) => {
  const { uid, recommendation_id, dismiss_reason } = req.body;
  
  if (!uid || !recommendation_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    const recommendationRef = db
      .collection("users")
      .doc(uid)
      .collection("consultants")
      .doc(recommendation_id);
    
    const recommendationDoc = await recommendationRef.get();
    
    if (!recommendationDoc.exists) {
      return res.status(404).json({ error: "Recommendation not found" });
    }
    
    // Update recommendation status to dismissed
    await recommendationRef.update({
      status: "dismissed",
      user_action: "dismissed",
      dismissed_at: admin.firestore.FieldValue.serverTimestamp(),
      dismiss_reason: dismiss_reason || null,
      user_viewed_at: recommendationDoc.data().user_viewed_at || admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[CONSULTANT] User ${uid} dismissed recommendation ${recommendation_id}`);
    
    res.status(200).json({ 
      success: true, 
      message: "Recommendation dismissed successfully" 
    });
  } catch (error) {
    console.error("Error dismissing recommendation:", error);
    res.status(500).json({ error: "Failed to dismiss recommendation" });
  }
});

/**
 * Submit consultation request
 * POST /consultants/submit-request
 */
app.post("/consultants/submit-request", async (req, res) => {
  const { 
    uid, 
    consultant_id, 
    recommendation_id,
    data_sharing_consent, 
    preferred_time_ranges 
  } = req.body;
  
  if (!uid || !consultant_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    // Get user email and name for notifications
    const userProfileRef = db
      .collection("users")
      .doc(uid)
      .collection("user_profiling")
      .doc("profile");
    const userProfile = await userProfileRef.get();
    const userEmail = userProfile.exists ? decryptField(userProfile.data().email, uid) : null;
    const userName = userProfile.exists ? decryptField(userProfile.data().name, uid) : null;
    
    console.log(`[CONSULTANT REQUEST] Fetching profile for user ${uid}`);
    console.log(`[CONSULTANT REQUEST] User name: ${userName}, Email: ${userEmail}`);
    
    // Prepare shared data if consent given
    let sharedDataSnapshot = null;
    if (data_sharing_consent) {
      // Get user profiling details
      const userDetailsRef = db
        .collection("users")
        .doc(uid)
        .collection("user_profiling")
        .doc("user_details");
      const userDetailsDoc = await userDetailsRef.get();
      
      if (userDetailsDoc.exists) {
        const userDetails = userDetailsDoc.data();
        // Decrypt sections
        const decryptedProfiling = {};
        const sections = [
          'core_identity', 'communication_profile', 'psychological_profile',
          'life_context_profile', 'historical_profile', 'strengths_profile',
          'behavioral_profile', 'risk_profile', 'treatment_response_profile'
        ];
        
        sections.forEach(section => {
          if (userDetails[section]) {
            try {
              decryptedProfiling[section] = decryptFields(userDetails[section], uid);
            } catch (error) {
              console.error(`Error decrypting ${section}:`, error);
            }
          }
        });
        
        sharedDataSnapshot = {
          profile: userProfile.exists ? {
            name: decryptField(userProfile.data().name, uid),
            age: decryptField(userProfile.data().age, uid),
            gender: decryptField(userProfile.data().gender, uid),
            email: userEmail
          } : null,
          profiling: decryptedProfiling
        };
      }
    } else {
      // Only basic demographics
      sharedDataSnapshot = userProfile.exists ? {
        name: decryptField(userProfile.data().name, uid),
        age: decryptField(userProfile.data().age, uid),
        gender: decryptField(userProfile.data().gender, uid),
        email: userEmail
      } : null;
    }
    
    // Create consultation request
    const requestRef = await db.collection("consultation_requests").add({
      user_id: uid,
      user_email: userEmail,
      user_name: userName || "Anonymous User",
      consultant_id,
      recommendation_id: recommendation_id || null,
      status: "pending",
      data_sharing_consent: data_sharing_consent || false,
      preferred_time_ranges: preferred_time_ranges || [],
      shared_data_snapshot: sharedDataSnapshot,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      admin_viewed_at: null,
      proposed_slot: null,
      meet_link: null,
      user_confirmed_at: null
    });
    
    console.log(`[CONSULTANT REQUEST] Created request ${requestRef.id} for user ${userName} (${uid})`);
    
    // Update recommendation status if exists
    if (recommendation_id) {
      await db
        .collection("users")
        .doc(uid)
        .collection("consultants")
        .doc(recommendation_id)
        .update({
          status: "contacted",
          user_action: "interested",
          request_submitted_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    
    console.log(`[CONSULTANT] Created consultation request ${requestRef.id} for user ${uid}`);
    
    // TODO: Send email notification to admins (will implement in next step)
    
    res.status(200).json({ 
      success: true, 
      request_id: requestRef.id,
      message: "Your consultation request has been submitted. You'll receive an email within 24 hours." 
    });
  } catch (error) {
    console.error("Error submitting consultation request:", error);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

/**
 * Get all consultation requests (for admin)
 * GET /admin/consultation-requests
 */
app.get("/admin/consultation-requests", async (req, res) => {
  const { admin_secret, status } = req.query;
  
  // Simple admin auth (prototype only)
  if (admin_secret !== process.env.ADMIN_SECRET && admin_secret !== "curez_admin_2025") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  try {
    console.log("[ADMIN] Fetching consultation requests, status:", status);
    
    let snapshot;
    
    if (status) {
      // Query with status filter - needs composite index
      snapshot = await db.collection("consultation_requests")
        .where("status", "==", status)
        .get();
    } else {
      // Get all requests without ordering
      snapshot = await db.collection("consultation_requests").get();
    }
    
    console.log("[ADMIN] Found", snapshot.size, "requests");
    console.log("[ADMIN] Found", snapshot.size, "requests");
    
    const requests = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get consultant details
        let consultant = null;
        try {
          const consultantDoc = await db.collection("consultants").doc(data.consultant_id).get();
          consultant = consultantDoc.exists ? { id: consultantDoc.id, ...consultantDoc.data() } : null;
        } catch (error) {
          console.error("[ADMIN] Error fetching consultant:", error);
        }
        
        // Get recommendation details if exists
        let recommendation = null;
        if (data.recommendation_id) {
          try {
            const recDoc = await db
              .collection("users")
              .doc(data.user_id)
              .collection("consultants")
              .doc(data.recommendation_id)
              .get();
            recommendation = recDoc.exists ? recDoc.data() : null;
          } catch (error) {
            console.error("[ADMIN] Error fetching recommendation:", error);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || new Date().toISOString(),
          consultant,
          recommendation
        };
      })
    );
    
    // Sort by created_at in memory (descending - newest first)
    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching consultation requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

/**
 * Complete consultation request (admin action)
 * POST /admin/complete-consultation
 */
app.post("/admin/complete-consultation", async (req, res) => {
  const { admin_secret, request_id, completion_notes } = req.body;
  
  // Simple admin auth (prototype only)
  if (admin_secret !== process.env.ADMIN_SECRET && admin_secret !== "curez_admin_2025") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  if (!request_id) {
    return res.status(400).json({ error: "Missing request_id" });
  }
  
  try {
    const requestRef = db.collection("consultation_requests").doc(request_id);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Consultation request not found" });
    }
    
    const requestData = requestDoc.data();
    
    // Update consultation request status to completed
    await requestRef.update({
      status: "completed",
      completed_at: admin.firestore.FieldValue.serverTimestamp(),
      completion_notes: completion_notes || null,
      completed_by: "admin"
    });
    
    // Update user's recommendation if linked
    if (requestData.recommendation_id && requestData.user_id) {
      try {
        await db
          .collection("users")
          .doc(requestData.user_id)
          .collection("consultants")
          .doc(requestData.recommendation_id)
          .update({
            status: "completed",
            completed_at: admin.firestore.FieldValue.serverTimestamp()
          });
      } catch (error) {
        console.error("[ADMIN] Error updating recommendation status:", error);
        // Don't fail the whole operation if recommendation update fails
      }
    }
    
    console.log(`[ADMIN] Marked consultation ${request_id} as completed`);
    
    res.status(200).json({ 
      success: true, 
      message: "Consultation marked as completed" 
    });
  } catch (error) {
    console.error("Error completing consultation:", error);
    res.status(500).json({ error: "Failed to complete consultation" });
  }
});

/**
 * Download consultation shared data as text (admin action)
 * GET /admin/consultation-shared-data/:request_id
 */
app.get("/admin/consultation-shared-data/:request_id", async (req, res) => {
  const { request_id } = req.params;
  const { admin_secret } = req.query;
  
  // Simple admin auth (prototype only)
  if (admin_secret !== process.env.ADMIN_SECRET && admin_secret !== "curez_admin_2025") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  if (!request_id) {
    return res.status(400).json({ error: "Missing request_id" });
  }
  
  try {
    const requestRef = db.collection("consultation_requests").doc(request_id);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Consultation request not found" });
    }
    
    const requestData = requestDoc.data();
    const sharedData = requestData.shared_data_snapshot;
    
    if (!sharedData) {
      return res.status(404).json({ error: "No shared data available" });
    }
    
    // Get consultant details
    let consultantName = "Unknown Consultant";
    if (requestData.consultant_id) {
      const consultantDoc = await db.collection("consultants").doc(requestData.consultant_id).get();
      if (consultantDoc.exists) {
        consultantName = consultantDoc.data().name;
      }
    }
    
    // Get recommendation reason if exists
    let recommendationReason = null;
    if (requestData.recommendation_id && requestData.user_id) {
      const recDoc = await db
        .collection("users")
        .doc(requestData.user_id)
        .collection("consultants")
        .doc(requestData.recommendation_id)
        .get();
      if (recDoc.exists) {
        recommendationReason = recDoc.data().recommendation_reason;
      }
    }
    
    // Format as text for consultant
    let text = '='.repeat(80) + '\n';
    text += 'CureZ - Consultation Data Export\n';
    text += '='.repeat(80) + '\n\n';
    text += `Export Date: ${new Date().toLocaleString()}\n`;
    text += `Consultation ID: ${request_id}\n`;
    text += `Consultant: ${consultantName}\n`;
    text += `Data Sharing Consent: ${requestData.data_sharing_consent ? 'Full Profile' : 'Basic Demographics Only'}\n\n`;
    
    // Add recommendation context
    if (recommendationReason) {
      text += '\n' + '='.repeat(80) + '\n';
      text += 'REFERRAL CONTEXT\n';
      text += '='.repeat(80) + '\n\n';
      text += `Reason for Referral: ${recommendationReason}\n`;
      text += `Urgency Level: ${requestData.recommendation?.urgency_level || 'N/A'}\n\n`;
    }
    
    // Fetch session summaries
    let summaries = [];
    try {
      const summariesSnapshot = await db
        .collection("users")
        .doc(requestData.user_id)
        .collection("summaries")
        .orderBy("timestamp", "desc")
        .limit(20) // Last 20 summaries
        .get();
      
      summariesSnapshot.forEach(doc => {
        const data = doc.data();
        summaries.push({
          date: data.timestamp?.toDate() || new Date(),
          summary: data.summary || '',
          mood: data.mood_trend || '',
          key_topics: data.key_topics || []
        });
      });
    } catch (error) {
      console.log('No summaries found or error fetching:', error.message);
    }
    
    // Fetch analytics summary
    let analyticsData = null;
    try {
      const analyticsDoc = await db
        .collection("users")
        .doc(requestData.user_id)
        .collection("analytics")
        .doc("summary")
        .get();
      
      if (analyticsDoc.exists) {
        analyticsData = analyticsDoc.data();
        console.log(`✅ Analytics found for user ${requestData.user_id}`);
      } else {
        console.log(`ℹ️  No analytics document yet for user ${requestData.user_id}`);
      }
    } catch (error) {
      console.log('❌ Error fetching analytics:', error.message);
    }
    
    // Add session summaries section
    if (summaries.length > 0) {
      text += '\n' + '='.repeat(80) + '\n';
      text += 'SESSION SUMMARIES\n';
      text += '='.repeat(80) + '\n\n';
      
      summaries.forEach((summary, index) => {
        text += `\n--- Session ${summaries.length - index} (${summary.date.toLocaleDateString()}) ---\n`;
        if (summary.mood) text += `Mood Trend: ${summary.mood}\n`;
        if (summary.key_topics && summary.key_topics.length > 0) {
          text += `Key Topics: ${summary.key_topics.join(', ')}\n`;
        }
        text += `\nSummary:\n${summary.summary}\n`;
      });
      
      text += '\n';
    }
    
    // Add analytics overview section (Embedded Windows Architecture)
    if (analyticsData) {
      text += '\n' + '='.repeat(80) + '\n';
      text += 'ANALYTICS OVERVIEW (Embedded Windows System)\n';
      text += '='.repeat(80) + '\n\n';
      
      // Current State (Real-time aggregates)
      if (analyticsData.current) {
        text += '--- CURRENT STATE (Real-Time Metrics) ---\n\n';
        
        const current = analyticsData.current;
        if (current.mood && current.mood.data_points > 0) {
          text += `Mood: ${current.mood.average}% (${current.mood.data_points} data points)\n`;
          text += `  Range: ${current.mood.min}% - ${current.mood.max}%\n`;
          text += `  Reliability: ${current.mood.reliable ? 'High' : 'Low'}\n\n`;
        }
        
        if (current.stress && current.stress.data_points > 0) {
          text += `Stress Level: ${current.stress.average}% (${current.stress.data_points} data points)\n`;
          text += `  Range: ${current.stress.min}% - ${current.stress.max}%\n\n`;
        }
        
        if (current.energy && current.energy.data_points > 0) {
          text += `Energy Level: ${current.energy.average}% (${current.energy.data_points} data points)\n\n`;
        }
        
        if (current.anxiety && current.anxiety.data_points > 0) {
          text += `Anxiety Level: ${current.anxiety.average}% (${current.anxiety.data_points} data points)\n\n`;
        }
        
        if (current.sleep && current.sleep.data_points > 0) {
          text += `Sleep Quality: ${current.sleep.average}% (${current.sleep.data_points} data points)\n\n`;
        }
      }
      
      // Time Windows (7-day, 30-day, 90-day trends)
      if (analyticsData.windows) {
        text += '\n--- TIME-BASED WINDOWS ---\n\n';
        
        const windows = analyticsData.windows;
        
        // 7-Day Window
        if (windows.last_7_days && windows.last_7_days.entries_count > 0) {
          text += '📊 Last 7 Days (Recent Trends):\n';
          if (windows.last_7_days.mood_avg !== null) {
            text += `  Mood Average: ${windows.last_7_days.mood_avg}%\n`;
          }
          if (windows.last_7_days.stress_avg !== null) {
            text += `  Stress Average: ${windows.last_7_days.stress_avg}%\n`;
          }
          if (windows.last_7_days.energy_avg !== null) {
            text += `  Energy Average: ${windows.last_7_days.energy_avg}%\n`;
          }
          text += `  Total Entries: ${windows.last_7_days.entries_count}\n`;
          if (windows.last_7_days.updated_at) {
            text += `  Last Updated: ${new Date(windows.last_7_days.updated_at).toLocaleDateString()}\n`;
          }
          text += '\n';
        }
        
        // 30-Day Window
        if (windows.last_30_days && windows.last_30_days.entries_count > 0) {
          text += '📊 Last 30 Days (Monthly Pattern):\n';
          if (windows.last_30_days.mood_avg !== null) {
            text += `  Mood Average: ${windows.last_30_days.mood_avg}%\n`;
          }
          if (windows.last_30_days.stress_avg !== null) {
            text += `  Stress Average: ${windows.last_30_days.stress_avg}%\n`;
          }
          if (windows.last_30_days.energy_avg !== null) {
            text += `  Energy Average: ${windows.last_30_days.energy_avg}%\n`;
          }
          text += `  Total Entries: ${windows.last_30_days.entries_count}\n`;
          if (windows.last_30_days.updated_at) {
            text += `  Last Updated: ${new Date(windows.last_30_days.updated_at).toLocaleDateString()}\n`;
          }
          text += '\n';
        }
        
        // 90-Day Window
        if (windows.last_90_days && windows.last_90_days.entries_count > 0) {
          text += '📊 Last 90 Days (Quarterly Progress):\n';
          if (windows.last_90_days.mood_avg !== null) {
            text += `  Mood Average: ${windows.last_90_days.mood_avg}%\n`;
          }
          if (windows.last_90_days.stress_avg !== null) {
            text += `  Stress Average: ${windows.last_90_days.stress_avg}%\n`;
          }
          if (windows.last_90_days.energy_avg !== null) {
            text += `  Energy Average: ${windows.last_90_days.energy_avg}%\n`;
          }
          text += `  Total Entries: ${windows.last_90_days.entries_count}\n`;
          if (windows.last_90_days.updated_at) {
            text += `  Last Updated: ${new Date(windows.last_90_days.updated_at).toLocaleDateString()}\n`;
          }
          text += '\n';
        }
      }
      
      // Data Breakdown
      if (analyticsData.breakdown) {
        text += '\n--- DATA SOURCES ---\n';
        text += `AI Sessions: ${analyticsData.breakdown.ai_sessions || 0}\n`;
        text += `Journal Entries: ${analyticsData.breakdown.journal_entries || 0}\n`;
        text += `Total Tracked Events: ${analyticsData.breakdown.total || 0}\n\n`;
      }
      
      // Metadata
      if (analyticsData.metadata) {
        text += '\n--- TRACKING SUMMARY ---\n';
        text += `Lifetime Entries: ${analyticsData.metadata.total_lifetime_entries || 0}\n`;
        if (analyticsData.metadata.first_entry) {
          text += `First Entry: ${new Date(analyticsData.metadata.first_entry).toLocaleDateString()}\n`;
        }
        if (analyticsData.metadata.last_entry) {
          text += `Last Entry: ${new Date(analyticsData.metadata.last_entry).toLocaleDateString()}\n`;
        }
        text += '\n';
      }
      
      text += '\n';
    } else {
      // No analytics document exists yet
      text += '\n' + '='.repeat(80) + '\n';
      text += 'ANALYTICS OVERVIEW\n';
      text += '='.repeat(80) + '\n\n';
      text += 'Analytics are generated automatically as the user completes sessions and journal entries.\n';
      text += 'No analytics data available yet for this user.\n\n';
    }
    
    // Basic Demographics (always included)
    text += '\n' + '='.repeat(80) + '\n';
    text += 'PATIENT DEMOGRAPHICS\n';
    text += '='.repeat(80) + '\n\n';
    
    if (sharedData.profile) {
      if (sharedData.profile.name) text += `Name: ${sharedData.profile.name}\n`;
      if (sharedData.profile.age) text += `Age: ${sharedData.profile.age}\n`;
      if (sharedData.profile.gender) text += `Gender: ${sharedData.profile.gender}\n`;
      if (sharedData.profile.email) text += `Email: ${sharedData.profile.email}\n`;
    } else if (sharedData.name) {
      // Handle basic demographics format
      if (sharedData.name) text += `Name: ${sharedData.name}\n`;
      if (sharedData.age) text += `Age: ${sharedData.age}\n`;
      if (sharedData.gender) text += `Gender: ${sharedData.gender}\n`;
      if (sharedData.email) text += `Email: ${sharedData.email}\n`;
    }
    
    // Full Profiling Data (only if consent given)
    if (requestData.data_sharing_consent && sharedData.profiling) {
      text += '\n' + '='.repeat(80) + '\n';
      text += 'PSYCHOLOGICAL PROFILING\n';
      text += '='.repeat(80) + '\n\n';
      
      // Remove empty fields from profiling data
      const profiling = removeEmptyFields(sharedData.profiling);
      
      // Core Identity
      if (profiling.core_identity && Object.keys(profiling.core_identity).length > 0) {
        text += '\n--- Core Identity ---\n';
        text += formatObject(profiling.core_identity, 1);
      }
      
      // Communication Profile
      if (profiling.communication_profile && Object.keys(profiling.communication_profile).length > 0) {
        text += '\n--- Communication Style ---\n';
        text += formatObject(profiling.communication_profile, 1);
      }
      
      // Psychological Profile
      if (profiling.psychological_profile && Object.keys(profiling.psychological_profile).length > 0) {
        text += '\n--- Psychological Overview ---\n';
        text += formatObject(profiling.psychological_profile, 1);
      }
      
      // Life Context
      if (profiling.life_context_profile && Object.keys(profiling.life_context_profile).length > 0) {
        text += '\n--- Life Context ---\n';
        text += formatObject(profiling.life_context_profile, 1);
      }
      
      // Strengths & Protective Factors
      if (profiling.strengths_profile && Object.keys(profiling.strengths_profile).length > 0) {
        text += '\n--- Strengths & Protective Factors ---\n';
        text += formatObject(profiling.strengths_profile, 1);
      }
      
      // Behavioral Patterns
      if (profiling.behavioral_profile && Object.keys(profiling.behavioral_profile).length > 0) {
        text += '\n--- Behavioral Patterns ---\n';
        text += formatObject(profiling.behavioral_profile, 1);
      }
      
      // Risk Factors
      if (profiling.risk_profile && Object.keys(profiling.risk_profile).length > 0) {
        text += '\n--- Risk Assessment ---\n';
        text += formatObject(profiling.risk_profile, 1);
      }
      
      // Treatment Response
      if (profiling.treatment_response_profile && Object.keys(profiling.treatment_response_profile).length > 0) {
        text += '\n--- Treatment Response Insights ---\n';
        text += formatObject(profiling.treatment_response_profile, 1);
      }
    } else if (requestData.data_sharing_consent) {
      text += '\n(User consented to full profile sharing, but no profiling data available yet)\n';
    } else {
      text += '\n' + '='.repeat(80) + '\n';
      text += 'NOTE: User chose to share basic demographics only.\n';
      text += 'Full psychological profiling not included.\n';
      text += '='.repeat(80) + '\n';
    }
    
    text += '\n' + '='.repeat(80) + '\n';
    text += 'END OF CONSULTATION DATA EXPORT\n';
    text += '='.repeat(80) + '\n';
    
    // Determine filename
    const userName = sharedData.profile?.name || sharedData.name || 'patient';
    const safeUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `consultation_${safeUserName}_${new Date().toISOString().split('T')[0]}.txt`;
    
    // Send as downloadable file
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(text);
    
    console.log(`[ADMIN] Downloaded consultation shared data for request ${request_id}`);
  } catch (error) {
    console.error("Error downloading consultation data:", error);
    res.status(500).json({ error: "Failed to download consultation data" });
  }
});

/**
 * Generate .ics calendar file for consultation
 * POST /admin/generate-calendar-invite
 */
app.post("/admin/generate-calendar-invite", async (req, res) => {
  const { 
    admin_secret, 
    request_id, 
    meeting_date, 
    meeting_time, 
    duration_minutes,
    meeting_link 
  } = req.body;
  
  // Simple admin auth (prototype only)
  if (admin_secret !== process.env.ADMIN_SECRET && admin_secret !== "curez_admin_2025") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  if (!request_id || !meeting_date || !meeting_time || !duration_minutes || !meeting_link) {
    return res.status(400).json({ 
      error: "Missing required fields: request_id, meeting_date, meeting_time, duration_minutes, meeting_link" 
    });
  }
  
  try {
    // Get consultation request details
    const requestRef = db.collection("consultation_requests").doc(request_id);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Consultation request not found" });
    }
    
    const requestData = requestDoc.data();
    
    // Get consultant name
    let consultantName = "Mental Health Consultant";
    if (requestData.consultant_id) {
      const consultantDoc = await db.collection("consultants").doc(requestData.consultant_id).get();
      if (consultantDoc.exists) {
        consultantName = consultantDoc.data().name;
      }
    }
    
    // Parse date and time (format: "2025-11-15" and "14:00")
    const [year, month, day] = meeting_date.split('-').map(Number);
    const [hours, minutes] = meeting_time.split(':').map(Number);
    
    // Create start date array [year, month, day, hour, minute]
    const startDate = [year, month, day, hours, minutes];
    
    // Calculate end time
    const endHours = hours + Math.floor((minutes + duration_minutes) / 60);
    const endMinutes = (minutes + duration_minutes) % 60;
    
    // Create calendar event
    const event = {
      start: startDate,
      duration: { minutes: duration_minutes },
      title: `Mental Wellness Consultation with ${consultantName}`,
      description: `Join your consultation session with ${consultantName}.\n\nMeeting Link: ${meeting_link}\n\nPlease be in a quiet, private space and test your camera/microphone beforehand.`,
      location: meeting_link,
      url: meeting_link,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'CureZ Mental Wellness', email: 'support@curez.app' },
      attendees: [
        { name: requestData.user_email || 'Patient', email: requestData.user_email || '', rsvp: true, role: 'REQ-PARTICIPANT' }
      ],
      alarms: [
        { action: 'display', trigger: { minutes: 15, before: true }, description: 'Reminder: Your consultation starts in 15 minutes' },
        { action: 'display', trigger: { minutes: 60, before: true }, description: 'Reminder: Your consultation starts in 1 hour' }
      ]
    };
    
    // Generate .ics file
    createEvent(event, (error, value) => {
      if (error) {
        console.error('Error creating calendar event:', error);
        return res.status(500).json({ error: 'Failed to generate calendar file' });
      }
      
      // Determine filename
      const userName = requestData.user_email?.split('@')[0] || 'patient';
      const safeUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `consultation_${safeUserName}_${meeting_date}.ics`;
      
      // Send as downloadable file
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(value);
      
      console.log(`[ADMIN] Generated calendar invite for request ${request_id}`);
    });
  } catch (error) {
    console.error("Error generating calendar invite:", error);
    res.status(500).json({ error: "Failed to generate calendar invite" });
  }
});

/**
 * Seed mock consultants (for initial setup)
 * POST /admin/seed-consultants
 */
app.post("/admin/seed-consultants", async (req, res) => {
  const { admin_secret } = req.body;
  
  if (admin_secret !== process.env.ADMIN_SECRET && admin_secret !== "curez_admin_2025") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  const mockConsultants = [
    {
      name: "Dr. Sarah Thompson",
      age: 38,
      gender: "female",
      specialty: "Clinical Psychology",
      sub_specialty: ["Youth Anxiety", "Depression", "Academic Stress"],
      languages: ["English", "Spanish"],
      experience_years: 12,
      education: "PhD Clinical Psychology, Stanford University",
      certifications: ["Licensed Clinical Psychologist (LCP)", "CBT Certified"],
      bio: "Dr. Thompson specializes in working with young adults facing anxiety and depression. With over 12 years of experience, she uses evidence-based approaches including CBT and mindfulness techniques to help clients develop coping strategies and improve their mental wellness.",
      photo_url: "/consultants/dr-sarah.jpg",
      rating: 4.8,
      is_active: true
    },
    {
      name: "Dr. Michael Chen",
      age: 42,
      gender: "male",
      specialty: "Psychiatry",
      sub_specialty: ["Mood Disorders", "ADHD", "Medication Management"],
      languages: ["English", "Mandarin"],
      experience_years: 15,
      education: "MD Psychiatry, Johns Hopkins University",
      certifications: ["Board Certified Psychiatrist", "ADHD Specialist"],
      bio: "Dr. Chen is a board-certified psychiatrist with expertise in mood disorders and ADHD. He takes a holistic approach, combining medication management with therapeutic interventions to support young adults in achieving optimal mental health.",
      photo_url: "/consultants/dr-chen.jpg",
      rating: 4.9,
      is_active: true
    },
    {
      name: "Dr. Priya Sharma",
      age: 35,
      gender: "female",
      specialty: "Counseling Psychology",
      sub_specialty: ["Trauma", "Cultural Identity", "Family Issues"],
      languages: ["English", "Hindi", "Punjabi"],
      experience_years: 10,
      education: "PsyD Counseling Psychology, University of California",
      certifications: ["Licensed Professional Counselor", "Trauma-Informed Care Certified"],
      bio: "Dr. Sharma specializes in trauma-informed care and cultural identity issues. She creates a safe, culturally-sensitive space for young adults to explore their experiences and develop resilience. Her approach integrates traditional therapeutic methods with mindfulness practices.",
      photo_url: "/consultants/dr-sharma.jpg",
      rating: 4.7,
      is_active: true
    },
    {
      name: "Dr. James Rodriguez",
      age: 40,
      gender: "male",
      specialty: "Clinical Social Work",
      sub_specialty: ["Substance Abuse", "Crisis Intervention", "Social Anxiety"],
      languages: ["English", "Spanish"],
      experience_years: 14,
      education: "PhD Clinical Social Work, Columbia University",
      certifications: ["Licensed Clinical Social Worker (LCSW)", "Substance Abuse Counselor"],
      bio: "Dr. Rodriguez has extensive experience in crisis intervention and substance abuse counseling. He works with young adults to address underlying mental health issues and develop healthy coping mechanisms. His compassionate approach focuses on empowerment and sustainable recovery.",
      photo_url: "/consultants/dr-rodriguez.jpg",
      rating: 4.6,
      is_active: true
    },
    {
      name: "Dr. Emily Wong",
      age: 33,
      gender: "female",
      specialty: "Youth Psychology",
      sub_specialty: ["Stress Management", "Self-Esteem", "Relationship Issues"],
      languages: ["English", "Cantonese"],
      experience_years: 8,
      education: "PhD Youth Psychology, University of Toronto",
      certifications: ["Licensed Psychologist", "Mindfulness-Based Stress Reduction Certified"],
      bio: "Dr. Wong specializes in helping young adults navigate stress, build self-esteem, and develop healthy relationships. She uses a strengths-based approach combined with mindfulness techniques to help clients discover their potential and achieve their goals.",
      photo_url: "/consultants/dr-wong.jpg",
      rating: 4.8,
      is_active: true
    }
  ];
  
  try {
    const batch = db.batch();
    
    mockConsultants.forEach(consultant => {
      const docRef = db.collection("consultants").doc();
      batch.set(docRef, {
        ...consultant,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    console.log(`[CONSULTANT] Seeded ${mockConsultants.length} mock consultants`);
    
    res.status(200).json({ 
      success: true, 
      message: `Successfully seeded ${mockConsultants.length} consultants` 
    });
  } catch (error) {
    console.error("Error seeding consultants:", error);
    res.status(500).json({ error: "Failed to seed consultants" });
  }
});

// ==================== END CONSULTANT SYSTEM ====================

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
