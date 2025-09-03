import asyncio
import json
import base64
import os
from datetime import datetime, timezone

# Google Generative AI (Vertex) SDK
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

# Project/common bits
from common import (
    BaseWebSocketServer,
    logger,
    PROJECT_ID,
    LOCATION,
    MODEL,
    VOICE_NAME,
    SEND_SAMPLE_RATE,
    SYSTEM_INSTRUCTION,
)

# ---------------------------------------
# System instruction loader (robust)
# ---------------------------------------
def read_text_file_best_effort(path: str) -> str:
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
    with open(path, "rb") as f:
        raw = f.read()
    logger.warning(f"Fell back to bytes decode with replacement. Tried encodings: {tried}")
    return raw.decode("utf-8", errors="replace")

try:
    file_path = os.path.join(os.path.dirname(__file__), "system_instruction.txt")
    SYSTEM_INSTRUCTION = read_text_file_best_effort(file_path)
except FileNotFoundError:
    logger.error("system_instruction.txt not found. Using a default instruction.")
    SYSTEM_INSTRUCTION = "You are a helpful AI assistant."

# ---------------------------------------
# Google client
# ---------------------------------------
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

google_search_tool = Tool(google_search_retrieval=GoogleSearchRetrieval())

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
    tools=[],  # add tools later if you wire them
)

# ---------------------------------------
# Utilities
# ---------------------------------------
def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def extract_json(text: str) -> dict:
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
    m = (live_or_text_model or "").lower()
    if "live" in m or "native-audio" in m or "realtime" in m:
        if "2.5" in m or "2-5" in m:
            return "gemini-2.0-flash-exp"
        if "2.0" in m or "2-" in m:
            return "gemini-2.0-flash-exp"
        return "gemini-1.5-flash"
    return live_or_text_model or "gemini-1.5-flash"

# ---------------------------------------
# WebSocket server
# ---------------------------------------
class LiveAPIWebSocketServer(BaseWebSocketServer):
    """WebSocket server implementation using Gemini LiveAPI directly."""

    def __init__(self):
        super().__init__()
        self.session_transcripts = {}  # client_id -> list of {role, text, ts}
        self.session_ids = {}          # client_id -> latest session handle

    async def process_audio(self, websocket, client_id):
        # Track this client
        self.active_clients[client_id] = websocket
        self.session_transcripts[client_id] = []

        # Defaults for this connection; can be changed by client_settings
        audio_mime_type = f"audio/pcm;rate={SEND_SAMPLE_RATE}"  # e.g., "audio/webm;codecs=opus"
        expect_transport = "auto"  # "auto" | "binary" | "base64"

        # Connect to Gemini LiveAPI
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            async with asyncio.TaskGroup() as tg:
                audio_queue = asyncio.Queue()

                # ---------------------------
                # Incoming from browser
                # ---------------------------
                async def handle_websocket_messages():
                    nonlocal audio_mime_type, expect_transport
                    async for message in websocket:
                        # Binary frames = raw audio bytes (do NOT decode!)
                        if isinstance(message, (bytes, bytearray)):
                            audio_bytes = bytes(message)
                            if not audio_bytes:
                                continue
                            if "audio/pcm" in audio_mime_type and (len(audio_bytes) % 2 != 0):
                                logger.warning("Odd-length PCM16 buffer (%d bytes).", len(audio_bytes))
                            await audio_queue.put(audio_bytes)
                            continue

                        # Text frames = JSON control / base64 audio
                        try:
                            data = json.loads(message)
                        except json.JSONDecodeError:
                            logger.error("Invalid JSON message received (text frame). Head: %r", message[:80])
                            continue

                        mtype = data.get("type")

                        if mtype == "client_settings":
                            transport = (data.get("transport", {}) or {}).get("audio")
                            mime = (data.get("transport", {}) or {}).get("mime")
                            if transport in {"auto", "binary", "base64"}:
                                expect_transport = transport
                                logger.info("Set audio transport: %s", expect_transport)
                            if isinstance(mime, str) and mime:
                                audio_mime_type = mime
                                logger.info("Set audio mime_type: %s", audio_mime_type)
                            continue

                        if mtype in {"audio", "audio_base64"}:
                            b64 = data.get("data", "")
                            try:
                                audio_bytes = base64.b64decode(b64, validate=True)
                            except Exception as e:
                                logger.error("Bad base64 audio: %s", e)
                                continue
                            await audio_queue.put(audio_bytes)
                            continue

                        if mtype == "text":
                            txt = data.get("data", "")
                            logger.info("Received text: %s", txt)
                            if txt:
                                self.session_transcripts[client_id].append({
                                    "role": "user",
                                    "text": txt,
                                    "ts": datetime.now(timezone.utc).isoformat()
                                })
                            continue

                        if mtype == "end":
                            logger.info("Received end signal from client")
                            try:
                                saved_path = await self.summarize_and_store(client_id)
                                try:
                                    await websocket.send(json.dumps({
                                        "type": "summary_saved",
                                        "data": saved_path or "ok"
                                    }))
                                except Exception as se:
                                    logger.error("Error sending summary_saved over WS: %s", se)
                            except Exception as e:
                                logger.error("Summarization error: %s", e)
                                try:
                                    await websocket.send(json.dumps({
                                        "type": "summary_saved",
                                        "data": f"error: {e}"
                                    }))
                                except Exception as se:
                                    logger.error("Error sending error over WS: %s", se)
                            continue

                        if mtype == "ping":
                            try:
                                await websocket.send(json.dumps({"type": "pong"}))
                            except Exception as se:
                                logger.error("Error sending pong: %s", se)
                            continue

                        logger.debug("Unhandled message type: %r", mtype)

                # ---------------------------
                # To Gemini: send audio
                # ---------------------------
                async def process_and_send_audio():
                    nonlocal audio_mime_type
                    while True:
                        data = await audio_queue.get()
                        await session.send_realtime_input(
                            media={
                                "data": data,
                                "mime_type": audio_mime_type,  # dynamic per client settings
                            }
                        )
                        audio_queue.task_done()

                # ---------------------------
                # From Gemini: receive events
                # ---------------------------
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
                                    self.session_ids[client_id] = session_id
                                    try:
                                        await websocket.send(json.dumps({
                                            "type": "session_id",
                                            "data": session_id
                                        }))
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
                                        b64_audio = base64.b64encode(part.inline_data.data).decode("utf-8")
                                        mime = getattr(part.inline_data, "mime_type", None) or f"audio/pcm;rate=24000"  # default
                                        try:
                                            await websocket.send(json.dumps({
                                                "type": "audio",
                                                "data": b64_audio,
                                                "mime": mime
                                                }))
                                        except Exception as se:
                                            logger.error(f"Error sending audio over WS: {se}")


                            if server_content and server_content.turn_complete:
                                logger.info("✅ Gemini done talking")
                                try:
                                    await websocket.send(json.dumps({"type": "turn_complete"}))
                                except Exception as se:
                                    logger.error(f"Error sending turn_complete over WS: {se}")

                            output_transcription = getattr(server_content, "output_transcription", None)
                            if output_transcription and output_transcription.text:
                                text_out = output_transcription.text
                                output_transcriptions.append(text_out)
                                try:
                                    await websocket.send(json.dumps({
                                        "type": "text",
                                        "data": text_out
                                    }))
                                except Exception as se:
                                    logger.error(f"Error sending text over WS: {se}")
                                self.session_transcripts[client_id].append({
                                    "role": "assistant",
                                    "text": text_out,
                                    "ts": datetime.now(timezone.utc).isoformat()
                                })

                            input_transcription = getattr(server_content, "input_transcription", None)
                            if input_transcription and input_transcription.text:
                                text_in = input_transcription.text
                                input_transcriptions.append(text_in)
                                self.session_transcripts[client_id].append({
                                    "role": "user",
                                    "text": text_in,
                                    "ts": datetime.now(timezone.utc).isoformat()
                                })

                        logger.info("Output transcription: %s", "".join(output_transcriptions))
                        logger.info("Input transcription: %s", "".join(input_transcriptions))

                # Kick off tasks
                tg.create_task(handle_websocket_messages())
                tg.create_task(process_and_send_audio())
                tg.create_task(receive_and_play())

    # ---------------------------------------
    # Summarize & store
    # ---------------------------------------
    async def summarize_and_store(self, client_id: str):
        transcript = self.session_transcripts.get(client_id, [])
        if not transcript:
            logger.info("No transcript found; skipping summary.")
            return None

        flat_lines = []
        for turn in transcript:
            role = turn.get("role", "user")
            text = turn.get("text", "").strip()
            if text:
                flat_lines.append(f"{role.upper()}: {text}")
        flat_transcript = "\n".join(flat_lines)

        session_handle = self.session_ids.get(client_id)

        system_note = (
            "You are YouthGuide, a supportive, empathetic AI mentor for young people. "
            "Summarize the user's full conversation in a youth wellness context. "
            "You must NOT provide any medical diagnosis. "
            "Detect safety concerns and reflect them as flags only. "
            "Return STRICT JSON only—no markdown, no code fences, no extra text."
        )

        schema_hint = {
            "session_id": session_handle or "",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "language": "auto",
            "summary": "",
            "main_points": [],
            "emotions_themes": [],
            "stressors": [],
            "protective_factors": [],
            "coping_strategies_discussed": [],
            "goals_or_hopes": [],
            "action_items_suggested": [],
            "risk_flags": {
                "mentions_self_harm": False,
                "mentions_harming_others": False,
                "mentions_abuse_or_unsafe": False,
                "urgent_support_recommended": False
            },
            "suggestions_non_clinical": [],
        }

        user_prompt = (
            "Summarize the following conversation verbatim transcript between USER and ASSISTANT. "
            "Focus on the youth's wellness state and the core points discussed. "
            "Infer language if not explicit. "
            "Fill the provided JSON schema faithfully and only return the JSON object.\n\n"
            f"JSON_SCHEMA_EXAMPLE:\n{json.dumps(schema_hint, ensure_ascii=False, indent=2)}\n\n"
            f"TRANSCRIPT:\n{flat_transcript}"
        )

        summarizer_model = pick_summarizer_model(MODEL)
        if summarizer_model != MODEL:
            logger.info(f"Using summarizer model '{summarizer_model}' for generateContent (from '{MODEL}').")

        user_content = types.Content(role="user", parts=[types.Part(text=user_prompt)])

        gen = await client.aio.models.generate_content(
            model=summarizer_model,
            contents=[user_content],
            config=types.GenerateContentConfig(
                temperature=0.2,
                system_instruction=system_note,
                response_mime_type="application/json",
            ),
        )

        text = ""
        if gen and getattr(gen, "candidates", None):
            for c in gen.candidates:
                if getattr(c, "content", None) and getattr(c.content, "parts", None):
                    for p in c.content.parts:
                        if getattr(p, "text", None):
                            text += p.text

        summary_obj = extract_json(text) if text else {"raw": ""}

        out_dir = os.path.join(os.path.dirname(__file__), "data", "summaries")
        ensure_dir(out_dir)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        filename = f"{client_id}_{ts}.json"
        out_path = os.path.join(out_dir, filename)

        payload = {
            "meta": {
                "client_id": client_id,
                "session_id": session_handle,
                "saved_at_utc": datetime.now(timezone.utc).isoformat(),
            },
            "summary": summary_obj,
            "transcript": transcript,
        }

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        logger.info(f"✅ Summary saved to: {out_path}")
        return out_path

# ---------------------------------------
# Entrypoint
# ---------------------------------------
async def main():
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
