/**
 * centreForTopo — shift a channel→value map so its midrange sits at zero.
 *
 * `renderTopomap` maps values linearly across a symmetric `[-absMax,
 * +absMax]`. For a quantity that never crosses zero — node strength, PSD
 * amplitude, an ICA mixing column read for shape rather than sign — feeding
 * it raw values wastes half the colormap and flattens the contrast that
 * matters. Centring on the data's own midrange spends the full jet on the
 * spread that is actually there.
 *
 * The catch, and the reason this lives in one place: **centring changes the
 * number space.** The canvas then carries deviations from `mid`, not the
 * quantity itself. Any scale, colorbar, or tick drawn beside that canvas has
 * to add `mid` back before it is labelled, or it will disagree with a hover
 * readout showing the raw value. That is exactly the defect this helper was
 * extracted after fixing (PR #1159, network topomap strip): a bar labelled
 * ±0.140 next to a readout saying 0.298 for the same electrode.
 *
 * So: paint with `shifted` + `halfRange`, and label with `mid ± halfRange`.
 */

export interface CentredTopoValues {
  /** Input values shifted so the midrange sits at 0 — what the canvas paints. */
  shifted: Record<string, number>;
  /**
   * The midrange the values were shifted by: `(min + max) / 2`.
   *
   * Add this back to convert a centred value — or a scale bound — into raw
   * units. A colorbar spanning the painted range is `mid - halfRange` at the
   * bottom and `mid + halfRange` at the top.
   */
  mid: number;
  /**
   * Half the data's full spread: `(max - min) / 2`, floored at 1e-9 so a
   * flat map cannot divide by zero. Pass as `absMax` to `renderTopomap`.
   */
  halfRange: number;
}

/**
 * Centre a channel→value map on its own midrange.
 *
 * @param raw Channel name → value. Non-finite values should be filtered by
 *            the caller; they are passed through the shift unchanged.
 * @returns   The shifted map plus the `mid` and `halfRange` that describe
 *            the shift, so callers can label a scale in raw units.
 */
export function centreForTopo(raw: Record<string, number>): CentredTopoValues {
  const vals = Object.values(raw);
  if (vals.length === 0) return { shifted: {}, mid: 0, halfRange: 1 };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const mid = (min + max) / 2;
  const halfRange = Math.max((max - min) / 2, 1e-9);
  const shifted: Record<string, number> = {};
  for (const [ch, v] of Object.entries(raw)) shifted[ch] = v - mid;
  return { shifted, mid, halfRange };
}
