/**
 * PaneInfo — pane-level information affordance.
 *
 * Standard pattern: ⓘ icon next to a pane title. Hover shows a brief
 * headline ("what question does this answer"). Click opens a popover
 * with methodology and a documentation link.
 *
 * Presence-driven: if `info` prop is missing/null, NOTHING renders.
 * Plugin authors opt their pane in with a single prop on VizCard:
 *
 *   <VizCard title="..." info={{ headline, methodology, docHref }}>
 *     ...
 *   </VizCard>
 *
 * Implementation notes:
 * - Tooltip + popover render via React portal to document.body, so
 *   parent overflow:hidden on the VizCard header doesn't clip them.
 * - Position is computed from the icon's getBoundingClientRect on each
 *   open, with viewport-edge clamping. No floating-ui dep.
 * - Custom-styled (NOT browser-native title attribute).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PaneInfoContent {
  /** Single-line "what question does this answer" — shown on hover and at top of popover. */
  headline: string;
  /** Paragraph(s) of methodology / what's computed and how. Plain text, line-breaks preserved. */
  methodology?: string;
  /** URL or anchor link for "Learn more". Anchor like '/docs/spec/SPEC-026#across-scale' is fine — opens in new tab. */
  docHref?: string;
  /** Optional label for the doc link. Defaults to "Learn more →". */
  docLabel?: string;
}

export interface PaneInfoProps {
  info?: PaneInfoContent | null;
  /** Optional override for icon size. Default 14. */
  iconSize?: number;
  /** Optional aria-label override. Default "About this pane". */
  ariaLabel?: string;
}

interface Anchor {
  /** Center-X of the icon, viewport coords. */
  cx: number;
  /** Bottom-Y of the icon, viewport coords. */
  bottom: number;
  /** Top-Y of the icon, viewport coords. */
  top: number;
}

const TOOLTIP_WIDTH = 320;
const POPOVER_WIDTH = 380;
const VIEWPORT_PAD = 12;

export function PaneInfo({ info, iconSize = 14, ariaLabel = 'About this pane' }: PaneInfoProps) {
  const [hovering, setHovering] = useState(false);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Recompute anchor whenever a popover/tooltip needs to be positioned.
  const measure = () => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ cx: r.left + r.width / 2, bottom: r.bottom, top: r.top });
  };

  useLayoutEffect(() => {
    if (hovering || open) measure();
  }, [hovering, open]);

  // Reflow on window resize / scroll while open
  useEffect(() => {
    if (!hovering && !open) return;
    const onReflow = () => measure();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [hovering, open]);

  // Dismiss popover on outside click + Esc
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      // Allow clicks inside the popover itself (rendered in portal)
      const popover = document.querySelector('[data-pane-info-popover]');
      if (popover?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!info) return null;

  const showHoverTip = hovering && !open;

  // Position the hover tooltip + popover relative to the icon. Both anchor
  // below the icon, horizontally centered, with viewport-edge clamping.
  const positionFor = (width: number) => {
    if (!anchor) return null;
    const left = Math.max(
      VIEWPORT_PAD,
      Math.min(window.innerWidth - width - VIEWPORT_PAD, anchor.cx - width / 2),
    );
    const top = anchor.bottom + 8;
    return { left, top };
  };

  const tipPos = positionFor(TOOLTIP_WIDTH);
  const popoverPos = positionFor(POPOVER_WIDTH);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        className="inline-flex items-center align-baseline text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-help"
        style={{ background: 'none', border: 'none', padding: 2, lineHeight: 0 }}
        data-test="pane-info-trigger"
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.5" />
          <line x1="8" y1="7.25" x2="8" y2="11.5" />
          <circle cx="8" cy="5" r="0.85" fill="currentColor" />
        </svg>
      </button>

      {/* Hover tooltip — headline only, rendered to body so parent overflow doesn't clip. */}
      {showHoverTip && tipPos && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            data-test="pane-info-tooltip"
            style={{
              position: 'fixed',
              left: tipPos.left,
              top: tipPos.top,
              width: TOOLTIP_WIDTH,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
            className="rounded-sm border border-border-subtle bg-surface-overlay px-3 py-2 text-[12.5px] leading-snug text-text-primary shadow-lg"
          >
            {info.headline}
          </div>,
          document.body,
        )}

      {/* Click popover — full three-tier disclosure, also portaled. */}
      {open && popoverPos && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-label={ariaLabel}
            data-pane-info-popover
            data-test="pane-info-popover"
            style={{
              position: 'fixed',
              left: popoverPos.left,
              top: popoverPos.top,
              width: POPOVER_WIDTH,
              zIndex: 9999,
            }}
            className="rounded-sm border border-border-subtle bg-surface-overlay shadow-lg overflow-hidden"
          >
            <div className="px-4 pt-3.5 pb-3 border-b border-border-subtle">
              <div className="text-text-primary text-[13.5px] font-medium leading-snug">
                {info.headline}
              </div>
            </div>
            {info.methodology && (
              <div className="px-4 py-3.5 text-text-secondary text-[12.5px] leading-relaxed whitespace-pre-wrap max-h-[420px] overflow-auto">
                {info.methodology}
              </div>
            )}
            {info.docHref && (
              <div className="px-4 pb-3 pt-2 flex justify-end border-t border-border-subtle">
                <a
                  href={info.docHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary text-[12px] hover:underline"
                >
                  {info.docLabel ?? 'Learn more →'}
                </a>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
