import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Phone, Users, ArrowRight, Mail } from 'lucide-react';

export const Signup = () => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
        }, 1500);
    };

    return (
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-2xl shadow-xl w-full max-w-lg mx-auto">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Create Account</h2>
                <p className="text-neutral-400 text-sm">Set up protection for yourself or a loved one</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Helper text for user info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-brand-400 uppercase tracking-wider text-xs">User Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Username"
                            placeholder="jdoe123"
                            icon={<User className="w-4 h-4" />}
                            required
                        />
                        <Input
                            label="My Phone Number"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            icon={<Phone className="w-4 h-4" />}
                            required
                        />
                    </div>
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="john@example.com"
                        icon={<Mail className="w-4 h-4" />}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-800">
                    <h3 className="text-sm font-medium text-brand-400 uppercase tracking-wider text-xs">Emergency Contacts</h3>
                    <p className="text-xs text-neutral-500 -mt-3">We'll alert these people if a scam is detected.</p>

                    <div className="space-y-4 p-4 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                label="Contact 1 Name"
                                placeholder="Jane Doe"
                                icon={<Users className="w-4 h-4" />}
                                required
                            />
                            <Input
                                label="Contact 1 Phone"
                                type="tel"
                                placeholder="+1 (555)..."
                                icon={<Phone className="w-4 h-4" />}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            <Input
                                label="Contact 2 Name"
                                placeholder="John Smith"
                                icon={<Users className="w-4 h-4" />}
                            />
                            <Input
                                label="Contact 2 Phone"
                                type="tel"
                                placeholder="+1 (555)..."
                                icon={<Phone className="w-4 h-4" />}
                            />
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full mt-6"
                    isLoading={isLoading}
                >
                    Complete Setup <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <p className="text-center text-sm text-neutral-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    );
};
