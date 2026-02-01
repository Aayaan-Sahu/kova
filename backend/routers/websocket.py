"""
WebSocket router for real-time audio transcription.
"""
import json
import asyncio
import time
from fastapi import APIRouter, WebSocket, Query
from starlette.websockets import WebSocketDisconnect

from services.deepgram_client import create_live_connection
from services.transcript_processor import TranscriptProcessor
from services.workflow import process_chunk
from services import session_manager
from services.session_state import SessionState
from services.supabase_client import update_call_analytics

router = APIRouter()


def detect_kova_stop(transcript: str) -> bool:
    """
    Detect "kova stop" command using syllable matching.
    "kova" isn't a real word, so we match syllables:
    - First syllable: "ko" or "co"
    - Second syllable: "va", "vah", or "ver"
    Plus the word "stop"
    """
    transcript_lower = transcript.lower()
    
    first_syllables = ["ko", "co"]
    second_syllables = ["va", "vah", "ver", "vid", "bra"]
    
    has_first = any(s in transcript_lower for s in first_syllables)
    has_second = any(s in transcript_lower for s in second_syllables)
    has_stop = "stop" in transcript_lower
    
    if has_first and has_second and has_stop:
        print(f"[WS] 'kova stop' detected! (first={has_first}, second={has_second}, stop={has_stop})")
        return True
    return False


@router.websocket("/ws/audio")
async def audio_websocket(
    websocket: WebSocket,
    sample_rate: int = Query(default=48000),
    caller_phone_number: str = Query(default=None),
    session_id: str = Query(default=None),
    user_id: str = Query(default=None),  # For analytics tracking
):
    """
    WebSocket endpoint for real-time audio transcription and scam detection.
    """
    await websocket.accept()
    print(f"[WS] Client connected (sample_rate={sample_rate}, caller={caller_phone_number}, user={user_id})")
    
    # Track call start time for analytics
    call_start_time = time.time()
    questions_generated_count = 0
    alerts_sent_count = 0
    
    processor = TranscriptProcessor()
    
    # Session state for scam detection
    session = {
        "transcript_history": [],
        "risk_score": 0,
        "confidence_score": 0,
        "last_alert_time": 0,
        "last_question_time": 0,
        "emergency_contacts": ["+16692940189"],  # Replace with real number
        "caller_phone_number": caller_phone_number,
        "suspicious_number_reported": False,
    }

    # Register session for Chatbot access
    if session_id:
        print(f"[WS] Registering session: {session_id}")
        live_session = SessionState()
        # Initialize workflow state for chat endpoint
        live_session.emergency_contacts = session["emergency_contacts"]
        live_session.caller_phone_number = session["caller_phone_number"]
        session_manager.save_session(session_id, live_session)
    else:
        live_session = None

    try:
        async with create_live_connection(sample_rate) as dg_connection:

            async def receive_transcripts():
                """Receive transcripts from Deepgram, identify speakers, run scam detection."""
                nonlocal questions_generated_count, alerts_sent_count
                try:
                    async for message in dg_connection:
                        if not (hasattr(message, "channel") and message.channel):
                            continue
                            
                        transcript = message.channel.alternatives[0].transcript
                        is_final = getattr(message, 'is_final', False)
                        
                        if not transcript:
                            continue
                            
                        print(f"[DG] {'Final' if is_final else 'Interim'}: {transcript}")
                        
                        # Check for "kova stop" voice command
                        if detect_kova_stop(transcript):
                            await websocket.send_text(json.dumps({
                                "type": "stop_call",
                                "transcript": transcript
                            }))
                            return  # Exit the transcript loop
                        
                        if is_final:
                            processor.add_transcript(transcript)
                            
                            if processor.should_process():
                                segments = await processor.process_buffer()
                                
                                # Run scam detection on combined segments
                                result = None
                                for seg in segments:
                                    # Add segment to history, then run detection on latest
                                    # Run scam detection in a separate thread to avoid blocking the WebSocket event loop
                                    result = await asyncio.to_thread(
                                        process_chunk,
                                        new_chunk=seg,
                                        transcript_history=session["transcript_history"],
                                        risk_score=session["risk_score"],
                                        confidence_score=session["confidence_score"],
                                        emergency_contacts=session["emergency_contacts"],
                                        last_alert_time=session["last_alert_time"],
                                        last_question_time=session.get("last_question_time", 0),
                                        caller_phone_number=session.get("caller_phone_number"),
                                        suspicious_number_reported=session.get("suspicious_number_reported", False),
                                    )
                                    # Update history from result (process_chunk appends chunk internally)
                                    session["transcript_history"] = result["transcript_history"]
                                    session["risk_score"] = result["risk_score"]
                                    session["confidence_score"] = result["confidence_score"]
                                    session["last_alert_time"] = result["last_alert_time"]
                                    session["last_question_time"] = result.get("last_question_time", 0)
                                    session["suspicious_number_reported"] = result.get("suspicious_number_reported", False)
                                    
                                    # Sync with shared session state for Chatbot
                                    if live_session:
                                        live_session.transcript_history = session["transcript_history"]
                                        live_session.risk_score = session["risk_score"]
                                        live_session.confidence_score = session["confidence_score"]
                                        live_session.latest_reasoning = result.get("latest_reasoning", "")
                                        live_session.last_alert_time = session["last_alert_time"]
                                        live_session.last_question_time = session["last_question_time"]
                                        live_session.suspicious_number_reported = session["suspicious_number_reported"]
                                
                                print(f"[SCAM] Risk: {session['risk_score']} | Conf: {session['confidence_score']}")
                                if result and result.get("suggested_question"):
                                    print(f"[SCAM] Suggested Question: {result['suggested_question']}")
                                    questions_generated_count += 1
                                
                                response = {
                                    "type": "transcript",
                                    "segments": segments,
                                    "risk_score": session["risk_score"],
                                    "confidence_score": session["confidence_score"],
                                    "reasoning": result["latest_reasoning"] if result else "",
                                    "suggested_question": result.get("suggested_question") if result else None,
                                    "alert_sent": result.get("alert_sent", False) if result else False,
                                }
                                if result and result.get("alert_sent"):
                                    alerts_sent_count += 1
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
        # Update analytics on call end (wrapped in try/except to never break core functionality)
        try:
            if user_id:
                call_duration = int(time.time() - call_start_time)
                final_risk = session.get("risk_score", 0)
                was_scam = final_risk >= 80
                await asyncio.to_thread(
                    update_call_analytics,
                    user_id=user_id,
                    call_duration_seconds=call_duration,
                    final_risk_score=final_risk,
                    caller_phone_number=caller_phone_number,
                    was_scam=was_scam,
                    questions_generated=questions_generated_count,
                    alerts_sent=alerts_sent_count,
                )
        except Exception as analytics_error:
            print(f"[WS] Analytics update failed (non-blocking): {analytics_error}")
        
        if session_id:
            session_manager.delete_session(session_id)
        try:
            await websocket.close()
        except Exception:
            pass  # Already closed
        print("[WS] Connection closed")