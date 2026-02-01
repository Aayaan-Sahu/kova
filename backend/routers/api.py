"""
REST API router for phone number operations.
"""
from fastapi import APIRouter, Query
from services.supabase_client import check_suspicious_number

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
