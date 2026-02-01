import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: Event & { error: string }) => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

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
    const [isSupported, setIsSupported] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const shouldBeListeningRef = useRef(false); // Track intended state
    const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onWakeWordRef = useRef(onWakeWord);
    const retryCountRef = useRef(0);
    const maxRetries = 5;
    const baseRetryDelay = 1000; // Start with 1 second delay

    // Keep callback ref updated
    useEffect(() => {
        onWakeWordRef.current = onWakeWord;
    }, [onWakeWord]);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }
    }, []);

    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            setIsSupported(false);
            setError('Speech recognition is not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            // Check all results for the wake word
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.toLowerCase().trim();
                console.log('[WakeWord] Heard:', transcript);

                if (transcript.includes(wakeWord.toLowerCase())) {
                    console.log('[WakeWord] Wake word detected!');
                    // Stop listening before triggering callback to prevent multiple triggers
                    shouldBeListeningRef.current = false;
                    cleanup();
                    recognition.stop();
                    setIsListening(false);
                    onWakeWordRef.current();
                    return;
                }
            }
        };

        recognition.onend = () => {
            console.log('[WakeWord] Recognition ended');
            setIsListening(false);

            // Only restart if we should still be listening
            if (shouldBeListeningRef.current && retryCountRef.current < maxRetries) {
                const delay = baseRetryDelay * Math.pow(1.5, retryCountRef.current); // Exponential backoff
                console.log(`[WakeWord] Scheduling restart in ${delay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);

                cleanup();
                restartTimeoutRef.current = setTimeout(() => {
                    if (shouldBeListeningRef.current) {
                        try {
                            recognition.start();
                            retryCountRef.current++;
                        } catch (e) {
                            console.error('[WakeWord] Failed to restart:', e);
                        }
                    }
                }, delay);
            } else if (retryCountRef.current >= maxRetries) {
                console.log('[WakeWord] Max retries reached, stopping');
                shouldBeListeningRef.current = false;
                setError('Speech recognition failed after multiple attempts. Click to retry.');
            }
        };

        recognition.onerror = (event) => {
            console.error('[WakeWord] Error:', event.error);

            if (event.error === 'not-allowed') {
                setError('Microphone permission denied');
                shouldBeListeningRef.current = false;
                setIsListening(false);
            } else if (event.error === 'network') {
                // Network errors are common and recoverable - don't show error to user
                // The onend handler will retry automatically
                console.log('[WakeWord] Network error, will retry...');
            } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
                console.log('[WakeWord] Non-fatal error:', event.error);
            }
        };

        recognition.onstart = () => {
            console.log('[WakeWord] Recognition started');
            setIsListening(true);
            setError(null);
            retryCountRef.current = 0; // Reset retry count on successful start
        };

        recognitionRef.current = recognition;

        return () => {
            shouldBeListeningRef.current = false;
            cleanup();
            recognition.abort();
        };
    }, [wakeWord, cleanup]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || !isSupported) return;

        shouldBeListeningRef.current = true;
        retryCountRef.current = 0;
        setError(null);

        try {
            recognitionRef.current.start();
        } catch (e) {
            // Already started or other error
            console.log('[WakeWord] Start error (may already be running):', e);
        }
    }, [isSupported]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;

        shouldBeListeningRef.current = false;
        cleanup();

        try {
            recognitionRef.current.stop();
        } catch (e) {
            console.log('[WakeWord] Stop error:', e);
        }
        setIsListening(false);
    }, [cleanup]);

    const toggleListening = useCallback(() => {
        if (shouldBeListeningRef.current) {
            stopListening();
        } else {
            startListening();
        }
    }, [startListening, stopListening]);

    // Auto-start when enabled changes
    useEffect(() => {
        if (enabled && isSupported) {
            startListening();
        } else {
            stopListening();
        }

        return () => {
            cleanup();
        };
    }, [enabled, isSupported, startListening, stopListening, cleanup]);

    return {
        isListening,
        isSupported,
        error,
        startListening,
        stopListening,
        toggleListening,
    };
};
