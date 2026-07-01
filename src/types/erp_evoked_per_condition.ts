import type { Provenance } from './provenance';

/**
 * Per-condition Evoked + GFP, ready for the workstation ERP panes
 * (butterfly, head-butterfly, GFP, topo-at-latency, diff-butterfly,
 * trial-count).
 *
 * Voltage units throughout: µV (panes display µV, so the producer
 * already converts from MNE's internal Volts).
 */
export interface ErpEvokedPerCondition {
  provenance: Provenance;
  data: {
    paradigm_id: string;
    /** Condition names present in `per_condition`. */
    conditions: string[];
    ch_names: string[];
    /** Time axis in seconds (epoch-latency, post-stim positive). */
    times_s: number[];
    sfreq_hz: number;
    tmin_s: number;
    tmax_s: number;
    per_condition: {
      [condition: string]: {
        /** Evoked waveform per channel: [n_ch][n_samp] in µV. */
        data_uv: number[][];
        n_trials: number;
        /** GFP trace in µV (one value per sample). */
        gfp_uv: number[];
      };
    };
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
