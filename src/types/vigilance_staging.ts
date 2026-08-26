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
      /**
       * Why the classifier reached this stage, in plain language, quoting the measurement that decided it against the threshold it was compared to (v0.10.0). Produced by classify_epoch_explained and NOT re-derived by consumers — a second copy of the decision tree would drift.
       */
      stage_reason?: string;
      /**
       * Present only when a post-processing pass (§7) overruled the classifier, naming which one and what it changed (v0.10.0). The stage on screen is frequently NOT the one classify_epoch chose, so without this a reader sees a reason describing a decision that was then overridden. Null when the classifier's own call survived.
       */
      stage_override?: string | null;
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
      /**
       * Per-epoch posterior alpha power divided by the epoch's own fitted aperiodic background (v0.9.0). 1.0 means the alpha band sits ON its background — no rhythm. This, not summed alpha power, is what 'alpha present' now tests.
       */
      alpha_peak_prominence?: (number | null)[];
      /**
       * Continuous position on the alert-to-sleep-onset axis, 0.0 to 1.0 (v0.9.0). Emitted ALONGSIDE the stage labels, never instead of them; nothing consumes it yet. Exists so a reviewer can correlate hand-scored recordings against a smooth quantity rather than bins. Its weights are unfitted guesses — see CAP-03 §12.12.
       */
      vigilance_index?: (number | null)[];
      [k: string]: unknown;
    };
    calibration?: {
      alpha_threshold_uv2?: number;
      theta_delta_threshold_uv2?: number;
      method?: string;
      /**
       * Posterior alpha/theta value below which alpha counts as present-but-not-dominant, forcing A3 (v0.8.0). Either the fixed floor or a subject-scaled bar; see alpha_dominance_source.
       */
      alpha_dominance_threshold?: number;
      /**
       * Where the alpha-dominance bar came from. 'fixed_floor' is the universal 0.5 constant and the default. 'subject_trait' scales it to the subject's own condition-matched history (CAP-03 §12.11) and is opt-in, uncalibrated.
       */
      alpha_dominance_source?: "fixed_floor" | "subject_trait";
      /**
       * The subject's typical-best posterior alpha/theta that scaled the bar, or null when the fixed floor was used.
       */
      trait_alpha_dominance?: number | null;
      [k: string]: unknown;
    };
    /**
     * Sleep transients detected once over the CONTINUOUS recording and mapped onto epochs by time overlap (v0.7.0). Spindles and K-complexes come from the shared cw_eeg.transients detectors that also produce transient.sleep_spindle / transient.k_complex, so the stager and the catalog findings cannot disagree about what is on the trace. Spindles additionally require corroboration on a second central channel. Either transient marks the epoch Stage C. Absent on artifacts written before 0.7.0, where the detectors could not fire at all and stages B1/B2-3/C read 0% in every recording.
     */
    sleep_events?: {
      spindles?: EventFamily;
      k_complexes?: EventFamily;
      sem?: EventFamily;
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
    /**
     * Which ocular reference the slow-eye-movement search used (v0.9.0). Load-bearing, not decoration: under 'frontal_proxy' or 'none' an empty sem list means we could not look, NOT that the subject held still — so Stage B1 at 0% must not be read as evidence of alertness. 'ocular_ic' is frequently unavailable in eyes-closed recordings, which is where it is most needed: slow eye movements are an eyes-closed phenomenon, and with the eyes shut there are few blinks for ICA to build a strong ocular component from.
     */
    eog_source?: "eog_channel" | "ocular_ic" | "frontal_proxy" | "none";
    /**
     * Recording-quality verdict. quality_rating, recommend_rerecord and recommend_epoch_selection derive from alert_percent (v0.9.0+), NOT from a1_percent.
     */
    quality_metrics?: {
      /**
       * Literally the Stage A1 share. NOT the alert share in eyes-open.
       */
      a1_percent?: number;
      a1_a2_percent?: number;
      /**
       * Share of the recording in an alert state FOR THIS CONDITION (v0.9.0). In eyes-open the alert state is Stage 0, not A1, so rating a recording on its A1 share alone condemns a perfectly good eyes-open recording.
       */
      alert_percent?: number;
      /**
       * Stages counted as alert: ['0','A1'] eyes-open, ['A1'] eyes-closed.
       */
      alert_stages?: string[];
      alert_epoch_count?: number;
      quality_rating?: "good" | "moderate" | "poor" | "unknown";
      recommend_rerecord?: boolean;
      recommend_epoch_selection?: boolean;
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
/**
 * One family of detected sleep transients: how many, and when.
 */
export interface EventFamily {
  count: number;
  /**
   * [start_s, end_s] per event, merged across channels so one transient seen on three derivations counts once.
   */
  times_sec: [number, number][];
  [k: string]: unknown;
}
