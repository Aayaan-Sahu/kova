import { useNavigate } from 'react-router-dom';
import { useWakeWord } from '../hooks/useWakeWord';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceActivationListenerProps {
    className?: string;
}

/**
 * Voice activation listener component
 * Displays a floating indicator and listens for "kova activate" wake phrase
 */
export const VoiceActivationListener = ({ className }: VoiceActivationListenerProps) => {
    const navigate = useNavigate();

    const handleActivate = () => {
        console.log('[VoiceActivation] Wake phrase detected! Navigating to active call...');
        // Navigate to active call with voiceActivated flag
        navigate('/active', { state: { voiceActivated: true, callerPhoneNumber: '' } });
    };

    const { isListening, isActivated, error, isSupported, start, stop } = useWakeWord({
        wakePhrase: 'kova activate',
        onActivate: handleActivate,
        autoStart: true
    });

    // Don't render if not supported
    if (!isSupported) {
        return null;
    }

    return (
        <div className={cn("fixed bottom-6 left-6 z-50", className)}>
            <AnimatePresence mode="wait">
                {error ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full backdrop-blur-xl"
                    >
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-300">{error}</span>
                    </motion.div>
                ) : isActivated ? (
                    <motion.div
                        key="activated"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500/20 border border-brand-500/30 rounded-full backdrop-blur-xl"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5 }}
                        >
                            <Mic className="w-4 h-4 text-brand-400" />
                        </motion.div>
                        <span className="text-sm text-brand-300 font-medium">Activating...</span>
                    </motion.div>
                ) : (
                    <motion.button
                        key="listening"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={isListening ? stop : start}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl transition-all cursor-pointer",
                            "hover:scale-105 active:scale-95",
                            isListening
                                ? "bg-neutral-800/80 border border-neutral-700"
                                : "bg-neutral-900/80 border border-neutral-800 opacity-60 hover:opacity-100"
                        )}
                        title={isListening ? 'Voice activation enabled - say "Kova, activate"' : 'Click to enable voice activation'}
                    >
                        <div className="relative">
                            {isListening ? (
                                <>
                                    <Mic className="w-4 h-4 text-brand-400" />
                                    {/* Pulse animation rings */}
                                    <motion.div
                                        className="absolute inset-0 rounded-full border border-brand-400"
                                        animate={{
                                            scale: [1, 2],
                                            opacity: [0.6, 0]
                                        }}
                                        transition={{
                                            duration: 1.5,
                                            repeat: Infinity,
                                            ease: "easeOut"
                                        }}
                                    />
                                </>
                            ) : (
                                <MicOff className="w-4 h-4 text-neutral-500" />
                            )}
                        </div>
                        <span className={cn(
                            "text-xs font-medium",
                            isListening ? "text-neutral-300" : "text-neutral-500"
                        )}>
                            {isListening ? '"Kova, activate"' : 'Voice off'}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};
