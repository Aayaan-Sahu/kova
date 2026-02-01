import os
from openai import OpenAI
from services.session_state import SessionState

# Use the same client setup pattern but looking for Keywords AI base URL
_client = None

def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            base_url="https://api.keywordsai.co/api",
            api_key=os.getenv("KEYWORDS_AI_API_KEY")
        )
    return _client

def format_history_for_context(history: list[dict]) -> str:
    """Format transcript history for the LLM context."""
    if not history:
        return "(No conversation history yet)"
    
    formatted = []
    for msg in history[-20:]: # Last 20 turns
        speaker = msg.get("speaker", "Unknown").upper()
        text = msg.get("text", "")
        formatted.append(f"{speaker}: {text}")
    
    return "\n".join(formatted)

def chat_with_protector(user_query: str, session: SessionState) -> str:
    """
    Simulates a 'Protective Companion' Chatbot.
    Uses Claude 3.5 Sonnet (via Keywords AI) to answer user questions based on the live call context.
    """
    
    # 1. Prepare Context
    history_str = format_history_for_context(session.transcript_history)
    risk_info = f"Current Risk Score: {session.risk_score}/100\nConfidence Score: {session.confidence_score}/100"
    
    system_prompt = f"""You are a trusted, protective family companion AI. You are monitoring a live phone call to help protect the user (often an elderly person) from potential scams.

CONTEXT FROM LIVE CALL:
{risk_info}

RECENT TRANSCRIPT:
{history_str}

YOUR ROLE:
- Verify the user's concerns using the transcript and risk scores as evidence.
- If the risk is high, be firm but calm. Warn them clearly.
- If the risk is low, be reassuring but cautious.
- Your tone should be empathetic, patient, and protective (like a knowledgeable grandchild).
- Keep answers concise (2-3 sentences max) so they can read it quickly while on the phone.

User Question: {user_query}
"""

    try:
        response = _get_client().chat.completions.create(
            model="bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0", 
            messages=[
                {"role": "user", "content": system_prompt} # Claude often prefers single user prompt for context
            ],
            extra_body={"prompt_name": "kova-companion-v1"}, # Tag for analytics
            temperature=0.3,
            max_tokens=300
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error in chat_bot: {e}")
        return "I'm having trouble analyzing the call right now. Please hang up if you feel unsafe."
