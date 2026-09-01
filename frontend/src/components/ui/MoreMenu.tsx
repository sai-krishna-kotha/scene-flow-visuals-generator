import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface MoreMenuProps {
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({ children, className = '', buttonClassName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${buttonClassName}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="More options"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                  // @ts-ignore
                  onClick: (e: React.MouseEvent) => {
                    setIsOpen(false);
                    const childProps = child.props as any;
                    if (childProps.onClick) {
                      childProps.onClick(e);
                    }
                  }
                });
              }
              return child;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const MoreMenuItem: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { destructive?: boolean }> = ({ 
  className = '', 
  destructive, 
  children, 
  ...props 
}) => {
  const baseStyle = "block w-full text-left px-4 py-2 text-sm font-medium transition-colors focus:outline-none";
  const stateStyle = destructive 
    ? "text-red-600 hover:bg-red-50 hover:text-red-700" 
    : "text-surface-700 hover:bg-surface-50 hover:text-surface-900";
    
  return (
    <button
      role="menuitem"
      className={`${baseStyle} ${stateStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
