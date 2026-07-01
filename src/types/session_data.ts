/**
 * SPEC-020 Phase 2 — workstation matcher input shape.
 *
 * Today every program's `matches()` callback receives the legacy
 * `StageMap` (a record of stage JSON keyed by stage name from the
 * retiring `prep_session.py` pipeline). Phase 2 evolves that to
 * `(session: SessionData) => ProgramInstanceSeed[]` so matchers can
 * key on per-recording bus availability instead.
 *
 * The `stages` field is transitional — kept while individual matchers
 * migrate; removed at SPEC-020 Phase 4 when every workstation pane is
 * bus-native.
 */

import type { MontageMetadata } from './montage_metadata';

/**
 * Legacy stage-map shape — record of stage JSON objects keyed by stage
 * name. Inlined here (rather than imported) because the SDK package
 * stays standalone; the desktop's own `StageMap` (at
 * `desktop/src/lib/workstation/core/types.ts`) is structurally
 * compatible.
 */
export type StageMap = Record<string, Record<string, unknown>>;

/**
 * Paradigm-aware ERP display plan — derived by the backend from the
 * paradigm config's `expected_components`, `difference_waves`, and
 * `hardware.reference`. Surfaces on the `bus/availability` recording
 * descriptor so the ERP program can initialize pane defaults without
 * re-computing the rule client-side.
 */
export interface ErpDisplayPlan {
  primary_view:
    | { raw_butterfly: true }
    | {
        difference_wave: {
          name: string;
          numerator: string | null;
          denominator: string | null;
        };
      };
  reference: 'device' | 'average';
  component_overlays: Array<{
    name: string;
    substrate: { raw: string } | { diff: string };
    peak_channels: string[];
    window_ms: number[];
    polarity: string;
    aodemr_stage: string | null;
    confidence: string | null;
  }>;
  rt_only: boolean;
}

export interface RecordingDescriptor {
  /** Stable per-recording id from `session.json`. */
  id: string;
  /** Recording type — typically "resting" or "erp". */
  type?: string | null;
  /** Human-readable label. */
  displayName?: string | null;
  /** Resting condition (e.g. "resting_eo"); null/undefined for ERP recordings. */
  condition?: string | null;
  /** ERP paradigm id (e.g. "neurofield_visual_oddball"); null/undefined for resting. */
  paradigmId?: string | null;
  /**
   * Bus artifact types currently available for this recording. Today every
   * recording in a session shares the same session-level set (bus storage
   * is keyed at session level). Plan E partitions per-recording.
   */
  availableArtifacts: string[];
  /**
   * Paradigm-aware ERP display plan — present when `type === 'erp'` and
   * the paradigm config declares `expected_components`. Null/undefined for
   * resting recordings or paradigms without component config.
   */
  displayPlan?: ErpDisplayPlan | null;
}

export interface SessionData {
  /** `${subjectId}__${date}` — the bus session id. */
  sessionId: string;
  recordings: RecordingDescriptor[];
  /**
   * Convenience union of every `availableArtifacts` across recordings —
   * useful for matchers that don't care about per-recording splitting.
   */
  sessionArtifacts: string[];
  /**
   * Transitional: legacy stage-map. Optional during the SPEC-020
   * migration; removed at Phase 4.
   */
  stages?: StageMap;
  /**
   * Per-recording montage metadata. Optional during the SPEC-021 Wave 1
   * migration; populated by the workstation `/bus/availability` endpoint
   * once the backend extension lands. Consumers should fall back to
   * `undefined` when absent (e.g., for sessions that haven't run prep).
   */
  montageMetadata?: MontageMetadata;
}
