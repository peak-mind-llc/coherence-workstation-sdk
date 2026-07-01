/**
 * Per-recording montage metadata describing how a session's recordings
 * were prepared for downstream analysis (channel count, montage ID,
 * downsampling status, clinical tier, optional per-session slot
 * bindings). Promoted to the workstation SDK in SPEC-021 Wave 1;
 * extended in the montage builder work for definition-ID metadata +
 * Flex slot assignments (Phase A) and ``clinicalTier`` (Phase B).
 */

export interface MontageMetadata {
  originalChannelCount: number;

  /** Definition ID from the montage registry (Phase A). New code should
   *  read this. Always populated on metadata written after Phase A. */
  montageId?: string;

  /** Per-session slot bindings for slot-layout definitions (e.g. BrainBit
   *  Flex). Maps slot ID (`ch1`..`ch4`) to a 10-10 site name. Only
   *  populated when the active definition is slot-layout. */
  channelAssignments?: Record<string, string>;

  /** @deprecated Use `montageId`. Retained for one release for back-compat
   *  with metadata written before Phase A. The two legacy values
   *  (`standard_1020`, `standard_1020_37`) map onto the corresponding
   *  `*_av` system definitions. */
  montageTarget: 'standard_1020' | 'standard_1020_37';

  downsampled: boolean;
  /** Clinical tier of the active montage. Drives the MontageBanner
   *  "research" pill and the normative-comparison refusal. Sessions
   *  written before Phase B default to 'norm-supported' when read. */
  clinicalTier?: 'norm-supported' | 'research';
}
