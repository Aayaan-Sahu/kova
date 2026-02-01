from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import session_manager
from services.chat_bot import chat_with_protector

router = APIRouter()

class ChatRequest(BaseModel):
    session_id: str
    query: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint for the 'Protective Companion' chatbot.
    Retrieves the live session state and generates a contextual answer.
    """
    
    # 1. Retrieve the active session
    session = session_manager.get_session(request.session_id)
    
    if not session:
        # If no active session found (e.g. testing without a call), 
        # we can either return an error or create a dummy empty session for demo purposes.
        # For now, let's return a specific message.
        raise HTTPException(status_code=404, detail="Active call session not found.")
        
    # 2. Call the service logic
    answer = chat_with_protector(request.query, session)
    
    # 3. Inject User Input into the Brain (Scam Detector)
    # We treat this as a "USER_INPUT" chunk which the prompt now prioritizes.
    from services.workflow import process_chunk
    
    # We fire and forget this processing so we don't block the chat response too much
    # (Though in sync python this still blocks. For hackathon speed it's fine.)
    process_chunk(
        new_chunk={"speaker": "USER_INPUT", "text": request.query},
        transcript_history=session.transcript_history,
        risk_score=session.risk_score,
        confidence_score=session.confidence_score,
        emergency_contacts=session.emergency_contacts,
        last_alert_time=session.last_alert_time,
        last_question_time=session.last_question_time,
        caller_phone_number=session.caller_phone_number,
        suspicious_number_reported=session.suspicious_number_reported
    )
    
    return ChatResponse(response=answer)
