# Kova

Kova is a real-time scam call protection system designed to help older adults stay safe during phone calls. It analyzes live conversations, detects potential scams, and alerts family members when something seems wrong.

## Features

- **Voice-activated wake word**: Say "kova, activate" to start protection hands-free
- **Real-time transcription**: Two-stage pipeline using Deepgram for low-latency streaming and Llama for semantic analysis
- **Scam detection**: LLM-powered analysis that maintains call context and outputs dynamic risk scores
- **Verification questions**: Suggests questions to help users interrogate suspicious callers
- **Instant alerts**: Sends iMessage notifications to emergency contacts when scams are detected
- **AI chat companion**: Claude 3.5 Sonnet chatbot connected to live call context for mid-call guidance
- **Community database**: Reports and tracks suspicious phone numbers
- **Analytics dashboard**: Shows call history, risk trends, and visualizations

## Tech Stack

### Frontend
- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- FastAPI (Python)
- WebSocket streaming for real-time audio
- LangGraph for AI workflow orchestration
- Deepgram SDK (Nova-2 model) for transcription
- Groq/Llama 3.3 70B for scam detection
- Claude 3.5 Sonnet for chatbot (via Keywords AI)
- Supabase (PostgreSQL) for database
- macOS AppleScript for iMessage alerts

## Prerequisites

- **macOS required**: The alert system uses AppleScript to send iMessages, so the backend must run on macOS
- Python 3.13+
- Node.js
- Supabase account
- API keys for: Deepgram, Groq, Google (Gemini), Keywords AI

## Setup

### Backend

1. Navigate to the backend directory:
   ```bash
   cd kova/backend
   ```

2. Create a `.env` file based on `.env.template`:
   ```
   DEEPGRAM_API_KEY=
   GROQ_API_KEY=
   KEYWORDS_AI_API_KEY=
   SUPABASE_URL=
   SUPABASE_KEY=
   SUPABASE_SERVICE_KEY=
   ```

3. Install dependencies (using uv):
   ```bash
   uv sync
   ```

4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd kova/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
kova/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── routers/
│   │   ├── api.py              # REST API endpoints
│   │   ├── chat.py             # Chatbot API routes
│   │   ├── wakeword.py         # Wake word detection endpoint
│   │   └── websocket.py        # WebSocket handler for real-time audio streaming
│   ├── services/
│   │   ├── alert_sender.py     # iMessage alert sending via AppleScript
│   │   ├── chat_bot.py         # Claude chatbot integration
│   │   ├── deepgram_client.py  # Deepgram transcription client
│   │   ├── question_generator.py # Generates verification questions
│   │   ├── scam_detector.py    # LLM-based scam analysis
│   │   ├── session_manager.py  # Manages active call sessions
│   │   ├── session_state.py    # Call session state model
│   │   ├── speaker_identifier.py # Identifies user vs caller in transcript
│   │   ├── supabase_client.py  # Database operations
│   │   ├── transcript_processor.py # Processes transcription results
│   │   └── workflow.py         # LangGraph workflow orchestration
│   ├── prompts/
│   │   ├── chatbot_prompts.py  # System prompts for chat companion
│   │   ├── question_gen.py     # Prompts for verification questions
│   │   ├── scam_detection.py   # Scam detection system prompts
│   │   └── speaker_identifier.py # Speaker identification prompts
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main app component with routing
│   │   ├── main.tsx            # React entry point
│   │   ├── components/
│   │   │   ├── AudioVisualizer.tsx  # Real-time audio waveform display
│   │   │   ├── ChatPanel.tsx        # AI chat companion interface
│   │   │   ├── PhoneNumberModal.tsx # Phone number input modal
│   │   │   └── ui/                  # Reusable UI components
│   │   ├── pages/
│   │   │   ├── Account.tsx     # User account settings
│   │   │   ├── ActiveCall.tsx  # Main call monitoring interface
│   │   │   ├── Analytics.tsx   # Call history and risk analytics
│   │   │   ├── Dashboard.tsx   # Home dashboard
│   │   │   ├── Login.tsx       # User login
│   │   │   └── Signup.tsx      # User registration
│   │   ├── lib/
│   │   │   ├── analyticsApi.ts # Analytics data fetching
│   │   │   ├── chatApi.ts      # Chat API client
│   │   │   └── supabaseClient.ts # Supabase client setup
│   │   ├── contexts/           # React context providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Page layout components
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utility functions
│   ├── public/                 # Static assets
│   └── index.html              # HTML entry point
└── supabase/                   # Database configuration
```

## License

MIT