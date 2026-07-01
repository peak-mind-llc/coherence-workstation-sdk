/**
 * Per-subject voice basin repertoire computed at DK-68 from a cleaned resting EEG recording (SPEC-013). Faithful to plugins/ins/coherence-basins/compute/producer.py CoherenceBasinsProducer.compute() — the bus `data` payload mirrors the legacy coherence_profile.json stage output (cw_eeg/schemas/coherence_profile_schema.json). The recording's own dynamics are decomposed into spatio-temporal mode families, classified against the SACRED voice catalog, and summarized by profile dynamics + depth metrics. Output register is descriptive (no normative reference).
 */
export interface CoherenceProfile {
  provenance: Provenance;
  data: {
    /**
     * Payload schema version. Mirrors the legacy stage const.
     */
    schema_version: "coherence_profile/v1";
    /**
     * Sampling rate (Hz) of the source-recon parcel time courses.
     */
    sfreq: number;
    /**
     * Parcellation atlas — Desikan-Killiany 68.
     */
    atlas: "dk68";
    /**
     * Scalp channel count of the cleaned signal that fed source reconstruction. The Coherence Dynamics page is density-gated on this value.
     */
    n_channels: 19 | 37;
    /**
     * Spatio-temporal decomposition method + mode counts.
     */
    decomposition: {
      /**
       * Decomposition algorithm used.
       */
      method: "hankel_dmd" | "leida";
      /**
       * Total modes returned by the decomposition before physiological filtering.
       */
      n_modes_total: number;
      /**
       * Modes retained after physiological (frequency/growth) filtering.
       */
      n_modes_filtered: number;
      /**
       * Effective sampling rate after any decomposition downsampling (Hz).
       */
      sfreq_effective: number;
      [k: string]: unknown;
    };
    /**
     * Number of mode families discovered by clustering.
     */
    n_families_discovered: number;
    /**
     * Discovered mode families, each a coherent spatio-temporal basin.
     */
    families: {
      /**
       * Stable identifier for this family within the profile.
       */
      family_id: number;
      /**
       * Number of modes clustered into this family.
       */
      n_modes: number;
      /**
       * Aggregate amplitude/weight of the family.
       */
      amplitude: number;
      /**
       * Per-parcel loading across the 68 DK parcels.
       *
       * @minItems 68
       * @maxItems 68
       */
      spatial_pattern: [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number
      ];
      /**
       * Up to 10 top-loading DK parcel anchor names for this family.
       *
       * @maxItems 10
       */
      top_anchors:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string, string, string];
      /**
       * Frequencies (Hz) of the modes that are members of this family.
       */
      member_frequencies_hz: number[];
      /**
       * Mean of member_frequencies_hz (Hz).
       */
      mean_member_frequency_hz: number;
      [k: string]: unknown;
    }[];
    /**
     * Per-voice classification of families against the SACRED voice catalog. Keys are the 8 canonical voice names (VOICES order).
     */
    voice_classification: {
      [k: string]: {
        /**
         * family_id values matched to this voice.
         */
        matched_family_ids: number[];
        /**
         * Map of family_id -> count of anchor matches for this voice.
         */
        n_anchor_matches: {
          [k: string]: number;
        };
        /**
         * Map of family_id -> Jaccard overlap with this voice's anchor set.
         */
        jaccard: {
          [k: string]: number;
        };
        /**
         * Locked voice palette hex color.
         */
        color: string;
        /**
         * Anatomical description of this voice's anchor regions.
         */
        anatomy: string;
        /**
         * Optional poetic display name for this voice.
         */
        poetic_name?: string | null;
        /**
         * Optional 19-channel prevalence percentage for this voice.
         */
        prevalence_pct_19ch?: number | null;
        /**
         * Optional note qualifying the prevalence figure.
         */
        prevalence_note?: string;
        /**
         * Evidence status of this voice's catalog definition.
         */
        validation_status: "solid" | "exploratory";
        [k: string]: unknown;
      };
    };
    /**
     * Temporal dynamics of family activations.
     */
    dynamics: {
      /**
       * family_id values, ordered to match per_family / transition_matrix.
       */
      family_ids: number[];
      /**
       * Map of family_id -> per-family occupancy/dwell metrics.
       */
      per_family: {
        [k: string]: {
          /**
           * Fraction of samples where this family is rank-1.
           */
          top1_fraction: number;
          /**
           * Fraction of samples where this family is in the top 3.
           */
          top3_fraction: number;
          /**
           * Mean activation rank of this family across samples.
           */
          mean_rank: number;
          /**
           * Median activation rank of this family across samples.
           */
          median_rank: number;
          /**
           * Dwell-time statistics for episodes where this family is dominant.
           */
          dwell: {
            /**
             * Number of dominance episodes.
             */
            n_episodes: number;
            /**
             * Mean episode duration (s).
             */
            mean_dwell_s: number;
            /**
             * Std of episode durations (s).
             */
            std_dwell_s: number;
            /**
             * Longest episode duration (s).
             */
            max_dwell_s: number;
            /**
             * Total dominance time (s).
             */
            total_time_s: number;
            [k: string]: unknown;
          };
          [k: string]: unknown;
        };
      };
      /**
       * Total number of dominant-family switches.
       */
      n_switches: number;
      /**
       * Switches per second.
       */
      switch_rate_per_s: number;
      /**
       * Family-to-family transition counts, indexed by family_ids order.
       */
      transition_matrix: number[][];
      [k: string]: unknown;
    };
    /**
     * Profile depth / repertoire-richness metrics.
     */
    depth: {
      /**
       * Shannon entropy of the family occupancy distribution.
       */
      family_entropy: number;
      /**
       * Effective number of families (exp of family_entropy).
       */
      n_eff_families: number;
      /**
       * Count of DK parcels in the repertoire long tail.
       */
      long_tail_parcel_count: number;
      /**
       * Fraction of the 68 DK parcels in the long tail.
       */
      long_tail_parcel_fraction: number;
      [k: string]: unknown;
    };
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
