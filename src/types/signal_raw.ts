/**
 * Normalized recording artifact: reference to an MNE-FIF inside the bus, normalized from any source format. Downstream producers consume the FIF only — they never see source formats.
 */
export interface SignalRaw {
  provenance: Provenance;
  data: {
    /**
     * file:// URI to the normalized FIF inside bus storage. Always loadable via mne.io.read_raw_fif. Downstream consumers MUST use this rather than reaching out to the source file.
     */
    uri: string;
    /**
     * Always 'fif' after normalization. Source format is recorded in original_format for provenance.
     */
    format: "fif";
    /**
     * file:// URI to the source recording (for provenance only — do not load directly)
     */
    original_uri?: string;
    /**
     * On-disk format of the source recording (for provenance and audit trails)
     */
    original_format?: "xdf" | "edf" | "fif" | "set" | "nfx" | "vhdr";
    n_channels: number;
    sfreq: number;
    duration_seconds: number;
    channel_names: string[];
    /**
     * Free-form metadata captured at acquisition (manufacturer, device serial, etc.)
     */
    acquisition_metadata?: {
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
