import os
from openai import OpenAI
from services.session_state import SessionState
from prompts.chat_bot import CHATBOT_SYSTEM_PROMPT

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

def format_chatbot_history(history: list[dict]) -> str:
    """Format previous Q&A between User and Protector."""
    if not history:
        return "(No previous chat)"
    
    formatted = []
    # Only show last 6 turns (3 exchanges) to keep context focused
    for msg in history[-6:]:
        role = "YOU" if msg["role"] == "user" else "PROTECTOR"
        content = msg["content"]
        formatted.append(f"{role}: {content}")
    
    return "\n".join(formatted)

def chat_with_protector(user_query: str, session: SessionState) -> str:
    """
    Simulates a 'Protective Companion' Chatbot.
    Uses Claude 3.5 Sonnet (via Keywords AI) to answer user questions based on the live call context.
    """
    
    # 1. Prepare Context
    history_str = format_history_for_context(session.transcript_history)
    chat_history_str = format_chatbot_history(session.chatbot_history)
    risk_info = f"Current Risk Score: {session.risk_score}/100\nConfidence Score: {session.confidence_score}/100"
    
    system_prompt = CHATBOT_SYSTEM_PROMPT.format(
        risk_info=risk_info,
        history_str=history_str,
        chat_history_str=chat_history_str,
        user_query=user_query
    )

    # Update history immediately (optimistic)
    session.chatbot_history.append({"role": "user", "content": user_query})

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
        
        answer = response.choices[0].message.content
        session.chatbot_history.append({"role": "assistant", "content": answer})
        return answer
        
    except Exception as e:
        print(f"Error in chat_bot: {e}")
        return "I'm having trouble analyzing the call right now. Please hang up if you feel unsafe."
