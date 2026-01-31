import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { cn } from '../utils/cn';
import { ShieldAlert, ShieldCheck, ShieldQuestion, PhoneOff, X, MessageCircleQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

            const wsUrl = `ws://localhost:8000/ws/audio?sample_rate=${audioContext.sampleRate}`;
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
                    const message: TranscriptMessage = JSON.parse(event.data);
                    console.log('Received:', message);

                    if (message.type === 'transcript') {
                        if (message.segments.length > 0) {
                            setTranscriptSegments(prev => [...prev, ...message.segments]);
                        }
                        setRiskScore(message.risk_score);
                        setConfidenceScore(message.confidence_score);

                        // Add new question if not duplicate
                        if (message.suggested_question) {
                            setSuggestedQuestions(prev => {
                                if (prev.includes(message.suggested_question!)) return prev;
                                const updated = [message.suggested_question!, ...prev];
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
    }, [selectedDeviceId]);

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
                from: 'from-[#50C878]',
                via: 'via-[#228B22]',
                to: 'to-[#98FF98]',
                glow: 'bg-emerald-500'
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
            case 'safe': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
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

            {/* Rotating Mesh Gradient Border */}
            <div className="absolute inset-0 z-0 p-[2px] rounded-[3rem] overflow-hidden">
                {/* The Rotating Gradient Layer - CHANGED TO STATIC PULSING to prevent corner glitches */}
                <motion.div
                    className={cn(
                        "absolute inset-[-50%] w-[200%] h-[200%] opacity-100 transition-colors duration-1000",
                        mesh.from, mesh.via, mesh.to
                    )}
                    // Removed rotation to keep corners static as requested
                    animate={{
                        opacity: [0.8, 1, 0.8],
                        scale: [1, 1.02, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        backgroundImage: `conic-gradient(from 0deg, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to), var(--tw-gradient-from))`
                    }}
                />

                <div className="absolute inset-[3px] bg-neutral-950 rounded-[calc(3rem-3px)] z-10" />

                <div className={cn(
                    "absolute inset-0 z-20 rounded-[3rem] shadow-[inset_0_0_60px_rgba(0,0,0,0.3)] transition-shadow duration-1000",
                    status === 'safe' && "shadow-[inset_0_0_40px_rgba(34,197,94,0.3)]",
                    status === 'warning' && "shadow-[inset_0_0_40px_rgba(245,158,11,0.3)]",
                    status === 'danger' && "shadow-[inset_0_0_40px_rgba(239,68,68,0.4)]"
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

                    {/* Microphone selector */}
                    <div className="mt-4">
                        <select
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            disabled={isListening}
                            className="bg-neutral-900/60 border border-neutral-700 text-white px-4 py-2 rounded-lg backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            {audioDevices.map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label}
                                </option>
                            ))}
                        </select>
                    </div>
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

                    {/* Live Transcript Stream with Speaker Labels */}
                    <div className="w-full h-48 overflow-hidden relative mask-image-gradient">
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950 z-20 pointer-events-none" />

                        <div className="space-y-4 text-center px-4 relative z-10 overflow-y-auto max-h-full">
                            <AnimatePresence mode="popLayout">
                                {transcriptSegments.length === 0 && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-neutral-600 italic font-light"
                                    >
                                        {isListening ? 'Listening for conversation...' : 'Press Start to begin listening...'}
                                    </motion.p>
                                )}
                                {transcriptSegments.slice(-5).map((segment, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
                                        className="flex items-start gap-3 text-left"
                                    >
                                        <span className={cn(
                                            "shrink-0 px-2 py-1 rounded text-xs font-bold uppercase",
                                            segment.speaker === 'user'
                                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        )}>
                                            {segment.speaker}
                                        </span>
                                        <span className={cn(
                                            "text-lg font-medium leading-relaxed",
                                            idx === transcriptSegments.slice(-5).length - 1 ? "text-white" : "text-neutral-400"
                                        )}>
                                            "{segment.text}"
                                        </span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
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
                                    ? "bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30"
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

        </div>
    );
};
