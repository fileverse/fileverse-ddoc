import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface SplitViewCssAccordionProps {
  /** The document's custom CSS (raw author selectors). */
  customCSS?: string;
}

/**
 * Split View LEFT pane: a collapsible, READ-ONLY view of the document's custom
 * CSS, shown above the markdown source. Custom CSS is edited in the styling
 * palette (the single source of truth), not in the markdown pane — this is a
 * transparency affordance so the author can see what CSS is applied while in
 * markdown mode. Renders nothing when there is no custom CSS.
 */
export const SplitViewCssAccordion = ({
  customCSS,
}: SplitViewCssAccordionProps) => {
  const [open, setOpen] = useState(false);
  const css = customCSS?.trim();
  if (!css) return null;

  return (
    <div className="shrink-0 border-b color-border-default">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium color-text-secondary hover:color-bg-default-hover transition-all"
      >
        <ChevronRight
          size={12}
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span>Custom CSS</span>
        <span className="ml-auto text-[10px] opacity-70">
          read-only · edit in Style panel
        </span>
      </button>
      {open && (
        <pre className="m-0 px-3 pb-2 text-[11px] leading-relaxed font-mono color-text-secondary whitespace-pre-wrap break-words max-h-40 overflow-auto select-text">
          {css}
        </pre>
      )}
    </div>
  );
};
