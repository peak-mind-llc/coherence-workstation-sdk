/**
 * DK-68 atlas MNI centroids — generated from cw_eeg/atlas.py.
 *
 * Each parcel is mirrored across the midline to produce -lh / -rh entries.
 * Coordinates are in MNI mm (x=left/right, y=ant/post, z=inf/sup).
 * To regenerate: run scripts/dump_dk68_centroids.py (TODO).
 */

export const DK68_MNI_CENTROIDS: Record<string, [number, number, number]> = {
  'bankssts-lh': [-52.0, -45.0, 5.0],
  'bankssts-rh': [52.0, -45.0, 5.0],
  'caudalanteriorcingulate-lh': [-4.0, 12.0, 35.0],
  'caudalanteriorcingulate-rh': [4.0, 12.0, 35.0],
  'caudalmiddlefrontal-lh': [-35.0, 10.0, 48.0],
  'caudalmiddlefrontal-rh': [35.0, 10.0, 48.0],
  'cuneus-lh': [-6.0, -80.0, 22.0],
  'cuneus-rh': [6.0, -80.0, 22.0],
  'entorhinal-lh': [-24.0, -6.0, -28.0],
  'entorhinal-rh': [24.0, -6.0, -28.0],
  'frontalpole-lh': [-6.0, 66.0, -2.0],
  'frontalpole-rh': [6.0, 66.0, -2.0],
  'fusiform-lh': [-40.0, -48.0, -18.0],
  'fusiform-rh': [40.0, -48.0, -18.0],
  'inferiorparietal-lh': [-46.0, -58.0, 35.0],
  'inferiorparietal-rh': [46.0, -58.0, 35.0],
  'inferiortemporal-lh': [-52.0, -35.0, -20.0],
  'inferiortemporal-rh': [52.0, -35.0, -20.0],
  'insula-lh': [-38.0, 2.0, 2.0],
  'insula-rh': [38.0, 2.0, 2.0],
  'isthmuscingulate-lh': [-8.0, -48.0, 12.0],
  'isthmuscingulate-rh': [8.0, -48.0, 12.0],
  'lateraloccipital-lh': [-38.0, -80.0, 10.0],
  'lateraloccipital-rh': [38.0, -80.0, 10.0],
  'lateralorbitofrontal-lh': [-32.0, 38.0, -14.0],
  'lateralorbitofrontal-rh': [32.0, 38.0, -14.0],
  'lingual-lh': [-12.0, -72.0, -6.0],
  'lingual-rh': [12.0, -72.0, -6.0],
  'medialorbitofrontal-lh': [-5.0, 48.0, -14.0],
  'medialorbitofrontal-rh': [5.0, 48.0, -14.0],
  'middletemporal-lh': [-58.0, -30.0, -6.0],
  'middletemporal-rh': [58.0, -30.0, -6.0],
  'paracentral-lh': [-6.0, -30.0, 62.0],
  'paracentral-rh': [6.0, -30.0, 62.0],
  'parahippocampal-lh': [-26.0, -30.0, -18.0],
  'parahippocampal-rh': [26.0, -30.0, -18.0],
  'parsopercularis-lh': [-52.0, 14.0, 12.0],
  'parsopercularis-rh': [52.0, 14.0, 12.0],
  'parsorbitalis-lh': [-44.0, 34.0, -10.0],
  'parsorbitalis-rh': [44.0, 34.0, -10.0],
  'parstriangularis-lh': [-50.0, 28.0, 8.0],
  'parstriangularis-rh': [50.0, 28.0, 8.0],
  'pericalcarine-lh': [-8.0, -82.0, 5.0],
  'pericalcarine-rh': [8.0, -82.0, 5.0],
  'postcentral-lh': [-42.0, -25.0, 52.0],
  'postcentral-rh': [42.0, -25.0, 52.0],
  'posteriorcingulate-lh': [-4.0, -35.0, 30.0],
  'posteriorcingulate-rh': [4.0, -35.0, 30.0],
  'precentral-lh': [-38.0, -10.0, 55.0],
  'precentral-rh': [38.0, -10.0, 55.0],
  'precuneus-lh': [-8.0, -60.0, 42.0],
  'precuneus-rh': [8.0, -60.0, 42.0],
  'rostralanteriorcingulate-lh': [-4.0, 34.0, 8.0],
  'rostralanteriorcingulate-rh': [4.0, 34.0, 8.0],
  'rostralmiddlefrontal-lh': [-38.0, 42.0, 20.0],
  'rostralmiddlefrontal-rh': [38.0, 42.0, 20.0],
  'superiorfrontal-lh': [-10.0, 50.0, 35.0],
  'superiorfrontal-rh': [10.0, 50.0, 35.0],
  'superiorparietal-lh': [-22.0, -58.0, 55.0],
  'superiorparietal-rh': [22.0, -58.0, 55.0],
  'superiortemporal-lh': [-55.0, -12.0, 0.0],
  'superiortemporal-rh': [55.0, -12.0, 0.0],
  'supramarginal-lh': [-52.0, -38.0, 38.0],
  'supramarginal-rh': [52.0, -38.0, 38.0],
  'temporalpole-lh': [-38.0, 16.0, -30.0],
  'temporalpole-rh': [38.0, 16.0, -30.0],
  'transversetemporal-lh': [-46.0, -18.0, 8.0],
  'transversetemporal-rh': [46.0, -18.0, 8.0],
};

export const DK68_PARCEL_NAMES: ReadonlyArray<string> = Object.keys(DK68_MNI_CENTROIDS);

/* Pre-flattened (name, x, y, z) tuple list — built once at module load
 * so the per-hover lookup is just a tight loop over 68 entries. */
const DK68_FLAT: ReadonlyArray<{
  name: string;
  x: number;
  y: number;
  z: number;
}> = Object.entries(DK68_MNI_CENTROIDS).map(([name, [x, y, z]]) => ({
  name,
  x,
  y,
  z,
}));

export interface DK68Match {
  /** Raw key (e.g. "rostralmiddlefrontal-lh"). */
  parcel: string;
  /** Display label matching backend convention (e.g. "left rostralmiddlefrontal"). */
  label: string;
  /** Distance in mm from cursor to nearest centroid. */
  distanceMm: number;
}

/* Convert a parcel key like "rostralmiddlefrontal-lh" → "left rostralmiddlefrontal".
 * Mirrors `_parcel_display_label` in cw_eeg/loreta.py — the backend's
 * peakParcelLabel uses the same `{hemi} {name}` shape so the hover badge
 * reads consistently with the rest of the source-loc pane. */
function parcelToLabel(parcel: string): string {
  if (parcel.endsWith('-lh')) return `left ${parcel.slice(0, -3)}`;
  if (parcel.endsWith('-rh')) return `right ${parcel.slice(0, -3)}`;
  return parcel;
}

/**
 * Find the nearest DK-68 parcel centroid to an MNI coordinate. Returns
 * null if the input is non-finite. Linear scan over 68 entries — well
 * under 0.1 ms per call, no debounce needed for hover.
 */
export function lookupDK68ParcelAtMni(
  mni: readonly [number, number, number],
): DK68Match | null {
  const [mx, my, mz] = mni;
  if (!Number.isFinite(mx) || !Number.isFinite(my) || !Number.isFinite(mz)) {
    return null;
  }
  let bestParcel = '';
  let bestDist2 = Infinity;
  for (const entry of DK68_FLAT) {
    const dx = entry.x - mx;
    const dy = entry.y - my;
    const dz = entry.z - mz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestParcel = entry.name;
    }
  }
  if (bestDist2 === Infinity) return null;
  return {
    parcel: bestParcel,
    label: parcelToLabel(bestParcel),
    distanceMm: Math.sqrt(bestDist2),
  };
}
