## Inspiration

Every year, Americans lose over \$10 billion to phone scams, with elderly individuals being the most vulnerable targets. We've all heard stories of someone's grandparent being manipulated into sending gift cards or wire transfers to fraudsters posing as the IRS, tech support, or even family members. We built Kova to be the protective companion that sits with you during calls—analyzing conversations in real-time and alerting family when something seems wrong.

## What it does

**Kova** is a real-time scam call protection system that:
- **Listens passively** using a voice-activated wake word ("Kova, activate") so users can start protection hands-free
- **Two-stage transcription pipeline:** Deepgram converts speech-to-text in real-time, then Llama 3.3 analyzes the raw transcript to identify who's the User vs Caller
- **Analyzes conversations** with an LLM-powered "Scam Brain" that maintains context across the entire call and outputs a dynamic risk score
- **Generates verification questions** to help users interrogate suspicious callers (e.g., "Ask for their employee ID and call-back number")
- **Sends instant iMessage alerts** to emergency contacts when a scam is detected with high confidence
- **Provides an AI chat companion** (Claude 3.5 Sonnet) that users can consult mid-call for guidance
- **Reports suspicious numbers** to a community database for pattern detection
- **Shows a live analytics dashboard** with call history, risk trends, and visualizations

## How we built it

- **Frontend:** React + Vite + TypeScript with Tailwind CSS and Framer Motion for smooth animations
- **Backend:** FastAPI (Python) handling WebSocket streams for real-time audio
- **Transcription:** Deepgram SDK with Nova-2 model for sub-200ms latency
- **AI Pipeline:** LangGraph orchestrates our multi-step workflow—scam detection (Groq/Llama 3.3 70B), question generation, and alerting logic
- **Chatbot:** Claude 3.5 Sonnet (via Keywords AI) for intelligent mid-call assistance
- **Database:** Supabase (PostgreSQL) for user profiles, emergency contacts, and suspicious number tracking
- **Alerts:** Native macOS AppleScript to send iMessages directly (bypassing Twilio verification delays)

## Challenges we ran into

- **Wake word detection** was unreliable with Web Speech API—we rebuilt it using Deepgram with phonetic fuzzy matching for "kova" since it's not a real word
- **Real-time latency** required aggressive tuning of audio chunk sizes (250ms) and WebSocket buffering
- **Session state management** across multiple concurrent WebSocket connections was tricky until we implemented a proper session manager
- **Twilio verification** takes days, so we pivoted to macOS native messaging as a workaround for the demo

## Accomplishments that we're proud of

- Achieved **sub-second end-to-end latency** from speech to on-screen risk score update
- Built a **beautiful, polished UI** with real-time animated visualizers that feels production-ready
- The **LangGraph workflow** elegantly handles conditional routing—alerting only when both risk AND confidence are high
- Successfully integrated **4 different AI models** (Deepgram, Llama 3.3, Claude 3.5 Sonnet) into a cohesive experience

## What we learned

- WebSocket architecture patterns for real-time bidirectional streaming
- LangGraph as an orchestration framework for multi-step AI workflows
- The importance of graceful degradation (e.g., switching from Twilio to native messaging)
- Phonetic matching strategies for detecting made-up words in speech recognition

## What's next for Kova

- **Mobile app** with call integration for Android/iOS
- **Multi-language support** for protecting non-English speakers
- **Crowdsourced scam intelligence**—using our suspicious number database to proactively warn users
- **Partner with senior care organizations** to get Kova into the hands of those who need it most
