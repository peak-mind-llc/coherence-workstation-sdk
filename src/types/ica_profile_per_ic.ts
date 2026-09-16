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
        lateralization?: "left" | "right" | "midline" | "bilateral" | "diffuse";
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
          /**
           * Band the peak's frequency falls in (delta|theta|alpha|beta|gamma).
           */
          band?: string | null;
          [k: string]: unknown;
        }[];
        /**
         * Band holding the most summed power in the component's spectrum (delta|theta|alpha|beta|gamma); null when no band holds power.
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
          /**
           * The Desikan-Killiany parcel the peak VOXEL sits in, with the distance to it. Distinct from `name` above, which is the parcel carrying the most summed source energy across the whole volume; on real data the two usually differ, so anything that marks `mni_coords` and captions it must caption it from here. Null, or absent entirely, when the peak is farther from labelled cortex than the atlas lookup will name across — and absent on every artifact produced before this field existed. In both cases the correct reading is 'no anatomy is known for this voxel', never a fallback to `name`.
           */
          at_peak_voxel?: {
            name?: string | null;
            hemisphere?: string | null;
            distance_mm?: number | null;
            confidence?: string | null;
            [k: string]: unknown;
          } | null;
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
