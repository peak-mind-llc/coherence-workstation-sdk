import type { ReactNode } from 'react';
import { KeyHint } from '../toolbar/KeyHint';

/**
 * <SecondaryAction> — outline-on-transparent companion to <PrimaryAction>.
 *
 * Used for the non-primary affordances on a surface: Cancel in a dialog,
 * Retreat / Reset / Substrate-fx in the phase strip, New subject and import
 * secondaries in the selection pane.
 *
 * Per SPEC-016: no size/density/variant props — the default is the rule.
 *
 * Disabled state drops the border (the visual signal for "actionable") and
 * dims text via opacity. Cursor turns not-allowed. ARIA gets aria-disabled.
 * The Bloomberg/Excel "still bordered, just grayed" pattern is gone.
 */
export interface SecondaryActionProps {
  /** Sentence-case label. SDK does not transform casing. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Hover tooltip. Optional but recommended. */
  title?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Keyboard shortcut hint rendered inline (e.g. "["). */
  kbd?: string;
}

export function SecondaryAction({
  label,
  onClick,
  disabled = false,
  type = 'button',
  title,
  leadingIcon,
  trailingIcon,
  kbd,
}: SecondaryActionProps) {
  const base =
    'inline-flex items-center gap-1.5 px-3 h-7 rounded-sm leading-none transition-colors';
  const enabled =
    'bg-transparent text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-raised)]';
  const disabledCls =
    'bg-transparent text-[var(--text-primary)] border border-transparent opacity-50 cursor-not-allowed';
  return (
    <button
      type={type}
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={`${base} ${disabled ? disabledCls : enabled}`}
      style={{
        fontSize: 'var(--workstation-font-label)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {leadingIcon}
      <span>{label}</span>
      {trailingIcon}
      {kbd ? (
        <span className="ml-1 text-[var(--text-tertiary)]">
          <KeyHint kbd={kbd} />
        </span>
      ) : null}
    </button>
  );
}
