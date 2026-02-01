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
    const shouldBeListeningRef = useRef(false);
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
            socketRef.current.close();
            socketRef.current = null;
        }
    }, []);

    const startListening = useCallback(async () => {
        if (!shouldBeListeningRef.current) {
            shouldBeListeningRef.current = true;
        }

        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            streamRef.current = stream;

            // Set up audio context
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;
            await audioContext.resume();

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

    // Auto-start when enabled
    useEffect(() => {
        if (enabled) {
            startListening();
        } else {
            stopListening();
        }

        return () => {
            cleanup();
        };
    }, [enabled]);

    return {
        isListening,
        isSupported: true, // WebSocket is always supported
        error,
        startListening,
        stopListening,
        toggleListening,
    };
};
