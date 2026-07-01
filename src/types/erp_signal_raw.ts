import type { Provenance } from './provenance';

/**
 * ERP-recording raw signal handle. Same shape as `SignalRaw` (signal.raw)
 * but namespaced to the ERP chain so the bus index doesn't collide with
 * the resting chain when both run in the same session.
 *
 * The `uri` points to a normalized FIF inside bus storage. Downstream
 * ERP producers consume this FIF only — they never see the source XDF/EDF/etc.
 */
export interface ErpSignalRaw {
  provenance: Provenance;
  data: {
    uri: string;
    format: 'fif';
    original_uri?: string;
    original_format?: string;
    n_channels: number;
    sfreq: number;
    duration_seconds: number;
    channel_names: string[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
