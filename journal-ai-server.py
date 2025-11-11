"""
HTTP Server for Journal AI Features
Provides REST API endpoints for journal-related AI operations
Run alongside the WebSocket server (server.py)
"""

import asyncio
import json
import os
import requests
import traceback
from datetime import datetime, timezone
from aiohttp import web
import logging

# Import from main server
from google import genai
from google.genai import types
from google.oauth2 import service_account

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
PROJECT_ID = "gen-ai-hack2skill-470416"
LOCATION = "us-central1"
MODEL = "gemini-2.0-flash-exp"  # Using text model for journal reflection

# Authorization
KEY_PATH = os.path.join(os.path.dirname(__file__), "service-account.json")
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
creds = service_account.Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = KEY_PATH
client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION,
    credentials=creds,
)

# Node.js backend URL
DB_SERVER_URL = "http://localhost:3000"


def extract_json(text: str) -> dict:
    """Best-effort extraction of a JSON object from model output."""
    if not text:
        return {"raw": ""}
    try:
        return json.loads(text)
    except Exception:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            pass
    return {"raw": text.strip()}


async def fetch_user_context(uid: str) -> dict:
    """Fetch user data and recent journal entries from Node.js backend"""
    try:
        # Fetch user profile and latest summary
        user_response = requests.get(f"{DB_SERVER_URL}/user/{uid}")
        if user_response.status_code != 200:
            logger.error(f"Failed to fetch user data: {user_response.status_code}")
            return {}
        
        user_data = user_response.json()
        
        # Fetch recent journal entries
        journal_response = requests.post(
            f"{DB_SERVER_URL}/get-user-context",
            json={"uid": uid}
        )
        
        if journal_response.status_code != 200:
            logger.error(f"Failed to fetch journal context: {journal_response.status_code}")
            return {"user": user_data, "journal_entries": []}
        
        journal_data = journal_response.json()
        
        return {
            "user": user_data,
            "journal_entries": journal_data.get("journal_entries", []),
            "latest_summary": user_data.get("latestSummary", {})
        }
        
    except Exception as e:
        logger.error(f"Error fetching user context: {e}")
        return {}


def format_journal_entries(entries: list) -> str:
    """Format journal entries for AI context"""
    if not entries:
        return "No previous journal entries."
    
    formatted = []
    for entry in entries[:5]:  # Last 5 entries
        date = entry.get("createdAt", "Unknown date")
        mood = entry.get("mood", "Not specified")
        title = entry.get("title", "Untitled")
        content = entry.get("content", "")
        
        # Truncate long content
        if len(content) > 200:
            content = content[:200] + "..."
        
        formatted.append(f"Date: {date}\nMood: {mood}\nTitle: {title}\nContent: {content}")
    
    return "\n\n---\n\n".join(formatted)


async def generate_reflection_questions(uid: str, current_entry: dict) -> dict:
    """Generate AI-powered reflection questions based on journal entry and user history"""
    
    # Fetch user context
    context = await fetch_user_context(uid)
    
    user_name = context.get("user", {}).get("name", "there")
    recent_entries = format_journal_entries(context.get("journal_entries", []))
    latest_summary = context.get("latest_summary", {}).get("summary_data", {})
    
    # Extract current entry details
    current_content = current_entry.get("content", "")
    current_mood = current_entry.get("mood", "Not specified")
    current_title = current_entry.get("title", "Untitled")
    
    # Build prompt for Gemini
    prompt = f"""You are CureZ, a supportive AI mental wellness mentor. A user named {user_name} just wrote a journal entry.

CURRENT JOURNAL ENTRY:
Title: {current_title}
Mood: {current_mood}
Content: {current_content}

RECENT JOURNAL HISTORY:
{recent_entries}

LATEST CONVERSATION CONTEXT (from voice chat):
{json.dumps(latest_summary, indent=2) if latest_summary else "No recent conversation"}

YOUR TASK:
Generate 2-3 deep, thoughtful reflection questions that:
1. Help the user explore their feelings and thoughts more deeply
2. Connect the current entry to patterns or themes from their history
3. Are gentle, non-judgmental, empowering, and encouraging
4. Promote self-discovery, emotional growth, and wellness
5. Feel natural and conversational, not clinical or formulaic

IMPORTANT:
- Questions should be specific to their situation, not generic
- Reference their actual experiences when relevant
- Be warm and supportive in tone
- Avoid yes/no questions - make them open-ended
- Keep questions concise and clear

Return your response as a JSON object with this structure:
{{
  "questions": [
    "Question 1 here",
    "Question 2 here",
    "Question 3 here"
  ],
  "insight": "A brief (1-2 sentences) observation about their entry or pattern you noticed"
}}"""

    try:
        logger.info(f"Generating reflection questions for user {uid}")
        
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=0.8,  # More creative for personalized questions
                top_p=0.95,
            )
        )
        
        # Extract text from response
        text = ""
        if response and getattr(response, "candidates", None):
            for c in response.candidates:
                if getattr(c, "content", None) and getattr(c.content, "parts", None):
                    for p in c.content.parts:
                        if getattr(p, "text", None):
                            text += p.text
        
        logger.info(f"Raw AI response: {text}")
        
        # Parse JSON response
        result = extract_json(text)
        
        # Validate response has required fields
        if "questions" not in result:
            logger.warning("AI response missing 'questions' field, using fallback")
            result = {
                "questions": [
                    "What feelings came up for you as you wrote this entry?",
                    "How does this experience connect to other things happening in your life?",
                    "What would it look like if this situation improved? What's one small step toward that?"
                ],
                "insight": "I'm here to support your reflection journey."
            }
        
        return {
            "success": True,
            "questions": result.get("questions", []),
            "insight": result.get("insight", ""),
            "context_used": {
                "recent_entries_count": len(context.get("journal_entries", [])),
                "has_chat_history": bool(latest_summary)
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating reflection questions: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Return fallback questions
        return {
            "success": False,
            "error": str(e),
            "questions": [
                "What feelings came up for you as you wrote this?",
                "What would you like to explore more deeply about this experience?",
                "How can you be kind to yourself as you process these thoughts?"
            ],
            "insight": "I'm here to support your reflection journey."
        }


# HTTP Endpoint Handlers
async def health_check(request):
    """Health check endpoint"""
    return web.json_response({"status": "ok", "service": "journal-ai-server"})


async def handle_reflection_questions(request):
    """
    POST /generate-reflection-questions
    Body: {
        "uid": "user_id",
        "entry": {
            "title": "...",
            "content": "...",
            "mood": "..."
        }
    }
    """
    try:
        data = await request.json()
        uid = data.get("uid")
        entry = data.get("entry", {})
        
        if not uid:
            return web.json_response(
                {"error": "Missing uid parameter"},
                status=400
            )
        
        if not entry.get("content"):
            return web.json_response(
                {"error": "Missing entry content"},
                status=400
            )
        
        # Generate reflection questions
        result = await generate_reflection_questions(uid, entry)
        
        return web.json_response(result)
        
    except Exception as e:
        logger.error(f"Error in handle_reflection_questions: {e}")
        return web.json_response(
            {"error": str(e), "success": False},
            status=500
        )


async def handle_journal_chat(request):
    """
    POST /journal-chat
    Handle chat messages about journal entries
    Provides context-aware, empathetic responses with image analysis
    Body: {
        "uid": "user_id",
        "message": "user's message",
        "history": [{"role": "user|assistant", "content": "..."}]
    }
    """
    try:
        data = await request.json()
        uid = data.get('uid')
        message = data.get('message')
        conversation_history = data.get('history', [])
        
        if not uid or not message:
            return web.json_response(
                {'error': 'uid and message are required'},
                status=400
            )
        
        logger.info(f"Journal chat request from user: {uid}")
        
        # 1. Fetch user context from db-server
        try:
            user_response = requests.get(f'{DB_SERVER_URL}/user/{uid}', timeout=5)
            user_data = user_response.json() if user_response.ok else {}
        except Exception as e:
            logger.warning(f"Failed to fetch user data: {e}")
            user_data = {}
        
        # 2. Fetch recent journal entries with images
        try:
            context_response = requests.post(
                f'{DB_SERVER_URL}/get-user-context',
                json={'uid': uid},
                timeout=10
            )
            context_data = context_response.json() if context_response.ok else {}
            entries = context_data.get('journal_entries', [])
        except Exception as e:
            logger.warning(f"Failed to fetch journal context: {e}")
            entries = []
        
        # 3. Build system instruction for empathetic chat
        user_name = user_data.get('name', 'there')
        latest_summary = user_data.get('latestSummary', {}).get('summary_data', {})
        
        # Check if this is the first message (pattern matching logic)
        is_first_message = len(conversation_history) == 0
        
        system_instruction = f"""You are CureZ, a warm, empathetic AI companion specializing in mental wellness support for youth.

Your role in this journal chat:
- Help {user_name} explore and understand their feelings
- Reference their journal entries naturally in conversation
- Be gentle, non-judgmental, and supportive
- Ask thoughtful follow-up questions when appropriate
- Validate their emotions and experiences
- Offer gentle insights and perspective
- Encourage self-reflection and growth
- If you see images in their entries, acknowledge and discuss what you observe

Guidelines:
- Use a warm, conversational tone (like a caring friend)
- Keep responses concise (2-4 sentences usually, longer if explaining something important)
- Reference specific journal entries when relevant ("I remember you wrote about...")
- If they mention an image, describe what you see and how it relates to their feelings
- Never diagnose or give medical advice
- Focus on emotional support and understanding
- Encourage journaling as a healthy practice
- Ask open-ended questions to deepen conversation

Recent conversation context from voice chat:
{json.dumps(latest_summary, indent=2) if latest_summary else 'No recent voice conversations'}

Recent journal entries (most recent first):"""
        
        # Add journal entries to context with image info
        entry_themes = []  # Track themes for pattern matching
        if entries:
            system_instruction += "\n"
            for i, entry in enumerate(entries[:5], 1):
                entry_date = entry.get('createdAt', 'Unknown date')
                entry_mood = entry.get('mood', 'not specified')
                entry_title = entry.get('title', 'Untitled')
                entry_content = entry.get('content', '')
                entry_images = entry.get('images', [])
                
                # Track themes for pattern matching
                entry_themes.append({
                    'title': entry_title,
                    'mood': entry_mood,
                    'date': entry_date
                })
                
                # Convert content to plain text if it's an array (PortableText)
                if isinstance(entry_content, list):
                    content_text = ' '.join([
                        ' '.join([child.get('text', '') for child in block.get('children', [])])
                        for block in entry_content if isinstance(block, dict)
                    ])
                else:
                    content_text = str(entry_content)
                
                # Truncate long content
                content_preview = content_text[:300] + "..." if len(content_text) > 300 else content_text
                
                system_instruction += f"\n\nEntry {i} - {entry_date}"
                if entry_title and entry_title != 'Untitled':
                    system_instruction += f"\nTitle: {entry_title}"
                system_instruction += f"\nMood: {entry_mood}"
                system_instruction += f"\nContent: {content_preview}"
                
                if entry_images and len(entry_images) > 0:
                    system_instruction += f"\n📷 Contains {len(entry_images)} image(s)"
                    for img_idx, img in enumerate(entry_images[:2], 1):  # First 2 images
                        system_instruction += f"\n  - Image {img_idx}: {img.get('alt', 'User uploaded image')}"
        else:
            system_instruction += "\n\n(User hasn't created any journal entries yet. Encourage them to start journaling!)"
        
        # Add pattern matching instructions for first message
        if is_first_message and entries:
            mood_list = [e['mood'] for e in entry_themes if e['mood'] != 'not specified']
            if mood_list:
                system_instruction += f"\n\n🔍 PATTERN ANALYSIS (First Message):"
                system_instruction += f"\n- Recent mood patterns: {', '.join(mood_list[:5])}"
                system_instruction += f"\n- Total entries analyzed: {len(entries)}"
                system_instruction += "\n\nSince this is the user's first message, analyze their question/statement against their journal history:"
                system_instruction += "\n1. Look for recurring themes or topics in their past entries"
                system_instruction += "\n2. Notice if they're asking about something they've written about before"
                system_instruction += "\n3. Reference similar past entries if relevant"
                system_instruction += "\n4. Note any patterns in their emotional journey"
                system_instruction += "\n5. Make your response feel personalized based on their history"
        
        system_instruction += "\n\nRemember: Be warm, supportive, and reference their actual experiences from their journal."
        
        # 4. Prepare conversation for Gemini
        formatted_history = []
        
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            role = "user" if msg.get('role') == 'user' else "model"
            content = msg.get('content', '')
            formatted_history.append({
                "role": role,
                "parts": [{"text": content}]
            })
        
        # 5. Call Gemini with conversation context
        try:
            response = await client.aio.models.generate_content(
                model=MODEL,
                contents=[
                    {"text": system_instruction},
                    *formatted_history,
                    {"text": message}
                ],
                config=types.GenerateContentConfig(
                    temperature=0.85,  # Warm and empathetic
                    top_p=0.95,
                    max_output_tokens=600,
                )
            )
            
            # Extract response text
            ai_response = ""
            if response and getattr(response, "candidates", None):
                for c in response.candidates:
                    if getattr(c, "content", None) and getattr(c.content, "parts", None):
                        for p in c.content.parts:
                            if getattr(p, "text", None):
                                ai_response += p.text
            
            if not ai_response:
                ai_response = f"I'm here to support you, {user_name}. Tell me more about what's on your mind."
            
            logger.info(f"Generated chat response for user {uid}")
            
            return web.json_response({
                'success': True,
                'response': ai_response.strip(),
                'contextUsed': {
                    'entriesCount': len(entries),
                    'hasConversationHistory': bool(latest_summary),
                    'historyLength': len(conversation_history)
                }
            })
            
        except Exception as e:
            logger.error(f"Error generating chat response: {e}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Fallback response
            return web.json_response({
                'success': True,
                'response': f"I'm here to listen, {user_name}. Tell me more about what's on your mind with your journal entries.",
                'contextUsed': {
                    'entriesCount': len(entries),
                    'hasConversationHistory': False,
                    'historyLength': len(conversation_history)
                },
                'fallback': True
            })
    
    except Exception as e:
        logger.error(f"Error in journal chat endpoint: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return web.json_response(
            {'error': 'Failed to process chat message', 'success': False},
            status=500
        )


async def evaluate_journal_summary_value(entry_data: dict) -> dict:
    """
    Determine if journal entry warrants summary storage
    Returns confidence score and decision on whether to store
    Threshold: 0.65 (only store if >= 0.65)
    """
    try:
        title = entry_data.get('title', 'Untitled')
        mood_emoji = entry_data.get('mood', 'not specified')
        content_text = entry_data.get('content_text', '')
        
        evaluation_prompt = f"""Analyze this journal entry to determine its value for mental health tracking.

JOURNAL ENTRY:
Title: {title}
Mood: {mood_emoji}
Content: {content_text}

EVALUATION CRITERIA:
Rate how valuable this entry is for understanding the user's mental wellness journey.

Consider:
1. Emotional depth (stress, anxiety, depression, joy indicators)
2. Behavioral patterns (sleep, social interactions, coping strategies)
3. Significant life events affecting mental health
4. Progress or setbacks in wellness journey
5. Risk factors or protective factors
6. Self-reflection and emotional awareness

VALUE CATEGORIES:
- CRISIS (1.0): Self-harm, suicidal ideation, severe distress, urgent support needed
- SIGNIFICANT (0.80-0.95): Major emotional events, therapy breakthroughs, important realizations
- MODERATE (0.65-0.79): Meaningful mood check-ins, coping strategies used, progress noted
- ROUTINE (0.40-0.64): Daily activities with minimal emotional content
- IRRELEVANT (0.20-0.39): Pure routine logging, no mental health relevance

Return ONLY a valid JSON object:
{{
  "confidence": 0.0-1.0,
  "value_category": "crisis" | "significant" | "moderate" | "routine" | "irrelevant",
  "should_store_summary": boolean,
  "key_insights": ["insight1", "insight2"],
  "reasoning": "Brief explanation of rating"
}}

IMPORTANT: 
- should_store_summary = true if confidence >= 0.65
- should_store_summary = false if confidence < 0.65"""

        logger.info(f"Evaluating journal entry summary value")
        
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[evaluation_prompt],
            config=types.GenerateContentConfig(
                temperature=0.3,
                top_p=0.95,
                response_mime_type="application/json"
            )
        )
        
        # Extract text from response
        text = ""
        if response and getattr(response, "candidates", None):
            for c in response.candidates:
                if getattr(c, "content", None) and getattr(c.content, "parts", None):
                    for p in c.content.parts:
                        if getattr(p, "text", None):
                            text += p.text
        
        evaluation = extract_json(text) if text else {}
        
        # Ensure confidence is within bounds
        confidence = max(0.0, min(1.0, evaluation.get('confidence', 0.5)))
        should_store = confidence >= 0.65
        
        result = {
            'confidence': confidence,
            'value_category': evaluation.get('value_category', 'routine'),
            'should_store_summary': should_store,
            'key_insights': evaluation.get('key_insights', []),
            'reasoning': evaluation.get('reasoning', 'Unable to evaluate')
        }
        
        logger.info(f"Evaluation result: {result['value_category']} (confidence: {confidence:.2f}, store: {should_store})")
        
        return result
        
    except Exception as e:
        logger.error(f"Error evaluating journal summary value: {e}")
        # Default to storing if evaluation fails (fail-safe)
        return {
            'confidence': 0.70,
            'value_category': 'moderate',
            'should_store_summary': True,
            'key_insights': [],
            'reasoning': 'Evaluation failed, defaulting to store'
        }


async def generate_journal_summary(uid: str, entry_data: dict, evaluation: dict) -> dict:
    """
    Generate narrative summary for journal entry (only if has mental health value)
    Similar to AI session summaries but from journal content
    """
    try:
        title = entry_data.get('title', 'Untitled')
        mood_emoji = entry_data.get('mood', 'not specified')
        content_text = entry_data.get('content_text', '')
        key_insights = evaluation.get('key_insights', [])
        
        summary_prompt = f"""Generate a concise narrative summary of this journal entry for mental health tracking.

JOURNAL ENTRY:
Title: {title}
Mood: {mood_emoji}
Content: {content_text}

KEY INSIGHTS IDENTIFIED:
{', '.join(key_insights) if key_insights else 'General mental wellness update'}

INSTRUCTIONS:
Create a 3-4 sentence summary that captures:
1. Main emotional themes and mental state
2. Key events or stressors mentioned
3. Coping strategies or protective factors noted
4. Any goals, hopes, or concerns expressed

Write in third person ("User wrote about...", "They expressed...") for consistent AI context building.
Focus on mental health aspects, not routine details.
Be compassionate and non-judgmental in tone.

Return the summary as plain text (no JSON, no formatting)."""

        logger.info(f"Generating narrative summary for journal entry")
        
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[summary_prompt],
            config=types.GenerateContentConfig(
                temperature=0.7,  # Slightly creative for natural language
                top_p=0.95,
                max_output_tokens=300
            )
        )
        
        # Extract summary text
        summary_text = ""
        if response and getattr(response, "candidates", None):
            for c in response.candidates:
                if getattr(c, "content", None) and getattr(c.content, "parts", None):
                    for p in c.content.parts:
                        if getattr(p, "text", None):
                            summary_text += p.text
        
        if not summary_text:
            summary_text = f"User wrote about {title.lower() if title != 'Untitled' else 'their day'} with a {mood_emoji} mood."
        
        logger.info(f"✅ Summary generated: {len(summary_text)} characters")
        
        return {
            'summary_generated': True,
            'summary_text': summary_text.strip(),
            'confidence': evaluation['confidence'],
            'value_category': evaluation['value_category'],
            'key_insights': key_insights
        }
        
    except Exception as e:
        logger.error(f"Error generating journal summary: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Return minimal summary on error
        return {
            'summary_generated': True,
            'summary_text': f"User created a journal entry titled '{entry_data.get('title', 'Untitled')}' with mood {entry_data.get('mood', 'not specified')}.",
            'confidence': evaluation.get('confidence', 0.70),
            'value_category': evaluation.get('value_category', 'moderate'),
            'key_insights': []
        }


def calculate_journal_confidence(entry_data: dict) -> float:
    """
    Calculate dynamic confidence based on journal entry richness
    Range: 0.65 - 0.85 (never exceeds AI session confidence of 0.90)
    """
    base_confidence = 0.70  # Start here
    
    content_length = len(entry_data.get('content_text', ''))
    has_reflection = entry_data.get('reflection_qa') is not None
    emoji_provided = entry_data.get('mood') is not None
    has_title = entry_data.get('title') and entry_data.get('title') != 'Untitled'
    
    # Boost for long, detailed entry
    if content_length > 500:
        base_confidence += 0.05
    elif content_length > 300:
        base_confidence += 0.03
    
    # Boost for reflection Q&A answered
    if has_reflection:
        base_confidence += 0.05
    
    # Boost for explicit emotion keywords
    emotion_keywords = ['feel', 'felt', 'feeling', 'emotion', 'anxious', 'happy', 'sad', 'stressed', 'worried', 'excited', 'afraid', 'angry', 'frustrated', 'hopeful']
    content_lower = entry_data.get('content_text', '').lower()
    emotion_count = sum(1 for keyword in emotion_keywords if keyword in content_lower)
    
    if emotion_count >= 3:
        base_confidence += 0.03
    elif emotion_count >= 1:
        base_confidence += 0.02
    
    # Boost for title provided
    if has_title:
        base_confidence += 0.02
    
    # Cap at 0.85 (never higher than AI session)
    return min(base_confidence, 0.85)


async def extract_journal_metrics(uid: str, entry_data: dict) -> dict:
    """
    Extract wellness metrics from journal entry using Gemini
    Returns same format as AI session summaries for unified analytics
    """
    try:
        # Extract entry details
        entry_id = entry_data.get('id', 'unknown')
        title = entry_data.get('title', 'Untitled')
        mood_emoji = entry_data.get('mood', 'not specified')
        content_text = entry_data.get('content_text', '')
        reflection_qa = entry_data.get('reflection_qa', None)
        
        # Build comprehensive analysis prompt
        analysis_prompt = f"""You are analyzing a mental wellness journal entry to extract structured metrics.

JOURNAL ENTRY DETAILS:
Title: {title}
User's Mood Selection (emoji): {mood_emoji}
Entry Content:
{content_text}

Reflection Q&A Responses:
{reflection_qa if reflection_qa else "No reflection questions answered yet"}

YOUR TASK:
Extract wellness metrics from this journal entry. Analyze the text carefully for:
- Emotional state and mood indicators
- Energy level mentions ("tired", "energetic", "exhausted")
- Stress indicators ("overwhelmed", "stressed", "pressure")
- Anxiety mentions ("anxious", "worried", "nervous")
- Sleep quality and duration mentions
- Social connection references ("alone", "friends", "isolated", "connected")
- Physical activity mentions
- Cognitive function indicators ("focused", "can't concentrate", "clear thinking")

IMPORTANT SCORING GUIDELINES:
- mood_percentage: 0-100 (0=severe distress, 50=neutral, 100=thriving)
  Consider overall emotional tone, not just the emoji
- energy_level: 0-100 (0=exhausted, 100=highly energetic)
- stress_level: 0-100 (0=no stress, 100=extreme stress)
- anxiety_level: 0-100 (0=calm, 100=severe anxiety)
- emotional_score: 0-100 (emotional awareness and regulation)
- cognitive_score: 0-100 (focus, clarity, problem-solving ability)

If a metric is not mentioned or cannot be inferred, set it to null.

Return ONLY a valid JSON object with this structure:
{{
  "mood_percentage": number or null,
  "energy_level": number or null,
  "stress_level": number or null,
  "anxiety_level": number or null,
  "emotional_score": number or null,
  "cognitive_score": number or null,
  "sleep_quality": "Rested" | "Okay" | "Exhausted" | null,
  "sleep_duration_hours": number or null,
  "social_connection_level": "Isolated" | "Some Connection" | "Connected" | null,
  "physical_activity_minutes": number or null,
  "focus_level": "Focused" | "Distracted" | "Scattered" | null,
  "mood_stability": "stable" | "fluctuating" | "improving" | "declining" | null,
  "mood_calmness": "calm" | "anxious" | "agitated" | "relaxed" | null,
  "main_topics": ["topic1", "topic2"],
  "stressors": ["stressor1", "stressor2"],
  "protective_factors": ["strength1", "strength2"],
  "coping_strategies_discussed": ["strategy1"],
  "goals_or_hopes": ["goal1"],
  "positive_event": "brief description" or null,
  "sentiment": "positive" | "negative" | "mixed" | "neutral",
  "risk_flags": {{
    "mentions_self_harm": boolean,
    "mentions_harming_others": boolean,
    "mentions_abuse_or_unsafe": boolean,
    "urgent_support_recommended": boolean
  }}
}}"""

        logger.info(f"Extracting metrics from journal entry {entry_id} for user {uid}")
        
        # Call Gemini for analysis
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[analysis_prompt],
            config=types.GenerateContentConfig(
                temperature=0.3,  # Lower temperature for consistent metric extraction
                top_p=0.95,
                response_mime_type="application/json"
            )
        )
        
        # Extract text from response
        text = ""
        if response and getattr(response, "candidates", None):
            for c in response.candidates:
                if getattr(c, "content", None) and getattr(c.content, "parts", None):
                    for p in c.content.parts:
                        if getattr(p, "text", None):
                            text += p.text
        
        logger.info(f"Raw Gemini metrics response: {text}")
        
        # Parse JSON response
        metrics = extract_json(text) if text else {}
        
        # Validate metrics are within bounds
        for key in ['mood_percentage', 'energy_level', 'stress_level', 'anxiety_level', 'emotional_score', 'cognitive_score']:
            if key in metrics and metrics[key] is not None:
                # Ensure values are between 0-100
                metrics[key] = max(0, min(100, metrics[key]))
        
        # Calculate dynamic confidence
        confidence = calculate_journal_confidence(entry_data)
        
        # Add metadata
        metrics['source'] = 'journal_entry'
        metrics['confidence'] = confidence
        metrics['entry_id'] = entry_id
        metrics['analyzed_at'] = datetime.now(timezone.utc).isoformat()
        
        logger.info(f"✅ Metrics extracted with confidence: {confidence}")
        
        return {
            'success': True,
            'metrics': metrics,
            'confidence': confidence
        }
        
    except Exception as e:
        logger.error(f"Error extracting journal metrics: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Return minimal fallback metrics based on emoji
        mood_map = {
            'very-happy': 85,
            'happy': 70,
            'neutral': 50,
            'sad': 35,
            'very-sad': 20
        }
        
        fallback_mood = mood_map.get(entry_data.get('mood'), 50)
        
        return {
            'success': False,
            'error': str(e),
            'metrics': {
                'mood_percentage': fallback_mood,
                'source': 'journal_entry',
                'confidence': 0.60,  # Low confidence for fallback
                'entry_id': entry_data.get('id', 'unknown'),
                'sentiment': 'neutral',
                'main_topics': [],
                'risk_flags': {
                    'mentions_self_harm': False,
                    'mentions_harming_others': False,
                    'mentions_abuse_or_unsafe': False,
                    'urgent_support_recommended': False
                }
            }
        }


async def handle_extract_metrics(request):
    """
    POST /extract-journal-metrics
    Extract wellness metrics AND evaluate if summary should be stored
    Body: {
        "uid": "user_id",
        "entry": {
            "id": "entry_id",
            "title": "Entry title",
            "mood": "happy",
            "content_text": "Plain text content...",
            "reflection_qa": "Q&A responses (optional)"
        }
    }
    
    Returns: {
        "success": true,
        "metrics": {...},
        "summary": {
            "summary_generated": true/false,
            "summary_text": "...",
            "confidence": 0.75,
            "should_store": true/false
        }
    }
    """
    try:
        logger.info("=" * 80)
        logger.info("📝 [JOURNAL METRICS] NEW REQUEST RECEIVED")
        logger.info("=" * 80)
        
        data = await request.json()
        logger.info(f"📦 [JOURNAL METRICS] Raw request body: {json.dumps(data, indent=2)}")
        
        uid = data.get('uid')
        entry = data.get('entry', {})
        
        logger.info(f"👤 [JOURNAL METRICS] User ID: {uid}")
        logger.info(f"📄 [JOURNAL METRICS] Entry ID: {entry.get('id')}")
        logger.info(f"📝 [JOURNAL METRICS] Entry title: {entry.get('title')}")
        logger.info(f"😊 [JOURNAL METRICS] Entry mood: {entry.get('mood')}")
        logger.info(f"📏 [JOURNAL METRICS] Content length: {len(entry.get('content_text', ''))} characters")
        
        if not uid:
            logger.error("❌ [JOURNAL METRICS] Missing uid parameter")
            return web.json_response(
                {'error': 'Missing uid parameter'},
                status=400
            )
        
        if not entry.get('content_text'):
            logger.error("❌ [JOURNAL METRICS] Missing entry content_text")
            return web.json_response(
                {'error': 'Missing entry content_text'},
                status=400
            )
        
        logger.info(f"✅ [JOURNAL METRICS] Validation passed, processing entry {entry.get('id')}")
        
        # Step 1: Extract metrics (always done)
        logger.info("🔬 [JOURNAL METRICS] Step 1: Extracting metrics...")
        metrics_result = await extract_journal_metrics(uid, entry)
        logger.info(f"✅ [JOURNAL METRICS] Metrics extracted successfully")
        logger.info(f"📊 [JOURNAL METRICS] Metrics: {json.dumps(metrics_result.get('metrics', {}), indent=2)}")
        
        # NEW: Send metrics to database server for analytics tracking
        logger.info("🚀 [JOURNAL METRICS] Step 2: Sending metrics to db-server...")
        try:
            metrics_payload = {
                "uid": uid,
                "entryId": entry.get('id'),
                "metrics": metrics_result.get('metrics', {})
            }
            logger.info(f"📦 [JOURNAL METRICS] Payload to db-server: {json.dumps(metrics_payload, indent=2)}")
            logger.info(f"🌐 [JOURNAL METRICS] Calling: {DB_SERVER_URL}/save-journal-metrics")
            
            metrics_response = requests.post(
                f"{DB_SERVER_URL}/save-journal-metrics",
                json=metrics_payload,
                timeout=10
            )
            
            logger.info(f"📨 [JOURNAL METRICS] db-server response status: {metrics_response.status_code}")
            logger.info(f"📨 [JOURNAL METRICS] db-server response body: {metrics_response.text}")
            
            if metrics_response.status_code == 200:
                logger.info(f"✅ [JOURNAL METRICS] Metrics saved successfully to analytics")
            else:
                logger.error(f"❌ [JOURNAL METRICS] Failed to save metrics: {metrics_response.status_code}")
        except Exception as e:
            logger.error(f"❌ [JOURNAL METRICS] Error sending metrics to backend: {e}")
            logger.error(traceback.format_exc())
        
        # Step 2: Evaluate if summary should be stored
        logger.info("🤔 [JOURNAL METRICS] Step 3: Evaluating summary value...")
        evaluation = await evaluate_journal_summary_value(entry)
        logger.info(f"📊 [JOURNAL METRICS] Evaluation result: {json.dumps(evaluation, indent=2)}")
        
        # Step 3: Generate summary only if confidence >= 0.65
        if evaluation['should_store_summary']:
            logger.info(f"✅ [JOURNAL METRICS] Summary will be generated (confidence: {evaluation['confidence']:.2f})")
            summary_result = await generate_journal_summary(uid, entry, evaluation)
            logger.info(f"✅ [JOURNAL METRICS] Summary generated: {len(summary_result.get('summary_text', ''))} characters")
        else:
            summary_result = {
                'summary_generated': False,
                'summary_text': None,
                'confidence': evaluation['confidence'],
                'value_category': evaluation['value_category'],
                'reasoning': evaluation['reasoning'],
                'should_store': False
            }
            logger.info(f"⏭️  [JOURNAL METRICS] Summary skipped (confidence: {evaluation['confidence']:.2f}, reason: {evaluation['reasoning']})")
        
        # Return both metrics and summary decision
        response_data = {
            'success': True,
            'metrics': metrics_result.get('metrics', {}),
            'summary': summary_result
        }
        logger.info("✅ [JOURNAL METRICS] Request completed successfully")
        logger.info("=" * 80)
        
        return web.json_response(response_data)
        
    except Exception as e:
        logger.error("❌ [JOURNAL METRICS] FATAL ERROR")
        logger.error(f"Error: {e}")
        logger.error(traceback.format_exc())
        logger.info("=" * 80)
        return web.json_response(
            {'error': str(e), 'success': False},
            status=500
        )


async def init_app():
    """Initialize the aiohttp application"""
    app = web.Application()
    
    # Add routes
    app.router.add_get('/health', health_check)
    app.router.add_post('/generate-reflection-questions', handle_reflection_questions)
    app.router.add_post('/journal-chat', handle_journal_chat)
    app.router.add_post('/extract-journal-metrics', handle_extract_metrics)
    
    return app


def main():
    """Start the HTTP server"""
    app = asyncio.run(init_app())
    
    logger.info("Starting Journal AI HTTP Server on http://0.0.0.0:8766")
    web.run_app(app, host='0.0.0.0', port=8766)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        import traceback
        traceback.print_exc()
