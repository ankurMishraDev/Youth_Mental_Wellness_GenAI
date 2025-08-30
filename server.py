import asyncio
import json
import base64
import os

# Import Google Generative AI components
from google import genai
from google.genai import types
from google.genai.types import (
    LiveConnectConfig,
    SpeechConfig,
    VoiceConfig,
    PrebuiltVoiceConfig,
    # --- FIXED: Added necessary imports for the tool ---
    Tool,
    GoogleSearchRetrieval,
)

# Import common components
from common import (
    BaseWebSocketServer,
    logger,
    PROJECT_ID,
    LOCATION,
    MODEL,
    VOICE_NAME,
    SEND_SAMPLE_RATE,
    SYSTEM_INSTRUCTION,
    get_order_status,
)

# --- This section is kept as is, it correctly loads the instruction from a file ---
# Ensure 'system_instruction.txt' exists in the same directory as this script.
try:
    file_path = os.path.join(os.path.dirname(__file__), "system_instruction.txt")
    with open(file_path, 'r') as file:
        SYSTEM_INSTRUCTION = file.read()
except FileNotFoundError:
    logger.error("Error: system_instruction.txt not found. Using a default instruction.")
    SYSTEM_INSTRUCTION = "You are a helpful AI assistant."


# Initialize Google client
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)


# --- FIXED: Properly define the Google Search tool object before using it ---
google_search_tool = Tool(
    google_search_retrieval=GoogleSearchRetrieval()
)


# LiveAPI Configuration
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
    # --- FIXED: Use the correctly defined tool variable ---
    tools=[],
)


class LiveAPIWebSocketServer(BaseWebSocketServer):
    """WebSocket server implementation using Gemini LiveAPI directly."""

    async def process_audio(self, websocket, client_id):
        # Store reference to client
        self.active_clients[client_id] = websocket

        # Connect to Gemini using LiveAPI
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            async with asyncio.TaskGroup() as tg:
                # Create a queue for audio data from the client
                audio_queue = asyncio.Queue()

                # Task to process incoming WebSocket messages
                async def handle_websocket_messages():
                    async for message in websocket:
                        try:
                            data = json.loads(message)
                            if data.get("type") == "audio":
                                audio_bytes = base64.b64decode(data.get("data", ""))
                                await audio_queue.put(audio_bytes)
                            elif data.get("type") == "end":
                                logger.info("Received end signal from client")
                            elif data.get("type") == "text":
                                logger.info(f"Received text: {data.get('data')}")
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
                                    session_id_msg = json.dumps({
                                        "type": "session_id", "data": session_id
                                    })
                                    await websocket.send(session_id_msg)

                            if response.go_away is not None:
                                logger.info(f"Session will terminate in: {response.go_away.time_left}")

                            server_content = response.server_content

                            if (hasattr(server_content, "interrupted") and server_content.interrupted):
                                logger.info("🤐 INTERRUPTION DETECTED")
                                await websocket.send(json.dumps({
                                    "type": "interrupted",
                                    "data": "Response interrupted by user input"
                                }))

                            if server_content and server_content.model_turn:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data:
                                        b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                        await websocket.send(json.dumps({
                                            "type": "audio", "data": b64_audio
                                        }))

                            if server_content and server_content.turn_complete:
                                logger.info("✅ Gemini done talking")
                                await websocket.send(json.dumps({ "type": "turn_complete" }))

                            output_transcription = getattr(response.server_content, "output_transcription", None)
                            if output_transcription and output_transcription.text:
                                output_transcriptions.append(output_transcription.text)
                                await websocket.send(json.dumps({
                                    "type": "text", "data": output_transcription.text
                                }))

                            input_transcription = getattr(response.server_content, "input_transcription", None)
                            if input_transcription and input_transcription.text:
                                input_transcriptions.append(input_transcription.text)

                        logger.info(f"Output transcription: {''.join(output_transcriptions)}")
                        logger.info(f"Input transcription: {''.join(input_transcriptions)}")

                # Start all tasks
                tg.create_task(handle_websocket_messages())
                tg.create_task(process_and_send_audio())
                tg.create_task(receive_and_play())


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