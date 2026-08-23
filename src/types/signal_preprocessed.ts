/**
 * Objectively-preprocessed signal: signal.raw + average reference + 0.5-100 Hz filter + line notch (EEG channels only; non-EEG pass through untouched). No clinical policy.
 */
export interface SignalPreprocessed {
  provenance: Provenance;
  data: {
    /**
     * File URI to the preprocessed recording (.fif)
     */
    uri: string;
    format: "fif";
    n_channels: number;
    sfreq: number;
    duration_seconds: number;
    channel_names: string[];
    /**
     * Applied reference (always 'average')
     */
    reference: string;
    /**
     * Bandpass edges [l_freq, h_freq] in Hz actually applied. Optional for backwards compatibility with envelopes written before SPEC-050; absent means the canonical 0.5-100 Hz.
     *
     * @minItems 2
     * @maxItems 2
     */
    filter_band_hz?: [number, number];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Provenance metadata carried by every bus artifact
 */
export interface Provenance {
  /**
   * Plugin or core producer identifier
   */
  producer: string;
  /**
   * Semver of the producer
   */
  producer_version: string;
  /**
   * ISO 8601 timestamp of computation
   */
  produced_at: string;
  /**
   * Evidence tier of this artifact
   */
  evidence_grade: "research" | "clinical-pending" | "clinical";
  /**
   * Output register of this artifact
   */
  output_register: "descriptive" | "self-comparative" | "inferential";
  /**
   * Content hashes of upstream artifacts this output was derived from
   */
  consumed_from: string[];
  /**
   * Stable hash of the parameters used to compute this output
   */
  parameters_hash: string;
  /**
   * Session this artifact belongs to
   */
  session_id?: string;
  /**
   * External references invoked (for self-comparative or inferential outputs)
   */
  references?: string[];
  [k: string]: unknown;
}
