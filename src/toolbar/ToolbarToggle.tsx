import { KeyHint } from './KeyHint';

/**
 * <ToolbarToggle> — standalone keyboard-hinted toggle pill.
 *
 * Used for primary single-letter actions (annotate, bad, mask, vs-baseline).
 * Independent border + background; not a child of <WorkstationPill>.
 *
 * Tone selects the active-state color:
 *   - "accent"  (default): blue/teal — neutral primary action
 *   - "warning" : orange — attention-grabbing state (e.g., bad-channel mode)
 *   - "error"   : red — destructive or strongly-marked state (e.g., mask)
 *   - "subtle"  : surface-raised — quiet on/off (e.g., show/hide marks)
 */
export type ToolbarToggleTone = 'accent' | 'warning' | 'error' | 'subtle';

export interface ToolbarToggleProps {
  kbd: string;
  label: string;
  /** Optional persisted-state count. When > 0, rendered as " (n)". */
  count?: number;
  active: boolean;
  onClick: () => void;
  /** Required hover tooltip explaining what the toggle does. */
  title: string;
  /** Active-state color. Default "accent". */
  tone?: ToolbarToggleTone;
  /** Disabled state. Drops the border, dims via opacity, suppresses onClick.
   *  Per SPEC-016 disabled-state convention. */
  disabled?: boolean;
}

/* Active fills use `--text-on-accent` (white in the workstation theme,
 * `#fff` fallback) so the label stays legible on top of the saturated
 * accent / warning / error background. Was `--surface-ground` (the
 * dark page bg) which read as dark-on-blue / dark-on-orange / dark-on-
 * red — fine on light themes, hard to scan on dark. The `subtle` tone
 * stays on text-primary because its fill is a near-neutral surface. */
const TONE_ACTIVE: Record<ToolbarToggleTone, string> = {
  accent:
    'bg-[var(--accent-primary)] text-[var(--text-on-accent,#fff)] border-[var(--accent-primary)] font-bold',
  warning:
    'bg-[var(--status-warning)] text-[var(--text-on-accent,#fff)] border-[var(--status-warning)] font-bold',
  error:
    'bg-[var(--status-error)] text-[var(--text-on-accent,#fff)] border-[var(--status-error)] font-bold',
  subtle:
    'bg-[var(--surface-raised)] border-[var(--border-default)] text-[var(--text-primary)]',
};

const INACTIVE =
  'bg-[var(--surface-base)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)]';

const DISABLED =
  'bg-transparent border-transparent text-[var(--text-primary)] opacity-50 cursor-not-allowed';

export function ToolbarToggle({
  kbd,
  label,
  count,
  active,
  onClick,
  title,
  tone = 'accent',
  disabled = false,
}: ToolbarToggleProps) {
  const stateClass = disabled ? DISABLED : active ? TONE_ACTIVE[tone] : INACTIVE;
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      aria-pressed={active}
      className={`px-2 h-7 rounded-sm border leading-none transition-colors ${stateClass}`}
      style={{
        fontSize: 'var(--workstation-font-label)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <KeyHint kbd={kbd} label={label} count={count} />
    </button>
  );
}
