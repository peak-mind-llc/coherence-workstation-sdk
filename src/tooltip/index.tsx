/**
 * <Tooltip> — small SDK primitive for hover/focus tooltips on inline content.
 *
 * Plugins (and host components) wrap any child with a tooltip:
 *
 *     <Tooltip content="What this number means">
 *       <span tabIndex={0}>{value}</span>
 *     </Tooltip>
 *
 * The wrapped child must be focusable (or the hover-only path is used). The
 * tooltip shows on mouseenter/focus and hides on mouseleave/blur/Escape.
 *
 * Positioning is intentionally simple: an absolute-positioned div anchored
 * to the wrapper. `placement` selects which edge ('top' default). For the
 * workstation's typical inline-table use case this is enough; if a future
 * caller needs viewport-overflow handling we can add a portal layer then.
 */
import {
  type ReactNode,
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Tooltip body. Plain string or any ReactNode. */
  content: ReactNode;
  /** Element to wrap. Must be focusable for keyboard access. */
  children: ReactNode;
  /** Edge to anchor against. Default 'top'. */
  placement?: TooltipPlacement;
  /** Optional className passed to the wrapper. */
  className?: string;
  /** Optional className passed to the popover itself. */
  popoverClassName?: string;
}

const PLACEMENT_STYLES: Record<TooltipPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1',
};

export function Tooltip({
  content,
  children,
  placement = 'top',
  className,
  popoverClassName,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        // Move focus off the trigger so the tip stays dismissed.
        containerRef.current?.blur();
      }
    },
    [open],
  );

  return (
    <span
      ref={containerRef}
      className={['relative inline-block', className].filter(Boolean).join(' ')}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={onKeyDown}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={[
            'pointer-events-none absolute z-50 max-w-xs whitespace-normal',
            'rounded border border-border-subtle bg-surface-overlay',
            'px-2 py-1 text-text-primary shadow-md',
            PLACEMENT_STYLES[placement],
            popoverClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ fontSize: 'var(--workstation-font-label)' }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
