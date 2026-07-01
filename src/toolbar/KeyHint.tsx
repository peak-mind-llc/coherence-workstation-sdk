/**
 * <KeyHint> — visual formatter for "K · label (n)" toolbar key cues.
 *
 * Pure presentational. The keyboard handler lives on the surrounding pane.
 * Always inlined into a <ToolbarToggle>, <PrimaryAction>, or other pill body
 * — never rendered standalone in a toolbar.
 *
 * When label is omitted (or empty), only the kbd glyph renders — no
 * separator, no label. This mode is used by <PrimaryAction kbd> where
 * the action label is already rendered separately by the parent button.
 */
export interface KeyHintProps {
  /** Single-letter or short keyboard cue. Rendered verbatim. */
  kbd: string;
  /** Action label. Rendered after the dot separator. Omit for kbd-only cue. */
  label?: string;
  /** Optional persisted-state count. When > 0, rendered as " (n)". */
  count?: number;
}

export function KeyHint({ kbd, label, count }: KeyHintProps) {
  const countSuffix = count && count > 0 ? ` · ${count}` : '';
  if (!label) {
    return (
      <>
        {kbd}
        {countSuffix}
      </>
    );
  }
  return (
    <>
      {kbd}
      <span className="text-[var(--text-tertiary)]">{' · '}</span>
      {label}
      {count && count > 0 ? ` (${count})` : ''}
    </>
  );
}
