/**
 * Per-channel specparam peaks collapsed into spatially-coherent rhythm families, each gated for whether it is plausibly visible by eye in the raw trace.
 */
export interface RhythmFamilies {
  provenance: Provenance;
  data: {
    /**
     * The gate values this artifact was produced under. Recorded so a family can be re-judged without re-running, and so a threshold change is visible in the artifact hash.
     */
    thresholds: {
      cf_tolerance_hz: number;
      neighbor_k: number;
      min_pw_visible: number;
      max_bw_visible: number;
      min_family_channels: number;
      /**
       * Worst-member r² floor for fit_quality='good', per aperiodic.r_squared_threshold. Decides visible via the fit_quality gate — recorded so a config change is visible in the artifact hash.
       */
      r_squared_threshold: number;
      [k: string]: unknown;
    };
    families: {
      /**
       * Power-weighted mean center frequency, Hz
       */
      cf: number;
      channels: string[];
      max_channel: string;
      /**
       * Greatest member power above the aperiodic fit
       */
      pw_max: number;
      pw_mean: number;
      /**
       * Power-weighted mean bandwidth, Hz
       */
      bw: number;
      /**
       * Estimated band-limited amplitude at max_channel, microvolts. Null when the aperiodic offset was unavailable.
       */
      amplitude_uv?: number | null;
      /**
       * Region of max_channel per cw_eeg.transients.topography.REGIONS
       */
      region?: string | null;
      /**
       * Band of cf per configs/default.yaml spectral.bands
       */
      band: string;
      /**
       * Worst member r_squared against aperiodic.r_squared_threshold
       */
      fit_quality: "good" | "poor";
      /**
       * Passed every eye-visibility gate — a candidate drill target
       */
      visible: boolean;
      /**
       * Gate names this family failed. Empty when visible is true. Families are kept, never dropped: the excluded set is what the reveal uses.
       */
      excluded_by: string[];
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
