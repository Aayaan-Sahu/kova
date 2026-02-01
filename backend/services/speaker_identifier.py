from openai import AsyncOpenAI
import os
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

# Initialize Groq client
groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

ai_client = None
def get_ai_client():
    global ai_client
    if ai_client is None:
        ai_client = AsyncOpenAI(
            base_url="https://api.keywordsai.co/api",
            api_key=os.getenv("KEYWORDS_API_KEY"),
        )
    return ai_client

async def identify_speakers(transcript: str, conversation_history: list[dict]) -> list[dict]:
    """
    Use Groq LLM to identify which parts of the transcript belong to User vs Caller.
    
    Args:
        transcript: The new transcript text to analyze
        conversation_history: Previous identified segments for context
        
    Returns:
        List of segments with speaker labels: [{"speaker": "user"|"caller", "text": "..."}]
    """
    
    # Build context from history
    history_context = ""
    if conversation_history:
        recent_history = conversation_history[-10:]  # Last 10 segments for context
        for seg in recent_history:
            history_context += f"{seg['speaker'].upper()}: {seg['text']}\n"
    
    prompt = f"""You are analyzing a phone call conversation between a USER (the person being called) and a CALLER (the person who initiated the call, possibly a scammer).

Previous conversation:
{history_context if history_context else "(No previous context)"}

New transcript to analyze:
"{transcript}"

Your task: Split this transcript into segments, identifying who said each part.
Rules:
- The CALLER typically: introduces themselves, asks for information, makes claims about accounts/money
- The USER typically: asks questions, expresses confusion, responds to the caller
- If someone says "hello?" or answers, they're likely the USER
- If someone introduces themselves as from a company/agency, they're likely the CALLER

Respond ONLY with valid JSON array. Each object has "speaker" (either "user" or "caller") and "text" (the words they said).
Example: [{{"speaker": "caller", "text": "Hello, this is John from the IRS."}}, {{"speaker": "user", "text": "Oh, what is this about?"}}]

If you cannot determine the speaker, default to "caller" for statements and "user" for questions.
JSON response:"""

    try:
        response = await get_ai_client().chat.completions.create(
            model="groq/llama-3.3-70b-versatile",  # Fast and accurate
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,  # Low temperature for consistent output
            max_tokens=500,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        # Handle potential markdown code blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        segments = json.loads(content)
        
        # Validate structure
        validated = []
        for seg in segments:
            if isinstance(seg, dict) and "speaker" in seg and "text" in seg:
                speaker = seg["speaker"].lower()
                if speaker not in ["user", "caller"]:
                    speaker = "caller"  # Default
                validated.append({
                    "speaker": speaker,
                    "text": seg["text"]
                })
        
        return validated if validated else [{"speaker": "caller", "text": transcript}]
        
    except Exception as e:
        print(f"Groq error: {e}")
        # Fallback: return as unknown speaker
        return [{"speaker": "caller", "text": transcript}]
