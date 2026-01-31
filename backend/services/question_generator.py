from typing import Dict, Optional
from openai import OpenAI
import os
import json
from prompts.question_gen import QUESTION_GENERATOR_SYSTEM_PROMPT, QUESTION_GENERATOR_USER_TEMPLATE
from services.session_state import SessionState

# Reuse the same lazy client pattern
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


from typing import Dict, Optional, Tuple

# ... imports ...

def generate_question(session: SessionState) -> Tuple[Optional[str], int]:
    """
    Decides if a verification question should be asked, and generates one if so.
    
    Args:
        session: The SessionState object with transcript history and scores.
        
    Returns:
        Tuple: (question_string_or_None, necessity_score_int)
    """
    
    # Format History
    history_str = "\n".join([_format_message(m) for m in session.transcript_history[-20:]])
    if not history_str:
        history_str = "(No conversation history yet)"
    
    # Determine last speaker
    last_speaker = "unknown"
    if session.transcript_history:
        last_speaker = session.transcript_history[-1].get("speaker", "unknown")
    
    # Construct Prompt
    user_content = QUESTION_GENERATOR_USER_TEMPLATE.format(
        risk_score=session.risk_score,
        confidence_score=session.confidence_score,
        formatted_history=history_str,
        last_speaker=last_speaker
    )

    try:
        response = _get_client().chat.completions.create(
            model="groq/llama-3.3-70b-versatile", 
            messages=[
                {"role": "system", "content": QUESTION_GENERATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            extra_body={"prompt_name": "kova-question-gen-v2"},
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
            
        result = json.loads(content)
        
        # Check if score meets threshold (7/10)
        score = result.get("necessity_score", 0)
        if score >= 7:
            return result.get("question"), score
        return None, score
        
    except Exception as e:
        print(f"Error in question generation: {e}")
        return None, 0
