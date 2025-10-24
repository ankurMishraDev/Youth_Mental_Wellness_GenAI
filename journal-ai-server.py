"""
HTTP Server for Journal AI Features
Provides REST API endpoints for journal-related AI operations
Run alongside the WebSocket server (server.py)
"""

import asyncio
import json
import os
import requests
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


async def init_app():
    """Initialize the aiohttp application"""
    app = web.Application()
    
    # Add routes
    app.router.add_get('/health', health_check)
    app.router.add_post('/generate-reflection-questions', handle_reflection_questions)
    
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
