"""
WebSocket router for real-time audio transcription.
"""
import json
import asyncio
from fastapi import APIRouter, WebSocket, Query
from starlette.websockets import WebSocketDisconnect

from services.deepgram_client import create_live_connection
from services.transcript_processor import TranscriptProcessor
from services.workflow import process_chunk

router = APIRouter()


@router.websocket("/ws/audio")
async def audio_websocket(
    websocket: WebSocket,
    sample_rate: int = Query(default=48000),
):
    """
    WebSocket endpoint for real-time audio transcription and scam detection.
    """
    await websocket.accept()
    print(f"[WS] Client connected (sample_rate={sample_rate})")
    
    processor = TranscriptProcessor()
    
    # Session state for scam detection
    session = {
        "transcript_history": [],
        "risk_score": 0,
        "confidence_score": 0,
        "last_alert_time": 0,
        "emergency_contacts": ["+16692940189"],  # Replace with real number
    }

    try:
        async with create_live_connection(sample_rate) as dg_connection:

            async def receive_transcripts():
                """Receive transcripts from Deepgram, identify speakers, run scam detection."""
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
                                
                                # Run scam detection on combined segments
                                result = None
                                for seg in segments:
                                    # Add segment to history, then run detection on latest
                                    result = process_chunk(
                                        new_chunk=seg,
                                        transcript_history=session["transcript_history"],
                                        risk_score=session["risk_score"],
                                        confidence_score=session["confidence_score"],
                                        emergency_contacts=session["emergency_contacts"],
                                        last_alert_time=session["last_alert_time"],
                                    )
                                    # Update history from result (process_chunk appends chunk internally)
                                    session["transcript_history"] = result["transcript_history"]
                                    session["risk_score"] = result["risk_score"]
                                    session["confidence_score"] = result["confidence_score"]
                                    session["last_alert_time"] = result["last_alert_time"]
                                
                                print(f"[SCAM] Risk: {session['risk_score']} | Conf: {session['confidence_score']}")
                                if result and result.get("suggested_question"):
                                    print(f"[SCAM] Suggested Question: {result['suggested_question']}")
                                
                                response = {
                                    "type": "transcript",
                                    "segments": segments,
                                    "risk_score": session["risk_score"],
                                    "confidence_score": session["confidence_score"],
                                    "reasoning": result["latest_reasoning"] if result else "",
                                    "suggested_question": result.get("suggested_question") if result else None,
                                    "alert_sent": result.get("alert_sent", False) if result else False,
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
