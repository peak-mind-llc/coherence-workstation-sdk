/**
 * Per-time-sample microstate assignment, downsampled for display
 */
export interface MicrostateSequence {
  provenance: Provenance;
  data: {
    /**
     * Canonical labels in order; integer codes in `labels` index into this
     */
    state_labels: string[];
    /**
     * State assignment per downsampled sample; -1 means no assignment
     */
    labels: number[];
    /**
     * Time in seconds for each downsampled sample
     */
    times_sec: number[];
    /**
     * Downsampled rate (typically ~10 Hz for display)
     */
    sample_rate_hz: number;
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
