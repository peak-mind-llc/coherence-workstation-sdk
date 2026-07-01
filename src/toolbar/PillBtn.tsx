import type { ReactNode } from 'react';

/**
 * <PillBtn> — button inside a <WorkstationPill> segmented control.
 *
 * No border (the parent pill provides it). 28px square for icon-only;
 * auto-width for label content. Active state uses the accent color.
 *
 * Per SPEC-016: disabled state dims via opacity (no border to drop on this
 * primitive — the parent pill carries the border). Cursor turns not-allowed.
 * onClick is suppressed.
 */
export interface PillBtnProps {
  title: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  /** Set true to give label content horizontal padding. Icons stay square. */
  padded?: boolean;
  disabled?: boolean;
}

export function PillBtn({
  title,
  onClick,
  children,
  active = false,
  padded = false,
  disabled = false,
}: PillBtnProps) {
  // Active state = solid pill fill (accent background, on-accent text).
  // The previous design layered an accent-subtle fill UNDER a heavy
  // accent border-bottom — readable but visually noisy. Per user
  // feedback the underline is gone; the fill alone carries the active
  // signal, which makes ProgramTabs + PhaseStrip read as actual pills.
  const sizing = padded ? 'px-2 h-full' : 'w-7 h-full';
  /* Active state: accent fill + bold white text. Was `text-[var(--surface-ground)]`
   * which resolved to the dark page bg on dark themes — dark-on-blue
   * reads as muted/illegible. `--text-on-accent` is the canonical
   * on-accent foreground (white in the workstation theme); the `#fff`
   * fallback covers themes that don't define it. */
  const tone = disabled
    ? 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
    : active
      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent,#fff)] font-bold'
      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]';
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      // No per-button rounding — the parent <WorkstationPill> already
      // clips the row with `overflow-hidden rounded-sm`. Adding `rounded-xs`
      // here left small surface-base slivers between adjacent buttons
      // when the active fill's rounded corner didn't meet the next
      // button's flat edge (visible as a "highlight gap" to the right
      // of the active pill).
      className={`${sizing} flex items-center justify-center leading-none transition-colors ${tone}`}
      style={{ fontSize: 'var(--workstation-font-label)' }}
    >
      {children}
    </button>
  );
}
