import React from 'react';

export const Loader = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    <p className="text-surface-800 font-medium">{text}</p>
  </div>
);

export const ErrorMessage = ({ message, onRetry }: { message: string, onRetry?: () => void }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
    <h3 className="font-bold">Error</h3>
    <p>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="mt-2 underline text-red-800 hover:text-red-900">
        Try again
      </button>
    )}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' }>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-primary-600 text-white hover:bg-primary-700",
      secondary: "bg-surface-200 text-surface-900 hover:bg-surface-300",
      outline: "border border-surface-200 text-surface-800 hover:bg-surface-50"
    };
    return <button ref={ref} className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />;
  }
);
Button.displayName = 'Button';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white shadow-sm border border-surface-200 rounded-lg p-6 ${className}`}>
    {children}
  </div>
);
