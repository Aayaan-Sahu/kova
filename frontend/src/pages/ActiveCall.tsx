import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { cn } from '../utils/cn';
import { ShieldAlert, ShieldCheck, ShieldQuestion, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ActiveCall = () => {
    const navigate = useNavigate();
    const [riskScore, setRiskScore] = useState(0); // 0-100
    const [transcript, setTranscript] = useState<string[]>([]);
    const [status, setStatus] = useState<'safe' | 'warning' | 'danger'>('safe');
    const [isSimulationMode, setIsSimulationMode] = useState(false);
    // Audio Context moved to Visualizer Component
    // No explicit audio logic here anymore

    // Startup sound effect
    useEffect(() => {
        const playStartupSound = async () => {
            try {
                // Wait for context to be ready (captured in prev effect or new one)
                // Note: new AudioContext might be needed if the other one is suspended or specific to mic
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContext();

                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                // "Siri-like" activation chime
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
                oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // Fast sweep up

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

    // Derived status
    useEffect(() => {
        if (riskScore < 30) setStatus('safe');
        else if (riskScore < 70) setStatus('warning');
        else setStatus('danger');
    }, [riskScore]);

    // Simulation effect
    useEffect(() => {
        if (!isSimulationMode) return;

        const interval = setInterval(() => {
            setRiskScore(prev => Math.min(prev + 5, 95));
            setTranscript(prev => [
                ...prev,
                `Simulated voice phrase #${prev.length + 1} detected...`
            ].slice(-5));
        }, 2000);

        return () => clearInterval(interval);
    }, [isSimulationMode]);

    const handleEndCall = () => {
        navigate('/dashboard');
    };

    // --- Mesh Gradient Colors ---
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

            {/* --- FLUID LUMINOUS HALO SYSTEM --- */}
            {/* Base Halo Glow (Outer Bleed) - STABILIZED (No pulsing opacity/scale) */}
            <motion.div
                className={cn(
                    "absolute inset-0 z-0 opacity-40 blur-[100px] transition-colors duration-1000",
                    mesh.glow
                )}
            // Removed animate property to stop "phasing in and out"
            />

            {/* Rotating Mesh Gradient Border */}
            {/* We create a container that fits the screen but has a gradient border */}
            <div className="absolute inset-0 z-0 p-[2px] rounded-[3rem] overflow-hidden">
                {/* The Rotating Gradient Layer */}
                <motion.div
                    className={cn(
                        "absolute inset-[-50%] w-[200%] h-[200%] bg-[conic-gradient(var(--tw-gradient-stops))] opacity-100 transition-colors duration-1000",
                        mesh.from, mesh.via, mesh.to
                    )}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{
                        // This creates the fluid mesh look by mixing conic gradient stops
                        backgroundImage: `conic-gradient(from 0deg, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to), var(--tw-gradient-from))`
                    }}
                />

                {/* Inner mask to create the "border" effect */}
                <div className="absolute inset-[3px] bg-neutral-950 rounded-[calc(3rem-3px)] z-10" />

                {/* Internal Inner Glow (Edge Lit) */}
                <div className={cn(
                    "absolute inset-0 z-20 rounded-[3rem] shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] transition-shadow duration-1000",
                    status === 'safe' && "shadow-[inset_0_0_40px_rgba(34,197,94,0.3)]",
                    status === 'warning' && "shadow-[inset_0_0_40px_rgba(245,158,11,0.3)]",
                    status === 'danger' && "shadow-[inset_0_0_40px_rgba(239,68,68,0.4)]"
                )} />
            </div>


            {/* Content Layer (Must be Z-30 to sit above the border mask) */}
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
                        {/* Audio glow behind visualizer */}
                        <div className={cn(
                            "absolute inset-0 blur-3xl opacity-20 transition-colors duration-700",
                            mesh.glow
                        )} />
                        {/* AudioVisualizer with real mic data */}
                        <AudioVisualizer
                            isActive={true}
                            className="relative z-10"
                        />
                    </div>

                    {/* Live Transcript Stream */}
                    <div className="w-full h-48 overflow-hidden relative mask-image-gradient">
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950 z-20 pointer-events-none" />

                        <div className="space-y-4 text-center px-4 relative z-10">
                            <AnimatePresence mode="popLayout">
                                {transcript.length === 0 && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-neutral-600 italic font-light"
                                    >
                                        Listening for conversation...
                                    </motion.p>
                                )}
                                {transcript.map((text, idx) => (
                                    <motion.p
                                        key={idx}
                                        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
                                        className={cn(
                                            "text-lg font-medium leading-relaxed",
                                            idx === transcript.length - 1 ? "text-white scale-105" : "text-neutral-500 blur-[0.5px]"
                                        )}
                                    >
                                        "{text}"
                                    </motion.p>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="w-full max-w-sm space-y-4">
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            className="flex-1 border-neutral-800 bg-neutral-900/60 backdrop-blur-xl hover:bg-neutral-800 transition-all"
                            onClick={() => {
                                setIsSimulationMode(!isSimulationMode);
                                if (!isSimulationMode) {
                                    setRiskScore(0);
                                    setTranscript([]);
                                }
                            }}
                        >
                            {isSimulationMode ? 'Stop Simulation' : 'Test Simulation'}
                        </Button>
                        <Button
                            variant="danger"
                            size="lg"
                            className="flex-1 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                            onClick={handleEndCall}
                        >
                            <PhoneOff className="w-5 h-5 mr-2" />
                            End Call
                        </Button>
                    </div>
                </div>
            </div>

        </div>
    );
};
