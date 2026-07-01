/**
 * Set of canonical microstate template topographies fitted from a recording
 */
export interface MicrostateTemplates {
  provenance: Provenance;
  data: {
    n_clusters: number;
    channel_names: string[];
    /**
     * One entry per canonical state (A, B, C, D, …)
     */
    templates: {
      /**
       * Canonical letter label (A, B, C, ...)
       */
      label: string;
      /**
       * Functional name when known (e.g., 'Left-Right Diagonal')
       */
      canonical_name?: string | null;
      functional_association?: string | null;
      network?: string | null;
      /**
       * Per-channel weight values (microvolts)
       */
      topography: {
        [k: string]: number;
      };
      /**
       * Global explained variance contributed by this state, percent
       */
      gev_percent: number;
      /**
       * Correlation with canonical template if matched
       */
      template_correlation?: number | null;
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
