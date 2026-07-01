/**
 * Artifact-rejection policy emitted by prep sign-off
 */
export interface RejectionPolicy {
  provenance: Provenance;
  data: {
    policy_kind: "off" | "prep-default" | "ic-corrected" | "user-marked";
    /**
     * Indices of ICA components to reject
     */
    rejected_components: number[];
    rejected_intervals: {
      start: number;
      end: number;
      reason?: string;
      [k: string]: unknown;
    }[];
    filter_chain?: {
      highpass_hz?: number;
      lowpass_hz?: number;
      notch_hz?: number;
      [k: string]: unknown;
    };
    /**
     * Channel names marked bad. Interpolated when bad_channel_interp is true.
     */
    bad_channel_marks?: string[];
    /**
     * If true, interpolate the bad channels; if false, mark only. Default true.
     */
    bad_channel_interp?: boolean;
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
