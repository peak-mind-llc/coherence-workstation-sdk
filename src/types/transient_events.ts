/**
 * Time-domain morphology/burst events detected on the raw trace. One detector -> one transient.<type> artifact reusing this shape.
 */
export interface TransientEvents {
  provenance: Provenance;
  data: {
    detector: {
      id: string;
      version: string;
      /**
       * @minItems 2
       * @maxItems 2
       */
      band_hz: [number, number];
      channels: string[];
      [k: string]: unknown;
    };
    events: {
      type: string;
      channels: string[];
      start_s: number;
      end_s: number;
      confidence?: number;
      ratio_to_median?: number;
      metrics?: {
        [k: string]: number;
      };
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
