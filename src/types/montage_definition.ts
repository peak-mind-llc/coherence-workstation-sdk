/**
 * MontageDefinition — typed schema for a single montage in the registry.
 *
 * Mirrors `cw_eeg.montage_registry.MontageDefinition` and its tagged
 * union types exactly. Served by `GET /api/montages`.
 *
 * Phase A of the montage builder design — see
 * `docs/superpowers/specs/2026-05-18-montage-builder-design.md`.
 */

/** Tagged union of reference types. Each variant declares the
 *  signal-processing transform that produces the channel's display signal. */
export type Referent =
  | { type: 'electrode'; site: string } // signal = active - electrode_signal
  | { type: 'average'; family: 'Av' | 'AvL' | 'AvR' | 'AA' } // mean over a group
  | { type: 'csd' } // spherical-spline current source density (V/m²)
  | { type: 'rest' }; // REST reference (reserved for future system templates)

/** Row in a fixed-layout definition — the Active electrode is known at
 *  definition time (clinical caps, fixed-position headbands like Muse). */
export interface FixedChannelRow {
  kind: 'fixed';
  active: string;
  referent: Referent;
  synonyms?: string[];
  label?: string;
  group?: string;
}

/** Row in a slot-layout definition — the Active electrode is assigned
 *  per session (movable-electrode devices like BrainBit Flex). The
 *  per-session binding lives in `MontageMetadata.channelAssignments`. */
export interface SlotChannelRow {
  kind: 'slot';
  slotId: string;
  referent: Referent;
  defaultPosition?: string;
  label?: string;
}

export type ChannelRow = FixedChannelRow | SlotChannelRow;

export interface MontageDefinition {
  montageId: string;
  name: string;
  source: 'system' | 'user' | 'plugin';
  layout: 'fixed' | 'slot';
  clinicalTier: 'norm-supported' | 'research';
  channels: ChannelRow[];
  description?: string;
  /** Grouping hint for the toolbar's picker — siblings (e.g. _av / _le)
   *  share a family so they render as one-click sibling toggles. */
  family?: string;
  /** ID of the parent definition when this is a user clone. */
  derivedFrom?: string;
}
