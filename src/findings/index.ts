// SPEC-029: only the generic FindingGeometry primitive stays public. The
// inference + proposed-finding surface moved to @coherence/clinical-sdk.
export type {
  FindingGeometry,
  FindingGeometryKind,
  FindingGeometryCursorAxis,
} from './geometry';
export { FINDING_GEOMETRY_KINDS } from './geometry';
