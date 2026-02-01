import unittest
import time
from unittest.mock import patch, MagicMock
from services.workflow import question_generator_node, KovaState

class TestRateLimit(unittest.TestCase):
    @patch('services.workflow.generate_question')
    @patch('services.workflow.SessionState')
    def test_rate_limit(self, mock_session, mock_generate):
        # Setup mock to always return a question
        mock_generate.return_value = ("Is this a scam?", 8)
        
        # Initial state: No last question time
        state: KovaState = {
            "transcript_history": [],
            "risk_score": 50,
            "confidence_score": 40,
            "latest_reasoning": "Uncertain",
            "new_chunk": {"speaker": "caller", "text": "Win money"},
            "suggested_question": None,
            "necessity_score": 0,
            "alert_sent": False,
            "last_alert_time": 0,
            "last_question_time": 0, # Should generate
            "suspicious_number_reported": False,
            "emergency_contacts": [],
            "caller_phone_number": "1234567890"
        }

        print("\n--- Test 1: First Call (Should Generate) ---")
        result1 = question_generator_node(state)
        self.assertEqual(result1["suggested_question"], "Is this a scam?")
        self.assertGreater(result1["last_question_time"], 0)
        print(f"Generated Question: {result1['suggested_question']}")
        print(f"Time: {result1['last_question_time']}")

        # Validate that the timestamp was updated
        first_time = result1["last_question_time"]
        
        print("\n--- Test 2: Immediate Second Call (Should Rate Limit) ---")
        # Reuse state with updated time
        state_immediate = result1.copy() 
        # Ensure time hasn't passed (we rely on execution being faster than 3s)
        
        result2 = question_generator_node(state_immediate)
        self.assertIsNone(result2["suggested_question"])
        self.assertEqual(result2["last_question_time"], first_time) # Should not update time
        print("Generated Question: None (Rate Limited)")

        print("\n--- Test 3: Call after 3 seconds (Should Generate) ---")
        # Manually set last_question_time to 4 seconds ago
        state_later = result1.copy()
        state_later["last_question_time"] = time.time() - 4.0
        
        result3 = question_generator_node(state_later)
        self.assertEqual(result3["suggested_question"], "Is this a scam?")
        self.assertGreater(result3["last_question_time"], state_later["last_question_time"])
        print(f"Generated Question: {result3['suggested_question']}")

if __name__ == '__main__':
    unittest.main()
