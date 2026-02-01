import { useState } from 'react';
import { Button } from './ui/Button';
import { Phone, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface PhoneNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (phoneNumber: string) => void;
}

export const PhoneNumberModal = ({ isOpen, onClose, onSubmit }: PhoneNumberModalProps) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');

    // Basic phone validation - accepts formats like +1234567890, (123) 456-7890, etc.
    const isValidPhone = (phone: string): boolean => {
        const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
        return cleaned.length >= 10 && /^\+?\d+$/.test(cleaned);
    };

    const handleSubmit = () => {
        if (!phoneNumber.trim()) {
            setError('Please enter a phone number');
            return;
        }
        if (!isValidPhone(phoneNumber)) {
            setError('Please enter a valid phone number');
            return;
        }
        setError('');
        onSubmit(phoneNumber.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isValidPhone(phoneNumber)) {
            handleSubmit();
        }
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
            <div className="relative z-10 w-full max-w-md mx-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
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

                {/* Input */}
                <div className="space-y-4">
                    <div>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => {
                                setPhoneNumber(e.target.value);
                                setError('');
                            }}
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
                            disabled={!phoneNumber.trim()}
                        >
                            Start Protection
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
