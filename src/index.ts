/**
 * Coherence Workstation instrument-mode plugin SDK (TypeScript).
 *
 * Public API — platform + substrate surface only. As of SPEC-029 the
 * private-clinical surface (synthesis/, longitudinal/, findings inference +
 * proposed-finding, the peak-annotation workflow, erp_voice_portrait) lives
 * in the closed `@coherence/clinical-sdk`. This package must never import it;
 * `scripts/check_sdk_public_boundary.py` enforces that in CI.
 *
 * `package.json` keeps `"private": true` until PLAN-oss-ramp Stage 5/6 readies
 * the package for OSS publication (READMEs, LICENSE, per-package CI). The
 * surface is now IP-clean; the flag is a release gate, no longer a leak guard.
 */

export type { SignalRaw } from './types/signal_raw';
export type { RejectionPolicy } from './types/rejection_policy';
export type { PsdWelchPerChannel } from './types/psd_welch_per_channel';
export type { Provenance } from './types/provenance';

// Signal viewer types (UI/rendering shapes — promoted in SPEC-021 Wave 1)
export type {
  WindowedSignalData,
  SignalWindowResponse,
  MontageKey,
  ProcessedPhysioChannel,
  FilterState,
} from './types/signal_viewer';

// Montage metadata (promoted in SPEC-021 Wave 1) — describes per-recording
// montage prep state; consumed by workstation code via `SessionData`.
export type { MontageMetadata } from './types/montage_metadata';

// Montage definition (Phase A of the builder design) — typed schema for the
// registry served by `GET /api/montages`.
export type {
  MontageDefinition,
  ChannelRow,
  FixedChannelRow,
  SlotChannelRow,
  Referent,
} from './types/montage_definition';

// SPEC-020 ERP migration — bus artifact schemas for the ERP chain.
export type { ErpSignalRaw } from './types/erp_signal_raw';
export type { ErpEpochs } from './types/erp_epochs';
export type { ErpEvokedPerCondition } from './types/erp_evoked_per_condition';
// NOTE: codegen emits only the top-level ErpArcparamPerCondition interface for
// this schema (the per-condition results are an additionalProperties map, so the
// nested shapes are inlined rather than named). Re-export only what exists.
export type { ErpArcparamPerCondition } from './types/erp_arcparam_per_condition';
// ERP Dynamics phase — time-frequency views (ERSP / ITC / ERP-image).
export type { ErpTfrPerCondition, ErpImageData } from './types/erp_tfr_per_condition';
// SPEC-021 Wave 3 — bus artifact schemas for the bus-native normative plugin
// (plugins/ins/normative). Replaces the legacy plugins/normative_comparison/
// HTTP endpoints that workstation reads.
export type { NormativeReport } from './types/normative_report';
export type { NormativePsdBands } from './types/normative_psd_bands';

// SPEC-013 — Coherence Basins exploratory plugin (plugins/ins/coherence-basins).
// Per-subject voice basin repertoire at DK-68. Consumers derive the payload
// shape via `CoherenceProfile['data']` (the bus envelope wraps it).
export type { CoherenceProfile } from './types/coherence_profile';

// SPEC-026 / SPEC-029 — substrate page measurements (plugins/ins/substrate).
// The four-axis decomposition (across scale / space / time / state) plus
// per-channel figure-on-ground. The clinical verdict surface lives in the
// sibling substrate.read artifact (closed — @coherence/clinical-sdk).
export type { SubstrateMeasurements } from './types/substrate_measurements';

// SPEC-020 Phase 2 — workstation matcher input shape.
export type {
  SessionData,
  RecordingDescriptor,
  StageMap,
  ErpDisplayPlan,
} from './types/session_data';

export {
  registerPlugin,
  getRegisteredPlugins,
  resetRegistryForTests,
} from './registry';
export type {
  EvidenceGrade,
  OutputRegister,
  RendererRegistration,
  PluginRegistration,
  PluginKindContribution,
  PluginTarget,
} from './registry';

export {
  registerPaneKeys,
  getRegisteredPaneKeys,
  resetPaneKeysForTests,
} from './keys';
export type { PaneKeyBinding } from './keys';

export {
  useBusArtifact,
  setBusClient,
  setBusFetchGate,
  getBusClient,
  setBusClientForTests,
  resetBusForTests,
  HttpBusClient,
} from './bus';
export type { BusArtifact, BusClient, HttpBusClientConfig } from './bus';

export {
  useActiveLayers,
  setActiveLayersForTests,
  resetActiveLayersForTests,
} from './active-layers';
export type { Layer, ActiveLayersInfo } from './active-layers';

export { wrapWithChrome, ChromeBadge } from './chrome';
export type { ChromeProps, ChromeBadgeProps } from './chrome';

export { paneFromRenderer } from './pane-adapter';
export type {
  PaneAdapterProps,
  PaneAdapterDefinition,
  PaneAdapterAxis,
  PaneFromRendererOptions,
} from './pane-adapter';

export { Tooltip } from './tooltip';
export type { TooltipProps, TooltipPlacement } from './tooltip';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps, ConfirmDialogTone } from './ConfirmDialog';

export { PaneInfo } from './PaneInfo';
export type { PaneInfoProps, PaneInfoContent } from './PaneInfo';

export {
  setSyncBus,
  getSyncBus,
  setSyncBusForTests,
  resetSyncBusForTests,
  useSyncValue,
} from './sync';
export type { SyncBus } from './sync';

export {
  setSubFocusBus,
  getSubFocusBus,
  setSubFocusBusForTests,
  resetSubFocusBusForTests,
  useSubSelect,
} from './sub-focus';
export {
  registerCaptureRepainter,
  getCaptureRepainter,
  clearCaptureRepaintersForTesting,
} from './capture-repainter';
export type { CaptureRepainter } from './capture-repainter';
export type {
  SubFocusBus,
  SubFocusItem,
  SubFocusSnapshot,
  UseSubSelectArgs,
  UseSubSelectResult,
} from './sub-focus';

// ---------------------------------------------------------------------------
// Rendering primitives — shared by the workstation host AND plugins so that
// visuals stay consistent. "If you want a head map, use ours."
// ---------------------------------------------------------------------------

export {
  renderTopomap,
  ELECTRODE_POSITIONS,
  Topomap,
  TopoColorbar,
  TopoValueHover,
  renderColorbarCanvas,
} from './topomap';
export type {
  TopoRenderOptions,
  TopomapProps,
  TopoColorbarProps,
  TopoValueHoverProps,
} from './topomap';

// HeadMap — reusable head-with-electrodes SVG (electrode picker + montage
// topology preview). Promoted from the recorder's BrainBitMontagePicker so
// the recorder picker and the workstation montage editor share one impl.
export { HeadMap } from './components/HeadMap';
export type { HeadMapProps, HeadMapLine } from './components/HeadMap';

export { TripletTopomap } from './topomap/TripletTopomap';
export type { TripletTopomapProps } from './topomap/TripletTopomap';

export { DiffTopomap } from './topomap/DiffTopomap';
export type { DiffTopomapProps } from './topomap/DiffTopomap';

export { SignificanceMarkerOverlay } from './topomap/SignificanceMarkerOverlay';
export type { SignificanceMarkerOverlayProps } from './topomap/SignificanceMarkerOverlay';

export {
  getColormap,
  getColormapPreference,
  zScoreColormap,
  qeegClassicColormap,
  sciColormap,
  hotColormap,
  normalColorToRGB,
  bwrColormap,
  resolveDivergingColormap,
} from './colormap';
export type { ColormapName, ColormapFn } from './colormap';

export { readCanvasTokens } from './canvas-tokens';
export type { CanvasTokens } from './canvas-tokens';

export {
  default as UPlotMiniSpectrum,
  DEFAULT_BANDS,
  SPECTRUM_PEAK_MARKER_DESIGN,
  SPECTRUM_VALLEY_MARKER_DESIGN,
} from './spectrum';
export type {
  UPlotMiniSpectrumProps,
  SpectrumYMode,
  BandRange,
  SpectrumPeakMarker,
} from './spectrum';

export { CompareSpectrumChart } from './spectrum/CompareSpectrumChart';
export type { CompareSpectrumChartProps } from './spectrum/CompareSpectrumChart';

// AnnotationPopoverShell moved to @coherence/clinical-sdk. It was only ever
// consumed by the clinical annotation popovers (which live there), and it now
// builds on the design-system kit `Popover` — which this package, being
// mirrored to a public repo, may not import (CONVENTIONS §6).

export type { PhaseToolbarProps } from './registry';

// ---------------------------------------------------------------------------
// Toolbar primitives — see docs/superpowers/specs/2026-05-03-workstation-toolbar-design.md
// ---------------------------------------------------------------------------

export {
  WorkstationToolbar,
  ToolbarMeta,
  WorkstationPill,
  PillBtn,
  ToolbarToggle,
  KeyHint,
  FilterPill,
  CompareTogglePill,
  useClickOutsideRef,
} from './toolbar';
export type {
  WorkstationToolbarProps,
  ToolbarMetaProps,
  WorkstationPillProps,
  PillBtnProps,
  ToolbarToggleProps,
  ToolbarToggleTone,
  KeyHintProps,
  FilterPillProps,
  CompareTogglePillProps,
} from './toolbar';

// ---------------------------------------------------------------------------
// Action primitives — see SPEC-016 (workstation chrome redesign).
// PrimaryAction is the solid-fill accent button for the one primary
// affordance per surface. SecondaryAction is its outline companion.
// ---------------------------------------------------------------------------

export { PrimaryAction, SecondaryAction } from './actions';
export type { PrimaryActionProps, SecondaryActionProps } from './actions';

// ---------------------------------------------------------------------------
// Findings — only the generic FindingGeometry primitive is public. The
// inference + proposed-finding surface lives in @coherence/clinical-sdk
// (SPEC-029).
// ---------------------------------------------------------------------------

export type {
  FindingGeometry,
  FindingGeometryKind,
  FindingGeometryCursorAxis,
} from './findings';
export { FINDING_GEOMETRY_KINDS } from './findings';

// ---------------------------------------------------------------------------
// Brain 3D — asset-agnostic Colin27 cortex scene (promoted from desktop
// ic-source-loc so plugins can render the same cortex without bundling
// the GLB through the SDK). The host/plugin supplies `cortexUrl` from its
// own bundler. See src/brain3d/CortexCanvas.tsx.
// ---------------------------------------------------------------------------

export {
  default as CortexCanvas,
  mniToScene,
  MNI_SCALE,
  EMPTY_REGION_POWER,
} from './brain3d/CortexCanvas';
export type {
  CortexCanvasProps,
  Hemisphere,
} from './brain3d/CortexCanvas';
export { VoiceAnchorMarker } from './brain3d/VoiceAnchorMarker';
export type { VoiceAnchorMarkerProps } from './brain3d/VoiceAnchorMarker';

// DK-68 MNI centroid table + nearest-parcel lookup (promoted from desktop
// ic-source-loc so plugins can perform the same MNI→parcel resolution).
export {
  DK68_MNI_CENTROIDS,
  DK68_PARCEL_NAMES,
  lookupDK68ParcelAtMni,
} from './brain3d/dk68-centroids';
export type { DK68Match } from './brain3d/dk68-centroids';

// ---------------------------------------------------------------------------
// Voice palette + metadata — mirrors cw_eeg/voice_catalog.py.
// Promoted so plugins can render voice-colored visuals without re-defining
// the locked palette.
// ---------------------------------------------------------------------------

export { VOICE_ORDER, VOICE_PALETTE, VOICE_METADATA, voiceColor } from './voices/voices';
export type { VoiceId, VoiceMetadata } from './voices/voices';
