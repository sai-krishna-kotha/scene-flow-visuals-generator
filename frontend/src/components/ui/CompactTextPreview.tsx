import React from 'react';
import { normalizeDisplayText } from '../../utils/text';

interface CompactTextPreviewProps {
  content: string | null | undefined;
  linesDesktop?: number;
  linesMobile?: number;
  className?: string;
}

export const CompactTextPreview: React.FC<CompactTextPreviewProps> = ({
  content,
  linesDesktop = 3,
  linesMobile = 2,
  className = '',
}) => {
  const normalized = normalizeDisplayText(content);
  
  if (!normalized) return null;

  const styleProps = {
    '--mobile-lines': linesMobile,
    '--desktop-lines': linesDesktop,
  } as React.CSSProperties;

  return (
    <p
      className={`line-clamp-responsive whitespace-pre-wrap ${className}`}
      style={styleProps}
    >
      {normalized}
    </p>
  );
};
