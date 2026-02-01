"""
Supabase client for database operations.
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
_supabase_client: Client = None


def get_supabase_client() -> Client:
    """Get or create the Supabase client singleton."""
    global _supabase_client
    
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for backend
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        _supabase_client = create_client(url, key)
    
    return _supabase_client


def report_suspicious_number(phone_number: str) -> bool:
    """
    Report a suspicious phone number to the database.
    
    If the number exists, increments report_count and updates last_reported_at.
    If the number doesn't exist, creates a new entry with report_count=1.
    
    Args:
        phone_number: The phone number to report (E.164 format preferred)
        
    Returns:
        True if operation succeeded, False otherwise
    """
    if not phone_number:
        print("WARNING: No phone number provided to report")
        return False
    
    try:
        client = get_supabase_client()
        
        # Check if the number already exists
        existing = client.table("suspicious_numbers") \
            .select("phone_number, report_count") \
            .eq("phone_number", phone_number) \
            .execute()
        
        if existing.data and len(existing.data) > 0:
            # Number exists - increment report count and update timestamp
            current_count = existing.data[0]["report_count"]
            result = client.table("suspicious_numbers") \
                .update({
                    "report_count": current_count + 1,
                    "last_reported_at": "now()"
                }) \
                .eq("phone_number", phone_number) \
                .execute()
            print(f"📊 Updated suspicious number {phone_number}: report_count = {current_count + 1}")
        else:
            # New number - insert with report_count=1
            result = client.table("suspicious_numbers") \
                .insert({
                    "phone_number": phone_number,
                    "report_count": 1,
                    "last_reported_at": "now()",
                    "created_at": "now()"
                }) \
                .execute()
            print(f"📊 Added new suspicious number: {phone_number}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reporting suspicious number: {e}")
        return False


def check_suspicious_number(phone_number: str) -> dict:
    """
    Check if a phone number exists in the suspicious_numbers database.
    
    Args:
        phone_number: The phone number to check (E.164 format preferred)
        
    Returns:
        {"found": True, "report_count": N} if found, {"found": False} if not
    """
    if not phone_number:
        return {"found": False}
    
    try:
        client = get_supabase_client()
        
        result = client.table("suspicious_numbers") \
            .select("phone_number, report_count") \
            .eq("phone_number", phone_number) \
            .execute()
        
        if result.data and len(result.data) > 0:
            return {
                "found": True,
                "report_count": result.data[0]["report_count"]
            }
        return {"found": False}
        
    except Exception as e:
        print(f"❌ Error checking suspicious number: {e}")
        return {"found": False}


# ============== ANALYTICS FUNCTIONS ==============

def get_user_analytics(user_id: str) -> dict:
    """
    Get analytics data for a user.
    
    Args:
        user_id: The user's UUID
        
    Returns:
        Analytics data dict or None if not found
    """
    if not user_id:
        return None
    
    try:
        client = get_supabase_client()
        result = client.table("user_analytics") \
            .select("*") \
            .eq("id", user_id) \
            .execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
        
    except Exception as e:
        print(f"❌ Error getting user analytics: {e}")
        return None


def update_call_analytics(
    user_id: str,
    call_duration_seconds: int = 0,
    final_risk_score: int = 0,
    caller_phone_number: str = None,
    was_scam: bool = False,
    questions_generated: int = 0,
    alerts_sent: int = 0
) -> bool:
    """
    Update analytics after a call ends. Purely additive - increments counters.
    
    Args:
        user_id: The user's UUID
        call_duration_seconds: Duration of the call in seconds
        final_risk_score: Final risk score at end of call
        caller_phone_number: The caller's phone number
        was_scam: Whether this was classified as a scam (risk >= 80)
        questions_generated: Number of verification questions generated during call
        alerts_sent: Number of alerts sent during call
        
    Returns:
        True if update succeeded, False otherwise
    """
    if not user_id:
        print("WARNING: No user_id provided for analytics update")
        return False
    
    try:
        client = get_supabase_client()
        
        # Get current analytics
        current = get_user_analytics(user_id)
        
        if not current:
            # Create new analytics row if doesn't exist
            from datetime import datetime
            now = datetime.utcnow().isoformat()
            client.table("user_analytics").insert({
                "id": user_id,
                "total_calls": 1,
                "total_call_duration_seconds": call_duration_seconds,
                "total_scam_calls": 1 if was_scam else 0,
                "total_suspicious_calls": 1 if 50 <= final_risk_score < 80 else 0,
                "total_safe_calls": 1 if final_risk_score < 50 else 0,
                "total_alerts_sent": alerts_sent,
                "total_questions_generated": questions_generated,
                "high_risk_calls": 1 if final_risk_score >= 80 else 0,
                "medium_risk_calls": 1 if 50 <= final_risk_score < 80 else 0,
                "low_risk_calls": 1 if final_risk_score < 50 else 0,
                "unique_callers_count": 1 if caller_phone_number else 0,
                "recent_callers": [{"phone": caller_phone_number, "last_call": now, "risk": final_risk_score}] if caller_phone_number else [],
                "first_call_at": now,
                "last_call_at": now,
                "last_scam_detected_at": now if was_scam else None,
                "weekly_stats": {},
                "daily_stats": {},
            }).execute()
            print(f"📊 Created analytics for user {user_id}")
            return True
        
        # Build update data - increment counters
        from datetime import datetime
        import json
        
        now = datetime.utcnow().isoformat()
        today = datetime.utcnow().strftime("%Y-%m-%d")
        week = datetime.utcnow().strftime("%Y-W%W")
        
        # Update weekly stats
        weekly_stats = current.get("weekly_stats") or {}
        if week not in weekly_stats:
            weekly_stats[week] = {"calls": 0, "scams": 0, "duration": 0}
        weekly_stats[week]["calls"] += 1
        weekly_stats[week]["duration"] += call_duration_seconds
        if was_scam:
            weekly_stats[week]["scams"] += 1
        
        # Update daily stats
        daily_stats = current.get("daily_stats") or {}
        if today not in daily_stats:
            daily_stats[today] = {"calls": 0, "scams": 0}
        daily_stats[today]["calls"] += 1
        if was_scam:
            daily_stats[today]["scams"] += 1
        
        # Update recent callers (keep last 10)
        recent_callers = current.get("recent_callers") or []
        if caller_phone_number:
            # Check if this caller already exists
            existing_idx = next((i for i, c in enumerate(recent_callers) if c.get("phone") == caller_phone_number), None)
            if existing_idx is not None:
                recent_callers.pop(existing_idx)
            recent_callers.insert(0, {"phone": caller_phone_number, "last_call": now, "risk": final_risk_score})
            recent_callers = recent_callers[:10]  # Keep only last 10
        
        # Count unique callers
        unique_phones = set()
        for caller in recent_callers:
            if caller.get("phone"):
                unique_phones.add(caller["phone"])
        
        update_data = {
            "total_calls": (current.get("total_calls") or 0) + 1,
            "total_call_duration_seconds": (current.get("total_call_duration_seconds") or 0) + call_duration_seconds,
            "total_scam_calls": (current.get("total_scam_calls") or 0) + (1 if was_scam else 0),
            "total_suspicious_calls": (current.get("total_suspicious_calls") or 0) + (1 if 50 <= final_risk_score < 80 else 0),
            "total_safe_calls": (current.get("total_safe_calls") or 0) + (1 if final_risk_score < 50 else 0),
            "total_alerts_sent": (current.get("total_alerts_sent") or 0) + alerts_sent,
            "total_questions_generated": (current.get("total_questions_generated") or 0) + questions_generated,
            "high_risk_calls": (current.get("high_risk_calls") or 0) + (1 if final_risk_score >= 80 else 0),
            "medium_risk_calls": (current.get("medium_risk_calls") or 0) + (1 if 50 <= final_risk_score < 80 else 0),
            "low_risk_calls": (current.get("low_risk_calls") or 0) + (1 if final_risk_score < 50 else 0),
            "unique_callers_count": len(unique_phones),
            "recent_callers": recent_callers,
            "weekly_stats": weekly_stats,
            "daily_stats": daily_stats,
            "last_call_at": now,
        }
        
        if was_scam:
            update_data["last_scam_detected_at"] = now
        
        client.table("user_analytics") \
            .update(update_data) \
            .eq("id", user_id) \
            .execute()
        
        print(f"📊 Updated analytics for user {user_id}: +1 call, duration={call_duration_seconds}s, risk={final_risk_score}")
        return True
        
    except Exception as e:
        print(f"❌ Error updating call analytics: {e}")
        return False


def export_analytics_data(user_id: str) -> dict:
    """
    Export all analytics data for a user in a format suitable for sharing.
    
    Args:
        user_id: The user's UUID
        
    Returns:
        Dict with formatted analytics data for export/sharing
    """
    analytics = get_user_analytics(user_id)
    if not analytics:
        return None
    
    # Calculate some derived metrics
    total_calls = analytics.get("total_calls") or 0
    total_duration = analytics.get("total_call_duration_seconds") or 0
    scam_calls = analytics.get("total_scam_calls") or 0
    
    avg_duration = total_duration // total_calls if total_calls > 0 else 0
    scam_rate = round((scam_calls / total_calls) * 100, 1) if total_calls > 0 else 0
    
    return {
        "summary": {
            "total_calls": total_calls,
            "total_call_duration_minutes": round(total_duration / 60, 1),
            "average_call_duration_seconds": avg_duration,
            "scam_calls_detected": scam_calls,
            "scam_detection_rate_percent": scam_rate,
            "alerts_sent_to_contacts": analytics.get("total_alerts_sent") or 0,
        },
        "risk_breakdown": {
            "high_risk_calls": analytics.get("high_risk_calls") or 0,
            "medium_risk_calls": analytics.get("medium_risk_calls") or 0,
            "low_risk_calls": analytics.get("low_risk_calls") or 0,
        },
        "activity": {
            "first_call": analytics.get("first_call_at"),
            "last_call": analytics.get("last_call_at"),
            "last_scam_detected": analytics.get("last_scam_detected_at"),
        },
        "weekly_activity": analytics.get("weekly_stats") or {},
        "recent_callers": analytics.get("recent_callers") or [],
        "exported_at": __import__("datetime").datetime.utcnow().isoformat(),
    }

