import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWakeWordOptions {
    wakeWord?: string;
    onWakeWord: () => void;
    enabled?: boolean;
}

interface UseWakeWordReturn {
    isListening: boolean;
    isSupported: boolean;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    toggleListening: () => void;
}

export const useWakeWord = ({
    wakeWord = 'hello',
    onWakeWord,
    enabled = true,
}: UseWakeWordOptions): UseWakeWordReturn => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const shouldBeListeningRef = useRef(enabled);
    const onWakeWordRef = useRef(onWakeWord);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep callback ref updated
    useEffect(() => {
        onWakeWordRef.current = onWakeWord;
    }, [onWakeWord]);

    const cleanup = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

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

        if (socketRef.current) {
            // Prevent onclose handler from triggering reconnect during manual cleanup
            socketRef.current.onclose = null;
            socketRef.current.close();
            socketRef.current = null;
        }
    }, []);

    const startListening = useCallback(async () => {
        // Guard: Don't start if already listening or socket exists
        if (socketRef.current || streamRef.current) {
            console.log('[WakeWord] Already listening, skipping start');
            return;
        }

        shouldBeListeningRef.current = true;

        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            // CHECKPOINT 1: Check if muted during getUserMedia await
            if (!shouldBeListeningRef.current) {
                console.log('[WakeWord] Muted during getUserMedia, aborting');
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            streamRef.current = stream;

            // Set up audio context
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;
            await audioContext.resume();

            // CHECKPOINT 2: Check if muted during audioContext.resume() await
            if (!shouldBeListeningRef.current) {
                console.log('[WakeWord] Muted during audioContext.resume, aborting');
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
                streamRef.current = null;
                audioContextRef.current = null;
                return;
            }

            // Connect to backend WebSocket
            const wsUrl = `ws://localhost:8000/ws/wakeword?sample_rate=${audioContext.sampleRate}&wake_word=${encodeURIComponent(wakeWord)}`;
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('[WakeWord] Connected to backend');
                setIsListening(true);
                setError(null);

                // Set up audio processing
                const source = audioContext.createMediaStreamSource(stream);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                    if (socket.readyState === WebSocket.OPEN) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const int16Data = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        socket.send(int16Data.buffer);
                    }
                };

                source.connect(processor);
                processor.connect(audioContext.destination);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[WakeWord] Message:', data);

                    if (data.detected) {
                        console.log('[WakeWord] Wake word detected!');
                        shouldBeListeningRef.current = false;
                        cleanup();
                        setIsListening(false);
                        onWakeWordRef.current();
                    }
                } catch (e) {
                    console.error('[WakeWord] Parse error:', e);
                }
            };

            socket.onclose = () => {
                console.log('[WakeWord] Connection closed');
                setIsListening(false);

                // Reconnect if we should still be listening
                if (shouldBeListeningRef.current) {
                    console.log('[WakeWord] Scheduling reconnect...');
                    cleanup();
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (shouldBeListeningRef.current) {
                            startListening();
                        }
                    }, 2000);
                }
            };

            socket.onerror = (e) => {
                console.error('[WakeWord] WebSocket error:', e);
                setError('Connection error - retrying...');
            };

        } catch (e) {
            console.error('[WakeWord] Error:', e);
            if ((e as Error).name === 'NotAllowedError') {
                setError('Microphone permission denied');
            } else {
                setError('Failed to start listening');
            }
            setIsListening(false);
        }
    }, [wakeWord, cleanup]);

    const stopListening = useCallback(() => {
        shouldBeListeningRef.current = false;
        cleanup();
        setIsListening(false);
        setError(null);
    }, [cleanup]);

    const toggleListening = useCallback(() => {
        if (shouldBeListeningRef.current) {
            stopListening();
        } else {
            startListening();
        }
    }, [startListening, stopListening]);

    // Refs for stable callback access without re-triggering effect
    const startListeningRef = useRef(startListening);
    const cleanupRef = useRef(cleanup);

    useEffect(() => {
        startListeningRef.current = startListening;
        cleanupRef.current = cleanup;
    }, [startListening, cleanup]);

    // Auto-start/stop when enabled changes - ONLY depend on enabled
    useEffect(() => {
        console.log(`[WakeWord] enabled changed to: ${enabled}`);

        // Important: Update the ref immediately so reconnect logic respects it
        shouldBeListeningRef.current = enabled;

        if (enabled) {
            startListeningRef.current();
        } else {
            console.log('[WakeWord] Muting - stopping all listeners');
            // Force stop everything
            cleanupRef.current();
            setIsListening(false);
            setError(null);
        }

        return () => {
            console.log('[WakeWord] useEffect cleanup running');
            shouldBeListeningRef.current = false;
            cleanupRef.current();
        };
    }, [enabled]); // Only depend on enabled!

    return {
        isListening,
        isSupported: true, // WebSocket is always supported
        error,
        startListening,
        stopListening,
        toggleListening,
    };
};
