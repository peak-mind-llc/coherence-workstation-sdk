import { WorkstationPill } from './WorkstationPill';
import { PillBtn } from './PillBtn';

/**
 * <CompareTogglePill> — segmented `[Current] [Compare]` pill for the
 * SPEC-022 compare-prior overlay (architectural QEEG phase).
 *
 * Distinct from <ComparatorPill>: that one selects WHICH baseline to
 * compare against in the dedicated longitudinal phase
 * (`baseline | most-recent | norms`). This one is the on/off switch
 * for the optional compare overlay on architecture-screen panes —
 * "show me the current recording" vs "show me current vs prior".
 *
 * When `disabled` is true (no prior recording exists for the subject),
 * both buttons render disabled with an explanatory tooltip on the
 * `Compare` side.
 */
export interface CompareTogglePillProps {
  /** True when the compare overlay is on. */
  active: boolean;
  /** Called with the next active state. */
  onChange: (next: boolean) => void;
  /**
   * When true, the pill is disabled (e.g. the active subject has no
   * prior recording yet). The Compare button shows the
   * `disabledTooltip` reason on hover.
   */
  disabled?: boolean;
  /**
   * Tooltip on the Compare button when `disabled` is true. Defaults to
   * "No prior recording for this subject yet." Override with the
   * exact reason (e.g. "Pick a prior recording first.").
   */
  disabledTooltip?: string;
  /**
   * Tooltip on the Compare button when ENABLED. Use to surface what
   * specific prior is in play — e.g. `vs baseline (2026-04-15)` —
   * so the clinician knows what the diff is against without leaving
   * the pane.
   */
  compareTooltip?: string;
}

const DEFAULT_DISABLED_TOOLTIP =
  'No prior recording for this subject yet — compare is unavailable.';
const DEFAULT_COMPARE_TOOLTIP =
  'Overlay current recording against the prior recording for this subject.';

export function CompareTogglePill({
  active,
  onChange,
  disabled = false,
  disabledTooltip = DEFAULT_DISABLED_TOOLTIP,
  compareTooltip = DEFAULT_COMPARE_TOOLTIP,
}: CompareTogglePillProps) {
  return (
    <WorkstationPill>
      <PillBtn
        title="Show current recording only (absolute view)."
        onClick={() => onChange(false)}
        active={!active && !disabled}
        padded
      >
        Current
      </PillBtn>
      <PillBtn
        title={disabled ? disabledTooltip : compareTooltip}
        onClick={() => onChange(true)}
        active={active && !disabled}
        padded
        disabled={disabled}
      >
        Compare
      </PillBtn>
    </WorkstationPill>
  );
}
