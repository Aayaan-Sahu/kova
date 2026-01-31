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
