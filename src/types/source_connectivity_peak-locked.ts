/**
 * Peak-locked DICS source connectivity: flat list of (parcel, peak) entries with top-K dWPLI partners and connected/stranded/drifting classification. Faithful to plugins/ins/spectral-atlas/compute/producer.py SpectralAtlasProducer._build_connectivity_payload(). Pairs are deduplicated across electrodes — the same parcel+peak_index appears once regardless of how many scalp channels project to it.
 */
export interface SourceConnectivityPeakLocked {
  provenance: Provenance;
  data: {
    /**
     * Flat list of per-parcel-per-peak connectivity records, deduplicated by (parcel, peak_index).
     */
    peak_partners: {
      /**
       * DK-68 parcel name (e.g. 'precuneus-lh').
       */
      parcel: string;
      /**
       * Human-readable parcel display name.
       */
      parcel_nice?: string | null;
      /**
       * Zero-based index of this peak within the parcel's SpecParam peaks list.
       */
      peak_index: number;
      /**
       * Center frequency of this spectral peak (Hz).
       */
      cf: number | null;
      /**
       * Peak power (dB above aperiodic floor) of this spectral peak.
       */
      pw: number | null;
      /**
       * Canonical band label for this peak's center frequency (e.g. 'alpha', 'theta').
       */
      band: string | null;
      /**
       * Connectivity status: 'connected' (dWPLI >= threshold with >=1 partner), 'stranded' (no partners), or 'drifting' (nearest partner is outside drift tolerance).
       */
      status: string | null;
      /**
       * Count of parcels with dWPLI >= dwpli_threshold_used at this peak frequency.
       */
      n_partners: number;
      /**
       * Top-K partner parcels by dWPLI, sorted descending.
       */
      partners: {
        parcel?: string;
        parcel_nice?: string | null;
        dwpli?: number;
        cf?: number | null;
        band?: string | null;
        [k: string]: unknown;
      }[];
      /**
       * Center frequency (Hz) of the nearest partner peak when status='drifting'.
       */
      drift_nearest_freq?: number;
      /**
       * dWPLI of the nearest partner when status='drifting'.
       */
      drift_nearest_dwpli?: number;
      [k: string]: unknown;
    }[];
    /**
     * Maximum number of top partners reported per peak (TOP_PARTNERS constant from cw_eeg.source_specparam).
     */
    k: number;
    /**
     * Lower frequency bound used for dWPLI computation (Hz).
     */
    fmin_hz: number;
    /**
     * Upper frequency bound used for dWPLI computation (Hz).
     */
    fmax_hz: number;
    /**
     * Recording condition (e.g. 'resting_eo', 'resting_ec').
     */
    condition: string;
    /**
     * dWPLI threshold applied to classify connected vs. stranded peaks.
     */
    dwpli_threshold_used: number;
    /**
     * Frequency tolerance (Hz) used to classify a near-miss as 'drifting' vs. 'stranded'.
     */
    drift_tolerance_hz: number;
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
