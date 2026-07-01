import type { ReactNode } from 'react';

/**
 * <WorkstationToolbar> — the canonical 32px control strip for a pane or
 * phase. Children are pills (WorkstationPill / ToolbarToggle / FilterPill)
 * separated by gap-2. No size/density/variant props — the default is the
 * rule (see spec §Design principles #1).
 */
export interface WorkstationToolbarProps {
  children: ReactNode;
  /** Optional className passthrough (e.g., for shrink-0 in flex columns). */
  className?: string;
}

export function WorkstationToolbar({
  children,
  className,
}: WorkstationToolbarProps) {
  return (
    <div
      data-capture-hide
      className={[
        'flex items-center gap-2 px-2 shrink-0',
        'border-b border-[var(--border-subtle)]',
        'bg-[var(--surface-raised)]',
        'select-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height: 'var(--workstation-header-height)', fontFamily: 'var(--font-ui)' }}
    >
      {children}
    </div>
  );
}

/**
 * <ToolbarMeta> — dimmed metadata tail. Lives at the right end of a
 * <WorkstationToolbar>, typically after a flex-spacer or just last.
 * Read-only; non-interactive.
 */
export interface ToolbarMetaProps {
  children: ReactNode;
}

export function ToolbarMeta({ children }: ToolbarMetaProps) {
  return (
    <span
      className="text-[var(--text-tertiary)] tabular-nums"
      style={{
        fontSize: 'var(--workstation-font-meta)',
        fontFamily: 'var(--font-workstation)',
      }}
    >
      {children}
    </span>
  );
}
