/**
 * Per-channel-per-band-per-metric z-scores against an external normative reference (e.g. Open Normative). Emitted by inferential-register plugins; consumed by Normative-phase topomap renderers.
 */
export interface NormativeReport {
  provenance: Provenance;
  data: {
    /**
     * Subject age in years.
     */
    subject_age?: number;
    /**
     * Normative age bin used for the comparison (e.g. '30-40').
     */
    age_bin: string;
    /**
     * Recording condition (e.g. 'eo', 'ec').
     */
    condition: string;
    /**
     * Name of the normative reference (e.g. 'Open Normative').
     */
    reference_name?: string;
    channel_names?: string[];
    results: {
      channel: string;
      band: string;
      /**
       * Metric key (e.g. 'absolute_power', 'relative_power'). Match the dashboard's metric naming.
       */
      metric: string;
      /**
       * Z-score against the normative mean; null if comparison failed.
       */
      z_score: number | null;
      /**
       * True if z-score is significant after Benjamini-Hochberg FDR correction.
       */
      fdr_significant?: boolean;
      p_value?: number | null;
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
