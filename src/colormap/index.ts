/**
 * Colormap utilities for topomap rendering.
 *
 * Provides three colormaps selectable via the host's visualization settings
 * (persisted to localStorage key `cw-colormap`):
 *   - classic:    Jet     (EEGLAB style, default)
 *   - perceptual: Viridis (perceptually uniform)
 *   - colorblind: Cividis (colorblind-safe)
 *
 * Plus standalone diverging maps (sci, zScore, qeegClassic, hot) used by
 * specific clinical visualizations.
 */

export type ColormapName = 'perceptual' | 'classic' | 'colorblind';

/** Map t in [0,1] to [R, G, B] each in 0-255 */
export type ColormapFn = (t: number) => [number, number, number];

/* ------------------------------------------------------------------ */
/*  Jet colormap (EEGLAB style)                                        */
/* ------------------------------------------------------------------ */

function jetRGB(t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  if (v < 0.125) {
    const s = v / 0.125;
    return [0, 0, Math.round(100 + s * 155)];
  } else if (v < 0.375) {
    const s = (v - 0.125) / 0.25;
    return [0, Math.round(s * 255), 255];
  } else if (v < 0.625) {
    const s = (v - 0.375) / 0.25;
    return [Math.round(s * 255), 255, Math.round(255 * (1 - s))];
  } else if (v < 0.875) {
    const s = (v - 0.625) / 0.25;
    return [255, Math.round(255 * (1 - s)), 0];
  } else {
    const s = (v - 0.875) / 0.125;
    return [Math.round(255 - s * 100), 0, 0];
  }
}

/* ------------------------------------------------------------------ */
/*  LUT interpolation helper                                           */
/* ------------------------------------------------------------------ */

interface ColorStop { t: number; r: number; g: number; b: number }

function interpolateLUT(stops: ColorStop[], t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));

  if (v <= stops[0].t) return [stops[0].r, stops[0].g, stops[0].b];
  if (v >= stops[stops.length - 1].t) {
    const last = stops[stops.length - 1];
    return [last.r, last.g, last.b];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i].t && v <= stops[i + 1].t) {
      const frac = (v - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return [
        Math.round(stops[i].r + frac * (stops[i + 1].r - stops[i].r)),
        Math.round(stops[i].g + frac * (stops[i + 1].g - stops[i].g)),
        Math.round(stops[i].b + frac * (stops[i + 1].b - stops[i].b)),
      ];
    }
  }

  const last = stops[stops.length - 1];
  return [last.r, last.g, last.b];
}

/* ------------------------------------------------------------------ */
/*  Viridis colormap — perceptually uniform                            */
/* ------------------------------------------------------------------ */

const VIRIDIS_STOPS: ColorStop[] = [
  { t: 0.00, r:  68, g:   1, b:  84 },
  { t: 0.07, r:  70, g:   8, b:  92 },
  { t: 0.13, r:  71, g:  17, b: 100 },
  { t: 0.20, r:  68, g:  15, b: 118 },
  { t: 0.27, r:  59, g:  31, b: 138 },
  { t: 0.33, r:  49, g:  48, b: 142 },
  { t: 0.40, r:  38, g:  73, b: 139 },
  { t: 0.47, r:  31, g:  95, b: 137 },
  { t: 0.53, r:  30, g: 114, b: 131 },
  { t: 0.60, r:  37, g: 133, b: 126 },
  { t: 0.67, r:  53, g: 183, b: 121 },
  { t: 0.73, r:  94, g: 201, b:  98 },
  { t: 0.80, r: 143, g: 215, b:  68 },
  { t: 0.87, r: 199, g: 224, b:  32 },
  { t: 0.93, r: 241, g: 229, b:  29 },
  { t: 1.00, r: 253, g: 231, b:  37 },
];

function viridisRGB(t: number): [number, number, number] {
  return interpolateLUT(VIRIDIS_STOPS, t);
}

/* ------------------------------------------------------------------ */
/*  Cividis colormap — colorblind-safe                                 */
/* ------------------------------------------------------------------ */

const CIVIDIS_STOPS: ColorStop[] = [
  { t: 0.00, r:   0, g:  32, b:  77 },
  { t: 0.07, r:   0, g:  43, b: 107 },
  { t: 0.13, r:  16, g:  51, b: 112 },
  { t: 0.20, r:  42, g:  60, b: 110 },
  { t: 0.27, r:  62, g:  69, b: 107 },
  { t: 0.33, r:  79, g:  78, b: 104 },
  { t: 0.40, r:  95, g:  88, b: 101 },
  { t: 0.47, r: 110, g:  98, b:  99 },
  { t: 0.53, r: 125, g: 108, b:  97 },
  { t: 0.60, r: 141, g: 119, b:  94 },
  { t: 0.67, r: 158, g: 131, b:  90 },
  { t: 0.73, r: 176, g: 144, b:  83 },
  { t: 0.80, r: 194, g: 158, b:  73 },
  { t: 0.87, r: 213, g: 174, b:  59 },
  { t: 0.93, r: 233, g: 192, b:  39 },
  { t: 1.00, r: 255, g: 233, b:  69 },
];

function cividisRGB(t: number): [number, number, number] {
  return interpolateLUT(CIVIDIS_STOPS, t);
}

/* ------------------------------------------------------------------ */
/*  SCI diverging colormap (red → white → blue)                        */
/* ------------------------------------------------------------------ */

export function sciColormap(t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  if (v <= 0.5) {
    const s = v / 0.5;
    return [
      Math.round(239 + s * (255 - 239)),
      Math.round(68  + s * (255 - 68)),
      Math.round(68  + s * (255 - 68)),
    ];
  } else {
    const s = (v - 0.5) / 0.5;
    return [
      Math.round(255 - s * (255 - 37)),
      Math.round(255 - s * (255 - 99)),
      Math.round(255 - s * (255 - 235)),
    ];
  }
}

/* ------------------------------------------------------------------ */
/*  Z-Score diverging colormap (blue → white → red)                    */
/* ------------------------------------------------------------------ */

export function zScoreColormap(t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  if (v <= 0.5) {
    const s = v / 0.5;
    return [
      Math.round(33 + s * (247 - 33)),
      Math.round(102 + s * (247 - 102)),
      Math.round(172 + s * (247 - 172)),
    ];
  } else {
    const s = (v - 0.5) / 0.5;
    return [
      Math.round(247 - s * (247 - 178)),
      Math.round(247 - s * (247 - 24)),
      Math.round(247 - s * (247 - 43)),
    ];
  }
}

/* ------------------------------------------------------------------ */
/*  QEEG Classic colormap — NeuroGuide/BrainDX convention              */
/* ------------------------------------------------------------------ */

function lerp(
  a: [number, number, number],
  b: [number, number, number],
  s: number,
): [number, number, number] {
  return [
    Math.round(a[0] + s * (b[0] - a[0])),
    Math.round(a[1] + s * (b[1] - a[1])),
    Math.round(a[2] + s * (b[2] - a[2])),
  ];
}

const NORMAL_COLOR_MAP: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  green: [0, 128, 0],
  lightgreen: [144, 238, 144],
  greenyellow: [173, 255, 47],
  black: [0, 0, 0],
};

export function normalColorToRGB(name: string): [number, number, number] {
  return NORMAL_COLOR_MAP[name] ?? NORMAL_COLOR_MAP.white;
}

/**
 * QEEG classic colormap matching NeuroGuide/BrainDX convention.
 */
export function qeegClassicColormap(
  t: number,
  normalRange: number = 1.0,
  normalColor: string = 'white',
  range: number = 3,
): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  const z = (v - 0.5) * 2 * range;

  if (Math.abs(z) <= normalRange) {
    return normalColorToRGB(normalColor);
  }

  if (z > normalRange) {
    const frac = Math.min(1, (z - normalRange) / (range - normalRange));
    if (frac < 0.33) {
      const s = frac / 0.33;
      return lerp([255, 215, 0], [255, 140, 0], s);
    } else if (frac < 0.66) {
      const s = (frac - 0.33) / 0.33;
      return lerp([255, 140, 0], [255, 0, 0], s);
    } else {
      const s = (frac - 0.66) / 0.34;
      return lerp([255, 0, 0], [139, 0, 0], s);
    }
  }

  const frac = Math.min(1, (Math.abs(z) - normalRange) / (range - normalRange));
  if (frac < 0.33) {
    const s = frac / 0.33;
    return lerp([173, 216, 230], [0, 255, 255], s);
  } else if (frac < 0.66) {
    const s = (frac - 0.33) / 0.33;
    return lerp([0, 255, 255], [0, 100, 200], s);
  } else {
    const s = (frac - 0.66) / 0.34;
    return lerp([0, 100, 200], [0, 0, 139], s);
  }
}

/* ------------------------------------------------------------------ */
/*  BWR diverging colormap (blue → white → red)                        */
/*  Copied verbatim from                                                */
/*  desktop/src/lib/workstation/panes/head-map-suite/cellValues.ts —    */
/*  used for ratio / phenotype / asymmetry head-map cells, and shared   */
/*  with the ERSP diverging colormap resolver below.                    */
/* ------------------------------------------------------------------ */

export const bwrColormap: ColormapFn = (t) => {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.5) {
    const k = x * 2;
    return [Math.round(60 + (255 - 60) * k), Math.round(80 + (255 - 80) * k), 255];
  }
  const k = (x - 0.5) * 2;
  return [255, Math.round(255 * (1 - k) + 60 * k), Math.round(255 * (1 - k) + 60 * k)];
};

/* ------------------------------------------------------------------ */
/*  Hot colormap — dark red → red → orange → yellow                    */
/* ------------------------------------------------------------------ */

const HOT_STOPS: ColorStop[] = [
  { t: 0.00, r:  20, g:   0, b:   0 },
  { t: 0.15, r:  90, g:   0, b:   0 },
  { t: 0.30, r: 160, g:   0, b:   0 },
  { t: 0.50, r: 220, g:  20, b:  10 },
  { t: 0.70, r: 250, g: 100, b:   0 },
  { t: 0.85, r: 255, g: 180, b:   0 },
  { t: 1.00, r: 255, g: 245, b:  80 },
];

export function hotColormap(t: number): [number, number, number] {
  return interpolateLUT(HOT_STOPS, t);
}

/* ------------------------------------------------------------------ */
/*  Registry + public API                                              */
/* ------------------------------------------------------------------ */

const COLORMAPS: Record<ColormapName, ColormapFn> = {
  perceptual: viridisRGB,
  classic: jetRGB,
  colorblind: cividisRGB,
};

/**
 * Read the host's colormap preference from localStorage.
 * Default: classic (jet), matching EEGLAB convention, per clinical-pro
 * decision — applies universally across hosts (Coherence, Neurofield).
 */
export function getColormapPreference(): ColormapName {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('cw-colormap') : null;
  if (saved === 'perceptual' || saved === 'classic' || saved === 'colorblind') return saved;
  return 'classic';
}

/** Get the colormap function for the current preference (or a specific name) */
export function getColormap(name?: ColormapName): ColormapFn {
  return COLORMAPS[name ?? getColormapPreference()];
}

/**
 * Shared diverging-colormap resolver for symmetric ±scale visualizations
 * (ERSP time-frequency maps, head-map ratio/asymmetry/phenotype cells).
 * `'classic'` maps to jet — on a symmetric ±scale that puts green at 0,
 * matching the EEGLAB look. `'perceptual'` and `'colorblind'` both map to
 * the blue-white-red diverging map, since viridis/cividis are sequential
 * (not diverging) and would misrepresent a zero-crossing.
 */
export function resolveDivergingColormap(pref: ColormapName): ColormapFn {
  return pref === 'classic' ? getColormap('classic') : bwrColormap;
}

export default COLORMAPS;
