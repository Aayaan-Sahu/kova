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
    
    return ChatResponse(response=answer)
