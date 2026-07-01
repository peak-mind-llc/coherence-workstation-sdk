import type { Provenance } from './provenance';

/**
 * Per-paradigm ERP epochs metadata + handle to the on-disk Epochs FIF.
 *
 * The actual Epochs object is too large to inline in the bus envelope;
 * the FIF lives beside the JSON envelope in bus storage and is
 * referenced via `epochs_uri`. ERP downstream producers (evoked,
 * voice_portrait) read it via mne.read_epochs.
 */
export interface ErpEpochs {
  provenance: Provenance;
  data: {
    epochs_uri: string;
    format: 'fif-epochs';
    paradigm_id: string;
    /** Sorted condition names present after epoching (e.g. ['standard','target']). */
    conditions: string[];
    n_trials_per_condition: { [condition: string]: number };
    tmin_s: number;
    tmax_s: number;
    /** [baseline_start_s, baseline_end_s] from the paradigm config. */
    baseline_s: [number, number];
    /** Peak-to-peak amplitude rejection threshold in µV (null = no rejection). */
    reject_uv: number | null;
    n_channels: number;
    ch_names: string[];
    sfreq_hz: number;
    epoch_rejection?: {
      n_events?: number;
      n_ignored?: number;
      n_kept?: number;
      n_dropped?: number;
      drop_pct?: number;
      [k: string]: unknown;
    };
    behavioral?: { [k: string]: unknown };
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
