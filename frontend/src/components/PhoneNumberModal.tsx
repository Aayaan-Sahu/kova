import { useState } from 'react';
import { Button } from './ui/Button';
import { Phone, X, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

interface PhoneNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (phoneNumber: string) => void;
}

interface SuspiciousCheck {
    found: boolean;
    report_count?: number;
}

export const PhoneNumberModal = ({ isOpen, onClose, onSubmit }: PhoneNumberModalProps) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [suspiciousWarning, setSuspiciousWarning] = useState<SuspiciousCheck | null>(null);

    const isValidPhone = (phone: string): boolean => {
        const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
        return cleaned.length >= 10 && /^\+?\d+$/.test(cleaned);
    };

    const handleSubmit = async () => {
        if (!phoneNumber.trim()) {
            setError('Please enter a phone number');
            return;
        }
        if (!isValidPhone(phoneNumber)) {
            setError('Please enter a valid phone number');
            return;
        }
        setError('');

        // If we haven't checked yet, check the number first
        if (suspiciousWarning === null) {
            setIsChecking(true);
            try {
                const response = await fetch(`http://localhost:8000/api/check-number?phone=${encodeURIComponent(phoneNumber.trim())}`);
                const data: SuspiciousCheck = await response.json();

                if (data.found) {
                    setSuspiciousWarning(data);
                    setIsChecking(false);
                    return;
                }
            } catch (e) {
                console.error('Error checking number:', e);
            }
            setIsChecking(false);
        }

        onSubmit(phoneNumber.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isValidPhone(phoneNumber)) {
            handleSubmit();
        }
    };

    const handlePhoneChange = (value: string) => {
        setPhoneNumber(value);
        setError('');
        setSuspiciousWarning(null); // Reset warning when number changes
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl animate-scale-in">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-brand-500/10 rounded-lg ring-1 ring-brand-500/20">
                        <Phone className="w-6 h-6 text-brand-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Enter Caller's Number</h2>
                        <p className="text-neutral-400 text-sm">Who is calling you?</p>
                    </div>
                </div>

                {/* Suspicious Number Warning */}
                {suspiciousWarning?.found && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-400 font-semibold">Warning: Suspicious Number</p>
                                <p className="text-red-300 text-sm mt-1">
                                    This number has been reported <span className="font-bold">{suspiciousWarning.report_count} time{suspiciousWarning.report_count !== 1 ? 's' : ''}</span> by other users.
                                </p>
                                <p className="text-neutral-400 text-xs mt-2">
                                    You can still proceed, but please be extra cautious.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="space-y-4">
                    <div>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="+1 (555) 123-4567"
                            className={cn(
                                "w-full px-4 py-3 bg-neutral-950 border rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all",
                                error ? "border-red-500" : "border-neutral-800"
                            )}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-400">{error}</p>
                        )}
                        <p className="mt-2 text-xs text-neutral-500">
                            This helps us track suspicious numbers if a scam is detected.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSubmit}
                            disabled={!phoneNumber.trim() || isChecking}
                            isLoading={isChecking}
                        >
                            {suspiciousWarning?.found ? 'Proceed Anyway' : 'Start Protection'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
