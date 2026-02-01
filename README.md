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
   GOOGLE_API_KEY=your_key
   SUPABASE_URL=your_url
   DEEPGRAM_API_KEY=your_key
   GROQ_API_KEY=your_key
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

2. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
kova/
├── backend/
│   ├── main.py           # FastAPI application entry point
│   ├── routers/          # API route handlers
│   ├── services/         # Business logic and integrations
│   ├── prompts/          # LLM prompt templates
│   └── tests/            # Test files
├── frontend/
│   ├── src/              # React source code
│   ├── public/           # Static assets
│   └── index.html        # HTML entry point
└── supabase/             # Database configuration
```

## License

MIT
