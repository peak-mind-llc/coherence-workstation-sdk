/**
 * AnnotationPopoverShell — anchored, dismissable popover container
 * shared by ``SpectralPeakAnnotationPopover`` and ``ErpPeakAnnotationPopover``.
 *
 * Positions itself relative to a click anchor (``anchor`` prop, in
 * page coordinates), nudging into the viewport when it would overflow.
 * Closes on Escape and on click-outside. Owns no annotation state —
 * the caller passes content children.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface AnnotationPopoverShellProps {
  /** Page-coordinate anchor (typically ``{ x: e.clientX, y: e.clientY }``). */
  anchor: { x: number; y: number };
  /** Called when the user dismisses (Escape, click-outside, or close button). */
  onClose: () => void;
  /** Header line (e.g. ``"Pz · 10.2 Hz · α (alpha)"``). */
  title: string;
  /** Optional secondary line under the header. */
  subtitle?: string;
  children: ReactNode;
  /** Test id on the popover root. */
  testId?: string;
}

const DEFAULT_WIDTH = 340;

export default function AnnotationPopoverShell({
  anchor,
  onClose,
  title,
  subtitle,
  children,
  testId = 'annotation-popover',
}: AnnotationPopoverShellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: anchor.x + 8,
    top: anchor.y + 8,
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = anchor.x + margin;
    let top = anchor.y + margin;
    // Nudge into viewport — flip side or clamp.
    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, anchor.x - rect.width - margin);
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, anchor.y - rect.height - margin);
    }
    setPos({ left, top });
  }, [anchor.x, anchor.y]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Capture phase + stopPropagation so the workstation's
        // KeyboardDispatcher doesn't swallow Escape before we see it.
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );
  useEffect(() => {
    // useCapture: true so Escape reaches the popover before any host
    // keyboard dispatcher (e.g. workstation's global key router).
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onKey]);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );
  useEffect(() => {
    // Defer one tick so the click that opened the popover doesn't
    // also close it.
    const t = window.setTimeout(() => {
      window.addEventListener('mousedown', onMouseDown, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('mousedown', onMouseDown, true);
    };
  }, [onMouseDown]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      data-testid={testId}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: DEFAULT_WIDTH,
        zIndex: 1000,
        background: 'var(--surface-base)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        fontFamily: 'var(--font-workstation)',
        fontSize: 'var(--workstation-font-data)',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 'var(--workstation-font-meta)',
                color: 'var(--text-tertiary)',
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}
