/**
 * Voice palette, metadata, and ordering constants.
 *
 * Mirrors cw_eeg/voice_catalog.py. Every visualization that names a voice
 * imports voiceColor() from here rather than hardcoding the palette.
 *
 * SPEC-013 §F lines 320-358; viz design doc lines 185-201.
 *
 * NOTE: hex values in VOICE_PALETTE are sacred — they are locked to
 * SPEC-013 and must mirror cw_eeg/voice_catalog.py exactly.
 */

export type VoiceId =
  | 'Bridge'
  | 'Feeler'
  | 'Deep Self'
  | 'Speaker'
  | 'Listener'
  | 'Planner'
  | 'Seer'
  | 'Witness';

export const VOICE_ORDER: VoiceId[] = [
  'Bridge',
  'Feeler',
  'Deep Self',
  'Speaker',
  'Listener',
  'Planner',
  'Seer',
  'Witness',
];

/* ------------------------------------------------------------------ */
/*  Locked palette (SPEC-013 §F lines 355-358; design doc Q7)         */
/* ------------------------------------------------------------------ */

export const VOICE_PALETTE: Record<VoiceId, string> = {
  Bridge: '#6BB6FF',
  Feeler: '#FF8A65',
  'Deep Self': '#B388FF',
  Speaker: '#4DD0B0',
  Listener: '#FFD54F',
  Planner: '#F06292',
  Seer: '#80CBC4',
  Witness: '#BDBDBD',
};

/** Color accessor for SVG / canvas / three.js consumers. */
export function voiceColor(voiceId: VoiceId | string): string {
  if (voiceId in VOICE_PALETTE) return VOICE_PALETTE[voiceId as VoiceId];
  return '#888888';
}

/* ------------------------------------------------------------------ */
/*  Static metadata — kept in sync with cw_eeg/voice_catalog.py        */
/* ------------------------------------------------------------------ */

export interface VoiceMetadata {
  voiceId: VoiceId;
  poeticName: string | null;
  anatomy: string;
  whatIsThis: string;
  prevalencePct19ch: number | null;
  prevalenceNote: string;
  validationStatus: 'solid' | 'exploratory';
}

export const VOICE_METADATA: Record<VoiceId, VoiceMetadata> = {
  Bridge: {
    voiceId: 'Bridge',
    poeticName: 'The Remembered Body',
    anatomy: 'Orbitofrontal cortex (medial + lateral) and frontal pole.',
    whatIsThis:
      'A coherence pattern centred on orbitofrontal cortex. Across cohorts the most stable basin — appears in roughly 92% of subjects at clinical channel densities. Interpretive label, not a diagnostic category.',
    prevalencePct19ch: 92,
    prevalenceNote: 'Most stable voice across cohorts.',
    validationStatus: 'solid',
  },
  Feeler: {
    voiceId: 'Feeler',
    poeticName: 'The Interoceptor',
    anatomy: 'Insula (bilateral) and anterior cingulate (caudal + rostral).',
    whatIsThis:
      'A coherence pattern in interoceptive insula and anterior cingulate. At 19-channel input it appears most often inside merged pairs with Speaker (18%) or Deep Self (62%). Interpretive label, not a diagnostic category.',
    prevalencePct19ch: null,
    prevalenceNote: 'Per-voice norms pending; appears in merged pairs at 19-ch.',
    validationStatus: 'solid',
  },
  'Deep Self': {
    voiceId: 'Deep Self',
    poeticName: 'The Relational Self',
    anatomy:
      'Posterior midline default-mode network: posterior cingulate, precuneus, inferior parietal (angular).',
    whatIsThis:
      'A coherence pattern in the posterior midline default-mode network. At 19-channel reports as the merged "Deep Self + Feeler" pair (~62%). Interpretive label, not a diagnostic category.',
    prevalencePct19ch: 62,
    prevalenceNote: 'Reported as a merged pair at 19-ch.',
    validationStatus: 'solid',
  },
  Speaker: {
    voiceId: 'Speaker',
    poeticName: 'The Embodied Interoceptor',
    anatomy:
      "Left perisylvian language network: left insula, left Heschl's gyrus, left superior temporal.",
    whatIsThis:
      'A left-lateralised coherence pattern over perisylvian language cortex. Reported as the merged "Speaker + Feeler" pair (~18%) at 19-channel; rises to ~69% at 123-channel. Interpretive label, not a diagnostic category.',
    prevalencePct19ch: 18,
    prevalenceNote: 'Merged pair at 19-ch; depth-of-recon limited.',
    validationStatus: 'solid',
  },
  Listener: {
    voiceId: 'Listener',
    poeticName: null,
    anatomy:
      "Right perisylvian network: right insula, right Heschl's gyrus, right superior temporal.",
    whatIsThis:
      'A right-lateralised coherence pattern mirroring Speaker. Per-voice norms pending — not yet broken out as a singleton in 19-ch DK-68 cohort summaries. Interpretive label, not a diagnostic category.',
    prevalencePct19ch: null,
    prevalenceNote: 'Per-voice norms pending.',
    validationStatus: 'solid',
  },
  Planner: {
    voiceId: 'Planner',
    poeticName: 'The Manager',
    anatomy:
      'Lateral prefrontal executive network: rostral / caudal middle frontal, superior frontal, frontal pole, pars triangularis / opercularis.',
    whatIsThis:
      'A lateral-prefrontal executive coherence pattern. Depth-of-recon limited at 19-channel (~45%); rises to ~88% at 123-channel. Interpretive label, not a diagnostic category.',
    prevalencePct19ch: 45,
    prevalenceNote: 'Rises substantially with channel density.',
    validationStatus: 'solid',
  },
  Seer: {
    voiceId: 'Seer',
    poeticName: 'The Embodied Observer',
    anatomy:
      'Early visual cortex: lateral occipital, cuneus, lingual, pericalcarine.',
    whatIsThis:
      'A coherence pattern over early visual cortex. Improves to ~74% at 123-channel from ~61% at 19-channel. Interpretive label, not a diagnostic category.',
    prevalencePct19ch: 61,
    prevalenceNote: 'Stable across cohorts; depth-limited at 19-ch.',
    validationStatus: 'solid',
  },
  Witness: {
    voiceId: 'Witness',
    poeticName: null,
    anatomy:
      'Ventral visual stream and collateral sulci: fusiform, lingual, lateral occipital, inferior temporal.',
    whatIsThis:
      'A coherence pattern over ventral visual stream. Most tenuous DK-68 distinction (heavy overlap with Seer); first place validation is expected to surface threshold-tuning needs. Interpretive label, not a diagnostic category.',
    prevalencePct19ch: null,
    prevalenceNote: 'Per-voice norms pending; tenuous DK-68 distinction.',
    validationStatus: 'exploratory',
  },
};
