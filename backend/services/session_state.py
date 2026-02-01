from typing import List, Dict

class SessionState:
    """
    Holds the state for a SINGLE user connection.
    This is preferred over a global variable so we don't mix up different users.
    """
    def __init__(self):
        # The shared history that all AI models (Detector, Question Generator) will read
        self.transcript_history: List[Dict[str, str]] = []
        
        # Scam Detection State
        self.risk_score: int = 0
        self.confidence_score: int = 0
        
        # Chatbot History (User <-> Protector)
        # Format: [{"role": "user"|"assistant", "content": "..."}]
        self.chatbot_history: List[Dict[str, str]] = []
        
        # For the frontend
        self.latest_reasoning: str = ""
    
    def add_turn(self, speaker: str, text: str):
        """Adds a turn to the history efficiently."""
        self.transcript_history.append({"speaker": speaker, "text": text})
        
        # Optional: Limit history size if it gets too huge (e.g. > 100 turns)
        if len(self.transcript_history) > 100:
             self.transcript_history = self.transcript_history[-100:]

    def to_dict(self):
        """Helper to send state to frontend"""
        return {
            "risk_score": self.risk_score,
            "confidence_score": self.confidence_score,
            "confidence_score": self.confidence_score,
            "history_length": len(self.transcript_history),
            "chat_length": len(self.chatbot_history)
        }
