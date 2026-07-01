/**
 * <SignificanceMarkerOverlay> — overlay layer for a topomap that marks
 * channels passing the FDR + Cohen's d gate.
 *
 * The longitudinal-priors spec specifies: "Channels passing both gates
 * are marked on the Δ viewport (small filled marker; legacy shows a
 * dot). Channels failing either gate are unmarked (the Δ value is
 * still drawn but not flagged as reliable)."
 *
 * The marker positions follow ``ELECTRODE_POSITIONS`` from the topomap
 * module — same coordinate system used to draw electrode pins, so the
 * dots land exactly on top of their channel's electrode marker.
 *
 * This component is presentational: it takes a list of channel names
 * to mark and renders dots at those electrode positions. The decision
 * of which channels to mark (per-band gate evaluation) lives upstream
 * — the longitudinal-spectral-headmap-diff pane resolves it from the
 * ``/api/subjects/{id}/longitudinal/spectral`` endpoint's
 * ``significant`` flag.
 */

import { ELECTRODE_POSITIONS } from './index';

export interface SignificanceMarkerOverlayProps {
  /** Channel names to mark (typically those with ``significant: true``). */
  channels: readonly string[];
  /** Marker fill color. Defaults to ``--text-primary``. */
  fill?: string;
  /** Marker radius in viewport-relative units (0.0–1.0). Default 0.012. */
  radius?: number;
  className?: string;
}

export function SignificanceMarkerOverlay({
  channels,
  fill,
  radius = 0.012,
  className,
}: SignificanceMarkerOverlayProps) {
  // Filter out unknown channels so the overlay never throws on a
  // typo/legacy name; just don't draw the marker.
  const points = channels
    .map((ch) => ({ ch, pos: ELECTRODE_POSITIONS[ch] }))
    .filter((p): p is { ch: string; pos: { x: number; y: number } } => p.pos != null);

  if (points.length === 0) return null;
  const dotR = radius * 100;
  const fillColor = fill ?? 'var(--text-primary)';

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      data-testid="significance-marker-overlay"
    >
      {points.map(({ ch, pos }) => (
        <circle
          key={ch}
          cx={pos.x * 100}
          cy={pos.y * 100}
          r={dotR}
          fill={fillColor}
          stroke="var(--surface-base)"
          strokeWidth={dotR * 0.4}
          data-testid={`significance-marker-${ch}`}
        />
      ))}
    </svg>
  );
}
