import * as React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                {label && (
                    <label className="text-sm font-medium text-neutral-400 block ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-400 transition-colors">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            'w-full bg-neutral-900/50 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-base placeholder:text-neutral-600 transition-all duration-200 outline-none',
                            'focus:border-brand-500/50 focus:bg-neutral-900 focus:shadow-[0_0_15px_-5px_rgba(34,197,94,0.1)]',
                            icon && 'pl-10',
                            error && 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_-5px_rgba(239,68,68,0.1)]',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="text-sm text-red-400 ml-1">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
