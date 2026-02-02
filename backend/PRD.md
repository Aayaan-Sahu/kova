# Product Requirement Document (PRD): Kova

**Version:** 3.0 (Final Implementation)  
**Date:** February 1, 2026

---

## 1. Executive Summary

Kova is a real-time scam call detection and protection system.

* **Input:** Live audio from a laptop microphone (capturing speakerphone audio), activated via voice command ("Kova, activate")
* **Processing:** Python backend streams audio to Deepgram for transcription, analyzes text with LLM-powered scam detection, and orchestrates responses via LangGraph
* **Output:** Real-time risk dashboard, AI-generated verification questions, protective AI chatbot, and instant iMessage alerts to emergency contacts

---

## 2. Tech Stack (Final)

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + Vite + TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | FastAPI (Python 3.13+) |
| **Database** | Supabase (PostgreSQL) |
| **Transcription** | Deepgram SDK (Nova-2 model) |
| **Scam Detection** | Keywords AI → Groq (Llama 3.3 70B Versatile) |
| **AI Chatbot** | Keywords AI → Claude 3.5 Sonnet (Bedrock) |
| **Orchestration** | LangGraph (state machine for multi-step AI workflow) |
| **Notifications** | macOS native iMessage via AppleScript (no Twilio) |

---

## 3. Architecture & Data Flow

```
┌─────────────────┐      WebSocket       ┌──────────────────┐
│   React Client  │ ◄──────────────────► │   FastAPI        │
│                 │   (audio + JSON)     │                  │
│  - Wake Word    │                      │  - /ws/wakeword  │
│  - Audio Stream │                      │  - /ws/listen    │
│  - Dashboard    │                      │  - /api/chat     │
│  - Chat Panel   │                      │                  │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
           ┌────────────────┐           ┌─────────────────┐           ┌─────────────────┐
           │   Deepgram     │           │   LangGraph     │           │   Supabase      │
           │   (STT)        │           │   Workflow      │           │   (PostgreSQL)  │
           │                │           │                 │           │                 │
           │  Nova-2 model  │           │  1. Analyze     │           │  - profiles     │
           │  <200ms latency│           │  2. Route       │           │  - suspicious   │
           └────────────────┘           │  3. Question/   │           │    _numbers     │
                                        │     Alert       │           └─────────────────┘
                                        └─────────────────┘
                                                  │
                           ┌──────────────────────┼──────────────────────┐
                           │                      │                      │
                           ▼                      ▼                      ▼
                   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
                   │ Scam Detector│      │ Question Gen │      │ Alert Sender │
                   │ (Llama 3.3)  │      │ (Llama 3.3)  │      │ (iMessage)   │
                   └──────────────┘      └──────────────┘      └──────────────┘
```

---

## 4. Core Features

### 4.1 Voice-Activated Wake Word
- User says **"Kova, activate"** to start protection
- Uses Deepgram with phonetic fuzzy matching (handles "cova", "kovah", etc.)
- Hands-free activation for accessibility

### 4.2 Two-Stage Transcription Pipeline
**Stage 1: Speech-to-Text (Deepgram)**
- Nova-2 model with sub-200ms latency
- Raw transcript text via WebSocket streaming

**Stage 2: Speaker Identification (Llama 3.3 70B)**
- LLM analyzes raw transcript to determine who is speaking
- Uses conversation history for context (last 10 segments)
- Outputs labeled segments: `{"speaker": "user"|"caller", "text": "..."}`
- Handles overlapping speech and ambiguous cases intelligently

### 4.3 LangGraph Scam Detection Workflow
The AI pipeline uses LangGraph for orchestration:

1. **Analyze Node:** Sends transcript to Llama 3.3 70B for risk/confidence scoring
2. **Routing Logic:**
   - Risk ≥80 AND Confidence ≥70 → **Alert Node** (send iMessage)
   - Confidence <50 → **Question Generator Node** (suggest verification questions)
   - Otherwise → Return status to frontend
3. **Throttling:** Alerts rate-limited to 30s, questions to 3s

### 4.4 AI Chatbot ("Protector")
- Powered by **Claude 3.5 Sonnet** via Keywords AI
- User can ask mid-call: "Is this a scam?", "What should I ask them?"
- Has full context of the live transcript and risk scores

### 4.5 Verification Question Generation
- When confidence is low, AI generates questions like:
  - "Ask for their employee ID and direct callback number"
  - "Request they send written documentation before any action"
- Displayed prominently on the dashboard

### 4.6 Emergency Alerts (iMessage)
- Uses **macOS native AppleScript** to send iMessages (bypasses Twilio verification)
- Sends to up to 2 emergency contacts configured in user profile
- Message includes risk score, confidence, and reasoning

### 4.7 Suspicious Number Database
- When a scam is confirmed, the caller's number is reported to `suspicious_numbers` table
- Community-driven database for future pattern detection

---

## 5. Database Schema (Supabase)

```sql
-- Table: Users (Linked to Supabase Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  phone_number text,
  emergency_contact_one_name text,
  emergency_contact_one_number text,
  emergency_contact_two_name text,
  emergency_contact_two_number text
);

-- Table: Known Scams (community database)
create table suspicious_numbers (
  phone_number text primary key,
  report_count int default 1,
  last_reported_at timestamptz default now()
);
```

---

## 6. Backend Structure

```
/backend
  ├── main.py                    # FastAPI entry point
  ├── .env                       # API Keys (DEEPGRAM, KEYWORDS_AI, SUPABASE)
  ├── pyproject.toml             # Dependencies (uv/pip)
  ├── /routers
  │   ├── wakeword.py            # /ws/wakeword - voice activation
  │   ├── audio.py               # /ws/listen - main audio stream
  │   └── chat.py                # /api/chat - AI chatbot
  ├── /services
  │   ├── deepgram_client.py     # Deepgram connection helper
  │   ├── scam_detector.py       # Llama 3.3 scam analysis
  │   ├── question_generator.py  # Verification question AI
  │   ├── chat_bot.py            # Claude 3.5 Sonnet chatbot
  │   ├── alert_sender.py        # iMessage via AppleScript
  │   ├── workflow.py            # LangGraph orchestration
  │   ├── session_state.py       # Per-session state management
  │   └── supabase_client.py     # Database operations
  └── /prompts
      ├── scam_detection.py      # System prompts for scam AI
      ├── question_gen.py        # Prompts for question generation
      └── chatbot_prompts.py     # Prompts for Protector chatbot
```

---

## 7. Frontend Pages

| Page | Description |
|------|-------------|
| **Login** | Supabase Auth login |
| **Signup** | New user registration with emergency contact setup |
| **Dashboard** | Main hub - start protection, view status |
| **ActiveCall** | Live call view with transcript, risk meter, suggested questions, chat panel |
| **Analytics** | Call history, risk trends, visualizations |
| **Account** | Profile settings, emergency contacts |

---

## 8. Key Implementation Details

### Audio Streaming
- MediaRecorder with 250ms timeslice for low latency
- Linear16 PCM at 48kHz sample rate
- Sent as binary blobs over WebSocket

### Session Management
- Each WebSocket connection has isolated `SessionState`
- Tracks: transcript_history, risk_score, confidence_score, chatbot_history
- Prevents cross-session contamination

### Rate Limiting
- Alerts: Max 1 per 30 seconds
- Questions: Max 1 per 3 seconds
- Prevents spam to emergency contacts

---

## 9. Environment Variables

```env
DEEPGRAM_API_KEY=your_deepgram_key
KEYWORDS_AI_API_KEY=your_keywords_ai_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 10. Running the Project

**Backend:**
```bash
cd backend
uv sync  # or pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 11. Demo Tips

1. **Wake Word:** Say "Kova, activate" clearly - the system uses phonetic matching
2. **Simulate Scam:** Have someone say scam phrases like "gift cards", "IRS", "arrest warrant"
3. **Chat with Protector:** Ask "Should I trust this caller?" mid-call
4. **Emergency Alerts:** Ensure iMessage is configured and emergency contacts are set in profile