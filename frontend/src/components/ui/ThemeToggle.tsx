import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './index';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4 text-text-muted" />;
    if (theme === 'dark') return <Moon className="w-4 h-4 text-text-muted" />;
    return <Monitor className="w-4 h-4 text-text-muted" />;
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="p-2 ml-2 text-text-muted hover:text-text-main hover:bg-surface-muted rounded-full flex items-center justify-center transition-colors"
      title={`Theme: ${theme}`}
    >
      {getIcon()}
    </Button>
  );
};
