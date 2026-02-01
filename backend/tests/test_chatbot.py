import unittest
from unittest.mock import patch, MagicMock
from services.session_state import SessionState
from services.chat_bot import chat_with_protector
from services import session_manager

class TestChatbot(unittest.TestCase):
    
    @patch('services.chat_bot._get_client')
    def test_end_to_end_logic(self, mock_get_client):
        # 1. Setup Mock OpenAI/Keywords Client
        mock_completion = MagicMock()
        mock_completion.choices[0].message.content = "Be careful, this sounds like a scam."
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion
        mock_get_client.return_value = mock_client
        
        # 2. Setup Session State
        session = SessionState()
        session.risk_score = 85
        session.confidence_score = 90
        session.add_turn("caller", "I need you to send money via gift cards.")
        session.add_turn("user", "But why?")
        
        # 3. Register Session (simulate WebSocket)
        session_id = "test-session-123"
        session_manager.save_session(session_id, session)
        
        # 4. Retrieval & Chat (simulate Router)
        retrieved_session = session_manager.get_session(session_id)
        self.assertIsNotNone(retrieved_session)
        
        response = chat_with_protector("Is this real?", retrieved_session)
        
        # 5. Verify
        print(f"Chatbot Response: {response}")
        self.assertEqual(response, "Be careful, this sounds like a scam.")
        
        # Verify the prompt included the context
        call_args = mock_client.chat.completions.create.call_args
        sent_messages = call_args.kwargs['messages']
        system_prompt = sent_messages[0]['content']
        
        self.assertIn("Current Risk Score: 85/100", system_prompt)
        self.assertIn("CALLER: I need you to send money via gift cards.", system_prompt)
        self.assertEqual(call_args.kwargs['model'], "bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0")
        
        print("Verification Successful: Context was correctly passed to Claude 3.5 Sonnet.")

if __name__ == '__main__':
    unittest.main()
