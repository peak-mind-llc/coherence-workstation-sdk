/**
 * HeadMap — a reusable head-with-electrodes SVG primitive.
 *
 * Renders a top-down head outline (circle + nose + ears) with a dot at
 * each requested 10-10 electrode position from `ELECTRODE_POSITIONS`.
 * Supports highlighting, click selection, per-site badges, and optional
 * routing lines (Active → Referent) for montage topology previews.
 *
 * Promoted from the recorder's BrainBitMontagePicker so the recorder's
 * electrode picker and the workstation montage editor share one
 * implementation. "If you want a head map, use ours."
 */

import { ELECTRODE_POSITIONS } from '../topomap';

/** A routing line from a site to either another site or an explicit point. */
export interface HeadMapLine {
  from: string;
  to: string | { x: number; y: number };
  color?: string;
}

export interface HeadMapProps {
  /** Sites to render dots for. Defaults to every site in ELECTRODE_POSITIONS. */
  electrodes?: readonly string[];
  /** Sites rendered in the highlight (accent-filled) state. */
  highlightedSites?: readonly string[];
  /** Click handler. When omitted the map is a non-interactive display. */
  onElectrodeClick?: (site: string) => void;
  /** Optional short badge text per site (e.g. slot index "1".."4"). */
  badges?: Record<string, string>;
  /** Optional routing lines drawn under the dots (montage topology preview). */
  lines?: readonly HeadMapLine[];
  /** Square pixel size cap. Renders responsive width with this maxHeight. */
  maxHeight?: number;
  /** Show the site name under each dot. Default true. */
  showLabels?: boolean;
}

const VIEWBOX = 200;

function _toXY(
  target: string | { x: number; y: number },
): { x: number; y: number } | null {
  if (typeof target !== 'string') return target;
  const pos = ELECTRODE_POSITIONS[target];
  return pos ? { x: pos.x, y: pos.y } : null;
}

/** Reusable head-with-electrodes SVG. See HeadMapProps. */
export function HeadMap({
  electrodes,
  highlightedSites,
  onElectrodeClick,
  badges,
  lines,
  maxHeight = 280,
  showLabels = true,
}: HeadMapProps) {
  const sites = (electrodes ?? Object.keys(ELECTRODE_POSITIONS)).filter(
    (s) => ELECTRODE_POSITIONS[s] != null,
  );
  const highlighted = new Set(highlightedSites ?? []);
  const interactive = typeof onElectrodeClick === 'function';

  return (
    <div
      className="relative"
      style={{
        /* Theme-aware: dark in Dark mode, light in Light mode. Electrode
         * strokes/labels below read theme-aware --text-* via SVG cascade. */
        background: 'var(--data-canvas-bg, #0a0a0c)',
        borderRadius: 4,
        padding: 8,
      }}
      data-testid="head-map"
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width="100%"
        style={{ display: 'block', maxHeight }}
      >
        {/* Head outline */}
        <circle
          cx={100}
          cy={100}
          r={88}
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth={1.5}
        />
        {/* Nose */}
        <polyline
          points="92,12 100,2 108,12"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth={1.5}
        />
        {/* Ears */}
        <ellipse cx={9} cy={100} rx={4} ry={10} fill="none" stroke="var(--text-tertiary)" strokeWidth={1.5} />
        <ellipse cx={191} cy={100} rx={4} ry={10} fill="none" stroke="var(--text-tertiary)" strokeWidth={1.5} />

        {/* Routing lines (drawn first, under the dots) */}
        {(lines ?? []).map((line, i) => {
          const from = _toXY(line.from);
          const to = _toXY(line.to);
          if (!from || !to) return null;
          return (
            <line
              key={`line-${i}-${line.from}`}
              x1={from.x * VIEWBOX}
              y1={from.y * VIEWBOX}
              x2={to.x * VIEWBOX}
              y2={to.y * VIEWBOX}
              stroke={line.color ?? 'var(--accent-primary, #5fb3f0)'}
              strokeWidth={0.75}
              opacity={0.6}
            />
          );
        })}

        {/* Electrode dots */}
        {sites.map((site) => {
          const pos = ELECTRODE_POSITIONS[site];
          const cx = pos.x * VIEWBOX;
          const cy = pos.y * VIEWBOX;
          const isOn = highlighted.has(site);
          const badge = badges?.[site];
          return (
            <g key={site}>
              <circle
                cx={cx}
                cy={cy}
                r={isOn ? 8 : 5}
                fill={isOn ? 'var(--accent-primary, #5fb3f0)' : 'var(--surface-raised, #1a1a1f)'}
                stroke={isOn ? 'var(--accent-primary, #5fb3f0)' : 'var(--text-tertiary)'}
                strokeWidth={isOn ? 0.5 : 1}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={interactive ? () => onElectrodeClick!(site) : undefined}
                data-testid={`electrode-${site}`}
                data-highlighted={isOn ? 'true' : 'false'}
              />
              {showLabels && (
                <text
                  x={cx}
                  y={cy + 16}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--text-tertiary)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {site}
                </text>
              )}
              {badge != null && (
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="var(--surface-ground, #000)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {badge}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default HeadMap;
