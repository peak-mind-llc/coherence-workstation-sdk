import type { ReactNode } from 'react';
import { KeyHint } from '../toolbar/KeyHint';

/**
 * <PrimaryAction> — the solid-fill accent button for the one primary
 * affordance per surface (Lock + advance, Attach to chart, Import a case).
 *
 * Per SPEC-016: no size/density/variant props — the default is the rule.
 * If a future need genuinely requires a destructive variant (red), that's
 * a follow-up spec, not a retroactive prop.
 *
 * Disabled state drops the border-style affordance entirely (the button
 * was solid; "no border" reads as "less affordant"). The Bloomberg/Excel
 * "still affordant, just inactive" pattern is gone.
 */
export interface PrimaryActionProps {
  /** Sentence-case label. SDK does not transform casing. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Hover tooltip. Optional but recommended. */
  title?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Keyboard shortcut hint rendered inline (e.g. "]"). */
  kbd?: string;
}

export function PrimaryAction({
  label,
  onClick,
  disabled = false,
  type = 'button',
  title,
  leadingIcon,
  trailingIcon,
  kbd,
}: PrimaryActionProps) {
  const base =
    'inline-flex items-center gap-1.5 px-3 h-7 rounded-sm leading-none transition-colors';
  // Pro-tool register (SPEC-016 follow-up): accent-tinted background +
  // accent border + accent text. Was solid Tailwind-blue fill which read
  // as web-app shouting. The new treatment still pops as an imperative
  // but doesn't dominate the chrome around it.
  const enabled =
    'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-primary)] font-semibold hover:bg-[var(--accent-primary)] hover:text-[var(--text-on-accent)] active:bg-[var(--accent-primary-active)] active:border-[var(--accent-primary-active)] active:text-[var(--text-on-accent)]';
  const disabledCls =
    'bg-transparent text-[var(--accent-primary)] border border-transparent opacity-50 cursor-not-allowed';
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
        <span className="ml-1 opacity-80">
          <KeyHint kbd={kbd} />
        </span>
      ) : null}
    </button>
  );
}
