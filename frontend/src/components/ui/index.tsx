import React from 'react';
import { Loader2, X } from 'lucide-react';
export * from './WakeupState';
export * from './ExpandableContent';
export * from './CompactTextPreview';


export const Loader = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-4">
    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    {text && <p className="text-surface-500 font-medium text-sm">{text}</p>}
  </div>
);

export const ErrorMessage = ({ message, onRetry }: { message: string, onRetry?: () => void }) => (
  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      <span className="font-medium">Error:</span>
      <span>{message}</span>
    </div>
    {onRetry && (
      <button onClick={onRetry} className="font-semibold hover:text-red-900 transition-colors">
        Retry
      </button>
    )}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg', isLoading?: boolean }>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
      secondary: "bg-surface-800 text-white hover:bg-surface-900 shadow-sm",
      outline: "border border-surface-200 bg-white text-surface-900 hover:bg-surface-50 shadow-sm",
      ghost: "hover:bg-surface-100 text-surface-700 hover:text-surface-900"
    };
    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-8 text-base"
    };

    return (
      <button 
        ref={ref} 
        disabled={disabled || isLoading}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white shadow-sm border border-surface-200 rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' | 'outline', className?: string }) => {
  const variants = {
    default: "bg-surface-100 text-surface-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    outline: "border border-surface-200 text-surface-700 bg-white"
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};



export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = "max-w-md"
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  maxWidth?: string;
}) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className={`relative bg-white rounded-xl shadow-xl w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-bold text-surface-900">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
