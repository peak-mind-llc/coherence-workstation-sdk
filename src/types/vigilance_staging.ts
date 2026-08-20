/**
 * Per-epoch Loomis vigilance staging. Faithful to cw_eeg/producers/vigilance_staging.py emission. dominant_state (v0.2.0) is the derived argmax of stage_distribution by count; null when the recording is too short to stage. analysis_windows (v0.6.0) carries the alert intervals an analysis should keep and the complement it should drop.
 */
export interface VigilanceStaging {
  provenance: Provenance;
  data: {
    epoch_length_sec: number;
    epoch_overlap: number;
    n_epochs: number;
    recording_duration_sec?: number;
    /**
     * Stage with the most epochs ('0'|'A1'|'A2'|'A3'|'B1'|'B2/3'|'C'); null if unstaged
     */
    dominant_state: string | null;
    epoch_classifications: {
      epoch_idx: number;
      time_start_sec: number;
      time_end_sec: number;
      stage: string;
      confidence: number;
      features?: {
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }[];
    /**
     * stage -> {count, percent, duration_sec}
     */
    stage_distribution: {
      [k: string]: {
        count: number;
        percent?: number;
        duration_sec?: number;
        [k: string]: unknown;
      };
    };
    transitions: {
      from?: string;
      to?: string;
      time_sec?: number;
      [k: string]: unknown;
    }[];
    continuous_features: {
      anteriorization_index?: (number | null)[];
      alpha_theta_ratio?: (number | null)[];
      peak_alpha_freq?: (number | null)[];
      posterior_alpha_power?: (number | null)[];
      frontal_alpha_power?: (number | null)[];
      epoch_times_sec?: number[];
      [k: string]: unknown;
    };
    calibration?: {
      alpha_threshold_uv2?: number;
      theta_delta_threshold_uv2?: number;
      method?: string;
      [k: string]: unknown;
    };
    /**
     * Alert intervals an analysis should keep and the complement it should drop (v0.6.0). available=false when the condition kind is unknown or nothing was staged.
     */
    analysis_windows?: {
      policy?: {
        condition_kind?: string | null;
        alert_stages?: string[];
        deep_stages?: string[];
        recovery_sec?: number;
        [k: string]: unknown;
      };
      alert: [number, number][];
      excluded: [number, number][];
      recovery?: [number, number][];
      retained_sec?: number;
      total_sec?: number;
      available: boolean;
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
