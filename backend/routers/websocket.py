"""
WebSocket router for real-time audio transcription.
"""
import json
import asyncio
from fastapi import APIRouter, WebSocket, Query
from starlette.websockets import WebSocketDisconnect

from services.deepgram_client import create_live_connection
from services.transcript_processor import TranscriptProcessor

router = APIRouter()


@router.websocket("/ws/audio")
async def audio_websocket(
    websocket: WebSocket,
    sample_rate: int = Query(default=48000),
):
    """
    WebSocket endpoint for real-time audio transcription.
    
    Accepts raw PCM audio (linear16) and returns JSON messages with
    speaker-identified transcript segments.
    """
    await websocket.accept()
    print(f"[WS] Client connected (sample_rate={sample_rate})")
    
    processor = TranscriptProcessor()

    try:
        async with create_live_connection(sample_rate) as dg_connection:

            async def receive_transcripts():
                """Receive transcripts from Deepgram and process them."""
                try:
                    async for message in dg_connection:
                        if not (hasattr(message, "channel") and message.channel):
                            continue
                            
                        transcript = message.channel.alternatives[0].transcript
                        is_final = getattr(message, 'is_final', False)
                        
                        if not transcript:
                            continue
                            
                        print(f"[DG] {'Final' if is_final else 'Interim'}: {transcript}")
                        
                        if is_final:
                            processor.add_transcript(transcript)
                            
                            if processor.should_process():
                                segments = await processor.process_buffer()
                                
                                response = {
                                    "type": "transcript",
                                    "segments": segments
                                }
                                print(f"[WS] Sending {len(segments)} segment(s) to client")
                                await websocket.send_text(json.dumps(response))
                                
                except Exception as e:
                    print(f"[DG] Receiver error: {e}")

            async def send_audio():
                """Receive audio from browser and send to Deepgram."""
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await dg_connection.send_media(data)
                except WebSocketDisconnect:
                    print("[WS] Client disconnected")

            await asyncio.gather(receive_transcripts(), send_audio())

    except Exception as e:
        print(f"[WS] Error: {e}")

    finally:
        await websocket.close()
        print("[WS] Connection closed")
