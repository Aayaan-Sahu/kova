"""
Transcript processing service for accumulating and processing speech-to-text results.
"""
from services.speaker_identifier import identify_speakers


class TranscriptProcessor:
    """
    Processes incoming transcripts, accumulates them, and identifies speakers.
    """
    
    def __init__(self, min_words: int = 5, max_history: int = 50):
        """
        Initialize the transcript processor.
        
        Args:
            min_words: Minimum words before processing a chunk
            max_history: Maximum conversation history segments to retain
        """
        self.min_words = min_words
        self.max_history = max_history
        self.buffer = ""
        self.conversation_history: list[dict] = []
    
    def add_transcript(self, transcript: str) -> None:
        """Add a transcript to the buffer."""
        self.buffer += " " + transcript
    
    def should_process(self) -> bool:
        """Check if buffer has enough words to process."""
        return len(self.buffer.split()) >= self.min_words
    
    async def process_buffer(self) -> list[dict]:
        """
        Process the accumulated buffer using LLM speaker identification.
        
        Returns:
            List of segments with speaker labels
        """
        if not self.buffer.strip():
            return []
        
        # Identify speakers using LLM
        segments = await identify_speakers(
            self.buffer.strip(),
            self.conversation_history
        )
        
        print(f"[LLM] Identified {len(segments)} segment(s)")
        
        # Update conversation history
        self.conversation_history.extend(segments)
        
        # Trim history if too long
        if len(self.conversation_history) > self.max_history:
            self.conversation_history = self.conversation_history[-30:]
        
        # Clear buffer
        self.buffer = ""
        
        return segments
    
    def clear(self) -> None:
        """Clear the buffer and history."""
        self.buffer = ""
        self.conversation_history = []
