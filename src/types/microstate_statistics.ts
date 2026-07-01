/**
 * Per-state and global temporal metrics for microstate analysis
 */
export interface MicrostateStatistics {
  provenance: Provenance;
  data: {
    per_state: {
      label: string;
      coverage_pct: number;
      mean_duration_ms: number;
      occurrence_per_sec: number;
      gev_pct?: number;
      [k: string]: unknown;
    }[];
    global_metrics: {
      total_gev_pct: number;
      mean_global_duration_ms: number;
      transition_entropy_bits?: number;
      transition_entropy_max_bits?: number;
      transition_entropy_normalized?: number;
      n_gfp_peaks?: number;
      [k: string]: unknown;
    };
    transition_matrix: {
      labels: string[];
      /**
       * Square matrix of observed transition probabilities
       */
      observed: number[][];
      expected: number[][];
      /**
       * observed - expected; positive = over-represented
       */
      deviation: number[][];
      [k: string]: unknown;
    };
    /**
     * Free-text quality concerns (e.g., 'low GEV', 'short duration')
     */
    quality_flags?: string[];
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
