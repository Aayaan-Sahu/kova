import os
import subprocess
import platform

def send_scam_alert(
    risk_score: int,
    confidence_score: int,
    reasoning: str,
    contact_numbers: list[str],
    from_number: str = None  # Unused for iMessage (uses system account)
) -> bool:
    """
    Sends iMessage alerts using MacOS native Messages app.
    
    Args:
        risk_score: Current risk score (0-100)
        confidence_score: Current confidence score (0-100)
        reasoning: The AI's reasoning for the alert
        contact_numbers: List of phone numbers to alert (E.164 or local format)
        
    Returns:
        True if commands executed, False otherwise.
    """
    
    if platform.system() != "Darwin":
        print("ERROR: This iMessage workaround only works on macOS.")
        return False
        
    # Compose the alert message
    message_body = (
        f"🚨 KOVA SCAM ALERT 🚨\\n\\n"
        f"Your loved one may be on a scam call.\\n"
        f"Risk Level: {risk_score}/100\\n"
        f"Confidence: {confidence_score}/100\\n\\n"
        f"Reason: {reasoning}\\n\\n"
        f"Please check on them immediately."
    )
    
    # Escape double quotes for AppleScript
    safe_message = message_body.replace('"', '\\"')
    
    success = True
    for number in contact_numbers:
        try:
            # AppleScript to send iMessage
            # We use 'participant' (modern macOS) or fallback logic could be added
            script = f'''
            tell application "Messages"
                set targetService to 1st account whose service type = iMessage
                set targetBuddy to participant "{number}" of targetService
                send "{safe_message}" to targetBuddy
            end tell
            '''
            
            # Run the script
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"✅ iMessage sent to {number}")
            else:
                print(f"❌ Failed to send iMessage to {number}: {result.stderr}")
                # Fallback: try sending to simple specific text buddy (sometimes works better for SMS forwarding)
                fallback_script = f'tell application "Messages" to send "{safe_message}" to buddy "{number}"'
                subprocess.run(["osascript", "-e", fallback_script], capture_output=True)
                
        except Exception as e:
            print(f"Error sending to {number}: {e}")
            success = False
            
    return success
