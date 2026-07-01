/**
 * Per-parcel DICS source-space spectral parameterization (SpecParam/FOOOF) across the 68 Desikan-Killiany parcels. Faithful to plugins/ins/spectral-atlas/compute/producer.py SpectralAtlasProducer._build_parcel_payload(). parcel_peaks values are lists of [cf, pw, bw] triples; parcel_aperiodic values carry {exponent, offset, r_squared}. electrode_to_parcels maps each scalp electrode to the top-K source parcels that explain it. status='insufficient_channels' is emitted when the montage has fewer than 19/37 channels and source localization is impossible.
 */
export interface SourceSpecparamParcel {
  provenance: Provenance;
  data: {
    /**
     * Canonical DK-68 parcel names (e.g. 'bankssts-lh', 'precuneus-rh').
     */
    parcel_names: string[];
    /**
     * Map of parcel name -> human-readable display name (e.g. 'Banks STS (L)').
     */
    parcel_nice_names: {
      [k: string]: string;
    };
    /**
     * Map of parcel name -> SpecParam aperiodic fit parameters.
     */
    parcel_aperiodic: {
      [k: string]: {
        /**
         * 1/f aperiodic exponent (higher = steeper slope = more low-freq dominant).
         */
        exponent: number;
        /**
         * Log-space vertical offset of the aperiodic component.
         */
        offset: number;
        /**
         * Goodness-of-fit R² for the full SpecParam model (aperiodic + peaks).
         */
        r_squared: number;
        [k: string]: unknown;
      };
    };
    /**
     * Map of parcel name -> list of detected spectral peaks, each as [cf_hz, power_dB, bw_hz].
     */
    parcel_peaks: {
      [k: string]: [number, number, number][];
    };
    /**
     * Map of scalp electrode name -> top-K source parcel entries (forward model gain-weighted).
     */
    electrode_to_parcels: {
      [k: string]: {
        /**
         * DK-68 parcel name.
         */
        parcel: string;
        /**
         * Human-readable parcel display name.
         */
        parcel_nice?: string | null;
        /**
         * Summed absolute gain from the forward model for this electrode→parcel pair.
         */
        gain?: number | null;
        /**
         * Normalized contribution score (gain × peak_power proxy).
         */
        effective_score?: number | null;
        /**
         * SpecParam peaks for this parcel: list of [cf_hz, power_dB, bw_hz] triples.
         */
        peaks: [number, number, number][];
        /**
         * Other electrodes this parcel meaningfully contributes to.
         */
        also_contributes_to?: string[];
        [k: string]: unknown;
      }[];
    };
    /**
     * Total number of DK parcels that were source-localized (0 when insufficient_channels).
     */
    n_parcels: number;
    /**
     * Number of scalp channels in the cleaned signal that fed the DICS beamformer.
     */
    n_channels: number;
    /**
     * Recording condition (e.g. 'resting_eo', 'resting_ec').
     */
    condition: string;
    /**
     * Optional status flag. 'insufficient_channels' when montage cannot be source-localized; absent or 'ok' otherwise.
     */
    status?: string;
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
