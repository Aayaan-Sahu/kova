"""
LangGraph orchestrator for Kova scam detection.

This graph coordinates the flow:
1. Analyze transcript → Update risk/confidence
2. Route based on scores:
   - High risk + High confidence → Alert contacts
   - Low confidence → Generate verification questions
   - Otherwise → End (just return status)
"""

import time
from typing import TypedDict, List, Dict, Literal
from langgraph.graph import StateGraph, END

from services.scam_detector import analyze_transcript
from services.question_generator import generate_question
from services.alert_sender import send_scam_alert
from services.session_state import SessionState


# ============== STATE DEFINITION ==============

class KovaState(TypedDict):
    """State that flows through the graph."""
    # Core session data
    transcript_history: List[Dict[str, str]]
    risk_score: int
    confidence_score: int
    latest_reasoning: str
    
    # Input for this invocation
    new_chunk: Dict[str, str]  # {"speaker": "caller", "text": "..."}
    
    # Outputs
    suggested_question: str  # Single question or None
    necessity_score: int  # 0-10 score for debugging
    alert_sent: bool
    last_alert_time: float  # Timestamp of last sent alert
    suspicious_number_reported: bool  # Whether this number has been reported to DB
    
    # Config (set once at start)
    emergency_contacts: List[str]  # Phone numbers for alerts
    caller_phone_number: str  # The caller's phone number (for suspicious number tracking)


# ============== NODE FUNCTIONS ==============

def analyze_node(state: KovaState) -> KovaState:
    """Node 1: Run scam detection on the new chunk."""
    
    # Create a SessionState object from the graph state
    session = SessionState()
    session.transcript_history = state["transcript_history"].copy()
    session.risk_score = state["risk_score"]
    session.confidence_score = state["confidence_score"]
    
    # Run analysis (this updates session in-place)
    analyze_transcript(state["new_chunk"], session)
    
    # Return updated state
    return {
        **state,
        "transcript_history": session.transcript_history,
        "risk_score": session.risk_score,
        "confidence_score": session.confidence_score,
        "latest_reasoning": session.latest_reasoning,
    }


def question_generator_node(state: KovaState) -> KovaState:
    """Node 2a: Generate a verification question when confidence is low."""
    
    session = SessionState()
    session.transcript_history = state["transcript_history"]
    session.risk_score = state["risk_score"]
    session.confidence_score = state["confidence_score"]
    
    question, score = generate_question(session)
    
    return {
        **state,
        "suggested_question": question,  # May be None if no question needed
        "necessity_score": score,
    }


def alert_node(state: KovaState) -> KovaState:
    """Node 2b: Send SMS alerts when scam is confirmed."""
    
    contacts = state.get("emergency_contacts", [])
    if not contacts:
        print("WARNING: No emergency contacts configured")
        return {**state, "alert_sent": False}
    
    caller_number = state.get("caller_phone_number")
    already_reported = state.get("suspicious_number_reported", False)
    
    # Only report to database once per session
    should_report = caller_number and not already_reported
    
    success = send_scam_alert(
        risk_score=state["risk_score"],
        confidence_score=state["confidence_score"],
        reasoning=state["latest_reasoning"],
        contact_numbers=contacts,
        caller_phone_number=caller_number if should_report else None
    )
    
    return {
        **state,
        "alert_sent": success,
        "last_alert_time": time.time(),
        "suspicious_number_reported": already_reported or should_report
    }


# ============== ROUTING LOGIC ==============

def route_after_analysis(state: KovaState) -> Literal["question_generator_node", "alert_node", "__end__"]:
    """Decide what to do after analyzing the transcript."""
    
    risk = state["risk_score"]
    conf = state["confidence_score"]
    
    # High risk + High confidence = Confirmed scam, alert!
    if risk >= 80 and conf >= 70:
        # Check throttling (30 seconds)
        last_time = state.get("last_alert_time", 0)
        if (time.time() - last_time) < 30:
            return END
            
        return "alert_node"
    
    # Low confidence = Need more info, generate questions
    if conf < 50:
        return "question_generator_node"
    
    # Otherwise, just end (return current status to frontend)
    return END


# ============== BUILD GRAPH ==============

def build_kova_graph() -> StateGraph:
    """Construct and return the Kova LangGraph."""
    
    graph = StateGraph(KovaState)
    
    # Add nodes
    graph.add_node("analyze_node", analyze_node)
    graph.add_node("question_generator_node", question_generator_node)
    graph.add_node("alert_node", alert_node)
    
    # Set entry point
    graph.set_entry_point("analyze_node")
    
    # Add conditional routing after analysis
    graph.add_conditional_edges(
        "analyze_node",
        route_after_analysis,
        {
            "question_generator_node": "question_generator_node",
            "alert_node": "alert_node",
            END: END,
        }
    )
    
    # Both question_generator and alert go to END after completing
    graph.add_edge("question_generator_node", END)
    graph.add_edge("alert_node", END)
    
    return graph.compile()


# ============== CONVENIENCE FUNCTION ==============

# Global compiled graph (singleton)
_kova_graph = None

def get_kova_graph():
    """Get or create the compiled Kova graph."""
    global _kova_graph
    if _kova_graph is None:
        _kova_graph = build_kova_graph()
    return _kova_graph


def process_chunk(
    new_chunk: Dict[str, str],
    transcript_history: List[Dict[str, str]],
    risk_score: int = 0,
    confidence_score: int = 0,
    emergency_contacts: List[str] = None,
    last_alert_time: float = 0,
    caller_phone_number: str = None,
    suspicious_number_reported: bool = False
) -> KovaState:
    """
    Main entry point: Process a new audio chunk through the Kova graph.
    
    Args:
        new_chunk: {"speaker": "caller"|"user", "text": "..."}
        transcript_history: List of previous turns
        risk_score: Current risk score (0 for new session)
        confidence_score: Current confidence (0 for new session)
        emergency_contacts: Phone numbers to alert (optional)
        last_alert_time: Timestamp of last alert sent (for throttling)
        caller_phone_number: The caller's phone number for suspicious number tracking
        suspicious_number_reported: Whether this number has already been reported to DB
        
    Returns:
        Updated KovaState with new scores, questions, alert status, and last_alert_time.
    """
    
    graph = get_kova_graph()
    
    initial_state: KovaState = {
        "transcript_history": transcript_history or [],
        "risk_score": risk_score,
        "confidence_score": confidence_score,
        "latest_reasoning": "",
        "new_chunk": new_chunk,
        "suggested_question": None,
        "necessity_score": 0,
        "alert_sent": False,
        "emergency_contacts": emergency_contacts or [],
        "last_alert_time": last_alert_time,
        "caller_phone_number": caller_phone_number,
        "suspicious_number_reported": suspicious_number_reported,
    }
    
    result = graph.invoke(initial_state)
    return result
