"""
Test the LangGraph orchestrator.
"""
import os
import sys
from dotenv import load_dotenv

# Ensure we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from services.workflow import process_chunk


def test_full_scam_flow():
    """Test that a scam call triggers both questions AND eventually an alert."""
    print("=== Testing LangGraph: Full Scam Flow ===\n")
    
    history = []
    risk = 0
    conf = 0
    
    chunks = [
        {"speaker": "caller", "text": "Hey grandma, it's me! I lost my phone so I'm calling from a friend's number."},
        {"speaker": "user", "text": "Who is this?"},
        {"speaker": "caller", "text": "It's your favorite grandchild! I got into some trouble and I need help."},
        {"speaker": "user", "text": "What kind of trouble?"},
        {"speaker": "caller", "text": "I need $2000 for bail. Can you go to Walmart and get a money order? Don't tell mom and dad."},
        {"speaker": "user", "text": "Okay, I'm heading to Walmart now. How do I send it?"},
        {"speaker": "caller", "text": "Just ask for a MoneyGram. Send it to John Doe in Miami. Hurry, please!"},
    ]
    
    last_alert_time = 0
    
    for i, chunk in enumerate(chunks, 1):
        print(f"\n--- Turn {i} ---")
        print(f"{chunk['speaker'].upper()}: {chunk['text']}")
        
        result = process_chunk(
            new_chunk=chunk,
            transcript_history=history,
            risk_score=risk,
            confidence_score=conf,
            emergency_contacts=["+16692940189"],
            last_alert_time=last_alert_time
        )
        
        # Update state for next iteration
        history = result["transcript_history"]
        risk = result["risk_score"]
        conf = result["confidence_score"]
        last_alert_time = result.get("last_alert_time", last_alert_time)
        
        print(f"Risk: {risk}/100 | Confidence: {conf}/100")
        print(f"Necessity Score: {result.get('necessity_score', 0)}/10")
        print(f"Reasoning: {result['latest_reasoning']}")
        
        if result["suggested_question"]:
            print(f"📋 Suggested Question: {result['suggested_question']}")
        
        if result["alert_sent"]:
            print("🚨 ALERT SENT!")
        else:
            if risk >= 80 and conf >= 70:
                print("⏳ Alert skipped (Throttled)")
    
    print("\n\n=== Final Results ===")
    print(f"Final Risk: {risk}/100")
    print(f"Final Confidence: {conf}/100")
    
    if risk > 80:
        print("✅ SUCCESS: Scam correctly detected!")
    else:
        print("❌ FAILURE: Scam not detected")


def test_safe_call_flow():
    """Test that a normal call keeps risk low and generates questions initially."""
    print("\n\n=== Testing LangGraph: Safe Call Flow ===\n")
    
    history = []
    risk = 0
    conf = 0
    
    chunks = [
        {"speaker": "caller", "text": "Hi, this is the pharmacy calling about your prescription refill."},
        {"speaker": "user", "text": "Oh yes, which prescription?"},
        {"speaker": "caller", "text": "Your blood pressure medication. It's ready for pickup. No payment needed, it's covered by insurance."},
        {"speaker": "user", "text": "Great, I'll pick it up this afternoon."},
    ]
    
    for i, chunk in enumerate(chunks, 1):
        print(f"\n--- Turn {i} ---")
        print(f"{chunk['speaker'].upper()}: {chunk['text']}")
        
        result = process_chunk(
            new_chunk=chunk,
            transcript_history=history,
            risk_score=risk,
            confidence_score=conf,
            emergency_contacts=[]
        )
        
        history = result["transcript_history"]
        risk = result["risk_score"]
        conf = result["confidence_score"]
        
        print(f"Risk: {risk}/100 | Confidence: {conf}/100")
        print(f"Necessity Score: {result.get('necessity_score', 0)}/10")
        print(f"Reasoning: {result['latest_reasoning']}")
        
        if result["suggested_question"]:
            print(f"📋 Suggested Question: {result['suggested_question']}")
    
    print("\n\n=== Final Results ===")
    print(f"Final Risk: {risk}/100")
    print(f"Final Confidence: {conf}/100")
    
    if risk < 30:
        print("✅ SUCCESS: Safe call correctly identified!")
    else:
        print("❌ FAILURE: False positive - safe call flagged as risky")


if __name__ == "__main__":
    test_full_scam_flow()
    test_safe_call_flow()
