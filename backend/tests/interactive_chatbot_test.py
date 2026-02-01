import os
import sys

# Add backend directory to sys.path so we can import services
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from services.session_state import SessionState
from services.chat_bot import chat_with_protector

def main():
    # 1. Setup Fake Scam Session
    session = SessionState()
    # High risk scenario
    session.risk_score = 88
    session.confidence_score = 92
    
    # Pre-load a "Grandson in Jail" scam script
    scam_script = [
        ("caller", "Hi Grandma, it's me. I'm in big trouble."),
        ("user", "Oh my god, is that you David? You sound different."),
        ("caller", "Yeah, I have a cold. Listen, I was in a car accident and the police are here."),
        ("caller", "They found drugs in the other car and they're blaming me."),
        ("user", "David! What are you saying?"),
        ("caller", "I need you to help me. Don't tell Mom or Dad, they'll kill me."),
        ("caller", "I'm scared Grandma. The public defender says I need $5,000 for bail."),
        ("caller", "You have to wire it or buy gift cards from Target immediately."),
    ]
    
    print("\n--- SIMULATED SCAM CALL HISTORY ---")
    for speaker, text in scam_script:
        session.add_turn(speaker, text)
        print(f"{speaker.upper()}: {text}")
    print("-----------------------------------\n")
    
    print(f"Risk Score: {session.risk_score}/100 | Confidence: {session.confidence_score}/100")
    print("The 'Protective Companion' is listening. Ask a question about this call.")
    print("Example: 'Is this really David?' or 'Should I go to Target?'")
    print("Type 'exit' to quit.\n")
    
    while True:
        try:
            user_input = input("YOU: ")
            if user_input.lower() in ['exit', 'quit']:
                break
            
            if not user_input.strip():
                continue
                
            print("... analyzing ...")
            response = chat_with_protector(user_input, session)
            print(f"\nPROTECTOR: {response}\n")
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
