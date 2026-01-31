import { motion } from 'framer-motion';
import { cn } from '../utils/cn';



export const AudioVisualizer = ({ isActive, intensity = 0, className, levels }: { isActive: boolean; intensity?: number; className?: string; levels?: number[] }) => {
    // 5 bars for symmetry
    const bars = [0, 1, 2, 3, 4];

    return (
        <div className={cn('flex items-center justify-center gap-3 h-32', className)}>
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
                                height: levels
                                    ? `${Math.max(15, levels[i] * 100)}%` // Real-time
                                    : [ // Simulation fallback
                                        '20%',
                                        `${Math.max(20, Math.random() * 100 * (0.5 + intensity * 0.5))}%`,
                                        '20%',
                                    ],
                            }
                            : { height: '10%' }
                    }
                    transition={{
                        // Use quicker transition for real-time smoothness
                        // Staggered delays: Center -> Right -> Left -> Edges
                        // Indices: 0(L-Out), 1(L-In), 2(Center), 3(R-In), 4(R-Out)
                        duration: levels ? 0.15 : 0.4, // Slightly slower for liquid feel
                        repeat: levels ? 0 : Infinity,
                        repeatType: 'reverse',
                        delay: levels ? [0.05, 0.02, 0, 0.02, 0.05][i] : i * 0.1, // Symmetric delays (Center ripple out)
                        ease: levels ? 'easeOut' : 'easeInOut', // Linear is too mechanical, easeOut feels more fluid
                    }}
                />
            ))}
        </div>
    );
};
