SPEAKER_ID_PROMPT = """You are analyzing a phone call conversation between a USER (the person being called) and a CALLER (the person who initiated the call, possibly a scammer).

Previous conversation:
{history_context}

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
JSON response:
"""

