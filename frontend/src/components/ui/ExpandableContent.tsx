import React, { useState, useRef, useEffect } from 'react';
import { normalizeDisplayText } from '../../utils/text';

interface ExpandableContentProps {
  content: string | null | undefined;
  collapsedLinesDesktop?: number;
  collapsedLinesMobile?: number;
  className?: string;
  textClassName?: string;
}

export const ExpandableContent: React.FC<ExpandableContentProps> = ({
  content,
  collapsedLinesDesktop = 8,
  collapsedLinesMobile = 5,
  className = '',
  textClassName = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const normalizedContent = normalizeDisplayText(content);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      // If scrollHeight is strictly greater than clientHeight, it's overflowing.
      // We add a tiny buffer (2px) to ignore rounding differences.
      if (el.scrollHeight > el.clientHeight + 2) {
        setNeedsExpansion(true);
      } else {
        if (!isExpanded) {
          setNeedsExpansion(false);
        }
      }
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(() => {
      if (!isExpanded) {
        checkOverflow();
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [normalizedContent, isExpanded, collapsedLinesDesktop, collapsedLinesMobile]);

  const styleProps = {
    '--mobile-lines': collapsedLinesMobile,
    '--desktop-lines': collapsedLinesDesktop,
  } as React.CSSProperties;

  if (!normalizedContent) return null;

  return (
    <div className={`relative ${className}`} style={styleProps}>
      <div
        ref={contentRef}
        className={`transition-all duration-300 ${!isExpanded ? 'line-clamp-responsive' : ''} ${textClassName}`}
      >
        {normalizedContent}
      </div>

      {!isExpanded && needsExpansion && (
        <div className="absolute bottom-6 left-0 right-0 h-16 bg-linear-to-t from-surface to-transparent pointer-events-none" />
      )}

      {needsExpansion && (
        <div className="mt-1">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline focus:outline-none focus:underline"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'View less' : 'View more'}
          </a>
        </div>
      )}
    </div>
  );
};
