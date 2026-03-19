import { useState, useRef, useEffect } from "react";

interface InfoTooltipProps {
  label: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * Mobile-friendly tap-to-reveal info tooltip.
 * Shows a small ⓘ icon next to the label text.
 * Tapping opens a tooltip overlay with the description.
 * Tapping anywhere else or the close button dismisses it.
 */
export default function InfoTooltip({ label, description, children }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center gap-1" ref={tooltipRef}>
      {children || <span>{label}</span>}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#2A2A3E] text-[8px] text-[#888899] hover:text-neon-cyan hover:bg-[#2A2A3E]/80 transition-colors flex-shrink-0"
        aria-label={`Info about ${label}`}
      >
        ?
      </button>
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 max-w-[80vw]">
          <div className="rounded-xl bg-[#1E1E32] border border-neon-cyan/30 shadow-lg shadow-neon-cyan/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-bold text-[10px] text-neon-cyan">{label}</span>
              <button onClick={() => setIsOpen(false)} className="text-[#888899] text-xs hover:text-[#E8E8E8]">✕</button>
            </div>
            <p className="text-[11px] text-[#CCCCDD] leading-relaxed">{description}</p>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-[#1E1E32] border-b border-r border-neon-cyan/30 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}
