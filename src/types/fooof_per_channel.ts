/**
 * FOOOF / specparam aperiodic + periodic spectral parameterization, per channel
 */
export interface FoofPerChannel {
  provenance: Provenance;
  data: {
    per_channel: {
      channel: string;
      aperiodic: {
        offset: number;
        exponent: number;
        knee?: number | null;
        [k: string]: unknown;
      };
      peaks: {
        /**
         * Center frequency in Hz
         */
        cf: number;
        /**
         * Peak power above aperiodic
         */
        pw: number;
        /**
         * Peak bandwidth
         */
        bw: number;
        [k: string]: unknown;
      }[];
      r_squared: number;
      error: number;
      [k: string]: unknown;
    }[];
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
