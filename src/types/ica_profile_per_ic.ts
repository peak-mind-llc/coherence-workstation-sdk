/**
 * Aggregated per-IC profiles for the AI Technician. Collects ICLabel category/confidence, variance accounted for, topography, FOOOF spectral parameterization, and optional sLORETA source localization into a single catalog-readable artifact.
 */
export interface IcaProfilePerIc {
  provenance: Provenance;
  data: {
    per_ic: {
      /**
       * Zero-based IC index matching the ICA decomposition order.
       */
      ic_index: number;
      iclabel: {
        /**
         * ICLabel category: brain | muscle | eye | heart | line_noise | channel_noise | other
         */
        category: string;
        /**
         * ICLabel posterior probability for the assigned category (0–1).
         */
        confidence: number;
        [k: string]: unknown;
      };
      /**
       * Fraction of total recording variance explained by this IC (0–1).
       */
      variance_accounted_for?: number;
      topography?: {
        /**
         * Channel with the highest absolute mixing-matrix weight.
         */
        peak_channel?: string;
        /**
         * Broad region of the peak channel (frontal|temporal|central|parietal|occipital).
         */
        peak_region?: string;
        /**
         * Left/right asymmetry classification of the IC topography.
         */
        lateralization?: "left" | "right" | "midline" | "bilateral";
        [k: string]: unknown;
      };
      spectrum?: {
        aperiodic?: {
          offset?: number;
          exponent?: number;
          [k: string]: unknown;
        };
        peaks?: {
          /**
           * Center frequency (Hz).
           */
          cf?: number;
          /**
           * Peak power above aperiodic.
           */
          pw?: number;
          /**
           * Peak bandwidth (Hz).
           */
          bw?: number;
          [k: string]: unknown;
        }[];
        /**
         * Band label of the highest-pw peak (delta|theta|alpha|beta|gamma); null if no clear peak.
         */
        dominant_band?: string | null;
        /**
         * FOOOF model fit quality (0–1).
         */
        r_squared?: number;
        [k: string]: unknown;
      };
      /**
       * sLORETA source localization result. Null when source localization was not computed or failed.
       */
      source_localization?: null | {
        peak_parcel?: {
          name?: string;
          hemisphere?: string;
          /**
           * @minItems 3
           * @maxItems 3
           */
          mni_coords?: [number, number, number];
          brodmann_areas?: number[];
          network_membership?: string[];
          region_power?: number;
          [k: string]: unknown;
        };
        top_parcels?: {
          name?: string;
          region_power?: number;
          [k: string]: unknown;
        }[];
        confidence?: number;
        spatial_resolution_mm?: number;
        [k: string]: unknown;
      };
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
