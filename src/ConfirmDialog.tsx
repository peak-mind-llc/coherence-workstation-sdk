/**
 * ConfirmDialog — themed in-app confirmation modal.
 *
 * Replaces ad-hoc ``window.confirm()`` calls. Visual language matches
 * WorkstationStaleIcaWarningModal: full-screen scrim, centered card,
 * z-2000, role="dialog". Click-outside the card and Escape both
 * dismiss as cancel; only the explicit confirm button resolves to
 * "yes." Confirm button can take a tone — ``danger`` for destructive
 * actions like fingerprint deletion.
 *
 * Usage:
 *
 * ```tsx
 * <ConfirmDialog
 *   open={open}
 *   title="Stop tracking?"
 *   body="This permanently removes the fingerprint and its history."
 *   confirmLabel="Stop tracking"
 *   tone="danger"
 *   onConfirm={() => doIt()}
 *   onCancel={() => setOpen(false)}
 * />
 * ```
 */

import { useEffect } from 'react';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-workstation)' };

export type ConfirmDialogTone = 'default' | 'danger';

export interface ConfirmDialogProps {
  /** When false, renders nothing. */
  open: boolean;
  /** Heading text. Short, action-oriented (e.g. "Stop tracking?"). */
  title: string;
  /** Body content — string or arbitrary JSX. */
  body: React.ReactNode;
  /** Label on the confirm button. Default: "Confirm". */
  confirmLabel?: string;
  /** Label on the cancel button. Default: "Cancel". */
  cancelLabel?: string;
  /** ``danger`` styles the confirm button red for destructive actions. */
  tone?: ConfirmDialogTone;
  /** Fired when the user clicks the confirm button. */
  onConfirm: () => void;
  /** Fired when the user clicks Cancel, presses Escape, or clicks the scrim. */
  onCancel: () => void;
  /** Optional test id for the outer container. */
  testId?: string;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
  testId,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const danger = tone === 'danger';
  const confirmFg = danger ? '#fff' : 'var(--accent-primary)';
  const confirmBg = danger ? 'var(--status-error, #ef4444)' : 'transparent';
  const confirmBorder = danger
    ? 'var(--status-error, #ef4444)'
    : 'var(--accent-primary)';
  const confirmHoverBg = danger
    ? 'var(--status-error, #dc2626)'
    : 'var(--accent-subtle)';

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      data-testid={testId ?? 'confirm-dialog'}
      onClick={onCancel}
    >
      <div
        className="bg-[var(--surface-base)] border border-[var(--border-default)] rounded shadow-lg w-[440px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="confirm-dialog-title"
          className="text-[var(--text-primary)] uppercase tracking-wider mb-3"
          style={{
            ...MONO,
            fontSize: 'var(--workstation-font-strong)',
            letterSpacing: '0.1em',
          }}
        >
          {title}
        </div>
        <div
          className="text-[var(--text-secondary)] mb-4"
          style={{ fontSize: 'var(--workstation-font-body)', lineHeight: 1.5 }}
        >
          {body}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            data-testid="confirm-dialog-cancel"
            className="px-3 py-1 border border-[var(--border-subtle)] rounded uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
            style={{ ...MONO, fontSize: 'var(--workstation-font-meta)' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
            className="px-3 py-1 rounded uppercase tracking-wider"
            style={{
              ...MONO,
              fontSize: 'var(--workstation-font-meta)',
              color: confirmFg,
              background: confirmBg,
              border: `1px solid ${confirmBorder}`,
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = confirmHoverBg;
              if (!danger) {
                e.currentTarget.style.color = 'var(--accent-primary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = confirmBg;
              e.currentTarget.style.color = confirmFg;
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
