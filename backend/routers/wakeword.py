"""
WebSocket router for wake word detection using Deepgram.
"""
import asyncio
from fastapi import APIRouter, WebSocket, Query
from starlette.websockets import WebSocketDisconnect

from services.deepgram_client import create_live_connection

router = APIRouter()


@router.websocket("/ws/wakeword")
async def wakeword_websocket(
    websocket: WebSocket,
    sample_rate: int = Query(default=48000),
    wake_word: str = Query(default="hello"),
):
    """
    WebSocket endpoint for wake word detection.
    Streams audio to Deepgram and watches for the wake word.
    Sends {"detected": true} when wake word is found, then closes.
    """
    await websocket.accept()
    print(f"[WakeWord] Client connected (sample_rate={sample_rate}, wake_word='{wake_word}')")
    
    wake_word_lower = wake_word.lower()
    detected = False
    
    try:
        async with create_live_connection(sample_rate) as dg_connection:
            
            async def receive_transcripts():
                """Receive transcripts from Deepgram and check for wake word."""
                nonlocal detected
                try:
                    async for message in dg_connection:
                        if detected:
                            return
                            
                        if not (hasattr(message, "channel") and message.channel):
                            continue
                            
                        transcript = message.channel.alternatives[0].transcript
                        if not transcript:
                            continue
                        
                        transcript_lower = transcript.lower()
                        print(f"[WakeWord] Heard: {transcript}")
                        
                        is_match = False
                        
                        if "kova" in wake_word_lower:
                            # Syllable matching for "kova" (not a real word)
                            # First syllable: "ko" or "co" 
                            # Second syllable: "va" or "vah"
                            first_syllables = ["ko", "co"]
                            second_syllables = ["va", "vah", "ver"]
                            
                            has_first = any(s in transcript_lower for s in first_syllables)
                            has_second = any(s in transcript_lower for s in second_syllables)
                            has_activate = "activate" in transcript_lower
                            
                            # Match if we have both syllables of "kova" + "activate"
                            if has_first and has_second and has_activate:
                                is_match = True
                                print(f"[WakeWord] Syllable match: first={has_first}, second={has_second}, activate={has_activate}")
                        else:
                            # Exact match for other wake words
                            is_match = wake_word_lower in transcript_lower
                        
                        if is_match:
                            print(f"[WakeWord] Wake word '{wake_word}' detected!")
                            detected = True
                            await websocket.send_json({"detected": True, "transcript": transcript})
                            return
                except Exception as e:
                    print(f"[WakeWord] Receiver error: {e}")

            async def send_audio():
                """Receive audio from browser and send to Deepgram."""
                nonlocal detected
                try:
                    while not detected:
                        data = await websocket.receive_bytes()
                        if not detected:
                            await dg_connection.send_media(data)
                except WebSocketDisconnect:
                    print("[WakeWord] Client disconnected")

            # Run both tasks, but cancel when wake word detected
            receive_task = asyncio.create_task(receive_transcripts())
            send_task = asyncio.create_task(send_audio())
            
            # Wait for either task to complete (wake word found or disconnect)
            done, pending = await asyncio.wait(
                [receive_task, send_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    except Exception as e:
        print(f"[WakeWord] Error: {e}")

    finally:
        try:
            await websocket.close()
        except Exception:
            pass  # Already closed
        print("[WakeWord] Connection closed")
