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
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event & { error: string }) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

interface UseWakeWordOptions {
    wakePhrase?: string;
    onActivate?: () => void;
    autoStart?: boolean;
}

interface UseWakeWordResult {
    isListening: boolean;
    isActivated: boolean;
    error: string | null;
    isSupported: boolean;
    start: () => void;
    stop: () => void;
}

/**
 * Custom hook for wake word detection using Web Speech API
 * Listens for "kova activate" (or custom phrase) and triggers callback
 */
export function useWakeWord(options: UseWakeWordOptions = {}): UseWakeWordResult {
    const {
        wakePhrase = 'kova activate',
        onActivate,
        autoStart = true
    } = options;

    const [isListening, setIsListening] = useState(false);
    const [isActivated, setIsActivated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const isRestartingRef = useRef(false);
    const shouldListenRef = useRef(autoStart);

    // Check browser support
    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // Normalize text for matching (lowercase, remove punctuation)
    const normalizeText = useCallback((text: string): string => {
        return text.toLowerCase()
            .replace(/[.,!?;:'"]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }, []);

    // Check if transcript contains wake phrase (fuzzy matching)
    const containsWakePhrase = useCallback((transcript: string): boolean => {
        const normalized = normalizeText(transcript);
        const normalizedWake = normalizeText(wakePhrase);

        // Direct match
        if (normalized.includes(normalizedWake)) return true;

        // Common variations: "kova, activate", "kova activate", "cova activate"
        const variations = [
            normalizedWake,
            'kova activate',
            'cova activate',
            'koba activate',
            'nova activate',
            'ko va activate',
        ];

        return variations.some(v => normalized.includes(v));
    }, [wakePhrase, normalizeText]);

    // Initialize speech recognition
    const initRecognition = useCallback(() => {
        if (!isSupported) {
            setError('Speech recognition is not supported in this browser');
            return null;
        }

        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            // Check all results from this event
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                console.log('[WakeWord] Heard:', transcript, '(final:', result.isFinal, ')');

                if (containsWakePhrase(transcript)) {
                    console.log('[WakeWord] Wake phrase detected!');
                    setIsActivated(true);
                    recognition.stop();
                    onActivate?.();
                    return;
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('[WakeWord] Error:', event.error);

            // Don't show error for expected situations
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }

            if (event.error === 'not-allowed') {
                setError('Microphone permission denied');
                shouldListenRef.current = false;
            } else {
                setError(`Speech recognition error: ${event.error}`);
            }

            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);

            // Auto-restart if we should still be listening and haven't activated
            if (shouldListenRef.current && !isRestartingRef.current) {
                isRestartingRef.current = true;
                setTimeout(() => {
                    if (shouldListenRef.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            console.error('[WakeWord] Restart failed:', e);
                        }
                    }
                    isRestartingRef.current = false;
                }, 100);
            }
        };

        return recognition;
    }, [isSupported, containsWakePhrase, onActivate]);

    // Start listening
    const start = useCallback(() => {
        if (!isSupported) {
            setError('Speech recognition is not supported in this browser');
            return;
        }

        shouldListenRef.current = true;
        setIsActivated(false);
        setError(null);

        if (!recognitionRef.current) {
            recognitionRef.current = initRecognition();
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Already started, ignore
                console.log('[WakeWord] Recognition already started');
            }
        }
    }, [isSupported, initRecognition]);

    // Stop listening
    const stop = useCallback(() => {
        shouldListenRef.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    // Auto-start on mount if enabled
    useEffect(() => {
        if (autoStart && isSupported) {
            recognitionRef.current = initRecognition();
            start();
        }

        return () => {
            shouldListenRef.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.abort();
                recognitionRef.current = null;
            }
        };
    }, [autoStart, isSupported, initRecognition, start]);

    return {
        isListening,
        isActivated,
        error,
        isSupported,
        start,
        stop
    };
}
