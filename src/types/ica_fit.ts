/**
 * Fitted ICA decomposition committed at prep sign-off; consumed by signal.descriptive to apply rejected_components from rejection.policy.
 */
export interface ICAFit {
  provenance: Provenance;
  data: {
    /**
     * file:// URI to the ICA FIF. Loadable via mne.preprocessing.read_ica.
     */
    uri: string;
    /**
     * Always 'ica-fif' — MNE's native ICA serialization format.
     */
    format: "ica-fif";
    /**
     * Number of ICA components in the decomposition.
     */
    n_components: number;
    /**
     * Channel names the ICA was fit on. Must match the apply-time channel set.
     */
    ch_names: string[];
    /**
     * ICA fit method (e.g. infomax, picard, fastica). Informational only.
     */
    method?: string;
    /**
     * Un-clipped fit-substrate FIF; basis-consistent get_sources(). SPEC-031 W4.
     */
    fit_substrate_uri?: string;
    /**
     * Optional ICLabel auto-classification results.
     */
    iclabel?: {
      labels?: string[];
      y_pred_proba?: number[];
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
