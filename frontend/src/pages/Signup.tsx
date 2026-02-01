import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Phone, Users, ArrowRight, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Signup = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { signUp } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        emergencyContact1Name: '',
        emergencyContact1Phone: '',
        emergencyContact2Name: '',
        emergencyContact2Phone: '',
    });

    const updateField = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password length
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        const { error: signUpError } = await signUp(formData.email, formData.password, {
            full_name: formData.fullName,
            phone_number: formData.phoneNumber,
            emergency_contact_one_name: formData.emergencyContact1Name || null,
            emergency_contact_one_number: formData.emergencyContact1Phone || null,
            emergency_contact_two_name: formData.emergencyContact2Name || null,
            emergency_contact_two_number: formData.emergencyContact2Phone || null,
        });

        if (signUpError) {
            setError(signUpError.message);
            setIsLoading(false);
            return;
        }

        navigate('/dashboard');
    };

    return (
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-2xl shadow-xl w-full max-w-lg mx-auto">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Create Account</h2>
                <p className="text-neutral-400 text-sm">Set up protection for yourself or a loved one</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Helper text for user info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-brand-400 uppercase tracking-wider text-xs">User Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            placeholder="John Doe"
                            icon={<User className="w-4 h-4" />}
                            value={formData.fullName}
                            onChange={updateField('fullName')}
                            required
                        />
                        <Input
                            label="My Phone Number"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            icon={<Phone className="w-4 h-4" />}
                            value={formData.phoneNumber}
                            onChange={updateField('phoneNumber')}
                            required
                        />
                    </div>
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="john@example.com"
                        icon={<Mail className="w-4 h-4" />}
                        value={formData.email}
                        onChange={updateField('email')}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={updateField('password')}
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={updateField('confirmPassword')}
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
                                value={formData.emergencyContact1Name}
                                onChange={updateField('emergencyContact1Name')}
                                required
                            />
                            <Input
                                label="Contact 1 Phone"
                                type="tel"
                                placeholder="+1 (555)..."
                                icon={<Phone className="w-4 h-4" />}
                                value={formData.emergencyContact1Phone}
                                onChange={updateField('emergencyContact1Phone')}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            <Input
                                label="Contact 2 Name"
                                placeholder="John Smith"
                                icon={<Users className="w-4 h-4" />}
                                value={formData.emergencyContact2Name}
                                onChange={updateField('emergencyContact2Name')}
                            />
                            <Input
                                label="Contact 2 Phone"
                                type="tel"
                                placeholder="+1 (555)..."
                                icon={<Phone className="w-4 h-4" />}
                                value={formData.emergencyContact2Phone}
                                onChange={updateField('emergencyContact2Phone')}
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
