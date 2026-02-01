import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PhoneNumberModal } from '../components/PhoneNumberModal';
import { Shield, Settings, LogOut, BarChart3, User, ChevronDown, Mic, MicOff } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { useWakeWord } from '../hooks/useWakeWord';

export const Dashboard = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
    const { profile, signOut } = useAuth();

    // Handle wake word detection - navigate directly to active call
    const handleWakeWordDetected = useCallback(() => {
        console.log('[Dashboard] Wake word detected! Navigating to active call...');
        navigate('/active', { state: { callerPhoneNumber: '' } });
    }, [navigate]);

    // Wake word listener
    const { isListening: isWakeWordListening, isSupported: isWakeWordSupported, toggleListening } = useWakeWord({
        wakeWord: 'hello',
        onWakeWord: handleWakeWordDetected,
        enabled: wakeWordEnabled,
    });

    const handleStartProtection = () => {
        setShowPhoneModal(true);
    };

    const handlePhoneSubmit = (phoneNumber: string) => {
        setShowPhoneModal(false);
        navigate('/active', { state: { callerPhoneNumber: phoneNumber } });
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleToggleWakeWord = () => {
        setWakeWordEnabled(!wakeWordEnabled);
        toggleListening();
    };

    // Get display name and initials from profile
    const displayName = profile?.full_name || 'User';
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const phoneNumber = profile?.phone_number || 'Not set';

    return (
        <div className="min-h-screen bg-neutral-950 p-6 md:p-12" onClick={() => setIsMenuOpen(false)}>
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg ring-1 ring-brand-500/20">
                            <Shield className="w-6 h-6 text-brand-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Welcome back, {displayName.split(' ')[0]}</h1>
                            <p className="text-neutral-400 text-sm">System Status: <span className="text-brand-400 font-medium">Active</span></p>
                        </div>
                    </div>

                    <div className="relative">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Menu</span>
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isMenuOpen && "rotate-180")} />
                        </Button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50">
                                <Link to="/analytics" className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
                                    <BarChart3 className="w-4 h-4" />
                                    Analytics
                                </Link>
                                <Link to="/account" className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
                                    <User className="w-4 h-4" />
                                    Account
                                </Link>
                                <div className="h-px bg-neutral-800 my-1" />
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Action Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Start Protection Card */}
                    <div className="md:col-span-2 relative group overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl transition-all duration-300 hover:shadow-brand-500/10 hover:border-brand-500/30 flex flex-col justify-center min-h-[300px]">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10 space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-4xl font-bold text-white tracking-tight">Kova Protection</h2>
                                <p className="text-neutral-400 max-w-md text-lg leading-relaxed">
                                    Ready to screen your calls? Activate real-time AI transcription and scam detection instantly.
                                </p>
                            </div>

                            <div className="max-w-xs">
                                <Button
                                    size="lg"
                                    className="w-full text-lg shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_-5px_rgba(34,197,94,0.5)] h-14"
                                    onClick={handleStartProtection}
                                >
                                    Start Protection
                                </Button>
                            </div>
                        </div>

                        {/* Decorative Icon */}
                        <Shield className="absolute -bottom-8 -right-8 w-64 h-64 text-neutral-800/30 rotate-12 group-hover:rotate-6 transition-transform duration-700" />
                    </div>

                    {/* Sidebar / Quick Stats */}
                    <div className="space-y-6">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-neutral-400 mb-2">
                                <BarChart3 className="w-5 h-5" />
                                <span className="font-medium text-sm uppercase tracking-wider">Recent Activity</span>
                            </div>

                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-brand-500" />
                                            <div className="text-sm">
                                                <p className="text-white font-medium">Unknown Caller</p>
                                                <p className="text-xs text-neutral-500">Today, 2:30 PM</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-brand-400 px-2 py-1 rounded-full bg-brand-500/10">Safe</span>
                                    </div>
                                ))}
                            </div>

                            <Button variant="ghost" size="sm" className="w-full text-xs text-neutral-500 hover:text-white mt-2" onClick={() => navigate('/analytics')}>
                                View All Activity
                            </Button>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                            <div className="flex items-center gap-3 text-neutral-400 mb-4">
                                <User className="w-5 h-5" />
                                <span className="font-medium text-sm uppercase tracking-wider">Profile</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-white font-bold text-lg">
                                    {initials}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{displayName}</p>
                                    <p className="text-xs text-neutral-500">{phoneNumber}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Phone Number Modal */}
            <PhoneNumberModal
                isOpen={showPhoneModal}
                onClose={() => setShowPhoneModal(false)}
                onSubmit={handlePhoneSubmit}
            />

            {/* Wake Word Indicator - Floating at bottom */}
            {isWakeWordSupported && (
                <button
                    onClick={handleToggleWakeWord}
                    className={cn(
                        "fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-300 group",
                        "border backdrop-blur-xl",
                        isWakeWordListening
                            ? "bg-brand-500/20 border-brand-500/50 hover:bg-brand-500/30 shadow-brand-500/30"
                            : "bg-neutral-800/80 border-neutral-700 hover:bg-neutral-700/80 opacity-60 hover:opacity-100"
                    )}
                    title={isWakeWordListening ? 'Voice activation ON - Say "hello" to start' : 'Voice activation OFF - Click to enable'}
                >
                    {isWakeWordListening ? (
                        <Mic className="w-6 h-6 text-brand-400 animate-pulse" />
                    ) : (
                        <MicOff className="w-6 h-6 text-neutral-500" />
                    )}

                    {/* Tooltip */}
                    <span className={cn(
                        "absolute bottom-full right-0 mb-2 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap",
                        "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                        isWakeWordListening
                            ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                            : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                    )}>
                        {isWakeWordListening ? 'Say "hello" to activate' : 'Click to enable voice activation'}
                    </span>
                </button>
            )}
        </div>
    );
};
