import type { ReactNode } from 'react';

/**
 * <WorkstationPill> — segmented-control container for related controls.
 *
 * 28px tall, rounded border, dark surface background. Children are
 * <PillBtn>s or label spans (for value display between buttons).
 *
 * Use this only when *grouping* multiple related controls. For a single
 * standalone toggle, use <ToolbarToggle>.
 */
export interface WorkstationPillProps {
  children: ReactNode;
}

export function WorkstationPill({ children }: WorkstationPillProps) {
  return (
    <div className="flex items-center h-7 rounded-sm border border-[var(--border-subtle)] bg-[var(--surface-base)] overflow-hidden">
      {children}
    </div>
  );
}
