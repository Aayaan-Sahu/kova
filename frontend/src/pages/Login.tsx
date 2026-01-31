import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export const Login = () => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
        }, 1000);
    };

    return (
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-2xl shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        placeholder="john@example.com"
                        icon={<Mail className="w-5 h-5" />}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        icon={<Lock className="w-5 h-5" />}
                        required
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full relative overflow-hidden group"
                    isLoading={isLoading}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>

                <p className="text-center text-sm text-neutral-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium hover:underline">
                        Sign up
                    </Link>
                </p>
            </form>
        </div>
    );
};
