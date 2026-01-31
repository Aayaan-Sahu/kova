import os
import sys
from dotenv import load_dotenv

# Ensure we can import from backend no matter where we run this
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.session_state import SessionState
from backend.services.scam_detector import analyze_transcript

# 1. Load Environment Variables (API Keys)
load_dotenv()

def test_tech_support_scam():
    print("--- Test 1: Tech Support Scam ---")
    
    session = SessionState()
    
    # Turn 1: Caller introduces themselves
    print("\n[Turn 1] Caller: Microsoft Security calling...")
    chunk1 = {"speaker": "caller", "text": "Hello, this is Microsoft Security calling. We've detected suspicious activity on your computer."}
    analyze_transcript(chunk1, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")

    # Turn 2: User responds
    print("\n[Turn 2] User: What kind of activity?")
    chunk2 = {"speaker": "user", "text": "What kind of activity? I haven't noticed anything wrong."}
    analyze_transcript(chunk2, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")

    # Turn 3: Caller asks for remote access
    print("\n[Turn 3] Caller: We need to connect with TeamViewer...")
    chunk3 = {"speaker": "caller", "text": "We need to connect to your computer using TeamViewer to fix the issue. Can you download it for me?"}
    analyze_transcript(chunk3, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")

    # Turn 4: Caller asks for payment
    print("\n[Turn 4] Caller: There's a $299 fee for the security package...")
    chunk4 = {"speaker": "caller", "text": "To protect your computer, you'll need our security package. It's $299. Do you have a credit card handy?"}
    analyze_transcript(chunk4, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")
    
    if session.risk_score > 80:
        print("\nSUCCESS: Scam detected!")
    else:
        print("\nWARNING: Scam score too low.")


def test_grandparent_scam():
    print("\n\n--- Test 2: Grandparent Scam (AI Voice Phishing) ---")
    
    session = SessionState()
    
    # Turn 1: Caller claims to be grandchild
    print("\n[Turn 1] Caller: Hey grandma, it's me!")
    chunk1 = {"speaker": "caller", "text": "Hey grandma, it's me! I lost my phone so I'm calling from a friend's number."}
    analyze_transcript(chunk1, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")

    # Turn 2: Grandma asks verification question
    print("\n[Turn 2] User: Which grandchild is this?")
    chunk2 = {"speaker": "user", "text": "Which grandchild is this? I have several."}
    analyze_transcript(chunk2, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")

    # Turn 3: Caller gives vague answer and creates urgency
    print("\n[Turn 3] Caller: It's your favorite! I'm in trouble...")
    chunk3 = {"speaker": "caller", "text": "It's your favorite grandchild! Listen, I'm in a bit of trouble. I got into a car accident and I need help."}
    analyze_transcript(chunk3, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")

    # Turn 4: Grandma asks another verification question
    print("\n[Turn 4] User: Are you okay? What's your dog's name?")
    chunk4 = {"speaker": "user", "text": "Oh no! Are you okay? Wait, what's your dog's name? I just want to make sure it's really you."}
    analyze_transcript(chunk4, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")

    # Turn 5: Caller dodges and asks for money
    print("\n[Turn 5] Caller: Grandma please, I need $2000 for bail...")
    chunk5 = {"speaker": "caller", "text": "Grandma, please, I don't have time for this. I need you to send $2000 for bail. Can you go to Walmart and get a money order? And please don't tell mom and dad, they'll be so disappointed."}
    analyze_transcript(chunk5, session)
    print(f"Result -> Risk: {session.risk_score}/100 | Confidence: {session.confidence_score}/100 | Reasoning: {session.latest_reasoning}")
    
    if session.risk_score > 80:
        print("\nSUCCESS: Grandparent scam detected!")
    else:
        print("\nWARNING: Scam score too low.")



if __name__ == "__main__":
    test_tech_support_scam()
    test_grandparent_scam()


