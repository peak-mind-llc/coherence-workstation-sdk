import { type ReactNode, useRef, useState } from 'react';
import { useClickOutsideRef } from './useClickOutsideRef';

/**
 * <FilterPill> — pill-shaped trigger that opens a popover.
 *
 * The trigger shows the *current value* (e.g., "0.5–45 Hz"); the popover
 * holds the controls. An optional modifier dot signals "an extra setting
 * inside the popover is active" without opening it.
 */
export interface FilterPillProps {
  /** Current-value summary, shown on the trigger. */
  label: ReactNode;
  /** Hover tooltip on the trigger. */
  title: string;
  /** Popover body. */
  children: ReactNode;
  /** Optional leading icon (e.g., sliders, filter). */
  iconLeft?: ReactNode;
  /** When true, render a small warning dot on the icon (modifier indicator). */
  modifierActive?: boolean;
  /** Popover width (Tailwind class). Default w-64. */
  popoverWidthClass?: string;
}

export function FilterPill({
  label,
  title,
  children,
  iconLeft,
  modifierActive = false,
  popoverWidthClass = 'w-64',
}: FilterPillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutsideRef(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={title}
        className="flex items-center gap-1.5 pl-2 pr-1.5 h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] transition-colors leading-none"
        style={{ fontSize: 'var(--workstation-font-label)' }}
      >
        {iconLeft && (
          <span className="relative flex items-center">
            {iconLeft}
            {/* TODO(ds-extraction): rounded-full → rounded-round once @coherence/design-system is extracted and the recorder consumes it (see README "Design system"). */}
            {modifierActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--status-warning)]" />
            )}
          </span>
        )}
        <span className="font-medium">{label}</span>
        <span className="text-[var(--text-tertiary)]">▾</span>
      </button>
      {open && (
        <div
          className={`absolute top-full left-0 mt-1 bg-[var(--surface-overlay)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-50 p-3 ${popoverWidthClass}`}
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
