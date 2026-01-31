"""
Deepgram client service for real-time audio transcription.
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from deepgram import AsyncDeepgramClient

load_dotenv()

# Singleton client instance
_client: AsyncDeepgramClient | None = None


def get_client() -> AsyncDeepgramClient:
    """Get or create the Deepgram client instance."""
    global _client
    if _client is None:
        api_key = os.getenv("DEEPGRAM_API_KEY")
        if not api_key:
            raise ValueError("DEEPGRAM_API_KEY environment variable is not set")
        _client = AsyncDeepgramClient(api_key=api_key)
    return _client


@asynccontextmanager
async def create_live_connection(sample_rate: int = 48000):
    """
    Create a live transcription connection to Deepgram.
    
    Args:
        sample_rate: Audio sample rate in Hz (default 48000)
        
    Yields:
        AsyncV1SocketClient: The Deepgram WebSocket connection
    """
    client = get_client()
    
    async with client.listen.v1.connect(
        model="nova-2",
        language="en-US",
        encoding="linear16",
        sample_rate=str(sample_rate),
        punctuate="true",
    ) as connection:
        print("[DG] Connection opened")
        yield connection
    
    print("[DG] Connection closed")
