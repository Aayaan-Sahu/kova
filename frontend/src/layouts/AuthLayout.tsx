import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-950 via-neutral-950 to-neutral-950">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="rounded-full bg-brand-500/10 p-4 ring-1 ring-brand-500/20 shadow-[0_0_50px_-10px_rgba(34,197,94,0.3)]">
                        <ShieldCheck className="w-12 h-12 text-brand-500" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mt-4">Kova</h1>
                    <p className="text-neutral-400">Advanced Real-time Scam Protection</p>
                </div>

                <Outlet />
            </div>
        </div>
    );
};
