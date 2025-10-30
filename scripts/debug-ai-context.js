/**
 * AI Context Debugger
 * Shows exactly what data is sent to the AI agent before each session
 * 
 * Usage: GET http://localhost:3001/debug-ai-context/:uid
 */

require('dotenv').config()
const express = require("express")
const admin = require("firebase-admin")
const cors = require("cors")
const { decryptField, decryptArray } = require("./encryption")

const serviceAccount = require("./admin-key.json")

// Constants
const DB_SERVER_URL = "http://localhost:3000"

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()
const app = express()
const port = 3002 // Different port to avoid conflicts with db-server.js

app.use(cors())
app.use(express.json())

/**
 * Debug endpoint - Shows AI context preparation
 * Query params:
 *   ?showEncryption=true - Show encryption status indicators
 *   ?archivesLimit=N - Number of weekly archives (default: 4, max: 12)
 * 
 * Strategy: Fetches last 5 AI sessions + last 5 journal entries
 */
app.get("/debug-ai-context/:uid", async (req, res) => {
  const { uid } = req.params
  const showEncryption = req.query.showEncryption === 'true'
  const archivesLimit = Math.min(parseInt(req.query.archivesLimit) || 4, 12)
  
  console.log('\n' + '='.repeat(80))
  console.log('🔍 AI CONTEXT DEBUGGER - Fetching data for UID:', uid)
  if (showEncryption) console.log('🔐 Encryption status display: ENABLED')
  console.log(`📊 Strategy: Last 5 sessions + Last 5 journals + ${archivesLimit} weekly archives`)
  console.log('='.repeat(80) + '\n')
  
  try {
    const aiContext = {
      timestamp: new Date().toISOString(),
      uid: uid,
      data_sources: [],
      formatted_for_ai: null
    }
    
    // ============================================================================
    // 1. USER PROFILE
    // ============================================================================
    console.log('📋 STEP 1: Fetching User Profile...')
    const profileDoc = await db.collection("users").doc(uid)
      .collection("user_profiling").doc("profile").get()
    
    if (profileDoc.exists) {
      const encryptedProfile = profileDoc.data()
      
      // Helper to safely decrypt with fallback
      const safeDecrypt = async (value, fieldName) => {
        if (!value) return null
        try {
          const decrypted = await decryptField(value, uid)
          const wasEncrypted = decrypted !== value
          if (showEncryption) {
            console.log(`   - ${fieldName}: ${wasEncrypted ? '🔐 ENCRYPTED' : '📝 PLAIN TEXT'}`)
          }
          return decrypted
        } catch (err) {
          console.log(`   - ${fieldName}: ❌ Error - ${err.message}`)
          return value // Return original on error
        }
      }
      
      const decryptedProfile = {
        name: await safeDecrypt(encryptedProfile.name, 'Name'),
        age: encryptedProfile.age ? parseInt(await safeDecrypt(encryptedProfile.age, 'Age'), 10) : null,
        gender: await safeDecrypt(encryptedProfile.gender, 'Gender'),
        email: encryptedProfile.email || null
      }
      
      console.log('✅ Profile Retrieved:')
      if (!showEncryption) {
        console.log('   - Name (encrypted):', encryptedProfile.name?.substring(0, 40) + '...')
        console.log('   - Name (decrypted):', decryptedProfile.name)
        console.log('   - Age:', decryptedProfile.age)
        console.log('   - Gender:', decryptedProfile.gender)
      } else {
        console.log('   Final values:')
        console.log(`     Name: ${decryptedProfile.name}`)
        console.log(`     Age: ${decryptedProfile.age}`)
        console.log(`     Gender: ${decryptedProfile.gender}`)
      }
      console.log('')
      
      aiContext.data_sources.push({
        source: 'user_profile',
        encrypted_sample: encryptedProfile.name?.substring(0, 40) + '...',
        decrypted_data: decryptedProfile
      })
    } else {
      console.log('⚠️  No profile found\n')
    }
    
    // ============================================================================
    // 2. RECENT SUMMARIES - Last 5 Sessions + Last 5 Journals
    // ============================================================================
    console.log('📊 STEP 2: Fetching Recent Summaries (Last 5 sessions + Last 5 journals)...')
    
    // ✅ OPTIMIZED: Uses Firestore composite index (source + timestamp)
    // Note: Old summaries without 'source' field are treated as AI sessions
    const sessionsSnapshot = await db.collection("users").doc(uid)
      .collection("summaries")
      .where("source", "==", "ai_session")
      .orderBy("timestamp", "desc")
      .limit(5)
      .get()
    
    const journalsSnapshot = await db.collection("users").doc(uid)
      .collection("summaries")
      .where("source", "==", "journal_entry")
      .orderBy("timestamp", "desc")
      .limit(5)
      .get()
    
    // Also fetch summaries without source field (legacy AI sessions)
    const legacySnapshot = await db.collection("users").doc(uid)
      .collection("summaries")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get()
    
    // Filter for docs without source field
    const legacyDocs = legacySnapshot.docs.filter(doc => !doc.data().source)
    
    const sessionsDocs = [...sessionsSnapshot.docs, ...legacyDocs].slice(0, 5)
    const journalsDocs = journalsSnapshot.docs
    
    // Process both types
    const processSummary = async (doc) => {
      const data = doc.data()
      const source = data.source || "ai_session"  // Default to ai_session for legacy summaries without source field
      
      const decrypted = {
        id: doc.id,
        source: source,
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
        timestamp_formatted: data.timestamp?.toDate()?.toLocaleString() || "Unknown date",
        summary_text_encrypted: data.summary_text?.substring(0, 40) + '...',
        summary_text_decrypted: data.summary_text ? await decryptField(data.summary_text, uid) : "",
        key_topics_encrypted: data.key_topics,
        key_topics_decrypted: await decryptArray(data.key_topics || [], uid),
        mood_emoji: data.mood_emoji || ""
      }
      
      // Add source-specific fields
      if (source === "ai_session") {
        decrypted.action_items = await decryptArray(data.action_items || [], uid)
        decrypted.coping_strategies = await decryptArray(data.coping_strategies || [], uid)
        decrypted.ongoing_concerns = await decryptArray(data.ongoing_concerns || [], uid)
      } else if (source === "journal_entry") {
        decrypted.title_encrypted = data.title?.substring(0, 40) + '...'
        decrypted.title_decrypted = data.title ? await decryptField(data.title, uid) : "Untitled"
        decrypted.emotional_themes = await decryptArray(data.emotional_themes || [], uid)
        decrypted.stressors = await decryptArray(data.stressors || [], uid)
      }
      
      return decrypted
    }
    
    const sessions = await Promise.all(sessionsDocs.map(processSummary))
    const journalSummaries = await Promise.all(journalsDocs.map(processSummary))
    
    // Combine and sort by timestamp (most recent first)
    const allSummaries = [...sessions, ...journalSummaries].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )
    
    console.log(`✅ Found ${sessions.length} AI sessions + ${journalSummaries.length} journal entries`)
    allSummaries.forEach((s, i) => {
      const icon = s.source === 'ai_session' ? '🎙️' : '📔'
      console.log(`   ${i + 1}. ${icon} [${s.source}] ${s.timestamp_formatted}`)
      console.log(`      Encrypted: ${s.summary_text_encrypted}`)
      console.log(`      Decrypted: ${s.summary_text_decrypted.substring(0, 100)}...`)
      console.log(`      Topics: ${s.key_topics_decrypted.join(', ')}`)
    })
    console.log('')
    
    aiContext.data_sources.push({
      source: 'recent_summaries',
      count: allSummaries.length,
      sessions_count: sessions.length,
      journals_count: journalSummaries.length,
      samples: allSummaries.map(s => ({
        source: s.source,
        timestamp: s.timestamp_formatted,
        encrypted_preview: s.summary_text_encrypted,
        decrypted_preview: s.summary_text_decrypted, // FULL TEXT, not truncated!
        topics: s.key_topics_decrypted,
        title: s.title_decrypted,
        mood_emoji: s.mood_emoji,
        action_items: s.action_items
      }))
    })
    
    // ============================================================================
    // 3. WEEKLY ARCHIVES (Last N weeks)
    // ============================================================================
    console.log(`📚 STEP 3: Fetching Weekly Archives (Last ${archivesLimit})...`)
    const archivesSnapshot = await db.collection("users").doc(uid)
      .collection("context_archives")
      .orderBy("week_start", "desc")
      .limit(archivesLimit)
      .get()
    
    const archives = await Promise.all(archivesSnapshot.docs.map(async (doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        week: `Week ${data.week_number}, ${data.year}`,
        narrative_encrypted: data.narrative_summary?.substring(0, 40) + '...',
        narrative_decrypted: data.narrative_summary ? await decryptField(data.narrative_summary, uid) : "",
        themes_encrypted: data.dominant_themes,
        themes_decrypted: await decryptArray(data.dominant_themes || [], uid),
        mood_avg: data.mood_avg,
        stress_avg: data.stress_avg
      }
    }))
    
    console.log(`✅ Found ${archives.length} weekly archives`)
    archives.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.week}`)
      console.log(`      Encrypted: ${a.narrative_encrypted}`)
      console.log(`      Decrypted: ${a.narrative_decrypted.substring(0, 100)}...`)
      console.log(`      Themes: ${a.themes_decrypted.join(', ')}`)
      console.log(`      Mood: ${a.mood_avg}/100, Stress: ${a.stress_avg}/100`)
    })
    console.log('')
    
    aiContext.data_sources.push({
      source: 'weekly_archives',
      count: archives.length,
      samples: archives.map(a => ({
        week: a.week,
        encrypted_preview: a.narrative_encrypted,
        decrypted_preview: a.narrative_decrypted.substring(0, 100),
        themes: a.themes_decrypted,
        metrics: { mood: a.mood_avg, stress: a.stress_avg }
      }))
    })
    
    // ============================================================================
    // 4. RECENT JOURNAL ENTRIES (Last 10)  
    // ============================================================================
    console.log('📝 STEP 4: Fetching Recent Journal Entries (Last 10) via db-server API...')
    
    // Use db-server.js API which handles encryption properly
    let journals = []
    try {
      const http = require('http')
      
      const apiData = await new Promise((resolve, reject) => {
        const postData = JSON.stringify({ uid })
        
        const options = {
          hostname: 'localhost',
          port: 3000,
          path: '/get-user-context',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
        
        const req = http.request(options, (res) => {
          let data = ''
          res.on('data', chunk => data += chunk)
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${e.message}`))
            }
          })
        })
        
        req.on('error', reject)
        req.write(postData)
        req.end()
      })
      
      const journalEntries = apiData.journal_entries || []
      
      journals = journalEntries.map(entry => ({
        id: entry.id,
        date: entry.createdAt || 'Unknown date',
        title_decrypted: entry.title || 'Untitled',
        content_preview: typeof entry.content === 'string' 
          ? entry.content.substring(0, 150)
          : (Array.isArray(entry.content) 
              ? entry.content.map(block => block.children?.map(c => c.text).join(' ') || '').join(' ').substring(0, 150)
              : ''),
        mood: entry.mood || 'not specified'
      }))
      
      console.log(`✅ Found ${journals.length} journal entries (decrypted via API)`)
      journals.forEach((j, i) => {
        console.log(`   ${i + 1}. ${j.date} - Mood: ${j.mood}`)
        console.log(`      Title: ${j.title_decrypted}`)
        console.log(`      Content: ${j.content_preview}...`)
      })
      console.log('')
      
    } catch (apiError) {
      console.log(`⚠️  API call failed, falling back to direct Firestore access`)
      console.log(`   Error: ${apiError.message}`)
      
      // Fallback: direct Firestore (will show encrypted if cross-encryption issue)
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      
      const journalSnapshot = await db.collection("users").doc(uid)
        .collection("journalEntries")
        .where("createdAt", ">=", thirtyDaysAgo)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get()
      
      journals = journalSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          date: data.createdAt?.toDate()?.toLocaleDateString() || null,
          title_decrypted: data.title || '[Encrypted - API call failed]',
          content_preview: '[Cannot decrypt - use API endpoint]',
          mood: data.mood || 'not specified'
        }
      })
      
      console.log(`⚠️  Found ${journals.length} entries but cannot decrypt without API`)
    }
    
    aiContext.data_sources.push({
      source: 'journal_entries',
      count: journals.length,
      samples: journals.map(j => ({
        date: j.date,
        title_encrypted: j.title_encrypted,
        title_decrypted: j.title_decrypted,
        content_preview: j.content_preview,
        mood: j.mood
      }))
    })
    
    // ============================================================================
    // 5. FORMAT FOR AI (EXACTLY like server.py does)
    // ============================================================================
    console.log('🤖 STEP 5: Formatting Context for AI Agent (Exact Match to server.py)...\n')
    
    const profileData = aiContext.data_sources.find(s => s.source === 'user_profile')?.decrypted_data
    const summariesData = aiContext.data_sources.find(s => s.source === 'recent_summaries')?.samples || []
    const archivesData = aiContext.data_sources.find(s => s.source === 'weekly_archives')?.samples || []
    
    const userName = profileData?.name || 'there'
    
    // Helper function to format dates like server.py (with "X days ago")
    const formatDate = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      let daysAgo = 'recent'
      if (daysDiff === 0) daysAgo = 'Today'
      else if (daysDiff === 1) daysAgo = 'Yesterday'
      else daysAgo = `${daysDiff} days ago`
      
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
                      ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      
      return { dateStr, daysAgo }
    }
    
    // Build recent activity section (MATCH server.py EXACTLY - lines 356-423)
    let recentActivity = ''
    if (summariesData.length > 0) {
      recentActivity = "\n\n--- RECENT ACTIVITY (Last 5 Summaries) ---\n"
      recentActivity += "Full details of all interactions:\n\n"
      
      summariesData.forEach(s => {
        const { dateStr, daysAgo } = formatDate(s.timestamp)
        const icon = s.source === 'ai_session' ? '🎙️' : '📔'
        const sourceLabel = s.source === 'ai_session' ? 'AI Session' : 'Journal Entry'
        
        recentActivity += `${icon} ${dateStr} (${daysAgo}) - ${sourceLabel}\n`
        
        // Source-specific details (journal entries only)
        if (s.source === 'journal_entry') {
          const title = s.title || 'Untitled'
          const mood = s.mood_emoji || ''
          if (title && title !== 'Untitled') {
            recentActivity += `Title: "${title}"\n`
          }
          if (mood) {
            recentActivity += `Mood: ${mood}\n`
          }
        }
        
        // Summary text (server.py uses summary_text field)
        const summaryText = s.summary_text || s.decrypted_preview || ''
        if (summaryText) {
          recentActivity += `${summaryText}\n`
        }
        
        // Key topics (server.py uses key_topics, fallback to topics)
        const keyTopics = s.key_topics || s.topics || []
        if (keyTopics && keyTopics.length > 0) {
          recentActivity += `Key topics: ${keyTopics.join(', ')}\n`
        }
        
        // Add source-specific context (AI sessions only - action items)
        if (s.source === 'ai_session') {
          const actionItems = s.action_items || []
          if (actionItems && actionItems.length > 0) {
            recentActivity += `Action items: ${actionItems.join(', ')}\n`
          }
        }
        
        recentActivity += '\n'
      })
      
      recentActivity += '------------------------------------------------\n'
      
      // Add summary statistics
      const sessionCount = summariesData.filter(s => s.source === 'ai_session').length
      const journalCount = summariesData.filter(s => s.source === 'journal_entry').length
      recentActivity += `\nRecent activity summary: ${sessionCount} AI sessions, ${journalCount} journal entries\n`
    }
    
    // Build weekly archives section (MATCH server.py lines 426-502)
    let weeklyArchives = ''
    if (archivesData.length > 0) {
      weeklyArchives = "\n\n--- WEEKLY ARCHIVES (Historical Context) ---\n"
      weeklyArchives += "Compressed summaries of previous weeks:\n\n"
      
      archivesData.forEach(a => {
        // Format date range (match server.py format)
        const weekNum = a.week_number || '?'
        const year = a.year || '?'
        let dateRange = `Week ${weekNum}, ${year}`
        
        try {
          if (a.week_start && a.week_end) {
            const startDate = new Date(a.week_start)
            const endDate = new Date(a.week_end)
            const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            dateRange = `${startStr} - ${endStr}`
          }
        } catch (e) {
          // Keep default format if date parsing fails
        }
        
        weeklyArchives += `📅 ${dateRange}\n`
        
        // Activity count
        const summaryCount = a.summary_count || {}
        const sessions = summaryCount.sessions || 0
        const journals = summaryCount.journals || 0
        weeklyArchives += `Activity: ${sessions} sessions, ${journals} journals\n\n`
        
        // Narrative summary
        const narrative = a.narrative_summary || a.decrypted_preview || ''
        if (narrative) {
          weeklyArchives += `${narrative}\n\n`
        }
        
        // Key information
        const themes = a.dominant_themes || a.themes || []
        if (themes && themes.length > 0) {
          weeklyArchives += `Main themes: ${themes.join(', ')}\n`
        }
        
        const trajectory = a.emotional_trajectory || ''
        if (trajectory) {
          weeklyArchives += `Emotional journey: ${trajectory}\n`
        }
        
        // Metrics
        const moodAvg = a.mood_avg
        const stressAvg = a.stress_avg
        if (moodAvg !== null && moodAvg !== undefined || stressAvg !== null && stressAvg !== undefined) {
          const metrics = []
          if (moodAvg !== null && moodAvg !== undefined) {
            metrics.push(`Mood: ${moodAvg}/100`)
          }
          if (stressAvg !== null && stressAvg !== undefined) {
            metrics.push(`Stress: ${stressAvg}/100`)
          }
          weeklyArchives += `Metrics: ${metrics.join(', ')}\n`
        }
        
        // Significant events (limit to top 3)
        const events = a.significant_events || []
        if (events && events.length > 0) {
          weeklyArchives += `Key events:\n`
          events.slice(0, 3).forEach(event => {
            weeklyArchives += `  • ${event}\n`
          })
        }
        
        // Patterns detected (limit to top 2)
        const patterns = a.patterns_detected || []
        if (patterns && patterns.length > 0) {
          weeklyArchives += `Patterns:\n`
          patterns.slice(0, 2).forEach(pattern => {
            weeklyArchives += `  • ${pattern}\n`
          })
        }
        
        // Coping strategies (limit to top 3)
        const strategies = a.coping_strategies || []
        if (strategies && strategies.length > 0) {
          weeklyArchives += `Coping strategies used: ${strategies.slice(0, 3).join(', ')}\n`
        }
        
        weeklyArchives += '\n' + '-'.repeat(50) + '\n\n'
      })
    }
    
    // EXACT AI PROMPT FORMAT (matches server.py lines 720-778 EXACTLY)
    // Read the full system instruction from file (just like server.py does at line 141)
    const fs = require('fs')
    const path = require('path')
    const systemInstructionPath = path.join(__dirname, '..', 'system_instruction.txt')
    let systemInstruction = ''
    try {
      systemInstruction = fs.readFileSync(systemInstructionPath, 'utf-8')
    } catch (err) {
      console.error('⚠️ Warning: Could not read system_instruction.txt:', err.message)
      systemInstruction = 'You are a compassionate mental health support AI for youth...'
    }
    
    const greeting = `Start the conversation by warmly welcoming the user back. Greet them by name: '${userName}'.`
    
    // Build exact AI prompt matching server.py line-by-line (lines 722-778)
    let exactAIPrompt = `${systemInstruction}\n\n`
    exactAIPrompt += `--- Conversation Context ---\n`
    exactAIPrompt += `${greeting}\n`
    
    // Add recent activity if available (server.py lines 729-739)
    if (recentActivity) {
      exactAIPrompt += recentActivity
      exactAIPrompt += (
        "\nUse the recent activity timeline above to:\n" +
        "- Reference both journal entries and AI sessions naturally\n" +
        "- Notice patterns across different types of interactions\n" +
        "- Follow up on action items from previous AI sessions\n" +
        "- Acknowledge journal entries when relevant (e.g., 'I see you wrote about...')\n" +
        "- Celebrate progress shown in journals or sessions\n" +
        "- Connect themes between written reflections and conversations\n" +
        "- Avoid repeating questions they already explored in journals\n\n"
      )
    }
    
    // Add weekly archives if available (server.py lines 742-752)
    if (weeklyArchives) {
      exactAIPrompt += weeklyArchives
      exactAIPrompt += (
        "\nUse the weekly archives to:\n" +
        "- Recognize long-term patterns and progress\n" +
        "- Reference past breakthroughs or challenges when relevant\n" +
        "- Celebrate growth over weeks (e.g., 'You've come a long way since...')\n" +
        "- Connect current struggles to past experiences\n" +
        "- Notice recurring themes or triggers\n\n"
      )
    }
    
    // NOTE: User profile section omitted for now (would be added here if available)
    // Server.py adds user_profile_section at lines 755-778 if profile exists
    
    // Add default follow-up question (server.py lines 782-787)
    // (server.py checks for generated_questions first, but we'll use the default for now)
    exactAIPrompt += "After the greeting, ask a general open-ended question like 'What's been on your mind lately?' or 'How have things been for you?'.\n"
    
    // Add closing line (server.py line 789)
    exactAIPrompt += "--------------------------"
    
    exactAIPrompt = exactAIPrompt.trim()
    
    // Also keep simplified format for comparison
    const aiFormattedContext = `
=== USER PROFILE ===
Name: ${profileData?.name || 'Unknown'}
Age: ${profileData?.age || 'Unknown'}
Gender: ${profileData?.gender || 'Unknown'}
${recentActivity}${weeklyArchives}
`.trim()
    
    console.log('📄 SIMPLIFIED FORMAT (Debug View):')
    console.log('─'.repeat(80))
    console.log(aiFormattedContext)
    console.log('─'.repeat(80))
    console.log('')
    
    console.log('🤖 EXACT AI PROMPT (What server.py sends):')
    console.log('═'.repeat(80))
    console.log(exactAIPrompt)
    console.log('═'.repeat(80))
    console.log('')
    
    aiContext.formatted_for_ai = aiFormattedContext
    aiContext.exact_ai_prompt = exactAIPrompt
    
    // ============================================================================
    // 6. SUMMARY
    // ============================================================================
    console.log('📊 SUMMARY:')
    console.log('─'.repeat(80))
    console.log(`Total Data Sources: ${aiContext.data_sources.length}`)
    console.log(`- User Profile: ${profileData ? '✅ Retrieved' : '❌ Missing'}`)
    console.log(`- Recent Summaries: ${summariesData.length} items (${summariesData.filter(s => s.source === 'ai_session').length} sessions, ${summariesData.filter(s => s.source === 'journal_entry').length} journals)`)
    console.log(`- Weekly Archives: ${archivesData.length} items`)
    console.log('')
    console.log(`Total Characters Sent to AI: ${aiFormattedContext.length}`)
    console.log(`Encryption Working: ${summariesData.length > 0 && summariesData[0].encrypted_preview !== summariesData[0].decrypted_preview ? '✅ YES' : '⚠️  CHECK'}`)
    console.log('─'.repeat(80))
    console.log('\n' + '='.repeat(80))
    console.log('✅ AI CONTEXT DEBUG COMPLETE')
    console.log('='.repeat(80) + '\n')
    
    // Return JSON response
    res.status(200).json({
      success: true,
      timestamp: aiContext.timestamp,
      uid: aiContext.uid,
      summary: {
        total_sources: aiContext.data_sources.length,
        profile_found: !!profileData,
        recent_summaries: summariesData.length,
        ai_sessions: summariesData.filter(s => s.source === 'ai_session').length,
        journal_entries: summariesData.filter(s => s.source === 'journal_entry').length,
        weekly_archives: archivesData.length,
        total_chars: aiFormattedContext.length,
        exact_ai_prompt_chars: exactAIPrompt.length,
        encryption_working: summariesData.length > 0 && summariesData[0].encrypted_preview !== summariesData[0].decrypted_preview
      },
      data_sources: aiContext.data_sources,
      formatted_context: aiFormattedContext,
      exact_ai_prompt: exactAIPrompt
    })
    
  } catch (error) {
    console.error('❌ ERROR:', error)
    console.error('Stack trace:', error.stack)
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: 'Check if db-server.js is running on port 3000 for journal decryption'
    })
  }
})

app.get("/", (req, res) => {
  res.send(`
    <h1>🔍 AI Context Debugger</h1>
    <p><strong>Usage:</strong> GET /debug-ai-context/:uid</p>
    
    <h3>Context Strategy:</h3>
    <ul>
      <li><strong>Last 5 AI Sessions</strong> - Most recent conversation summaries</li>
      <li><strong>Last 5 Journal Entries</strong> - Most recent journal summaries</li>
      <li><strong>Weekly Archives</strong> - Compressed history (older data)</li>
      <li><strong>User Profile</strong> - Long-term understanding</li>
    </ul>
    
    <h3>Examples:</h3>
    <ul>
      <li><a href="/debug-ai-context/YOUR_USER_ID">/debug-ai-context/YOUR_USER_ID</a> - Basic usage (last 5+5)</li>
      <li><a href="/debug-ai-context/YOUR_USER_ID?showEncryption=true">/debug-ai-context/YOUR_USER_ID?showEncryption=true</a> - Show encryption status</li>
      <li><a href="/debug-ai-context/YOUR_USER_ID?archivesLimit=8">/debug-ai-context/YOUR_USER_ID?archivesLimit=8</a> - Fetch 8 weeks of archives</li>
    </ul>
    
    <h3>Query Parameters:</h3>
    <ul>
      <li><strong>showEncryption</strong> - Show encryption status (true/false)</li>
      <li><strong>archivesLimit</strong> - Number of weekly archives (default: 4, max: 12)</li>
    </ul>
    
    <h3>Features:</h3>
    <ul>
      <li>✅ Handles both encrypted and unencrypted (legacy) data</li>
      <li>✅ Calls db-server.js API for journal decryption</li>
      <li>✅ Shows full summary text (no truncation)</li>
      <li>✅ Displays proper source labels and timestamps</li>
      <li>✅ <strong>Last 5 sessions + Last 5 journals</strong> (or fewer if not available)</li>
      <li>✅ <strong>Sorted by timestamp</strong> (most recent first)</li>
    </ul>
    
    <h3>Requirements:</h3>
    <ul>
      <li>🔴 db-server.js must be running on port 3000</li>
      <li>🔴 Firebase credentials configured</li>
      <li>🔴 ENCRYPTION_SECRET in .env file</li>
    </ul>
    
    <p><a href="/debug-ai-context.html">📊 Open Visual Interface</a></p>
  `)
})

app.listen(port, () => {
  console.log(`\n🔍 AI Context Debugger running at http://localhost:${port}`)
  console.log(`   Usage: http://localhost:${port}/debug-ai-context/YOUR_USER_ID\n`)
})