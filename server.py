import asyncio
import json
import base64
import os
import requests
from datetime import datetime, timezone
from google.auth.transport.requests import Request

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

def validate_mood_scores(summary_obj: dict) -> dict:
    """Validate and correct mood scores to ensure they're within valid ranges."""
    if not isinstance(summary_obj, dict):
        return summary_obj
    
    # Define validation rules for each score field
    score_fields = {
        'mood_percentage': (0, 100),  # 0-100 scale (no negative values)
        'energy_level': (0, 100),
        'stress_level': (0, 100),
        'cognitive_score': (0, 100),
        'emotional_score': (0, 100),
        'anxiety_level': (0, 100),
        'physical_activity_minutes': (0, None),  # No upper limit for minutes
    }
    
    # Validate and clamp scores
    for field, (min_val, max_val) in score_fields.items():
        if field in summary_obj and summary_obj[field] is not None:
            try:
                score = float(summary_obj[field])
                
                # Apply minimum constraint
                if score < min_val:
                    logger.warning(f"Clamping {field} from {score} to {min_val} (minimum)")
                    score = min_val
                
                # Apply maximum constraint if specified
                if max_val is not None and score > max_val:
                    logger.warning(f"Clamping {field} from {score} to {max_val} (maximum)")
                    score = max_val
                
                # Round to nearest integer for percentage scores
                if field.endswith('_level') or field.endswith('_score') or field.endswith('_percentage'):
                    summary_obj[field] = round(score)
                else:
                    summary_obj[field] = score
                    
            except (ValueError, TypeError):
                logger.warning(f"Invalid {field} value: {summary_obj[field]}, setting to 0")
                summary_obj[field] = 0
    
    # Special validation for sleep duration (should be reasonable)
    if 'sleep_duration_hours' in summary_obj and summary_obj['sleep_duration_hours'] is not None:
        try:
            hours = float(summary_obj['sleep_duration_hours'])
            if hours < 0:
                summary_obj['sleep_duration_hours'] = 0
            elif hours > 24:  # Cap at 24 hours
                summary_obj['sleep_duration_hours'] = 24
        except (ValueError, TypeError):
            summary_obj['sleep_duration_hours'] = None
    
    return summary_obj


# Import Google Generative AI components
from google import genai
from google.genai import types
from google.genai.types import (
    LiveConnectConfig,
    SpeechConfig,
    VoiceConfig,
    PrebuiltVoiceConfig,
    Tool,
    GoogleSearchRetrieval,
)

import logging
import websockets
import traceback
from websockets.exceptions import ConnectionClosed

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
PROJECT_ID = "gen-ai-hack2skill-470416"
LOCATION = "us-central1"
MODEL = "gemini-live-2.5-flash-preview-native-audio"
VOICE_NAME = "Puck"
SEND_SAMPLE_RATE = 16000

def should_refresh_token(creds, buffer_seconds=300):
    """
    Check if token needs refresh (with 5-minute buffer).
    Returns True if token should be refreshed, False otherwise.
    """
    if not creds or not hasattr(creds, 'expiry') or not creds.expiry:
        return True
    
    import datetime as dt
    time_until_expiry = (creds.expiry - dt.datetime.utcnow()).total_seconds()
    return time_until_expiry < buffer_seconds

def read_text_file_best_effort(path: str) -> str:
    # Try common encodings first; fall back to byte decode with replacement
    tried = []
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            with open(path, "r", encoding=enc) as f:
                text = f.read()
                logger.info(f"Loaded system_instruction.txt using encoding: {enc}")
                return text
        except UnicodeDecodeError:
            tried.append(enc)
            continue
        except FileNotFoundError:
            raise
    # Last resort: decode bytes with replacement so the server still boots
    with open(path, "rb") as f:
        raw = f.read()
    logger.warning(f"Fell back to bytes decode with replacement. Tried encodings: {tried}")
    return raw.decode("utf-8", errors="replace")

try:
    file_path = os.path.join(os.path.dirname(__file__), "system_instruction.txt")
    SYSTEM_INSTRUCTION = read_text_file_best_effort(file_path)
except FileNotFoundError:
    logger.error("Error: system_instruction.txt not found. Using a default instruction.")
    SYSTEM_INSTRUCTION = "You are a helpful AI assistant."


from google.oauth2 import service_account

# ======== AUTHORIZATION BLOCK ========
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
# ===================================

# Define tool object (not used yet, but kept as in your code)
google_search_tool = Tool(
    google_search_retrieval=GoogleSearchRetrieval()
)

# LiveAPI Configuration (unchanged)
config = LiveConnectConfig(
    response_modalities=["AUDIO"],
    output_audio_transcription={},
    input_audio_transcription={},
    speech_config=SpeechConfig(
        voice_config=VoiceConfig(
            prebuilt_voice_config=PrebuiltVoiceConfig(voice_name=VOICE_NAME)
        )
    ),
    session_resumption=types.SessionResumptionConfig(handle=None),
    system_instruction=SYSTEM_INSTRUCTION,
    tools=[],
)

# ---------- Utilities ----------
def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

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
            return {"raw": text.strip()}
    return {"raw": text.strip()}

def pick_summarizer_model(live_or_text_model: str) -> str:
    """
    Map Live/native-audio models to a compatible text model for generateContent.
    Falls back to the original if it's already a text model.
    """
    m = (live_or_text_model or "").lower()

    # Common live/native-audio identifiers
    if "live" in m or "native-audio" in m or "realtime" in m:
        # Prefer a modern Flash text model available in Vertex region
        # Adjust these if you have specific allowlists in your project/region
        if "2.5" in m or "2-5" in m:
            return "gemini-2.0-flash-exp"      # good general fast text model
        if "2.0" in m or "2-" in m:
            return "gemini-2.0-flash-exp"
        # Fallback
        return "gemini-1.5-flash"

    # If the provided model is already a text model, keep it
    return live_or_text_model or "gemini-1.5-flash"


class LiveAPIWebSocketServer:
    """WebSocket server implementation using Gemini LiveAPI directly."""

    def __init__(self, host="0.0.0.0", port=8765):
        self.host = host
        self.port = port
        self.active_clients = {}
        self.session_transcripts = {}
        self.session_ids = {}
        self.user_ids = {}
        self.session_start_times = {}  # NEW: Track session start times for duration calculation

    async def start(self):
        logger.info(f"Starting WebSocket server on {self.host}:{self.port}")
        async with websockets.serve(self.handle_client, self.host, self.port):
            await asyncio.Future()

    async def handle_client(self, websocket):
        """Handle a new WebSocket client connection"""
        client_id = id(websocket)
        logger.info(f"New client connected: {client_id}")

        # Send ready message to client
        await websocket.send(json.dumps({"type": "ready"}))

        try:
            # Start the audio processing for this client
            await self.process_audio(websocket, client_id)
        except ConnectionClosed:
            logger.info(f"Client disconnected: {client_id}")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
            logger.error(traceback.format_exc())
        finally:
            # Summarize and clean up on disconnect
            logger.info(f"Cleaning up connection for client {client_id}")
            uid = self.user_ids.get(client_id)
            if uid and self.session_transcripts.get(client_id):
                logger.info(f"Connection closed for UID {uid}. Summarizing transcript.")
                try:
                    await self.summarize_and_store(client_id, uid)
                except Exception as e:
                    logger.error(f"Error during cleanup summarization for client {client_id}: {e}")

            # Clean up dictionaries
            if client_id in self.active_clients:
                del self.active_clients[client_id]
            if client_id in self.session_transcripts:
                del self.session_transcripts[client_id]
            if client_id in self.session_ids:
                del self.session_ids[client_id]
            if client_id in self.user_ids:
                del self.user_ids[client_id]

    async def _fetch_with_timeout(self, url, method="GET", json_data=None, timeout=8.0):
        """Helper method for HTTP requests with better timeout handling."""
        try:
            loop = asyncio.get_event_loop()
            if method.upper() == "GET":
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None, 
                        lambda: requests.get(url, timeout=timeout)
                    ),
                    timeout=timeout + 2.0
                )
            else:
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None, 
                        lambda: requests.post(url, json=json_data, timeout=timeout)
                    ),
                    timeout=timeout + 2.0
                )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"HTTP {response.status_code} from {url}")
                return None
                
        except asyncio.TimeoutError:
            logger.error(f"Request timeout for {url} after {timeout}s")
            return None
        except Exception as e:
            logger.error(f"Request failed for {url}: {e}")
            return None

    async def generate_dynamic_system_instruction(self, uid: str) -> str:
        """
        Generates a dynamic system instruction based on user data from the database.
        Uses unified context system: 7-day recent summaries + historical archives
        """
        total_start = datetime.now()
        logger.info(f"🚀 Starting dynamic instruction generation for UID: {uid}")
        
        if not uid:
            logger.warning("No UID provided, using default system instruction.")
            return SYSTEM_INSTRUCTION

        try:
            # 1. Fetch user data from the Node.js server
            user_data = await self._fetch_with_timeout(
                f"http://localhost:3000/user/{uid}", 
                timeout=8.0
            )
            if not user_data:
                logger.error(f"Failed to fetch user data for UID {uid}.")
                return SYSTEM_INSTRUCTION

            user_name = user_data.get("name", "there")
            latest_summary = user_data.get("latestSummary", {}).get("summary_data", {})

            # 2. Make parallel requests for context data
            recent_context_response, weekly_archives_response, user_profile_response = await asyncio.gather(
                self._fetch_with_timeout(
                    "http://localhost:3000/get-recent-context", 
                    method="POST", 
                    json_data={"uid": uid}, 
                    timeout=10.0
                ),
                self._fetch_with_timeout(
                    f"http://localhost:3000/get-weekly-archives/{uid}?limit=4",
                    timeout=10.0
                ),
                self._fetch_with_timeout(
                    f"http://localhost:3000/user-profile/{uid}",
                    timeout=8.0
                ),
                return_exceptions=True
            )

            # Process recent context
            recent_activity = ""
            if recent_context_response and not isinstance(recent_context_response, Exception):
                context_data = recent_context_response
                all_summaries = context_data.get("summaries", [])
                
                if all_summaries:
                    recent_activity = "\n\n--- RECENT ACTIVITY (Last 5 Summaries) ---\n"
                    recent_activity += "Full details of all interactions:\n\n"
                    
                    for summary in all_summaries:
                        timestamp = summary.get("timestamp")
                        source = summary.get("source", "unknown")
                        
                        # Calculate days ago
                        days_ago = "recent"
                        date_str = "Unknown date"
                        if timestamp:
                            try:
                                summary_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                days_diff = (datetime.now(summary_date.tzinfo) - summary_date).days
                                if days_diff == 0:
                                    days_ago = "Today"
                                elif days_diff == 1:
                                    days_ago = "Yesterday"
                                else:
                                    days_ago = f"{days_diff} days ago"
                                date_str = summary_date.strftime("%b %d, %I:%M %p")
                            except:
                                pass
                        
                        # Source icon
                        icon = "🎙️" if source == "ai_session" else "📔"
                        source_label = "AI Session" if source == "ai_session" else "Journal Entry"
                        
                        recent_activity += f"{icon} {date_str} ({days_ago}) - {source_label}\n"
                        
                        # Add source-specific details
                        if source == "journal_entry":
                            title = summary.get("title", "Untitled")
                            mood = summary.get("mood_emoji", "")
                            if title and title != "Untitled":
                                recent_activity += f"Title: \"{title}\"\n"
                            if mood:
                                recent_activity += f"Mood: {mood}\n"
                        
                        # Summary text
                        summary_text = summary.get("summary_text", "")
                        if summary_text:
                            recent_activity += f"{summary_text}\n"
                        
                        # Key topics
                        key_topics = summary.get("key_topics", [])
                        if key_topics:
                            recent_activity += f"Key topics: {', '.join(key_topics)}\n"
                        
                        # Add source-specific context
                        if source == "ai_session":
                            action_items = summary.get("action_items", [])
                            if action_items:
                                recent_activity += f"Action items: {', '.join(action_items)}\n"
                        
                        recent_activity += "\n"
                    
                    recent_activity += "------------------------------------------------\n"
                    
                    # Add summary statistics
                    session_count = sum(1 for s in all_summaries if s.get("source") == "ai_session")
                    journal_count = sum(1 for s in all_summaries if s.get("source") == "journal_entry")
                    recent_activity += f"\nRecent activity summary: {session_count} AI sessions, {journal_count} journal entries\n"

            # Process weekly archives
            weekly_archives_section = ""
            if weekly_archives_response and not isinstance(weekly_archives_response, Exception):
                archives_data = weekly_archives_response
                archives = archives_data.get("archives", [])
                
                if archives:
                    weekly_archives_section = "\n\n--- WEEKLY ARCHIVES (Historical Context) ---\n"
                    weekly_archives_section += "Compressed summaries of previous weeks:\n\n"
                    
                    for i, archive in enumerate(archives):
                        week_num = archive.get("week_number", "?")
                        year = archive.get("year", "?")
                        week_start = archive.get("week_start", "")
                        week_end = archive.get("week_end", "")
                        
                        # Format date range
                        date_range = f"Week {week_num}, {year}"
                        try:
                            if week_start and week_end:
                                start_date = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
                                end_date = datetime.fromisoformat(week_end.replace('Z', '+00:00'))
                                date_range = f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
                        except:
                            pass
                        
                        weekly_archives_section += f"📅 {date_range}\n"
                        
                        # Activity count
                        summary_count = archive.get("summary_count", {})
                        sessions = summary_count.get("sessions", 0)
                        journals = summary_count.get("journals", 0)
                        weekly_archives_section += f"Activity: {sessions} sessions, {journals} journals\n\n"
                        
                        # Narrative summary
                        narrative = archive.get("narrative_summary", "")
                        if narrative:
                            weekly_archives_section += f"{narrative}\n\n"
                        
                        # Key information
                        themes = archive.get("dominant_themes", [])
                        if themes:
                            weekly_archives_section += f"Main themes: {', '.join(themes)}\n"
                        
                        trajectory = archive.get("emotional_trajectory", "")
                        if trajectory:
                            weekly_archives_section += f"Emotional journey: {trajectory}\n"
                        
                        # Metrics
                        mood_avg = archive.get("mood_avg")
                        stress_avg = archive.get("stress_avg")
                        if mood_avg is not None or stress_avg is not None:
                            metrics = []
                            if mood_avg is not None:
                                metrics.append(f"Mood: {mood_avg}/100")
                            if stress_avg is not None:
                                metrics.append(f"Stress: {stress_avg}/100")
                            weekly_archives_section += f"Metrics: {', '.join(metrics)}\n"
                        
                        weekly_archives_section += "\n" + "-" * 50 + "\n\n"
                    
                    logger.info(f"Included {len(archives)} weekly archives in context")

            # Process user profile
            user_profile_section = ""
            if user_profile_response and not isinstance(user_profile_response, Exception):
                profile_data = user_profile_response
                
                if profile_data.get("exists"):
                    profile = profile_data.get("profile", {})
                    user_profile_section = "\n\n--- USER PROFILE (Long-term Understanding) ---\n"
                    user_profile_section += "Deep knowledge built organically over time:\n\n"
                    
                    # Core Identity
                    core = profile.get("core_identity", {})
                    if any(core.values()):
                        user_profile_section += "IDENTITY:\n"
                        if core.get("preferred_name"):
                            user_profile_section += f"  • Preferred name: {core['preferred_name']}\n"
                        if core.get("age_range"):
                            user_profile_section += f"  • Age range: {core['age_range']}\n"
                        if core.get("gender_identity"):
                            user_profile_section += f"  • Gender: {core['gender_identity']}\n"
                        if core.get("pronouns"):
                            user_profile_section += f"  • Pronouns: {core['pronouns']}\n"
                        if core.get("region"):
                            user_profile_section += f"  • Region: {core['region']}\n"
                        user_profile_section += "\n"
                    
                    # Communication Style
                    comm = profile.get("communication_profile", {})
                    if any(comm.values()):
                        user_profile_section += "COMMUNICATION STYLE:\n"
                        if comm.get("verbal_expressiveness"):
                            user_profile_section += f"  • Expressiveness: {comm['verbal_expressiveness']}\n"
                        if comm.get("emotional_vocabulary_range"):
                            user_profile_section += f"  • Emotional vocabulary: {comm['emotional_vocabulary_range']}\n"
                        if comm.get("typical_conversation_length"):
                            user_profile_section += f"  • Conversation length: {comm['typical_conversation_length']}\n"
                        if comm.get("comfort_with_vulnerability"):
                            user_profile_section += f"  • Comfort with vulnerability: {comm['comfort_with_vulnerability']}\n"
                        if comm.get("uses_humor") is not None:
                            user_profile_section += f"  • Uses humor: {'Yes' if comm['uses_humor'] else 'No'}\n"
                        user_profile_section += "\n"
                    
                    # Psychological Patterns
                    psych = profile.get("psychological_profile", {})
                    if any(psych.values()):
                        user_profile_section += "PSYCHOLOGICAL PATTERNS:\n"
                        if psych.get("typical_coping_mechanisms"):
                            coping = psych['typical_coping_mechanisms']
                            if isinstance(coping, list) and coping:
                                user_profile_section += f"  • Coping mechanisms: {', '.join(coping)}\n"
                        if psych.get("stress_response_pattern"):
                            user_profile_section += f"  • Stress response: {psych['stress_response_pattern']}\n"
                        user_profile_section += "\n"
                    
                    # Life Context
                    life = profile.get("life_context_profile", {})
                    if any(life.values()):
                        user_profile_section += "LIFE CONTEXT:\n"
                        if life.get("current_life_stage"):
                            user_profile_section += f"  • Life stage: {life['current_life_stage']}\n"
                        if life.get("academic_pressure_level"):
                            user_profile_section += f"  • Academic pressure: {life['academic_pressure_level']}\n"
                        user_profile_section += "\n"
                    
                    # Strengths
                    strengths = profile.get("strengths_profile", {})
                    if any(strengths.values()):
                        user_profile_section += "STRENGTHS & RESOURCES:\n"
                        if strengths.get("character_strengths"):
                            chars = strengths['character_strengths']
                            if isinstance(chars, list) and chars:
                                user_profile_section += f"  • Character strengths: {', '.join(chars)}\n"
                        user_profile_section += "\n"
                    
                    user_profile_section += "-" * 50 + "\n\n"
                    
                    logger.info(f"Included user profile in context")

            # 4. Generate questions using Gemini based on the latest summary
            generated_questions = ""
            if latest_summary:
                question_prompt = (
                    "Based on the following summary of a user's previous session, "
                    "generate 2-3 thoughtful, open-ended follow-up questions to help them continue exploring their feelings. "
                    "The questions should be gentle, encouraging, and in line with the persona of a supportive mentor. "
                    "Frame them as natural conversation starters.\n\n"
                    f"PREVIOUS SUMMARY:\n{json.dumps(latest_summary, indent=2)}\n\n"
                    "QUESTIONS:"
                )
                
                try:
                    question_model = pick_summarizer_model(MODEL)
                    question_response = await client.aio.models.generate_content(
                        model=question_model,
                        contents=[question_prompt],
                        config=types.GenerateContentConfig(temperature=0.7)
                    )
                    # Safely extract text from response
                    if question_response and getattr(question_response, "candidates", None):
                        for c in question_response.candidates:
                            if getattr(c, "content", None) and getattr(c.content, "parts", None):
                                for p in c.content.parts:
                                    if getattr(p, "text", None):
                                        generated_questions += p.text
                    generated_questions = generated_questions.strip()
                except Exception as e:
                    logger.error(f"Error generating questions with Gemini: {e}")
                    generated_questions = "How have you been feeling since we last talked?" # Fallback question

            # 5. Construct the dynamic system instruction with unified context + archives
            greeting = f"Start the conversation by warmly welcoming the user back. Greet them by name: '{user_name}'."
            
            dynamic_instruction = (
                f"{SYSTEM_INSTRUCTION}\n\n"
                f"--- Conversation Context ---\n"
                f"{greeting}\n"
            )

            # Add recent activity timeline if available
            if recent_activity:
                dynamic_instruction += recent_activity
                dynamic_instruction += (
                    "\nUse the recent activity timeline above to:\n"
                    "- Reference both journal entries and AI sessions naturally\n"
                    "- Follow up on action items from previous AI sessions\n"
                    "- Acknowledge journal entries when relevant\n\n"
                )
            
            # Add weekly archives if available
            if weekly_archives_section:
                dynamic_instruction += weekly_archives_section
                dynamic_instruction += (
                    "\nUse the weekly archives to:\n"
                    "- Recognize long-term patterns and progress\n"
                    "- Reference past breakthroughs or challenges when relevant\n"
                    "- Celebrate growth over weeks\n\n"
                )
            
            # Add user profile if available
            if user_profile_section:
                dynamic_instruction += user_profile_section
                dynamic_instruction += (
                    "\nUse the user profile to:\n"
                    "- Adapt your communication style to match theirs\n"
                    "- Reference their strengths when they feel discouraged\n"
                    "- Use language that matches their emotional vocabulary range\n"
                    "- NEVER explicitly mention 'the profile' - just naturally incorporate the knowledge\n\n"
                )

            if generated_questions:
                dynamic_instruction += (
                    "After the greeting, gently ask one of the following questions to help them open up, "
                    "based on their previous conversation. Choose the one that feels most natural.\n"
                    f"{generated_questions}\n"
                )
            else:
                 dynamic_instruction += "After the greeting, ask a general open-ended question like 'What's been on your mind lately?' or 'How have things been for you?'.\n"

            dynamic_instruction += "--------------------------"
            
            total_time = (datetime.now() - total_start).total_seconds()
            logger.info(f"✅ Dynamic instruction generated in {total_time:.2f}s (length: {len(dynamic_instruction)} chars)")
            
            if total_time > 10.0:
                logger.warning(f"⚠️  Slow generation detected: {total_time:.2f}s - encryption may be causing delays")
            
            return dynamic_instruction

        except Exception as e:
            total_time = (datetime.now() - total_start).total_seconds()
            logger.error(f"❌ Dynamic instruction generation failed after {total_time:.2f}s: {e}")
            logger.error(traceback.format_exc())
            return SYSTEM_INSTRUCTION

    async def process_audio(self, websocket, client_id):
        # Store reference to client
        self.active_clients[client_id] = websocket

        # Init transcript buffer for this client
        self.session_transcripts[client_id] = []
        
        # NEW: Record session start time for duration calculation
        self.session_start_times[client_id] = datetime.now()

        # Wait for the initial user_id message before starting the session (with increased timeout)
        uid = None
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=30.0)  # Increased timeout
            data = json.loads(message)
            if data.get("type") == "user_id":
                uid = data.get("data")
                self.user_ids[client_id] = uid
                logger.info(f"Received user ID: {uid}")
            else:
                logger.error("First message from client was not 'user_id'. Closing connection.")
                await websocket.close(code=1008, reason="user_id message expected")
                return
        except asyncio.TimeoutError:
            logger.error("Client did not send user_id in time. Closing connection.")
            await websocket.close(code=1008, reason="user_id timeout")
            return
        except (json.JSONDecodeError, websockets.exceptions.ConnectionClosed) as e:
            logger.error(f"Error receiving user_id from client: {e}")
            return # Connection is likely already closed or message was malformed

        # Send status update to client
        try:
            await websocket.send(json.dumps({
                "type": "status",
                "data": "Preparing your personalized AI companion..."
            }))
        except Exception:
            pass

        # Generate dynamic system instruction using the received UID
        logger.info(f"⏳ Generating dynamic system instruction for UID: {uid}")
        try:
            dynamic_system_instruction = await asyncio.wait_for(
                self.generate_dynamic_system_instruction(uid),
                timeout=25.0  # Overall timeout for instruction generation
            )
        except asyncio.TimeoutError:
            logger.error("🚨 Dynamic instruction generation timed out - using fallback")
            dynamic_system_instruction = SYSTEM_INSTRUCTION + "\n\nWelcome back! How have you been feeling lately?"

        # Send status update to client
        try:
            await websocket.send(json.dumps({
                "type": "status",
                "data": "Connecting to AI service..."
            }))
        except Exception:
            pass

        # Create a new LiveAPI Config for this session with the dynamic instruction
        logger.info(f"⏳ Creating LiveAPI config for session...")
        live_config = LiveConnectConfig(
            response_modalities=["AUDIO"],
            output_audio_transcription={},
            input_audio_transcription={},
            speech_config=SpeechConfig(
                voice_config=VoiceConfig(
                    prebuilt_voice_config=PrebuiltVoiceConfig(voice_name=VOICE_NAME)
                )
            ),
            session_resumption=types.SessionResumptionConfig(handle=None),
            system_instruction=dynamic_system_instruction,
            tools=[],
        )
        logger.info(f"✅ LiveAPI config created")

        # 🔥 CRITICAL FIX: Refresh authentication before connecting to LiveAPI
        logger.info(f"⏳ Connecting to Gemini LiveAPI (model: {MODEL})...")
        auth_start = datetime.now()
        
        global client, creds
        
        try:
            logger.info("🔄 Refreshing authentication credentials...")
            
            # Log current token state
            if creds.expiry:
                import datetime as dt
                time_left = (creds.expiry - dt.datetime.utcnow()).total_seconds()
                logger.info(f"📊 Current token age: {time_left:.0f}s remaining")
            
            # Method 1: Refresh existing credentials (fastest)
            creds.refresh(Request())
            
            # Recreate client with refreshed credentials
            client = genai.Client(
                vertexai=True,
                project=PROJECT_ID,
                location=LOCATION,
                credentials=creds,
            )
            
            auth_time = (datetime.now() - auth_start).total_seconds()
            expiry_time = creds.expiry.strftime("%H:%M:%S") if creds.expiry else "unknown"
            logger.info(f"✅ Token refreshed in {auth_time:.2f}s (expires at: {expiry_time})")
            
        except Exception as auth_error:
            logger.error(f"❌ Token refresh failed: {auth_error}")
            
            # Method 2: Recreate credentials from file (slower but more thorough)
            try:
                logger.info("🔄 Fallback: Recreating credentials from service account file...")
                
                creds = service_account.Credentials.from_service_account_file(
                    KEY_PATH, 
                    scopes=SCOPES
                )
                
                # Force immediate token fetch
                creds.refresh(Request())
                
                # Recreate client
                client = genai.Client(
                    vertexai=True,
                    project=PROJECT_ID,
                    location=LOCATION,
                    credentials=creds,
                )
                
                auth_time = (datetime.now() - auth_start).total_seconds()
                expiry_time = creds.expiry.strftime("%H:%M:%S") if creds.expiry else "unknown"
                logger.info(f"✅ Fallback successful in {auth_time:.2f}s (expires at: {expiry_time})")
                
            except Exception as fallback_error:
                logger.error(f"❌ All authentication attempts failed: {fallback_error}")
                logger.error(traceback.format_exc())
                
                # Send error to client
                try:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "data": f"Authentication failed: Unable to connect to AI service. Please try again."
                    }))
                except Exception as send_error:
                    logger.error(f"Failed to send error message to client: {send_error}")
                
                # Don't proceed to LiveAPI connection
                return

        # NOW connect to LiveAPI with fresh token
        logger.info(f"⏳ Attempting LiveAPI connection with fresh credentials...")
        try:
            async with client.aio.live.connect(model=MODEL, config=live_config) as session:
                connect_time = (datetime.now() - auth_start).total_seconds()
                logger.info(f"✅ Successfully connected to Gemini LiveAPI! (total time: {connect_time:.2f}s)")
                
                # Send success status to client
                try:
                    await websocket.send(json.dumps({
                        "type": "status",
                        "data": "AI companion ready! You can start talking now."
                    }))
                except Exception:
                    pass
                
                async with asyncio.TaskGroup() as tg:
                    # Create a queue for audio data from the client
                    audio_queue = asyncio.Queue()

                    # Task to process incoming WebSocket messages (audio, text, end)
                    async def handle_websocket_messages():
                        async for message in websocket:
                            try:
                                data = json.loads(message)
                                if data.get("type") == "audio":
                                    audio_bytes = base64.b64decode(data.get("data", ""))
                                    await audio_queue.put(audio_bytes)
                                elif data.get("type") == "end":
                                    logger.info("Received end signal from client")
                                    # Summarize on demand when client signals end
                                    try:
                                        uid = self.user_ids.get(client_id)
                                        if not uid:
                                            logger.error("No user ID found for client")
                                            continue
                                        
                                        saved_path = await self.summarize_and_store(client_id, uid)
                                        try:
                                            await websocket.send(json.dumps({
                                                "type": "summary_saved",
                                                "data": saved_path or "ok"
                                            }))
                                        except Exception as se:
                                            logger.error(f"Error sending summary_saved over WS: {se}")
                                    except Exception as e:
                                        logger.error(f"Summarization error: {e}")
                                        try:
                                            await websocket.send(json.dumps({
                                                "type": "summary_saved",
                                                "data": f"error: {e}"
                                            }))
                                        except Exception as se:
                                            logger.error(f"Error sending error over WS: {se}")
                                elif data.get("type") == "text":
                                    txt = data.get("data")
                                    logger.info(f"Received text: {txt}")
                                    # Record explicit text messages from client as user turns
                                    if txt:
                                        self.session_transcripts[client_id].append({
                                            "role": "user",
                                            "text": txt,
                                            "ts": datetime.now(timezone.utc).isoformat()
                                        })
                                        # Corrected method to send text content
                                        await session.send_realtime_input(text=txt)
                                elif data.get("type") == "user_id":
                                    # This shouldn't happen if client logic is correct, but log it.
                                    logger.warning(f"Received subsequent user_id message for client {client_id}.")
                            except json.JSONDecodeError:
                                logger.error("Invalid JSON message received")
                            except Exception as e:
                                logger.error(f"Error processing message: {e}")

                    # Task to process and send audio to Gemini
                    async def process_and_send_audio():
                        while True:
                            data = await audio_queue.get()
                            await session.send_realtime_input(
                                media={
                                    "data": data,
                                    "mime_type": f"audio/pcm;rate={SEND_SAMPLE_RATE}",
                                }
                            )
                            audio_queue.task_done()

                    # Task to receive and play responses
                    async def receive_and_play():
                        while True:
                            input_transcriptions = []
                            output_transcriptions = []

                            async for response in session.receive():
                                if response.session_resumption_update:
                                    update = response.session_resumption_update
                                    if update.resumable and update.new_handle:
                                        session_id = update.new_handle
                                        logger.info(f"New SESSION: {session_id}")
                                        # Keep latest handle per client
                                        self.session_ids[client_id] = session_id

                                        session_id_msg = json.dumps({
                                            "type": "session_id", "data": session_id
                                        })
                                        try:
                                            await websocket.send(session_id_msg)
                                        except Exception as se:
                                            logger.error(f"Error sending session_id over WS: {se}")

                                if response.go_away is not None:
                                    logger.info(f"Session will terminate in: {response.go_away.time_left}")

                                server_content = response.server_content

                                if (hasattr(server_content, "interrupted") and server_content.interrupted):
                                    logger.info("🤐 INTERRUPTION DETECTED")
                                    try:
                                        await websocket.send(json.dumps({
                                            "type": "interrupted",
                                            "data": "Response interrupted by user input"
                                        }))
                                    except Exception as se:
                                        logger.error(f"Error sending interrupted over WS: {se}")

                                if server_content and server_content.model_turn:
                                    for part in server_content.model_turn.parts:
                                        if part.inline_data:
                                            b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                            try:
                                                await websocket.send(json.dumps({
                                                    "type": "audio", "data": b64_audio
                                                }))
                                            except Exception as se:
                                                logger.error(f"Error sending audio over WS: {se}")

                                if server_content and server_content.turn_complete:
                                    logger.info("✅ Gemini done talking")
                                    try:
                                        await websocket.send(json.dumps({ "type": "turn_complete" }))
                                    except Exception as se:
                                        logger.error(f"Error sending turn_complete over WS: {se}")

                                output_transcription = getattr(response.server_content, "output_transcription", None)
                                if output_transcription and output_transcription.text:
                                    text_out = output_transcription.text
                                    output_transcriptions.append(text_out)

                                    # Check for and save suggested exercises
                                    try:
                                        if '"suggested_exercises"' in text_out:
                                            start = text_out.find("{")
                                            end = text_out.rfind("}") + 1
                                            if 0 <= start < end:
                                                json_str = text_out[start:end]
                                                data = json.loads(json_str)
                                                exercise_ids = data.get("suggested_exercises")
                                                uid = self.user_ids.get(client_id)
                                                if uid and exercise_ids and isinstance(exercise_ids, list):
                                                    logger.info(f"Found suggested exercises: {exercise_ids} for user {uid}. Sending to db-server...")
                                                    payload = {"uid": uid, "exerciseIds": exercise_ids}
                                                    try:
                                                        # This is a blocking call, consider using an async library like aiohttp in production
                                                        response = requests.post("http://localhost:3000/save-exercises", json=payload)
                                                        logger.info(f"Save exercises response status: {response.status_code}")
                                                        logger.info(f"Save exercises response body: {response.text}")
                                                    except requests.exceptions.RequestException as req_e:
                                                        logger.error(f"HTTP Request error when saving exercises: {req_e}")
                                    except Exception as e:
                                        logger.error(f"Error processing suggested exercises: {e}")

                                    try:
                                        await websocket.send(json.dumps({
                                            "type": "text", "data": text_out
                                        }))
                                    except Exception as se:
                                        logger.error(f"Error sending text over WS: {se}")
                                    # Record assistant outputs
                                    self.session_transcripts[client_id].append({
                                        "role": "assistant",
                                        "text": text_out,
                                        "ts": datetime.now(timezone.utc).isoformat()
                                    })

                                input_transcription = getattr(response.server_content, "input_transcription", None)
                                if input_transcription and input_transcription.text:
                                    text_in = input_transcription.text
                                    input_transcriptions.append(text_in)
                                    # Record user recognized speech
                                    self.session_transcripts[client_id].append({
                                        "role": "user",
                                        "text": text_in,
                                        "ts": datetime.now(timezone.utc).isoformat()
                                    })

                            logger.info(f"Output transcription: {''.join(output_transcriptions)}")
                            logger.info(f"Input transcription: {''.join(input_transcriptions)}")

                    # Start all tasks
                    tg.create_task(handle_websocket_messages())
                    tg.create_task(process_and_send_audio())
                    tg.create_task(receive_and_play())
        except Exception as gemini_error:
            logger.error(f"❌ Gemini LiveAPI connection failed: {gemini_error}")
            logger.error(traceback.format_exc())
            # Send error to client
            try:
                await websocket.send(json.dumps({
                    "type": "error",
                    "data": f"Failed to connect to AI service: {str(gemini_error)}"
                }))
            except Exception as send_error:
                logger.error(f"Failed to send error message to client: {send_error}")
            raise  # Re-raise to trigger cleanup in handle_client

    # ---------- Summarize & store function ----------
    async def summarize_and_store(self, client_id: str, uid: str):
        """
        Summarizes the full transcript for a client and sends it to the Node.js backend.
        """
        transcript = self.session_transcripts.get(client_id, [])
        if not transcript:
            logger.info("No transcript found; skipping summary.")
            return None

        # Extract user's name from the first user message
        user_name = None
        for message in transcript:
            if message.get("role") == "user":
                # This is a simple heuristic to find the name.
                # A more robust solution would use named entity recognition.
                text = message.get("text", "").lower()
                if "my name is" in text:
                    user_name = text.split("my name is")[-1].strip()
                    break
        
        if user_name:
            try:
                requests.post("http://localhost:3000/save-name", json={"uid": uid, "name": user_name})
            except requests.exceptions.RequestException as e:
                logger.error(f"Error saving user name: {e}")

        # Fetch previous summary
        previous_summary = ""
        try:
            response = requests.get(f"http://localhost:3000/get-summary/{uid}")
            if response.status_code == 200:
                previous_summary = response.json().get("latestSummary", {}).get("summary_data", {}).get("summary", "")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching previous summary: {e}")

        # Prepare a compact transcript string (role: text)
        flat_lines = []
        for turn in transcript:
            role = turn.get("role", "user")
            text = turn.get("text", "").strip()
            if text:
                flat_lines.append(f"{role.upper()}: {text}")
        flat_transcript = "\n".join(flat_lines)

        session_handle = self.session_ids.get(client_id)

        # Instruction to produce STRICT JSON (no clinical diagnoses)
        system_note = (
            "You are CureZ, a supportive, empathetic AI mentor for young people. "
            "Summarize the user's full conversation in a youth wellness context. "
            "You must NOT provide any medical diagnosis. "
            "Detect safety concerns and reflect them as flags only. "
            "Return STRICT JSON only—no markdown, no code fences, no extra text."
        )

        # JSON schema we want (kept simple and extensible)
        schema_hint = {
            "session_id": session_handle or "",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "language": "auto",
            "summary": "",
            "main_points": [],
            "emotions_themes": [],
            "mood": "",
            "mood_percentage": 0,  # 0-100 scale (0 = very poor mood, 100 = excellent mood)
            "energy_level": 0,  # 0-100 scale (0 = very low energy, 100 = very high energy)
            "stress_level": 0,  # 0-100 scale (0 = no stress, 100 = extreme stress)
            "mood_stability": "",  # e.g., "stable", "fluctuating", "improving"
            "mood_calmness": "",  # e.g., "calm", "anxious", "agitated"
            "cognitive_score": 0,  # 0-100 scale
            "emotional_score": 0,  # 0-100 scale
             "sleep_quality": None,  # e.g., "Rested", "Okay", "Exhausted"
            "sleep_duration_hours": None,  # numeric hours slept (allow decimals)
            "social_connection_level": None,  # e.g., "Feeling Connected", "Feeling Isolated"
            "social_interaction_log": None,  # yes/no or note on interactions
            "physical_activity_minutes": None,  # minutes of movement (0 if none)
            "physical_activity_summary": None,  # short descriptor of activity effort
            "anxiety_level": None,  # 0-100 scale distinct from stress
            "focus_level": None,  # e.g., "Focused", "Distracted"
            "positive_event": None,  # gratitude or positive highlight
            "stressors": [],
            "protective_factors": [],
            "coping_strategies_discussed": [],
            "goals_or_hopes": [],
            "action_items_suggested": [],
            "progress_analysis": "",
            "risk_flags": {
                "mentions_self_harm": False,
                "mentions_harming_others": False,
                "mentions_abuse_or_unsafe": False,
                "urgent_support_recommended": False
            },
            "suggestions_non_clinical": [],
            "suggested_exercises": ["ex001","ex002","ex003"],
            # NEW: Developed areas tracking (15 predefined areas with confidence scores)
            "developed_areas": [
                {"name": "self_awareness", "confidence": 0.0},
                {"name": "emotional_regulation", "confidence": 0.0},
                {"name": "stress_management", "confidence": 0.0}
            ]
        }

        user_prompt = (
            "Analyze the following conversation transcript and combine it with the previous summary to create an updated summary. "
            "The updated summary should reflect the user's progress and current wellness state. "
            "Focus on the youth's wellness state and the core points discussed. "
            "If a previous summary is provided, analyze the user's progress over time in the 'progress_analysis' field. "
            "Infer language if not explicit. "
            "Analyze the overall mood of the user based on their messages and provide: "
            "- A brief description in the 'mood' field (e.g., positive, neutral, anxious, hopeful, struggling, resilient). "
            "- A mood percentage on a scale of 0-100 in the 'mood_percentage' field (0 = very poor mood/distressed, 100 = excellent mood/thriving). "
            "  IMPORTANT: Consider ALL factors when calculating mood percentage - stress, energy, behavioral lifestyle metrics, protective factors, and overall functioning. "
            "  Use the holistic scoring guidelines: Factor in conversational tone (30%), stress levels (25%), energy levels (20%), behavioral metrics (15%), and cognitive functioning (10%). "
            "  The mood percentage should NEVER be negative and must be between 0-100. "
            "- An energy level on a scale of 0-100 in the 'energy_level' field (0 = very low energy, 100 = very high energy). "
            "- A stress level on a scale of 0-100 in the 'stress_level' field (0 = no stress, 100 = extreme stress). "
            "- Mood stability assessment in the 'mood_stability' field (e.g., stable, fluctuating, improving, declining). "
            "- Mood calmness level in the 'mood_calmness' field (e.g., calm, anxious, agitated, relaxed). "
            "- A 'cognitive_score' on a 0-100 scale, derived from the user's focus level, clarity of thought, and problem-solving mentions. "
            "- An 'emotional_score' on a 0-100 scale, based on mood calmness, stability, and emotional articulation. "
                "Capture lifestyle patterns by filling the behavioral metrics: "
            "- 'sleep_quality' as a short descriptor like Rested/Okay/Exhausted and 'sleep_duration_hours' as a numeric value. "
            "- 'social_connection_level' describing their connected vs. isolated feelings and 'social_interaction_log' as a yes/no or short note. "
            "- 'physical_activity_minutes' representing minutes moved (0 if none) and 'physical_activity_summary' with a short description of the movement effort. "
            "Document cognitive and emotional granularity: "
            "- 'anxiety_level' on a 0-100 scale distinct from stress (0 = no anxiety, 100 = extreme anxiety). "
            "- 'focus_level' describing their concentration (e.g., Focused, Distracted, Scattered). "
            "- 'positive_event' capturing a gratitude or positive moment noted by the user. "
            "IMPORTANT - Developed Areas Analysis: "
            "Analyze the conversation and identify which of these 15 wellness areas the user demonstrated growth or engagement in. "
            "For each relevant area, assign a confidence score (0.0-1.0) representing how strongly this area was developed in the session. "
            "Only include areas with confidence > 0.6 in the 'developed_areas' array. Each entry should have 'name' and 'confidence'. "
            "Areas: self_awareness, emotional_regulation, stress_management, anxiety_coping, social_skills, academic_stress, "
            "family_relationships, peer_relationships, self_esteem, goal_setting, decision_making, conflict_resolution, "
            "time_management, healthy_habits, resilience. "
            "Use the behavioral and cognitive metrics (sleep quality, social connection, physical activity), along with mood, energy, and stress, when estimating 'mood_percentage'. "
            "Apply holistic scoring: Start with a base score from conversational tone, then adjust based on stress levels, energy levels, behavioral metrics, and cognitive functioning. "
            "Consider protective factors like support systems, coping strategies, and resilience indicators when determining the final mood percentage. "
            "Remember: mood_percentage must be 0-100 (never negative), representing overall mental wellness state, not just immediate emotional expression. "
            "If information is not provided, set the corresponding field to null. "
            "Fill the provided JSON schema faithfully and only return the JSON object.\n\n"
            f"PREVIOUS_SUMMARY:\n{previous_summary}\n\n"
            f"JSON_SCHEMA_EXAMPLE:\n{json.dumps(schema_hint, ensure_ascii=False, indent=2)}\n\n"
            f"TRANSCRIPT:\n{flat_transcript}"
        )


        # Pick a compatible model for generateContent (avoids INVALID_ARGUMENT)
        summarizer_model = pick_summarizer_model(MODEL)
        if summarizer_model != MODEL:
            logger.info(f"Using summarizer model '{summarizer_model}' for generateContent (from '{MODEL}')")

        # Build Content/Part properly
        user_content = types.Content(
            role="user",
            parts=[types.Part(text=user_prompt)]
        )

        # Call the text model
        gen = await client.aio.models.generate_content(
            model=summarizer_model,
            contents=[user_content],  # could also pass contents=user_prompt (string)
            config=types.GenerateContentConfig(
                temperature=0.3,
                system_instruction=system_note,
                response_mime_type="application/json"
            )
        )

        # Extract text safely
        text = ""
        if gen and getattr(gen, "candidates", None):
            for c in gen.candidates:
                if getattr(c, "content", None) and getattr(c.content, "parts", None):
                    for p in c.content.parts:
                        if getattr(p, "text", None):
                            text += p.text

        logger.info(f"Raw AI response: {text}")
        summary_obj = extract_json(text) if text else {"raw": ""}
        
        # Validate and correct mood scores
        summary_obj = validate_mood_scores(summary_obj)
        logger.info(f"Parsed and validated summary object: {json.dumps(summary_obj, indent=2)}")

        # NEW: Calculate session duration
        session_duration_minutes = 0
        if client_id in self.session_start_times:
            session_end_time = datetime.now()
            session_start_time = self.session_start_times[client_id]
            duration_seconds = (session_end_time - session_start_time).total_seconds()
            session_duration_minutes = round(duration_seconds / 60, 2)  # Convert to minutes
            logger.info(f"📊 Session duration: {session_duration_minutes} minutes")

        # Send to Node.js backend
        try:
            payload = {
                "uid": uid,
                "summary": {
                    "summary_data": summary_obj,
                    "meta": {
                        "client_id": client_id,
                        "session_id": session_handle,
                        "saved_at_utc": datetime.now(timezone.utc).isoformat(),
                        "duration_minutes": session_duration_minutes  # NEW: Include duration
                    }
                }
            }
            response = requests.post("http://localhost:3000/save-summary", json=payload)
            response.raise_for_status()  # Raise an exception for bad status codes
            logger.info(f"✅ Summary sent to Node.js backend: {response.text}")
            
            # NEW: Clean up session start time after sending summary
            if client_id in self.session_start_times:
                del self.session_start_times[client_id]
            
            return "ok"
        except requests.exceptions.RequestException as e:
            logger.error(f"Error sending summary to Node.js backend: {e}")
            return None


async def main():
    """Main function to start the server"""
    server = LiveAPIWebSocketServer()
    await server.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting application via KeyboardInterrupt...")
    except Exception as e:
        logger.error(f"Unhandled exception in main: {e}")
        import traceback
        traceback.print_exc()