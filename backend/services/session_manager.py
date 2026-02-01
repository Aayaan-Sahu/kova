from typing import Dict, Optional
from services.session_state import SessionState

# Singleton storage for active sessions
# Key: session_id (str), Value: SessionState
_active_sessions: Dict[str, SessionState] = {}

def get_session(session_id: str) -> Optional[SessionState]:
    """Retrieve an active session by ID."""
    return _active_sessions.get(session_id)

def save_session(session_id: str, session: SessionState):
    """Save or update a session."""
    _active_sessions[session_id] = session

def delete_session(session_id: str):
    """Remove a session (e.g. on disconnect)."""
    if session_id in _active_sessions:
        del _active_sessions[session_id]
