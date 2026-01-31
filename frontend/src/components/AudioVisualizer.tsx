import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface AudioVisualizerProps {
    isActive: boolean;
    className?: string;
    // Removed 'levels' and 'intensity' as this component now self-manages
}

export const AudioVisualizer = ({ isActive, className }: AudioVisualizerProps) => {
    // 5 bars for symmetry
    const bars = [0, 1, 2, 3, 4];
    const [levels, setLevels] = useState<number[]>([0.02, 0.02, 0.02, 0.02, 0.02]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const timeRef = useRef<number>(0);
    const prevLevels = useRef<number[]>([0.02, 0.02, 0.02, 0.02, 0.02]);

    useEffect(() => {
        if (!isActive) return;

        let animationFrameId: number;

        const startAudio = async () => {
            try {
                // Initialize Audio Context
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContext();
                audioContextRef.current = ctx;

                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                const analyser = ctx.createAnalyser();
                analyser.fftSize = 64;
                analyserRef.current = analyser;

                // Try microphone access
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const source = ctx.createMediaStreamSource(stream);
                    sourceRef.current = source;
                    source.connect(analyser);

                    const bufferLength = analyser.frequencyBinCount;
                    dataArrayRef.current = new Uint8Array(bufferLength) as any;
                } catch (micErr) {
                    console.warn("Visualizer mic access failed:", micErr);
                }

                // Animation Loop
                const animate = () => {
                    // 1. Calculate base energy
                    let energy = 0;
                    if (analyserRef.current && dataArrayRef.current) {
                        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
                        const bufferLength = analyserRef.current.frequencyBinCount;
                        let sum = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            sum += dataArrayRef.current[i];
                        }
                        const avgVolume = sum / bufferLength;
                        // High sensitivity, low floor
                        energy = Math.min(1, avgVolume / 50);
                    }

                    // 2. Idle "Siri-like" breathing
                    timeRef.current += 0.05;
                    const t = timeRef.current;

                    const idle0 = Math.sin(t) * 0.02 + 0.02;
                    const idle1 = Math.sin(t * 0.8 + 1) * 0.02 + 0.02;
                    const idle2 = Math.sin(t * 0.5) * 0.02 + 0.02;
                    const idle3 = Math.sin(t * 0.9 + 2) * 0.02 + 0.02;
                    const idle4 = Math.sin(t * 1.1 + 4) * 0.02 + 0.02;

                    // Alternating Asymmetry (Every ~2 seconds)
                    // timeRef increments by 0.05 per frame (approx 60fps -> +3 per second)
                    // We want a switch every ~2 seconds -> every ~6 units
                    const cycle = Math.floor(t / 6) % 2;

                    // Define two asymmetric states (mirrored slightly)
                    // Increased multipliers as requested.
                    // Center Peak: 1.5 (was 1.3)
                    // Inner: 1.2/1.3 (was 1.0/1.1)
                    // Outer: 0.7/0.8 (was 0.5/0.6)
                    const m = cycle === 0
                        ? [0.7, 1.3, 1.5, 1.2, 0.8]  // State A
                        : [0.8, 1.2, 1.5, 1.3, 0.7]; // State B

                    const targets = [
                        energy * m[0] + idle0,
                        energy * m[1] + idle1,
                        energy * m[2] + idle2,      // Center Peak
                        energy * m[3] + idle3,
                        energy * m[4] + idle4
                    ];

                    // 3. Smooth Interpolation
                    const smoothing = 0.2;
                    const newLevels = prevLevels.current.map((prev, i) => {
                        return prev + (targets[i] - prev) * smoothing;
                    });

                    prevLevels.current = newLevels;
                    setLevels(newLevels); // Updates only this component
                    animationFrameId = requestAnimationFrame(animate);
                };

                animate();

            } catch (err) {
                console.error("Visualizer setup failed:", err);
            }
        };

        startAudio();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            sourceRef.current?.disconnect();
            audioContextRef.current?.close();
        };
    }, [isActive]);


    return (
        <div className={cn('flex items-center justify-end gap-3 h-80', className)}>
            {bars.map((i) => (
                <motion.div
                    key={i}
                    className={cn(
                        'w-12 rounded-full bg-gradient-to-t from-brand-500 to-brand-300 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]',
                        !isActive && 'opacity-30 grayscale'
                    )}
                    animate={
                        isActive
                            ? {
                                height: `${Math.min(100, Math.max(5, levels[i] * 40))}%` // Scale factor 40 fits levels into h-80. Min 5%.
                            }
                            : { height: '5%' }
                    }
                    transition={{
                        duration: 0.1, // Faster update for responsiveness
                        ease: "linear", // Frame-by-frame updates handle smoothing
                    }}
                />
            ))}
        </div>
    );
};
