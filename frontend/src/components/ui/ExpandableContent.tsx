import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface ExpandableContentProps {
  content: ReactNode;
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
  }, [content, isExpanded, collapsedLinesDesktop, collapsedLinesMobile]);

  const styleProps = {
    '--mobile-lines': collapsedLinesMobile,
    '--desktop-lines': collapsedLinesDesktop,
  } as React.CSSProperties;

  if (!content) return null;

  return (
    <div className={`relative ${className}`} style={styleProps}>
      <div
        ref={contentRef}
        className={`transition-all duration-300 ${!isExpanded ? 'line-clamp-responsive' : ''} ${textClassName}`}
      >
        {content}
      </div>

      {!isExpanded && needsExpansion && (
        <div className="absolute bottom-[36px] left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      )}

      {needsExpansion && (
        <div className="mt-1 flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 -ml-2 transition-colors flex items-center"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'View less' : 'View more'}
          </button>
        </div>
      )}
    </div>
  );
};
