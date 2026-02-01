"""
REST API router for phone number operations.
"""
from fastapi import APIRouter, Query
from services.supabase_client import check_suspicious_number, get_user_analytics, export_analytics_data

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/check-number")
async def check_number(phone: str = Query(..., description="Phone number to check")):
    """
    Check if a phone number has been reported as suspicious.
    
    Returns:
        {"found": true, "report_count": N} if the number is in the database,
        {"found": false} if not found.
    """
    result = check_suspicious_number(phone)
    return result


@router.get("/analytics")
async def get_analytics(user_id: str = Query(..., description="User UUID")):
    """
    Get analytics data for a user.
    
    Returns:
        Full analytics data or {"error": "Not found"} if user has no analytics.
    """
    result = get_user_analytics(user_id)
    if result:
        return result
    return {"error": "Not found"}


@router.get("/analytics/export")
async def export_analytics(user_id: str = Query(..., description="User UUID")):
    """
    Export analytics data in a shareable format.
    
    Returns:
        Formatted analytics summary for sharing with loved ones.
    """
    result = export_analytics_data(user_id)
    if result:
        return result
    return {"error": "No analytics data found"}

