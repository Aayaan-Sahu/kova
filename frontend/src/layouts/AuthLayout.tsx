import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-950 via-neutral-950 to-neutral-950">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_50px_-10px_rgba(34,197,94,0.3)] w-24 h-24 flex items-center justify-center">
                        <img src="/kova.PNG" alt="Kova Logo" className="w-full h-full object-cover scale-150" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mt-4">Kova</h1>
                    <p className="text-neutral-400">Advanced Real-time Scam Protection</p>
                </div>

                <Outlet />
            </div>
        </div>
    );
};
