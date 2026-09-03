/**
 * Which seconds of a resting recording are valid for QEEG analysis (SPEC-054). Faithful to cw_eeg/producers/vigilance_validity.py. This is a data-quality gate, NOT a sleep stager: it reports no vigilance stage, and none should be inferred from it. Two rules produce the verdict. In eyes-closed, stretches with no detected posterior alpha peak are excluded locally and the recording continues. In either condition a vertex wave or K-complex at Cz truncates: everything after the first one is excluded however alert it looks, because sleep pressure within a session does not reverse. Replaces vigilance.staging as the artifact the quality verdict and the analysis mask derive from.
 */
export interface VigilanceValidity {
  provenance: Provenance;
  data: {
    /**
     * False when the condition is neither eyes-open nor eyes-closed, so neither criterion applies. Consumers must treat this as 'do not offer the feature' rather than defaulting to a criterion built for the other condition.
     */
    available: boolean;
    condition_kind: "ec" | "eo" | null;
    /**
     * Why the check is unavailable. Present only when available is false.
     */
    reason?: string;
    /**
     * Share of the recording that can be analysed, 0-1.
     */
    valid_fraction: number;
    valid_sec: number;
    total_sec: number;
    epoch_sec?: number;
    step_sec?: number;
    /**
     * Intervals to keep, as [start_sec, end_sec].
     */
    valid_segments: [number, number][];
    /**
     * Intervals to drop, each naming the rule that dropped it so a clinician looking at a retention figure can see which rule did the cutting.
     */
    excluded_segments: {
      start_sec: number;
      end_sec: number;
      rule: "alpha_absent" | "unmeasurable" | "after_transient" | "before_transient" | "too_short";
      /**
       * Human-readable form of rule.
       */
      label?: string;
      [k: string]: unknown;
    }[];
    /**
     * Where the recording stops being used, or null. Sits a backward margin EARLIER than the transient that caused it — surfaces showing a moment against the trace want the transient time, not this.
     */
    truncation_point_sec: number | null;
    /**
     * Whether the alpha criterion could grade this recording, and why or why not. Reports unavailable rather than valid when it cannot: reading 'no alpha' as 'fine' was the failure of the model this replaces.
     */
    alpha_route?: {
      available?: boolean;
      coverage?: number;
      measured_epochs?: number;
      reason?: string;
      [k: string]: unknown;
    };
    /**
     * Vertex waves and K-complexes at Cz. Both count identically for this gate — each means the subject left wakefulness — and the distinction between them belongs to the AI Technician, which describes what is on the trace.
     */
    transients?: {
      start_sec: number;
      end_sec: number;
      type?: string | null;
      channel?: string | null;
      [k: string]: unknown;
    }[];
    quality?: {
      rating?: "good" | "fair" | "poor" | "unusable" | "unavailable";
      recommend_rerecord?: boolean;
      headline?: string;
      detail?: string;
      [k: string]: unknown;
    };
    /**
     * Top-level mirror of quality.rating. The catalog DSL resolves artifact.field and not nested paths, and several rules gate on whether the recording was predominantly usable.
     */
    quality_rating?: "good" | "fair" | "poor" | "unusable" | "unavailable";
    /**
     * The rules in play, in plain language, each marked with whether it did anything to THIS recording. Authored in the producer so the explanation a clinician reads cannot drift from the code that made the decision.
     */
    rules?: {
      id: string;
      label: string;
      detail: string;
      applies: boolean;
      note?: string | null;
      [k: string]: unknown;
    }[];
    epochs?: {
      start_sec?: number;
      end_sec?: number;
      /**
       * Start of the slice this epoch speaks for. Windows overlap several deep, so a verdict covers the step-wide slice at the window's centre; crediting it the full window width multiplies every isolated disagreement.
       */
      span_start_sec?: number;
      span_end_sec?: number;
      /**
       * null means the epoch could not be measured, which is a different claim from 'no alpha here' and justifies neither keeping nor dropping on its own.
       */
      alpha_present?: boolean | null;
      alpha_peak_hz?: number | null;
      frontal_alpha_present?: boolean | null;
      band?: "valid" | "borderline" | "excluded";
      rule?: string | null;
      [k: string]: unknown;
    }[];
    /**
     * The parameters this verdict was produced under, so a stored artifact can be read back knowing what it meant.
     */
    policy?: {
      backward_sec?: number;
      min_exclusion_run_sec?: number;
      min_retained_segment_sec?: number;
      alpha_route_min_coverage?: number;
      epoch_sec?: number;
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
