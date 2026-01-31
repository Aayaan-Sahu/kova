from typing import List, Dict
from openai import OpenAI
import os
import json
from prompts.scam_detection import SCAM_DETECTION_SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from services.session_state import SessionState

# Client will be initialized lazily
_client = None

def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            base_url="https://api.keywordsai.co/api",
            api_key=os.getenv("KEYWORDS_AI_API_KEY")
        )
    return _client


def _format_message(msg: Dict[str, str]) -> str:
    """Helper to format a single message dict into 'Speaker: Text'."""
    speaker = msg.get("speaker", "Unknown").capitalize()
    text = msg.get("text", "")
    return f"**{speaker}**: {text}"

def analyze_transcript(new_chunk: Dict[str, str], session: SessionState) -> None:
    """
    Analyzes a new chunk, updates the SessionState IN-PLACE.
    
    Args:
        new_chunk: Dict like {"speaker": "caller", "text": "Hello"}
        session: The SessionState object for this user.
    """
    
    # 1. Add the new chunk to history immediately (so it's included in next turns context)
    # NOTE: Depending on your logic, you might want it in history NOW or AFTER analysis. 
    # Usually you want the AI to see the *previous* context + *new* chunk.
    # The prompt expects "Previous History" vs "New Chunk", so we rely on session.transcript_history 
    # being the *previous* turns. 
    
    # Format History (Exclude the very newest chunk since we pass it separately)
    history_str = "\n".join([_format_message(m) for m in session.transcript_history[-20:]]) # last 20 turns
    if not history_str:
        history_str = "(No previous history)"
        
    # Format New Chunk
    new_chunk_str = _format_message(new_chunk)
    
    # 2. Construct Prompt
    user_content = USER_PROMPT_TEMPLATE.format(
        risk_score=session.risk_score,
        confidence=session.confidence_score,
        formatted_history=history_str,
        formatted_new_chunk=new_chunk_str
    )

    try:
        response = _get_client().chat.completions.create(
            model="groq/llama-3.3-70b-versatile", 
            messages=[
                {"role": "system", "content": SCAM_DETECTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            extra_body={"prompt_name": "kova-guard-v1"},
            temperature=0.0
        )
        
        # 3. Parse and Update State
        content = response.choices[0].message.content
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
            
        result = json.loads(content)
        
        # UPDATE THE SESSION DIRECTLY
        session.risk_score = result.get("risk_score", session.risk_score)
        session.confidence_score = result.get("confidence_score", session.confidence_score)
        session.latest_reasoning = result.get("reasoning", "")
        
        # Now append the new chunk to history so it's there for next time
        session.add_turn(new_chunk["speaker"], new_chunk["text"])
        
    except Exception as e:
        print(f"Error in scam detection: {e}")
        # On error, we just append the text to history anyway so we don't lose the record
        session.add_turn(new_chunk["speaker"], new_chunk["text"])
