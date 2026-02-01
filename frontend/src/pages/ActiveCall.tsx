import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { ChatPanel } from '../components/ChatPanel';
import { cn } from '../utils/cn';
import { ShieldAlert, ShieldCheck, ShieldQuestion, PhoneOff, X, MessageCircleQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface AudioDevice {
    deviceId: string;
    label: string;
}

interface TranscriptSegment {
    speaker: 'user' | 'caller';
    text: string;
}

interface TranscriptMessage {
    type: string;
    segments: TranscriptSegment[];
    risk_score: number;
    confidence_score: number;
    reasoning: string;
    suggested_question: string | null;
    alert_sent: boolean;
}

export const ActiveCall = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const locationState = location.state as { callerPhoneNumber?: string; autoStart?: boolean } | null;
    const callerPhoneNumber = locationState?.callerPhoneNumber || '';
    const autoStart = locationState?.autoStart || false;
    const [riskScore, setRiskScore] = useState(0);
    const [confidenceScore, setConfidenceScore] = useState(0);
    const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [status, setStatus] = useState<'safe' | 'warning' | 'danger'>('safe');
    const [isListening, setIsListening] = useState(false);
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    // WebSocket and audio refs
    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Session ID for chatbot context - stable across component lifecycle
    const sessionId = useMemo(() => crypto.randomUUID(), []);

    // Get available audio input devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e) {
                console.error('Microphone permission denied');
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices
                .filter(device => device.kind === 'audioinput')
                .filter(device => !device.label.toLowerCase().includes('virtual'))
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
                }));

            setAudioDevices(audioInputs);

            if (audioInputs.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(audioInputs[0].deviceId);
            }
        };

        getDevices();
    }, []);

    // Startup sound effect
    const hasPlayedSound = useRef(false);
    useEffect(() => {
        if (hasPlayedSound.current) return;
        hasPlayedSound.current = true;

        const playStartupSound = async () => {
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContextClass();

                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.5);
            } catch (e) {
                console.error("Audio play failed", e);
            }
        };

        playStartupSound();
    }, []);

    // Derived status based on risk score
    useEffect(() => {
        if (riskScore < 30) setStatus('safe');
        else if (riskScore < 70) setStatus('warning');
        else setStatus('danger');
    }, [riskScore]);

    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    const startListening = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false, // Important for reliable visualizer levels
                }
            });
            streamRef.current = stream;
            setMediaStream(stream); // Share with Visualizer

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;
            await audioContext.resume();

            // Create two branches: one for Analysis (Visualizer), one for Processing (WebSocket)
            // Branch 1 is handled by passing 'stream' to AudioVisualizer component

            // Branch 2: Sending data to backend
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            const wsUrl = `ws://localhost:8000/ws/audio?sample_rate=${audioContext.sampleRate}&caller_phone_number=${encodeURIComponent(callerPhoneNumber)}&session_id=${sessionId}&user_id=${user?.id || ''}`;
            socketRef.current = new WebSocket(wsUrl);

            socketRef.current.onopen = () => {
                console.log('WebSocket Connected');
                setIsListening(true);

                processor.onaudioprocess = (e) => {
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Downsample or process if needed, but here we send raw PCM
                        const int16Data = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        socketRef.current.send(int16Data.buffer);
                    }
                };

                source.connect(processor);
                processor.connect(audioContext.destination); // Essential for script processor to run
            };

            // ... (rest of websocket handlers) ...

            // Handle incoming transcripts with speaker info
            socketRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('Received:', message);

                    // Handle "kova stop" voice command
                    if (message.type === 'stop_call') {
                        console.log('[ActiveCall] "kova stop" detected, ending call...');
                        handleEndCall();
                        return;
                    }

                    if (message.type === 'transcript') {
                        const transcriptMessage = message as TranscriptMessage;
                        if (transcriptMessage.segments.length > 0) {
                            setTranscriptSegments(prev => [...prev, ...transcriptMessage.segments]);
                        }
                        setRiskScore(transcriptMessage.risk_score);
                        setConfidenceScore(transcriptMessage.confidence_score);

                        // Add new question if not duplicate
                        if (transcriptMessage.suggested_question) {
                            setSuggestedQuestions(prev => {
                                if (prev.includes(transcriptMessage.suggested_question!)) return prev;
                                const updated = [transcriptMessage.suggested_question!, ...prev];
                                return updated.slice(0, 3); // Keep max 3
                            });
                        }
                    }
                } catch (e) {
                    console.error('Error parsing message:', e);
                }
            };

            socketRef.current.onclose = () => console.log('WebSocket Closed');
            socketRef.current.onerror = (error) => console.error('WebSocket Error:', error);

        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    }, [selectedDeviceId, callerPhoneNumber, sessionId]);

    const stopListening = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setMediaStream(null); // Clear for visualizer fallback

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        setIsListening(false);
    }, []);

    // Auto-start recording when navigated via wake word
    useEffect(() => {
        if (autoStart && !isListening) {
            console.log('[ActiveCall] Auto-starting recording from wake word...');
            startListening();
        }
    }, [autoStart]); // Only run once when component mounts with autoStart

    const handleEndCall = () => {
        stopListening();
        navigate('/dashboard');
    };

    const clearTranscript = () => {
        setTranscriptSegments([]);
        setRiskScore(0);
        setConfidenceScore(0);
        setSuggestedQuestions([]);
    };

    const dismissQuestion = (question: string) => {
        setSuggestedQuestions(prev => prev.filter(q => q !== question));
    };

    // Mesh Gradient Colors
    const getMeshColors = () => {
        switch (status) {
            case 'safe': return {
                from: 'from-brand-600',
                via: 'via-brand-500',
                to: 'to-brand-400',
                glow: 'bg-brand-500' // Cyan/Blue glow for Safe
            };
            case 'warning': return {
                from: 'from-amber-400',
                via: 'via-yellow-500',
                to: 'to-orange-400',
                glow: 'bg-amber-500'
            };
            case 'danger': return {
                from: 'from-red-600',
                via: 'via-rose-500',
                to: 'to-crimson-600',
                glow: 'bg-red-600'
            };
        }
    };

    const mesh = getMeshColors();

    const getStatusColor = () => {
        switch (status) {
            case 'safe': return 'text-brand-400 bg-brand-500/10 border-brand-500/20 shadow-[0_0_35px_rgba(14,165,233,0.3)]'; // Increased glow
            case 'warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'danger': return 'text-red-400 bg-red-500/10 border-red-500/20';
        }
    };

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-between p-6">

            {/* FLUID LUMINOUS HALO SYSTEM */}
            <motion.div
                className={cn(
                    "absolute inset-0 z-0 opacity-40 blur-[100px] transition-colors duration-1000",
                    mesh.glow
                )}
            />

            {/* Sleek Static Glowing Border - Modeled after Image 2 */}
            <div className="absolute inset-0 z-0 p-[2px] rounded-[3rem] overflow-hidden">
                {/* Static Gradient Border Layer */}
                <div
                    className={cn(
                        "absolute inset-0 transition-colors duration-700 opacity-80",
                        status === 'safe' ? "bg-gradient-to-b from-brand-500 via-transparent to-brand-600" :
                            status === 'warning' ? "bg-gradient-to-b from-amber-500 via-transparent to-amber-600" :
                                "bg-gradient-to-b from-red-600 via-transparent to-red-600"
                    )}
                />

                {/* Inner Black Background */}
                <div className="absolute inset-[1px] bg-neutral-950 rounded-[calc(3rem-1px)] z-10" />

                {/* Inner Glow/Shadow for Depth */}
                <div className={cn(
                    "absolute inset-0 z-20 rounded-[3rem] shadow-[inset_0_0_50px_rgba(0,0,0,0.6)] transition-shadow duration-700",
                    status === 'safe' && "shadow-[inset_0_0_40px_rgba(14,165,233,0.4)] border border-brand-500/50",
                    status === 'warning' && "shadow-[inset_0_0_30px_rgba(245,158,11,0.3)] border border-amber-500/30",
                    status === 'danger' && "shadow-[inset_0_0_40px_rgba(239,68,68,0.4)] border border-red-500/30"
                )} />
            </div>

            {/* Content Layer */}
            <div className="relative z-30 w-full flex flex-col items-center justify-between h-full pt-12 pb-6">

                {/* Status Pill */}
                <motion.div
                    className="w-full max-w-lg text-center space-y-2"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <motion.div
                        className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-xl shadow-lg", getStatusColor())}
                        layout
                    >
                        {status === 'safe' && <ShieldCheck className="w-4 h-4" />}
                        {status === 'warning' && <ShieldQuestion className="w-4 h-4" />}
                        {status === 'danger' && <ShieldAlert className="w-4 h-4 animate-pulse" />}
                        <span className="font-semibold uppercase tracking-wider text-sm">
                            {status === 'safe' ? 'Protected' : status === 'warning' ? 'Analyzing...' : 'Scam Detected'}
                        </span>
                    </motion.div>
                </motion.div>

                {/* Main Visualizer Area */}
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mt-16">
                    <div className="mb-12 relative">
                        <div className={cn(
                            "absolute inset-0 blur-3xl opacity-20 transition-colors duration-700",
                            mesh.glow
                        )} />
                        <AudioVisualizer
                            isActive={true}
                            status={status}
                            audioStream={mediaStream} // Pass shared stream
                            className="relative z-10"
                        />
                    </div>

                    {/* Status message when listening */}
                    <div className="w-full text-center py-4">
                        <p className="text-neutral-500 italic font-light text-sm">
                            {isListening ? 'Listening for conversation...' : 'Press Start to begin listening...'}
                        </p>
                    </div>

                    {/* Suggested Questions */}
                    <AnimatePresence>
                        {suggestedQuestions.length > 0 && riskScore < 70 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="w-full space-y-2 mt-4"
                            >
                                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                                    <MessageCircleQuestion className="w-4 h-4" />
                                    <span>Ask to verify caller:</span>
                                </div>
                                {suggestedQuestions.map((question, idx) => (
                                    <motion.div
                                        key={question}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3"
                                    >
                                        <span className="flex-1 text-purple-200 text-sm">"{question}"</span>
                                        <button
                                            onClick={() => dismissQuestion(question)}
                                            className="text-purple-400 hover:text-purple-200 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="w-full max-w-sm space-y-4">
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            className={cn(
                                "flex-1 border-neutral-800 backdrop-blur-xl transition-all",
                                isListening
                                    ? "bg-brand-500/20 border-brand-500/30 hover:bg-brand-500/30"
                                    : "bg-neutral-900/60 hover:bg-neutral-800"
                            )}
                            onClick={isListening ? stopListening : startListening}
                        >
                            {isListening ? '⏹ Stop Listening' : '🎤 Start Listening'}
                        </Button>
                        <Button
                            variant="outline"
                            className="border-neutral-800 bg-neutral-900/60 backdrop-blur-xl hover:bg-neutral-800 transition-all"
                            onClick={clearTranscript}
                        >
                            Clear
                        </Button>
                    </div>
                    <Button
                        variant="danger"
                        size="lg"
                        className="w-full shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                        onClick={handleEndCall}
                    >
                        <PhoneOff className="w-5 h-5 mr-2" />
                        End Call
                    </Button>
                </div>
            </div>

            {/* Chatbot Panel */}
            <ChatPanel sessionId={isListening ? sessionId : null} isListening={isListening} />
        </div>
    );
};
