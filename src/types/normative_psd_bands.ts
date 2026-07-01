/**
 * Per-channel-per-frequency normative PSD curves (mean and SD) for an age bin and condition. Consumed by spectrum renderers to draw the ±1σ / ±2σ shaded band overlay behind the patient's PSD line.
 */
export interface NormativePsdBands {
  provenance: Provenance;
  data: {
    /**
     * Normative age bin (e.g. '30-39').
     */
    age_bin: string;
    /**
     * Recording condition (e.g. 'eo', 'ec').
     */
    condition: string;
    /**
     * Name of the normative reference (e.g. 'Open Normative').
     */
    reference_name?: string;
    /**
     * Frequency axis in Hz.
     */
    freqs: number[];
    /**
     * Channel names; outer axis of mean/sd matrices.
     */
    ch_names: string[];
    /**
     * Per-channel-per-frequency normative mean PSD in log10(µV²/Hz). Shape: (n_channels, n_freqs).
     */
    mean: number[][];
    /**
     * Per-channel-per-frequency normative SD in log10(µV²/Hz). Shape: (n_channels, n_freqs).
     */
    sd: number[][];
    /**
     * Sample size of the normative cohort for this age_bin × condition cell.
     */
    n?: number;
    /**
     * Format version of the underlying norms_psd.npz. 1 = mean/sd/n only. 2 = v1 fields plus per-frequency percentile arrays (percentile_points, percentiles) and normality_p, enabling distribution-honest ribbon overlays in the renderer. Absent when the underlying bundle is v1.
     */
    psd_format_version?: number;
    /**
     * v2 only. Percentile points (e.g. [0.5, 1, 2.5, 5, 10, 25, 50, 75, 90, 95, 97.5, 99, 99.5]) for the per-frequency percentile boundaries. Shape: (n_points,). Absent when v1.
     */
    percentile_points?: number[];
    /**
     * v2 only. Per-channel × per-frequency × per-percentile-point normative boundary values in log10(µV²/Hz) (same space as mean/sd). Shape: (n_channels, n_freqs, n_points). Consumed by the renderer to draw distribution-honest percentile ribbons (e.g. p2.5-p97.5, p10-p90, p25-p75) and compute the patient's robust-z on hover. Absent when v1.
     */
    percentiles?: number[][][];
    /**
     * v2 only. Per-channel × per-frequency Shapiro-Wilk p-value of the normative distribution in log10(µV²/Hz) space. p < 0.05 indicates a non-normal distribution where the parametric ±σ math is unreliable; the renderer surfaces this as a per-cell cue. Shape: (n_channels, n_freqs). Absent when v1.
     */
    normality_p?: number[][];
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
