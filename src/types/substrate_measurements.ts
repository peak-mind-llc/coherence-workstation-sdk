/**
 * Normative envelope of expected PSD across the fit range; null if no norms apply.
 *
 * Patched in SPEC-026 T14: json2ts emits this as
 * `{...} & ({...} | null)` which TypeScript collapses to `never` for the
 * null branch (intersection of object with null is unsatisfiable). The
 * spec explicitly allows null (norms unavailable for the subject's age
 * range, single-condition recordings) and `AcrossScaleEntry.norm_envelope`
 * must accept it. Re-emit as a plain `{...} | null` so consumers can
 * write `entry.norm_envelope = null` without a type assertion.
 */
export type NormEnvelopeScale =
  | ({
      freqs_hz: number[];
      p10_db: number[];
      p50_db: number[];
      p90_db: number[];
      [k: string]: unknown;
    })
  | null;
export type NormEnvelopeScale1 = NormEnvelopeScale;
/**
 * Normative envelope for head-mean slope distribution; null if no norms apply.
 *
 * Patched in SPEC-026 T14: same `& null` collapse as NormEnvelopeScale above.
 */
export type NormEnvelopeSpace =
  | ({
      p10: number;
      p50: number;
      p90: number;
      [k: string]: unknown;
    })
  | null;
export type NormEnvelopeSpace1 = NormEnvelopeSpace;

/**
 * Substrate page measurement bundle. Four-axis decomposition (across scale / space / time / state) of EEG measurements plus per-channel figure-on-ground PSD decomposition. The clinical verdict surface (axis_status, fragment_locations, first_line) is in the sibling substrate.read artifact. Public substrate; see SPEC-029 for the split rationale. Schema version: substrate.measurements.v1.
 */
export interface SubstrateMeasurements {
  provenance: Provenance;
  data: {
    schema_version: "substrate.measurements.v1";
    meta: {
      /**
       * Subject age in years; null if unknown (graceful degradation).
       */
      subject_age_years?: number | null;
      /**
       * Line noise frequency for the recording (50 or 60 Hz).
       */
      line_freq_hz: number;
      /**
       * Identifier of the norms reference used; null if no norms applied.
       */
      norms_version?: string | null;
      /**
       * Per-condition recording metadata. Keys are condition codes (e.g. 'EC', 'EO'). Both keys are optional — single-condition recordings are valid.
       */
      conditions: {
        EC?: ConditionMeta;
        EO?: ConditionMeta;
        // Patched in SPEC-026 T13: index signature widened to accept the
        // `EC?`/`EO?` optional members above (json2ts emitted these without
        // `| undefined` and TS rejects the optional-vs-required mismatch).
        [k: string]: ConditionMeta | undefined;
      };
      /**
       * 2D projected channel positions for topomap rendering.
       */
      channel_positions?: {
        name: string;
        x: number;
        y: number;
        [k: string]: unknown;
      }[];
      /**
       * Non-fatal warnings raised during bundle computation.
       */
      compute_warnings?: string[];
      [k: string]: unknown;
    };
    across_scale: {
      /**
       * Keyed by condition code (EC, EO). Both optional — single-condition recordings valid.
       */
      per_condition: {
        EC?: AcrossScaleEntry;
        EO?: AcrossScaleEntry;
        // Patched in SPEC-026 T13: see `meta.conditions` for rationale.
        [k: string]: AcrossScaleEntry | undefined;
      };
      [k: string]: unknown;
    };
    across_space: {
      /**
       * Keyed by condition code (EC, EO). Both optional.
       */
      per_condition: {
        EC?: AcrossSpaceEntry;
        EO?: AcrossSpaceEntry;
        // Patched in SPEC-026 T13: see `meta.conditions` for rationale.
        [k: string]: AcrossSpaceEntry | undefined;
      };
      [k: string]: unknown;
    };
    across_time: {
      /**
       * Keyed by condition code (EC, EO). Both optional.
       */
      per_condition: {
        EC?: AcrossTimeEntry;
        EO?: AcrossTimeEntry;
        // Patched in SPEC-026 T13: see `meta.conditions` for rationale.
        [k: string]: AcrossTimeEntry | undefined;
      };
      [k: string]: unknown;
    };
    across_state: {
      trajectory_points: {
        label: string;
        condition: string;
        segment_idx: number;
        head_mean_slope: number;
        norm_p10?: number | null;
        norm_p50?: number | null;
        norm_p90?: number | null;
        [k: string]: unknown;
      }[];
      deltas: {
        from: string;
        to: string;
        delta: number;
        direction_norm_match: boolean;
        [k: string]: unknown;
      }[];
      /**
       * Delta between conditions (e.g. EC vs EO head-mean slope). Null if only one condition present.
       */
      between_condition_delta?: number | null;
      /**
       * Normative band for the between-condition delta as [lo, hi]. Null if no norms apply.
       *
       * @minItems 2
       * @maxItems 2
       */
      norm_between_condition_delta_band?: [number, number] | null;
      [k: string]: unknown;
    };
    figure_on_ground: {
      /**
       * Keyed by channel name. No fixed channel list.
       */
      per_channel: {
        [k: string]: {
          freqs_hz: number[];
          psd_db: number[];
          aperiodic_db: number[];
          peaks: Peak[];
          [k: string]: unknown;
        };
      };
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
export interface ConditionMeta {
  duration_s: number;
  windows_kept: number;
  windows_dropped: number;
  [k: string]: unknown;
}
export interface AcrossScaleEntry {
  freqs_hz: number[];
  psd_db: number[];
  aperiodic_fit: AperiodicFit;
  peaks: Peak[];
  norm_envelope?: NormEnvelopeScale;
  [k: string]: unknown;
}
export interface AperiodicFit {
  slope_below_knee: number;
  slope_above_knee: number;
  knee_hz: number;
  r_squared: number;
  /**
   * @minItems 2
   * @maxItems 2
   */
  fit_freq_range_hz: [number, number];
  [k: string]: unknown;
}
export interface Peak {
  center_hz: number;
  height_db: number;
  /**
   * Optional band label (e.g. 'theta', 'alpha', 'beta', 'gamma') or empty string.
   */
  label?: string;
  [k: string]: unknown;
}
export interface AcrossSpaceEntry {
  per_channel: {
    name: string;
    slope: number;
    knee_hz?: number | null;
    r_squared: number;
    z_from_head_mean: number;
    in_norm_band: boolean;
    [k: string]: unknown;
  }[];
  head_mean_slope: number;
  max_abs_z_deviation: number;
  norm_envelope?: NormEnvelopeSpace;
  [k: string]: unknown;
}
export interface AcrossTimeEntry {
  window_centers_s: number[];
  frontal_slope_series: number[];
  posterior_slope_series: number[];
  frontal_subject_sd: number;
  posterior_subject_sd: number;
  estimation_noise_sd: number;
  frontal_unstable: boolean;
  posterior_unstable: boolean;
  [k: string]: unknown;
}
