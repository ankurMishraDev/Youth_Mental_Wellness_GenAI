// Load environment variables FIRST
require('dotenv').config();

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { encryptField, decryptField, encryptArray, decryptArray } = require('./encryption');

// Import service account credentials for production Firestore access
const serviceAccount = require('./admin-key.json');

// Initialize Firebase Admin with credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get Firestore instance
const db = admin.firestore();

// Initialize Gemini AI - prioritize environment variable for local testing
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || functions.config().gemini?.api_key
);

/**
 * Weekly Archive Cloud Function
 * Runs every Sunday at 11:59 PM IST
 * Archives past week's summaries into compressed weekly archives
 */
exports.weeklyArchive = functions
  .region('asia-south1')  // Match your Firestore database region
  .pubsub
  .schedule('59 23 * * 0')  // Cron: Every Sunday at 11:59 PM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('=== Starting Weekly Archive Job ===');
    
    const db = admin.firestore();
    
    // Calculate week boundaries (7 days ago = days 1-7 before today)
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - 1); // Yesterday (end of the week being archived)
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6); // 7 days total
    weekStart.setHours(0, 0, 0, 0);
    
    const weekNumber = getWeekNumber(weekStart);
    const year = weekStart.getFullYear();
    
    console.log(`Archiving week ${weekNumber} of ${year} (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})`);
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users to process`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      
      try {
        const result = await archiveUserWeek(uid, weekStart, weekEnd, weekNumber, year);
        
        if (result === 'skipped') {
          skippedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Archive failed for user ${uid}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('=== Weekly Archive Complete ===');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skippedCount} (no data)`);
    console.log(`❌ Errors: ${errorCount}`);
    
    return null;
  });

/**
 * Archive one user's week of summaries
 */
async function archiveUserWeek(uid, weekStart, weekEnd, weekNumber, year) {
  console.log(`Processing user: ${uid}`);
  
  try {
    // 1. Fetch all summaries from this week
    // Try to query, but handle case where summaries collection doesn't exist
    const summariesSnapshot = await db.collection('users').doc(uid)
      .collection('summaries')
      .orderBy('timestamp', 'asc')
      .get();
    
    if (summariesSnapshot.empty) {
      console.log(`  ⏭️  No summaries for user ${uid} - skipping`);
      return 'skipped';
    }
    
    // Filter summaries manually for the date range (in case timestamp field is inconsistent)
    const weekStartTime = weekStart.getTime();
    const weekEndTime = weekEnd.getTime();
    
    const summaries = summariesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(summary => {
        if (!summary.timestamp) return false;
        
        // Handle both Timestamp objects and Date objects
        let summaryTime;
        if (summary.timestamp.toDate) {
          // Firestore Timestamp
          summaryTime = summary.timestamp.toDate().getTime();
        } else if (summary.timestamp instanceof Date) {
          summaryTime = summary.timestamp.getTime();
        } else if (typeof summary.timestamp === 'string') {
          summaryTime = new Date(summary.timestamp).getTime();
        } else {
          return false;
        }
        
        return summaryTime >= weekStartTime && summaryTime <= weekEndTime;
      });
    
    if (summaries.length === 0) {
      console.log(`  ⏭️  No summaries in date range for user ${uid} - skipping`);
      return 'skipped';
    }
    
    console.log(`  📦 Found ${summaries.length} summaries to archive`);
    
    // 2. 🔓 DECRYPT summaries before passing to AI
    console.log('  🔓 Decrypting summaries for AI processing...');
    const decryptedSummaries = await Promise.all(summaries.map(async (summary) => {
      try {
        const decrypted = { ...summary };
        
        // Decrypt text fields
        if (summary.summary_text) {
          decrypted.summary_text = await decryptField(summary.summary_text, uid);
        }
        if (summary.title) {
          decrypted.title = await decryptField(summary.title, uid);
        }
        
        // Decrypt arrays
        if (summary.key_topics) {
          decrypted.key_topics = await decryptArray(summary.key_topics, uid);
        }
        if (summary.key_insights) {
          decrypted.key_insights = await decryptArray(summary.key_insights, uid);
        }
        if (summary.emotional_themes) {
          decrypted.emotional_themes = await decryptArray(summary.emotional_themes, uid);
        }
        if (summary.stressors) {
          decrypted.stressors = await decryptArray(summary.stressors, uid);
        }
        if (summary.action_items) {
          decrypted.action_items = await decryptArray(summary.action_items, uid);
        }
        if (summary.coping_strategies) {
          decrypted.coping_strategies = await decryptArray(summary.coping_strategies, uid);
        }
        if (summary.ongoing_concerns) {
          decrypted.ongoing_concerns = await decryptArray(summary.ongoing_concerns, uid);
        }
        if (summary.strengths_shown) {
          decrypted.strengths_shown = await decryptArray(summary.strengths_shown, uid);
        }
        if (summary.goals) {
          decrypted.goals = await decryptArray(summary.goals, uid);
        }
        if (summary.urgency_level) {
          decrypted.urgency_level = await decryptField(summary.urgency_level, uid);
        }
        if (summary.positive_moments) {
          decrypted.positive_moments = await decryptField(summary.positive_moments, uid);
        }
        
        return decrypted;
      } catch (error) {
        console.error(`  ⚠️  Decryption error for summary ${summary.id}:`, error.message);
        // Return original if decryption fails (might be old unencrypted data)
        return summary;
      }
    }));
    
    // 3. Use Gemini to compress into weekly archive (with DECRYPTED data)
    const archive = await generateWeeklyArchive(decryptedSummaries, weekStart, weekEnd);
    
    // 4. 🔐 ENCRYPT the archive before saving
    console.log('  🔐 Encrypting archive before saving...');
    const encryptedArchive = {
      // Encrypt narrative and text fields
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
      
      // Metadata
      summary_count: archive.summary_count || summaries.length
    };
    
    console.log('  🔍 Archive generated and encrypted, preparing to save...');
    console.log('  weekStart type:', typeof weekStart, weekStart);
    console.log('  weekEnd type:', typeof weekEnd, weekEnd);
    
    // 3. Save archive with structured ID
    const archiveId = `week_${String(weekNumber).padStart(2, '0')}_${year}`;
    
    // Convert dates to Firestore Timestamps using imported Timestamp
    const weekStartTimestamp = Timestamp.fromDate(weekStart);
    const weekEndTimestamp = Timestamp.fromDate(weekEnd);
    
    console.log('  🔍 Timestamps created:', weekStartTimestamp, weekEndTimestamp);
    
    await db.collection('users').doc(uid)
      .collection('context_archives')
      .doc(archiveId)
      .set({
        ...encryptedArchive,
        week_number: weekNumber,
        year: year,
        week_start: weekStartTimestamp,
        week_end: weekEndTimestamp,
        created_at: FieldValue.serverTimestamp()
      });
    
    console.log(`  ✅ Archive created: users/${uid}/context_archives/${archiveId}`);
    
    // 4. Delete archived summaries to save storage (optional)
    // Only delete summaries that are older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const batch = db.batch();
    let deleteCount = 0;
    
    summaries.forEach(summary => {
      // Find the actual document to delete
      const docRef = db.collection('users').doc(uid)
        .collection('summaries')
        .doc(summary.id);
      
      let summaryTime;
      if (summary.timestamp && summary.timestamp.toDate) {
        summaryTime = summary.timestamp.toDate();
      } else if (summary.timestamp instanceof Date) {
        summaryTime = summary.timestamp;
      } else if (typeof summary.timestamp === 'string') {
        summaryTime = new Date(summary.timestamp);
      }
      
      if (summaryTime && summaryTime < sevenDaysAgo) {
        batch.delete(docRef);
        deleteCount++;
      }
    });
    
    if (deleteCount > 0) {
      await batch.commit();
      console.log(`  🗑️  Deleted ${deleteCount} archived summaries (older than 7 days)`);
    }
    
    return 'success';
    
  } catch (error) {
    // Log error but don't crash - continue with other users
    throw error;
  }
}

/**
 * Generate weekly archive using Gemini AI
 */
async function generateWeeklyArchive(summaries, weekStart, weekEnd) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  // Prepare summaries text with formatting
  const summariesText = summaries.map((s, i) => {
    const source = s.source === 'ai_session' ? '🎙️ AI Session' : '📔 Journal';
    
    // Handle different timestamp formats
    let date = 'Unknown date';
    if (s.timestamp) {
      try {
        if (s.timestamp.toDate) {
          date = s.timestamp.toDate().toLocaleDateString('en-IN', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
        } else if (s.timestamp instanceof Date) {
          date = s.timestamp.toLocaleDateString('en-IN', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
        } else if (typeof s.timestamp === 'string') {
          date = new Date(s.timestamp).toLocaleDateString('en-IN', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }
    
    return `
${i + 1}. ${source} - ${date}
Summary: ${s.summary_text || s.title || 'No summary'}
Key topics: ${s.key_topics?.join(', ') || 'N/A'}
Mood: ${s.mood_emoji || 'N/A'} (${s.mood_percentage || 'N/A'}%)
Stress: ${s.stress_level || 'N/A'}/100
Energy: ${s.energy_level || 'N/A'}/100
${s.action_items?.length ? `Action items: ${s.action_items.join(', ')}` : ''}
    `.trim();
  }).join('\n\n---\n\n');
  
  const prompt = `
You are a mental wellness AI assistant analyzing a week of mental health activity summaries.

WEEK PERIOD: ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}
NUMBER OF ENTRIES: ${summaries.length}

SUMMARIES:
${summariesText}

Create a comprehensive weekly archive that compresses these summaries while preserving important mental health context.

Return a JSON object with these exact fields:

{
  "narrative_summary": "2-3 paragraph narrative describing the user's week - emotional journey, key events, progress or setbacks",
  "dominant_themes": ["theme1", "theme2", "theme3"],
  "emotional_trajectory": "One sentence describing mood changes across the week",
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
  "progress_notes": "What progress or challenges occurred this week",
  "risk_flags": { "any_critical": true/false, "isolation_mentioned": true/false, "self_harm_mentioned": true/false },
  "protective_factors": ["factor1", "factor2"],
  "patterns_detected": ["pattern1 - e.g., 'Stress peaks on Mondays'", "pattern2"]
}

IMPORTANT:
- Focus on patterns, not just individual events
- Identify time-based patterns (day of week, time of day)
- Note correlations (e.g., "poor sleep → lower mood next day")
- Highlight coping strategies that worked or didn't work
- Flag any risk indicators (suicidal thoughts, self-harm, severe isolation)
- Identify protective factors (support systems, positive habits)
- Be concise but preserve important mental health context

Return ONLY valid JSON, no markdown formatting.
  `.trim();
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON from response
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
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
    
    archive.included_summaries = summaries.map(s => s.id);
    
    return archive;
    
  } catch (error) {
    console.error('Failed to generate archive with Gemini:', error);
    
    // Fallback: Create basic archive without AI
    return createFallbackArchive(summaries);
  }
}

/**
 * Create basic archive without AI (fallback)
 */
function createFallbackArchive(summaries) {
  const moods = summaries.map(s => s.mood_percentage).filter(m => m != null);
  const stressLevels = summaries.map(s => s.stress_level).filter(s => s != null);
  const energyLevels = summaries.map(s => s.energy_level).filter(e => e != null);
  
  return {
    narrative_summary: `This week had ${summaries.length} entries. Archive generated without AI compression.`,
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
    progress_notes: "Fallback archive created",
    risk_flags: { any_critical: false },
    protective_factors: [],
    patterns_detected: [],
    summary_count: {
      sessions: summaries.filter(s => s.source === 'ai_session').length,
      journals: summaries.filter(s => s.source === 'journal_entry').length,
      total: summaries.length
    },
    included_summaries: summaries.map(s => s.id)
  };
}

/**
 * Calculate ISO week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Manual trigger function for testing (HTTP callable)
 */
exports.triggerWeeklyArchive = functions
  .region('asia-south1')  // Match your Firestore database region
  .https.onRequest(async (req, res) => {
  console.log('Manual archive trigger received');
  
  try {
    // Calculate week boundaries
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - 1); // Yesterday
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6); // 7 days total
    weekStart.setHours(0, 0, 0, 0);
    
    const weekNumber = getWeekNumber(weekStart);
    const year = weekStart.getFullYear();
    
    console.log('=== Starting Weekly Archive Job ===');
    console.log(`Archiving week ${weekNumber} of ${year} (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})`);
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users to process`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      
      try {
        const result = await archiveUserWeek(uid, weekStart, weekEnd, weekNumber, year);
        
        if (result === 'skipped') {
          skippedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Archive failed for user ${uid}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('=== Weekly Archive Complete ===');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skippedCount} (no data)`);
    console.log(`❌ Errors: ${errorCount}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Weekly archive completed successfully',
      summary: {
        success: successCount,
        skipped: skippedCount,
        errors: errorCount,
        total: usersSnapshot.size
      }
    });
  } catch (error) {
    console.error('Manual archive failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});