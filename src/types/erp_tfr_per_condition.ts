import type { Provenance } from './provenance';

/**
 * Per-condition time-frequency views for the ERP Dynamics phase:
 * ERSP power (Morlet, baseline-corrected logratio), inter-trial coherence
 * (ITC), and sorted single-trial ERP-image data. Mirrors the
 * `erp.tfr.per_condition` bus artifact and the ops-aware `op-tfr` endpoint.
 *
 * Consumed by the `erp-tf-suite` pane. Hand-written to match its sibling
 * `ErpEvokedPerCondition` (no JSON schema, like the other SPEC-020 ERP types).
 */
export interface ErpTfrPerCondition {
  provenance: Provenance;
  data: {
    paradigm_id: string;
    /** Condition names present in `per_condition`. */
    conditions: string[];
    ch_names: string[];
    /** Frequency axis in Hz (log-spaced Morlet bins). The full requested
     *  band is present: epochs are cut wider than the display window (by a
     *  wavelet half-width) and the result cropped back, so long low-frequency
     *  wavelets fit and no bins are trimmed. */
    freqs_hz: number[];
    /** Time axis in seconds (epoch-latency, post-stim positive). */
    times_s: number[];
    sfreq_hz: number;
    tmin_s: number;
    tmax_s: number;
    per_condition: {
      [condition: string]: {
        /** ERSP power [n_ch][n_freqs][n_times] in dB — 10*log10 of the ratio
         *  to the pre-stimulus baseline. Already scaled by the backend;
         *  consumers must not re-scale. */
        power: number[][][];
        /** Inter-trial coherence [n_ch][n_freqs][n_times] in [0,1], or null. */
        itc: number[][][] | null;
        /** Sorted single-trial ERP-image data (per-channel sorted_/erp_ keys). */
        erpimage: ErpImageData;
      };
    };
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

/**
 * Single-trial ERP-image payload from `_serialize_erpimage`. Besides the
 * fixed keys below it carries, for every channel in `channels`: a
 * `trial_<ch>` (binned trials × time in acquisition order — the default,
 * unsorted view), a `sorted_<ch>` (the same binned to P300-latency order),
 * and an `erp_<ch>` (mean waveform) array.
 */
export interface ErpImageData {
  /** Time axis in milliseconds (downsampled). */
  times: number[];
  n_trials: number;
  /** 97th-percentile |µV| color scale. */
  vmax: number;
  channels: string[];
  [k: string]: unknown;
}
