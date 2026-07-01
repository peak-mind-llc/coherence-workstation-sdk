/**
 * FindingGeometry — the structural anchor for any finding (or proposed
 * finding) the workstation surfaces.
 *
 * Long-term home for this discriminated union is the workstation SDK
 * package: it is consumed by both the host application (`desktop/`) and
 * by the Phase-1 ProposedFinding schema below, and per CLAUDE.md
 * §"Default new shared code to the workstation SDK package" the SDK is
 * the canonical location.
 *
 * Until the dashboard mode is retired, `desktop/src/lib/workstation/findings.ts`
 * re-exports this type so existing imports keep working without a
 * breaking churn. Do not duplicate the declaration over there — extend
 * here and let the re-export carry the change forward.
 *
 * The shape mirrors `cw_eeg.proposals._validate_geometry` server-side;
 * any change to one must be reflected in the other.
 */

/**
 * `cursorAxis` is intentionally typed loose here so the SDK can ship
 * geometry without depending on the host's `SyncAxis` (defined in
 * `desktop/src/lib/workstation/core/types.ts`). The host narrows it on
 * consumption.
 */
export type FindingGeometryCursorAxis = string;

export type FindingGeometry =
  | { kind: 'whole-pane'; paneType: string }
  | {
      kind: 'rect-snap-rows';
      paneType: string;
      tStart: number;
      tEnd: number;
      channels: readonly string[];
    }
  | {
      kind: 'rect-free';
      paneType: string;
      tStart: number;
      tEnd: number;
      yMin: number;
      yMax: number;
    }
  | {
      kind: 'point';
      paneType: string;
      t: number;
      cursorAxis: FindingGeometryCursorAxis;
    }
  | { kind: 'channel-set'; paneType: string; channels: readonly string[] }
  | {
      kind: 'channel-overlay';
      paneType: string;
      comparisons: readonly {
        src: string;
        dst: string;
        showDiff?: boolean;
      }[];
    }
  /**
   * Cross-pane compose set. Each fragment is either a whole-pane
   * snapshot or a sub-item (channel/band) within a pane. Saved
   * findings with this geometry have a composed PNG as their
   * screenshot (workstation host's `composeFragments` output)
   * rather than a single pane capture. paneType reflects the most
   * prominent / first pane type for chip display.
   */
  | {
      kind: 'multi-fragment';
      paneType: string;
      fragments: readonly {
        paneId: string;
        paneType: string;
        channel?: string;
      }[];
    };

/** All geometry kinds. The Pydantic discriminator (server) tracks this list. */
export const FINDING_GEOMETRY_KINDS = [
  'whole-pane',
  'rect-snap-rows',
  'rect-free',
  'point',
  'channel-set',
  'channel-overlay',
  'multi-fragment',
] as const;

export type FindingGeometryKind = (typeof FINDING_GEOMETRY_KINDS)[number];
