import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface AudioVisualizerProps {
    isActive: boolean;
    className?: string;
    status?: 'safe' | 'warning' | 'danger';
    // Removed 'levels' and 'intensity' as this component now self-manages
}

export const AudioVisualizer = ({ isActive, className, status = 'safe' }: AudioVisualizerProps) => {
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
                    // Alternating Asymmetry (Every ~2 seconds)
                    const cycle = Math.floor(t / 6) % 2;

                    // Global Pulse (Every 0.75s)
                    // t increases by 3.0 per second (0.05 * 60)
                    // Period = 0.75s -> 2.25 units of t
                    // Frequency B = 2*PI / 2.25 ≈ 2.8
                    // Range: 1.0 to 1.15 (+15%)
                    const globalPulse = 1.0 + (Math.sin(t * 2.8) * 0.5 + 0.5) * 0.15;

                    // Inner bars increased by 20% from previous step (0.93 -> 1.12, 0.85 -> 1.02)
                    // Center Peak: 1.5
                    const m = cycle === 0
                        ? [0.4, 1.12, 1.5, 1.02, 0.5]  // State A
                        : [0.5, 1.02, 1.5, 1.12, 0.4]; // State B

                    // Apply Energy * Multiplier * GlobalPulse + Idle
                    const targets = [
                        energy * m[0] * globalPulse + idle0,
                        energy * m[1] * globalPulse + idle1,
                        energy * m[2] * globalPulse + idle2,
                        energy * m[3] * globalPulse + idle3,
                        energy * m[4] * globalPulse + idle4
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


    const getStatusStyles = () => {
        switch (status) {
            case 'safe': return 'from-[#50C878] to-[#228B22] shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]'; // Emerald
            case 'warning': return 'from-amber-400 to-amber-600 shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)]'; // Amber
            // Danger: Lighter bottom (red-500), Dark Maroon Top (red-900). 
            // Also added red-400 glow to "make top slightly lighter" appearance via shadow/border effect if needed, 
            // but for gradient `to` is top.
            case 'danger': return 'from-red-500 to-red-900 shadow-[0_0_20px_-5px_rgba(239,68,68,0.6)]';
            default: return 'from-brand-500 to-brand-300';
        }
    };

    return (
        <div className={cn('flex items-center justify-end gap-3 h-80', className)}>
            {bars.map((i) => (
                <motion.div
                    key={i}
                    className={cn(
                        'w-12 rounded-full bg-gradient-to-t transition-colors duration-500',
                        getStatusStyles(),
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
                        height: { duration: 0.1, ease: "linear" },
                        backgroundColor: { duration: 0.5 } // Smooth color transition
                    }}
                />
            ))}
        </div>
    );
};
