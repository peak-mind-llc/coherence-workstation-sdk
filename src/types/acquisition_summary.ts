/**
 * Recording-acquisition facts for the clinical report's recording-parameters and technical-information paragraphs (SPEC-056 T1). Produced Workstation-side from the session manifest, substrate header, op-stack state and the Welch PSD artifact; nothing here is interpreted.
 */
export interface AcquisitionSummary {
  provenance: Provenance;
  data: {
    /**
     * Shape version of this summary. 1 is the SPEC-056 T1 shape.
     */
    schema_version: number;
    /**
     * Acquisition device, from the session manifest's recordingMeta.device, else the workspace's clinic-profile equipment. Null when neither is set.
     */
    amplifier?: string | null;
    /**
     * The software that produced the analysis.
     */
    software?: {
      name?: string;
      version?: string | null;
      /**
       * Installed MNE-Python version, read from package metadata.
       */
      mne_version?: string | null;
      [k: string]: unknown;
    } | null;
    /**
     * Montage target of the first recording in manifest order, e.g. standard_1020.
     */
    electrode_montage?: string | null;
    /**
     * Channel count from the first condition whose substrate header could be read.
     */
    channel_count?: number | null;
    /**
     * Sample rate from the first condition whose substrate header could be read.
     */
    sample_rate_hz?: number | null;
    /**
     * Session-level reference: the first condition's. Null when no condition carries an op-stack.
     */
    reference?: string | null;
    /**
     * Session-level filter: the first condition's. Null when no condition carries an op-stack.
     */
    filter?: {
      low_cut_hz?: number | null;
      high_cut_hz?: number | null;
      notch_hz?: number | null;
      [k: string]: unknown;
    } | null;
    /**
     * True when every condition's filter equals the session-level one, so the report may state a single filter for the whole recording.
     */
    filters_uniform?: boolean;
    /**
     * Sum of the per-condition counts. Null when no condition carries an op-stack.
     */
    ica_components_removed_total?: number | null;
    /**
     * Resting recordings from the session manifest, in manifest order.
     */
    conditions: {
      condition: string;
      /**
       * 1-based position in manifest order.
       */
      order: number;
      /**
       * Recorded duration from the substrate header.
       */
      duration_sec?: number | null;
      /**
       * Duration left after the applied epoch and vigilance masks, and on Inclusions the time outside the include spans (SPEC-060), are removed.
       */
      clean_duration_sec?: number | null;
      /**
       * Which marked spans the analysis used (SPEC-060): 'exclude' = the recording minus exclusions; 'include' = the include spans minus exclusions. Null when no op-stack was read.
       */
      mask_basis?: "exclude" | "include" | null;
      /**
       * Seconds of the recording outside the include spans (SPEC-060); 0 when analysis used exclusions; null when the duration is unknown.
       */
      outside_include_sec?: number | null;
      /**
       * Which op-stack slot the cleaning facts came from. Null when the condition has neither.
       */
      op_stack_tier?: "signed_off" | "draft" | null;
      reference?: string | null;
      filter?: {
        low_cut_hz?: number | null;
        high_cut_hz?: number | null;
        notch_hz?: number | null;
        [k: string]: unknown;
      } | null;
      ica_components_removed?: number | null;
      /**
       * Welch window length, n_fft divided by the sample rate. Null when the PSD artifact or the rate is missing.
       */
      epoch_length_sec?: number | null;
      /**
       * Whole epochs of epoch_length_sec that fit in clean_duration_sec.
       */
      epoch_count?: number | null;
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
