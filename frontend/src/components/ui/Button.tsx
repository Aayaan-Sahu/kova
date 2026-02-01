import * as React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 focus:ring-offset-neutral-950',
                    {
                        'bg-brand-500 text-white hover:bg-brand-400 shadow-[0_0_20px_-10px_rgba(34,197,94,0.6)] hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.5)]': variant === 'primary',
                        'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700': variant === 'secondary',
                        'border-2 border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white bg-transparent': variant === 'outline',
                        'text-neutral-400 hover:text-white hover:bg-neutral-800/50': variant === 'ghost',
                        'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_20px_-10px_rgba(239,68,68,0.6)]': variant === 'danger',

                        'h-9 px-4 text-sm': size === 'sm',
                        'h-11 px-6 text-base': size === 'md',
                        'h-14 px-8 text-lg font-semibold': size === 'lg',
                        'h-10 w-10 p-0': size === 'icon',
                    },
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
