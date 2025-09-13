import asyncio
import json
import base64
import os
import requests
from datetime import datetime, timezone

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

# # --- System instruction loader (unchanged) ---
# try:
#     file_path = os.path.join(os.path.dirname(__file__), "system_instruction.txt")
#     with open(file_path, 'r') as file:
#         SYSTEM_INSTRUCTION = file.read()
# except FileNotFoundError:
#     logger.error("Error: system_instruction.txt not found. Using a default instruction.")
#     SYSTEM_INSTRUCTION = "You are a helpful AI assistant."


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
            # Clean up if needed
            if client_id in self.active_clients:
                del self.active_clients[client_id]

    async def generate_dynamic_system_instruction(self, uid: str) -> str:
        """
        Generates a dynamic system instruction based on user data from the database.
        """
        if not uid:
            logger.warning("No UID provided, using default system instruction.")
            return SYSTEM_INSTRUCTION

        try:
            # 1. Fetch user data from the Node.js server
            response = requests.get(f"http://localhost:3000/user/{uid}")
            if response.status_code != 200:
                logger.error(f"Failed to fetch user data for UID {uid}. Status: {response.status_code}")
                return SYSTEM_INSTRUCTION

            user_data = response.json()
            user_name = user_data.get("name", "there")
            latest_summary = user_data.get("latestSummary", {}).get("summary_data", {})

            # 2. Generate questions using Gemini based on the summary
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

            # 3. Construct the dynamic system instruction
            greeting = f"Start the conversation by warmly welcoming the user back. Greet them by name: '{user_name}'."
            
            dynamic_instruction = (
                f"{SYSTEM_INSTRUCTION}\n\n"
                f"--- Conversation Context ---\n"
                f"{greeting}\n"
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
            
            logger.info(f"Generated dynamic instruction for UID {uid}")
            return dynamic_instruction

        except requests.exceptions.RequestException as e:
            logger.error(f"RequestException when fetching user data: {e}")
            return SYSTEM_INSTRUCTION
        except Exception as e:
            logger.error(f"An unexpected error occurred in generate_dynamic_system_instruction: {e}")
            logger.error(traceback.format_exc())
            return SYSTEM_INSTRUCTION

    async def process_audio(self, websocket, client_id):
        # Store reference to client
        self.active_clients[client_id] = websocket

        # Init transcript buffer for this client
        self.session_transcripts[client_id] = []

        # Wait for the initial user_id message before starting the session
        uid = None
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
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

        # Generate dynamic system instruction using the received UID
        dynamic_system_instruction = await self.generate_dynamic_system_instruction(uid)

        # Create a new LiveAPI Config for this session with the dynamic instruction
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

        # Connect to Gemini using LiveAPI with the session-specific config
        async with client.aio.live.connect(model=MODEL, config=live_config) as session:
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
                                    await session.send_text_input(txt)
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
            "You are YouthGuide, a supportive, empathetic AI mentor for young people. "
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
            "mood_percentage": 0,  # -100 to 100 scale (negative = negative mood, positive = positive mood)
            "energy_level": 0,  # 0-100 scale (0 = very low energy, 100 = very high energy)
            "stress_level": 0,  # 0-100 scale (0 = no stress, 100 = extreme stress)
            "mood_stability": "",  # e.g., "stable", "fluctuating", "improving"
            "mood_calmness": "",  # e.g., "calm", "anxious", "agitated"
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
        }

        user_prompt = (
            "Analyze the following conversation transcript and combine it with the previous summary to create an updated summary. "
            "The updated summary should reflect the user's progress and current wellness state. "
            "Focus on the youth's wellness state and the core points discussed. "
            "If a previous summary is provided, analyze the user's progress over time in the 'progress_analysis' field. "
            "Infer language if not explicit. "
            "Analyze the overall mood of the user based on their messages and provide: "
            "- A brief description in the 'mood' field (e.g., positive, neutral, anxious, hopeful). "
            "- A mood percentage on a scale of -100 to 100 in the 'mood_percentage' field (negative for negative mood, positive for positive mood, 0 for neutral). "
            "- An energy level on a scale of 0-100 in the 'energy_level' field (0 = very low energy, 100 = very high energy). "
            "- A stress level on a scale of 0-100 in the 'stress_level' field (0 = no stress, 100 = extreme stress). "
            "- Mood stability assessment in the 'mood_stability' field (e.g., stable, fluctuating, improving, declining). "
            "- Mood calmness level in the 'mood_calmness' field (e.g., calm, anxious, agitated, relaxed). "
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
        logger.info(f"Parsed summary object: {json.dumps(summary_obj, indent=2)}")

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
                    }
                }
            }
            response = requests.post("http://localhost:3000/save-summary", json=payload)
            response.raise_for_status()  # Raise an exception for bad status codes
            logger.info(f"✅ Summary sent to Node.js backend: {response.text}")
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
