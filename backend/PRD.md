Product Requirement Document (PRD): kova (Python Edition)
Version: 2.0 (FastAPI + Python Backend) Date: January 31, 2026
1. Executive Summary
kova is a real-time scam detection system.
* Input: Live audio from a laptop microphone (capturing speakerphone audio).
* Processing: Python backend streams audio to a transcription engine and analyzes text for scam patterns.
* Output: Real-time "Safe/Danger" dashboard for the user and SMS alerts for relatives.

2. The Tech Stack
* Frontend: React (Vite) + Tailwind CSS. (Keep it simple, no Next.js needed if we have a Python backend).
* Backend: FastAPI (Python 3.10+).
* Database: Supabase (PostgreSQL).
* Transcription: Deepgram Python SDK (Free Tier).
    * Why: It has a native Python library that handles the WebSocket streaming for you. It is accurate and ultra-fast.
* Intelligence: Keywords AI (Proxy) → Groq (Llama 3 70B).
* Notifications: Twilio (Python Helper Library).

3. Architecture & Data Flow
1. React Client: Captures microphone audio → Sends binary blobs via WebSocket to FastAPI.
2. FastAPI: Receives audio → Pushes to Deepgram Live Client.
3. Deepgram: Returns real-time text transcript to FastAPI.
4. FastAPI (Logic):
    * Accumulates text buffer.
    * Every 1-2 sentences, sends text to Keywords AI.
    * If risk_score > 80, triggers Twilio SMS.
    * Sends transcript + risk_score + suggested_prompt back to React via WebSocket.

4. Database Schema (Supabase)
Set this up in the Supabase SQL Editor.
SQL

-- Table: Users (Linked to Supabase Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  phone_number text, -- The user's number
  emergency_contact_one_name text,
  emergency_contact_one_number text -- The relative to alert
  emergency_contact_two_name text,
  emergency_contact_two_number text -- The relative to alert
);

-- Table: Known Scams (for blocking numbers)
create table suspicious_numbers (
  phone_number text primary key,
  report_count int default 1,
  last_reported_at timestamptz default now()
);

5. End-to-End Implementation Plan
Phase 1: Project Setup (Python & React)
A. Backend (FastAPI) Structure your folder like this:
Plaintext

/backend
  ├── main.py            # Entry point
  ├── .env               # API Keys
  ├── requirements.txt   # fastapi, uvicorn, deepgram-sdk, supabase, openai, twilio
  └── /routers
      └── websocket.py   # The core audio logic
B. Frontend (React + Vite)
Bash

npm create vite@latest frontend -- --template react-ts
npm install lucide-react socket.io-client

Phase 2: The WebSocket Audio Stream (The Hardest Part)
This is where Python shines. We need a WebSocket endpoint that accepts audio and keeps a connection open to Deepgram.
backend/routers/websocket.py (Conceptual Code):
Python

from fastapi import APIRouter, WebSocket
from deepgram import DeepgramClient, LiveOptions
import os
import asyncio

router = APIRouter()

@router.websocket("/ws/listen")
async def listen(websocket: WebSocket):
    await websocket.accept()
    
    # 1. Initialize Deepgram (The "Free" Transcription)
    deepgram = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))
    
    # 2. Setup the Deepgram Live Connection
    dg_connection = deepgram.listen.live.v("1")
    
    # Define what happens when we get text back
    def on_message(self, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        if len(sentence) > 0:
            # TODO: Send this sentence to Scam Detector AI
            # TODO: Send result back to Frontend
            print(f"Transcript: {sentence}")

    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)

    # 3. Configure options (English, Smart Formatting)
    options = LiveOptions(
        model="nova-2", 
        language="en-US", 
        smart_format=True,
    )
    
    await dg_connection.start(options)

    # 4. Loop: Receive Audio from React -> Send to Deepgram
    try:
        while True:
            # Receive audio blob from frontend
            data = await websocket.receive_bytes()
            # Send to Deepgram
            await dg_connection.send(data)
    except Exception as e:
        print(f"Connection closed: {e}")
    finally:
        await dg_connection.finish()

Phase 3: The "Scam Brain" (Keywords AI + Groq)
We need a function that takes the transcript and decides if it's a scam.
backend/services/scam_detector.py:
Python

from openai import OpenAI
import os
import json

# Initialize Keywords AI (acting as OpenAI)
client = OpenAI(
    base_url="https://api.keywordsai.co/api",
    api_key=os.getenv("KEYWORDS_AI_API_KEY")
)

def analyze_transcript(transcript_text):
    response = client.chat.completions.create(
        model="llama-3-70b-8192", # Using Groq via Keywords AI
        messages=[
            {"role": "system", "content": """
                You are a scam detection AI. Return a JSON object with:
                - risk_score (0-100)
                - reasoning (string)
                - suggested_question (string, something the user can ask to verify the caller)
                
                Example JSON:
                {"risk_score": 85, "reasoning": "Caller asking for gift cards", "suggested_question": "Ask for their employee ID"}
            """},
            {"role": "user", "content": transcript_text}
        ],
        extra_body={"prompt_name": "kova-guard-v1"} # Optional: Track in Keywords Dashboard
    )
    
    # Parse the JSON string from the LLM
    content = response.choices[0].message.content
    return json.loads(content) 

Phase 4: Frontend Audio Capture
The React app needs to capture audio and send it to the FastAPI WebSocket.
frontend/src/components/AudioRecorder.tsx:
TypeScript

import { useState, useRef } from 'react';

const AudioRecorder = () => {
  const [status, setStatus] = useState('idle');
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    // 1. Open WebSocket to FastAPI
    socketRef.current = new WebSocket('ws://localhost:8000/ws/listen');

    // 2. Get Microphone Stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 3. Setup MediaRecorder
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    // 4. Send audio chunks every 250ms
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(event.data);
      }
    };

    mediaRecorderRef.current.start(250); // Chunk size
    setStatus('recording');
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    socketRef.current?.close();
    setStatus('idle');
  };

  return (
    <button onClick={status === 'idle' ? startRecording : stopRecording}>
      {status === 'idle' ? 'Start Protection' : 'Stop'}
    </button>
  );
};

Phase 5: The "Interrogation" & Alerts
Logic in FastAPI (websocket.py): Update the on_message function to actually do the work.
Python

accumulated_transcript = ""

def on_message(self, result, **kwargs):
    sentence = result.channel.alternatives[0].transcript
    
    if len(sentence) > 10: # Only analyze substantial phrases
        # 1. Get Analysis
        analysis = analyze_transcript(sentence)
        
        # 2. Check for Danger
        if analysis['risk_score'] > 85:
            send_sms_alert() # Call Twilio function
            
        # 3. Send back to Frontend
        asyncio.run(websocket.send_json({
            "type": "analysis",
            "transcript": sentence,
            "risk_score": analysis['risk_score'],
            "prompt": analysis['suggested_question']
        }))

6. Onboarding Flow (The Demo Setup)
Since you are demoing this, you need a smooth setup flow:
1. Login: User enters name/email (Supabase Auth).
2. Relative Setup: User enters "Grandson's Phone Number". Save this to Supabase profiles.
3. Mic Check: A visualizer bar that bounces when you speak (proves it's working).
4. Simulation Mode (Crucial for Demo):
    * Add a toggle on the frontend: "Simulation Mode".
    * If active, instead of using the microphone, the frontend plays a pre-recorded mp3 of a scam call (so the judges hear it clearly) and streams that audio to the backend. This guarantees a perfect demo every time.
7. Final Checklist for Success
1. Latency: Ensure the MediaRecorder timeslice is small (250ms). If it's too large (e.g., 1000ms), the transcription will lag by 1 second.
2. Venv: Use a Python virtual environment (python -m venv venv) so your libraries don't conflict.
3. Twilio Verified IDs: If you use a free Twilio account, you can only send SMS to numbers you have verified. Do this before the presentation.
4. Deepgram API Key: Keep it in your .env file on the backend. Do not expose it to the frontend.