/**
 * Signal-viewer types — UI/rendering shapes consumed by workstation
 * signal panes (raw trace, band-topo strip, spectrogram, field-topo).
 *
 * Promoted from desktop/src/components/dashboard/shared/eeg-viewer/types.ts
 * in SPEC-021 Wave 1 so the workstation surface no longer depends on the
 * dashboard tree (which Wave 4 deletes).
 *
 * Type bodies are byte-equivalent to the dashboard source. ChannelGroup
 * and PhysioChannel travel along because the 5 promoted types reference
 * them; both are copied verbatim from the same source file.
 */

export interface ChannelGroup {
  name: string;
  indices: number[];
}

/** Montage key used throughout the viewer. The legacy dashboard's
 *  EEGSignalViewer only renders the first three (its UI doesn't expose
 *  Laplacian); 'laplacian' is included so the workstation's data hooks
 *  that reuse this type accept all four. */
export type MontageKey = 'average_ref' | 'linked_ears' | 'bipolar' | 'laplacian';

/** Per-channel non-EEG (physio) payload from the signal-window endpoints
 *  (SPEC-019 T2). HR, ECG, EOG, etc. retained by the loader (per SPEC-019
 *  T1) reach the client through this sibling array because
 *  ``compute_montage_variants`` filters by ``_DISPLAY_ORDER`` and excludes
 *  non-EEG by name. Each entry carries its own auto-gain hint (``ch_std``)
 *  since physio amplitudes vary widely (HR BPM ~60 vs ECG µV ~1000).
 *
 *  Workstation mode renders these as a separate band beneath the EEG stack
 *  in ``RawTracePane`` when the "Show physio" toggle is on. Dashboard mode
 *  ignores this field. */
export interface PhysioChannel {
  ch_name: string;
  ch_type: string;            // MNE ch_type ("misc", "ecg", "eog", ...)
  data: number[];             // decimated to match variant sfreq, in µV-equivalent
  sfreq: number;
  ch_std: number;
}

/** Workstation-side processed shape for a physio channel — Float32Array
 *  for efficient rendering, camelCase keys to match WindowedSignalData. */
export interface ProcessedPhysioChannel {
  chName: string;
  chType: string;
  data: Float32Array;
  sfreq: number;
  chStd: number;
}

/** Windowed signal data from the signal-window endpoint.
 *
 *  ``chTypes`` (SPEC-019 T2): parallel to ``chNames``. For variant payloads
 *  every entry is "eeg" (the variant ch list is filtered by display order),
 *  but the field is still threaded through so workstation panes can
 *  partition consistently if the data shape ever broadens.
 *
 *  ``physioChannels`` (SPEC-019 T2): non-EEG channels retained by the
 *  loader, surfaced as a sibling array since ``compute_montage_variants``
 *  excludes them. Empty for non-Q21 / EEG-only sessions. */
export interface WindowedSignalData {
  channels: Float32Array[];
  chNames: string[];
  chTypes: string[];
  chGroups: ChannelGroup[];
  chStds: number[];
  sfreq: number;
  startSec: number;
  durationSec: number;
  totalDurationSec: number;
  physioChannels: ProcessedPhysioChannel[];

  /** Phase B: when the server couldn't supply the requested montage
   *  (e.g. Linked Ears on a recording with no A1/A2 and no saved
   *  pre_ref_mean), this carries the requested montage's identifier
   *  and a human-readable reason. ``channels`` and ``chNames`` are
   *  empty when this is set. Consumers should render an "unavailable"
   *  notice instead of a chart. */
  montageUnavailable?: {
    requestedMontage: string;
    reason: string;
  };
}

/** Raw API response from GET /api/sessions/{id}/{date}/signal-window */
export interface SignalWindowResponse {
  condition: string;
  montage_key: string;
  start_sec: number;
  duration_sec: number;
  total_duration_sec: number;
  sfreq: number;
  ch_names: string[];
  /** SPEC-019 T2 — parallel to ``ch_names``. Optional for backward
   *  compatibility with older test fixtures. */
  ch_types?: string[];
  ch_groups: ChannelGroup[];
  data: number[][];
  ch_stds: number[];
  /** SPEC-019 T2 — non-EEG channels retained by the loader (HR, ECG, etc.).
   *  Optional for backward compatibility with older test fixtures. */
  physio_channels?: PhysioChannel[];
  /** Phase B unavailable-montage signal. When true, the server couldn't
   *  supply ``montage_key`` for this recording; ``ch_names`` / ``data``
   *  are empty. See ``requested_montage`` and ``unavailability_reason``
   *  for the user-facing fields. */
  montage_unavailable?: boolean;
  /** The legacy montage string the client requested when the variant
   *  was unavailable (matches ``montage_key`` in normal responses). */
  requested_montage?: string;
  /** Human-readable label from compute_montage_variants — e.g.
   *  "Linked Ears (reprocess to enable)". Frontend renders this verbatim
   *  in the unavailability notice. */
  unavailability_reason?: string;
}

/** Filter state for Butterworth IIR. */
export interface FilterState {
  lowCut: number;      // highpass cutoff Hz (0 = off)
  highCut: number;     // lowpass cutoff Hz (0 = off)
  notch: number;       // notch center Hz (0 = off, typically 50 or 60)
  notch16Hz?: boolean; // 16 Hz ADC artifact notch (independent of line-noise notch)
}
