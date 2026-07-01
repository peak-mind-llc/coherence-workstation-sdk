/**
 * Per-condition gamma-arc fit + residual peak detection. Faithful to plugins/ins/erp/compute/producer.py ErpArcparamProducer.compute() emission. conditions values are null when detect_arcparam_for_evoked returns None (degenerate/pathological arc fit).
 */
export interface ErpArcparamPerCondition {
  provenance: Provenance;
  data: {
    /**
     * Paradigm identifier from the evoked artifact (e.g. 'oddball', 'go_nogo').
     */
    paradigm_id: string;
    /**
     * Map of condition key -> per-condition arcparam result. Value is null when the arc fit failed.
     */
    conditions: {
      [k: string]: null | {
        /**
         * Always 'arcparam_headline'.
         */
        engine: string;
        /**
         * Gamma envelope fit parameters and derived waveform.
         */
        arc_fit: {
          /**
           * Always 'gamma' for iterative_decompose output.
           */
          best_model: string;
          /**
           * Arc-only R² (temporal coherence index) — gamma fit goodness-of-fit.
           */
          tci: number;
          /**
           * R² including the floor term.
           */
          combined_r2: number;
          /**
           * Latency (ms post-stimulus) of the gamma arc peak.
           */
          peak_latency_ms: number;
          /**
           * GFP amplitude (µV) at the arc peak.
           */
          peak_amplitude_uv: number;
          /**
           * Arc decay constant (ms) from the falling half.
           */
          decay_const_ms: number;
          /**
           * Gamma scale parameter tau in milliseconds.
           */
          tau_ms: number;
          /**
           * Gamma shape parameter n.
           */
          n: number;
          /**
           * Floor offset C of the fitted gamma (µV).
           */
          floor_uv: number;
          /**
           * True when any optimizer parameter parked at a bound (degenerate fit).
           */
          fit_at_bounds: boolean;
          /**
           * Which parameters hit a bound: 'n_max', 'n_min', 'tau_min', 'tau_max'.
           */
          fit_at_bounds_params: string[];
          /**
           * Reconstructed arc waveform values (µV, post-stim only).
           */
          arc_waveform: number[];
          /**
           * Latency axis matching arc_waveform (ms post-stimulus).
           */
          arc_times_ms: number[];
          /**
           * Phase inflection landmarks derived from (n, tau): phases list + rising/falling ms.
           */
          arc_phases: {
            phases: {
              key: string;
              label: string;
              tmin_ms: number;
              tmax_ms: number;
              [k: string]: unknown;
            }[];
            rising_inflection_ms: number;
            falling_inflection_ms: number;
            [k: string]: unknown;
          };
          [k: string]: unknown;
        };
        /**
         * SVD spatial components extracted from the per-condition Evoked.
         */
        ics: {
          /**
           * Zero-based SVD component index.
           */
          idx: number;
          /**
           * Human-readable topographic descriptor (e.g. 'parietal-positive').
           */
          descriptor: string;
          /**
           * Fraction of total variance explained by this SVD component.
           */
          var_explained: number;
          /**
           * Per-channel weights for this SVD component.
           */
          spatial_pattern: number[];
          /**
           * Singular-value-scaled time course for this component.
           */
          time_course: number[];
          source_attribution?: null | {
            /**
             * @minItems 3
             * @maxItems 3
             */
            peak_mni?: [number, number, number];
            peak_parcel_label?: string;
            peak_parcel?: {
              [k: string]: unknown;
            };
            peak_ba?: {
              [k: string]: unknown;
            };
            top_parcels?: {
              [k: string]: unknown;
            }[];
            source_power?: number[];
            [k: string]: unknown;
          };
          [k: string]: unknown;
        }[];
        /**
         * Residual peaks detected after arc subtraction, with labeling and source attribution.
         */
        peaks: {
          /**
           * Peak latency in milliseconds post-stimulus.
           */
          latency_ms: number;
          /**
           * Residual GFP amplitude above the arc (µV); negative for inverted peaks.
           */
          residual_amp_uv: number;
          /**
           * scipy.signal peak prominence (µV).
           */
          prominence_uv: number;
          /**
           * Full width at half maximum (ms); null when width cannot be computed.
           */
          fwhm_ms?: null | number;
          /**
           * Peak's position relative to arc peak in decay-constant units.
           */
          arc_phase?: null | number;
          /**
           * Ratio of residual amplitude to arc peak amplitude.
           */
          arc_relative_amp?: null | number;
          /**
           * FWHM normalized by arc decay constant.
           */
          arc_relative_width?: null | number;
          /**
           * Arc waveform value at this peak's latency (µV).
           */
          arc_carrier_uv?: number;
          /**
           * Arc carrier / arc peak amplitude (0–1 engagement scale).
           */
          engagement?: null | number;
          /**
           * Residual amplitude / arc carrier; null for pre-mobilization peaks.
           */
          boost_ratio?: null | number;
          /**
           * True when the peak falls before the arc has meaningfully risen (engagement < 0.05).
           */
          is_pre_mobilization: boolean;
          /**
           * Traditional ERP label assigned after all three gates pass (N1, P3b, etc.); '—' when unlabeled.
           */
          candidate_label: string;
          /**
           * Prominence qualifier for the label (e.g. 'moderate'); empty string when unlabeled.
           */
          candidate_prominence: string;
          /**
           * True when label was assigned via polarity-inverted topography rescue.
           */
          is_inverted: boolean;
          /**
           * Scaling factor applied to candidate-label windows (1.0 = no scaling).
           */
          arc_label_scale: number;
          /**
           * Why the scale was or was not applied: 'applied', 'disabled', 'skipped_low_r2', 'skipped_pathological_fit'.
           */
          arc_label_scale_reason: string;
          /**
           * True when the peak precedes the arc-domain onset and a cognitive label was suppressed.
           */
          pre_arc_domain: boolean;
          /**
           * Computed arc-domain onset latency (ms) used for Gate 2.
           */
          arc_domain_onset_ms: number;
          /**
           * True when the topography gate (Rule 3) blocked the candidate label.
           */
          topo_gate_failed: boolean;
          /**
           * Burst tag for adjacent same-label peaks, e.g. ' (1/2)'; empty when not a burst.
           */
          burst_marker: string;
          /**
           * AODEMR processing stage for this peak's latency (e.g. 'O', 'D', 'E', 'M', 'R').
           */
          aodemr_stage: null | string;
          /**
           * Arc-derived phase label: 'mobilizing', 'peak', 'returning', 'settling'.
           */
          arc_phase_label: null | string;
          /**
           * Per-channel scalp voltage at this peak's latency (µV).
           */
          topomap: number[];
          /**
           * Index of the best-matching SVD IC (-1 when no match).
           */
          best_ic_idx: number;
          /**
           * Spatial correlation with the best-matching IC.
           */
          best_ic_corr: number;
          /**
           * Normalized temporal activation of the best IC at this peak's time.
           */
          best_ic_temporal_act: number;
          /**
           * Hybrid spatial×temporal match score for the best IC.
           */
          best_ic_hybrid_score: number;
          /**
           * Topographic descriptor of the best-matching IC; null when best_ic_idx == -1.
           */
          best_ic_descriptor?: null | string;
          /**
           * Shape coherence quality metric (0–1).
           */
          shape_coherence: number;
          /**
           * Shape symmetry metric (0–1).
           */
          shape_symmetry: number;
          /**
           * Shape unimodality metric (0–1).
           */
          shape_unimodality: number;
          /**
           * Expected canonical generator region for this label (null when unlabeled).
           */
          expected_generator?: string | null;
          /**
           * Whether the best IC descriptor matches the expected generator; null when unlabeled.
           */
          generator_matches_expectation: boolean | null;
          /**
           * Whether an ICA cross-engine agreed on this peak (filled by orchestrator).
           */
          ica_confirmed: boolean;
          /**
           * Latency offset (ms) from ICA cross-validation; null when not confirmed.
           */
          ica_latency_offset_ms?: null | number;
          /**
           * Topographic descriptor from ICA cross-validation; null when not confirmed.
           */
          ica_descriptor?: null | string;
          /**
           * Agreement status: 'arcparam_only', 'ica_confirmed', 'ica_conflict'.
           */
          cross_engine_agreement: string;
          /**
           * Plain-English clinician-readable interpretation of this peak.
           */
          interpretation: string;
          source_attribution?: null | {
            /**
             * @minItems 3
             * @maxItems 3
             */
            peak_mni?: [number, number, number];
            peak_parcel_label?: string;
            peak_parcel?: {
              [k: string]: unknown;
            };
            peak_ba?: {
              [k: string]: unknown;
            };
            top_parcels?: {
              [k: string]: unknown;
            }[];
            source_power?: number[];
            [k: string]: unknown;
          };
          /**
           * Rich arc-phase-driven label from attach_component_labels (additive; legacy candidate_label unchanged).
           */
          component_label?: {
            [k: string]: unknown;
          };
          /**
           * True when a duplicate label was suppressed in favour of a higher-amplitude sibling.
           */
          dedup_suppressed?: boolean;
          /**
           * Derived topographic hotspot string added by attach_component_labels.
           */
          topography_hotspot?: string | null;
          /**
           * Polarity derived from residual_amp_uv sign: 'positive' or 'negative'.
           */
          polarity?: string | null;
          [k: string]: unknown;
        }[];
        /**
         * Plain-English clinician-readable summary of the arc fit and peak findings.
         */
        assessment_paragraph: string;
        /**
         * Channel names from the source Evoked (matches spatial_pattern length in ICs and topomap length in peaks).
         */
        channels: string[];
        /**
         * MNI/sensor position [x, y, z] for each channel (for frontend topomap rendering).
         */
        channel_positions: [number, number, number][];
        [k: string]: unknown;
      };
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
