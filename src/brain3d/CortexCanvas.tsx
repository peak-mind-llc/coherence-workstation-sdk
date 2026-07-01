/**
 * CortexCanvas — reusable Colin27 cortex 3D scene (SDK-promoted, asset-agnostic).
 *
 * Extracted from IcSourceLocCanvas (SPEC-014 / PEA-98 Task 9) so the
 * connectivity-arc-brain pane can reuse the same anatomical context
 * without duplicating the GLB-loading + hemisphere-clipping +
 * zoom-to-fit infrastructure.
 *
 * Renders:
 *   - A `<Canvas>` with the standard 3-light setup.
 *   - The Colin27 cortex mesh, optionally tinted by a regionPower map
 *     (DK68 region label → normalized power [0, 1]).
 *   - A `ZoomToFit` driver that re-frames the camera on first load and
 *     on every hemisphere toggle.
 *   - `OrbitControls` with the same constraints as IcSourceLocCanvas.
 *   - Anything passed as `children` is rendered inside the same
 *     `<Canvas>` so callers can add overlays (probability blobs, arcs,
 *     parcel-centroid spheres) that share the cortex's coordinate
 *     system. Use `mniToScene(x, y, z)` to map MNI mm to scene units.
 *
 * The ic-source-loc pane keeps its existing LORETA activation behavior
 * by passing a populated `regionPower` and `threshold`. The arc-brain
 * pane passes an empty object (the module-frozen `EMPTY_REGION_POWER`)
 * so the cortex renders pure anatomical gray and the arcs read on top.
 *
 * Hemisphere clipping uses `THREE.Plane` cuts at x=0 (after the MNI X
 * negation in the position transform). When `hemisphere` is 'left' or
 * 'right' the contralateral mesh is hidden — exposing the medial wall
 * of the visible side. Same pattern as ProtocolCortexMesh.
 *
 * Asset-agnostic: the caller supplies `cortexUrl` (from its own bundler)
 * so no binary GLB ships through the SDK package.
 */

import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, MutableRefObject, ReactNode } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { hotColormap } from '../colormap';

/** MNI mm → three.js scene units. Exposed so consumers can place
 *  overlays (parcel centroids, arcs) in the same coordinate frame. */
export const MNI_SCALE = 0.0094;

/** Module-frozen empty regionPower — used when the cortex should
 *  render pure sulcal-shaded gray with no activation overlay. Frozen
 *  so the memo's reference equality is stable across renders. */
export const EMPTY_REGION_POWER: Readonly<Record<string, number>> =
  Object.freeze({});

export type Hemisphere = 'left' | 'right' | 'both';

/**
 * Map an MNI coordinate (mm) to scene units, applying the same X
 * negation the cortex mesh uses so anatomical-left lands on scene +x.
 *
 * MNI Z (superior) → scene Y; MNI Y (anterior) → scene Z. Negate MNI X
 * so anatomical L ends up on scene +x (screen-left at the default
 * camera angle) — matches the niivue slicer's neurological convention.
 */
export function mniToScene(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [-x * MNI_SCALE, z * MNI_SCALE, y * MNI_SCALE];
}

/* Bounding spheres are computed inside Cortex (where the parsed
 * geometry lives) and pushed into this ref so ZoomToFit (which
 * needs useThree() and therefore a separate child of Canvas) can
 * read them without a re-render-on-load coupling. */
interface HemiBounds {
  both: THREE.Sphere | null;
  left: THREE.Sphere | null;
  right: THREE.Sphere | null;
}

/* Hemisphere clipping planes. We negate MNI X in the position
 * transform below so anatomical-left maps to scene+x and renders on
 * screen-left in the default camera angle (matches the niivue slicer
 * which uses neurological convention). After that flip:
 *   anatomical L = scene +x → LH_CLIP keeps x ≥ 0
 *   anatomical R = scene -x → RH_CLIP keeps x ≤ 0
 */
const LH_CLIP = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.001)];
const RH_CLIP = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.001)];

export interface CortexCanvasProps {
  /** URL to the Colin27 cortex GLB asset. Supplied by the host/plugin
   *  via its own bundler (e.g. Vite `?url` import) so no binary ships
   *  through the SDK package. */
  cortexUrl: string;
  /** DK region label → normalized power [0, 1]. Empty for plain anatomical
   *  gray. Pass `EMPTY_REGION_POWER` when no overlay is wanted. */
  regionPower?: Readonly<Record<string, number>>;
  /** Activation threshold below which a parcel reads as quiet gray. */
  threshold?: number;
  /** Hemisphere visibility — 'left' or 'right' hides the contralateral
   *  half (exposing the medial wall of the visible side). */
  hemisphere?: Hemisphere;
  /** Cortex opacity [0, 1] (default 1 — fully opaque, unchanged). When
   *  < 1 the cortex mesh renders as a translucent glass shell
   *  (transparent + depthWrite off) so overlays placed inside read
   *  through it. Leave at 1 for activation/dipole panes. */
  opacity?: number;
  /** Inline style override for the `<Canvas>` element. */
  style?: CSSProperties;
  /** Children rendered inside the same `<Canvas>` so consumers can
   *  add 3D overlays (probability blobs, arcs, centroid spheres) that
   *  share the cortex's coordinate frame. */
  children?: ReactNode;
}

/**
 * Reusable Colin27 cortex scene. Wraps `<Canvas>` + cortex mesh +
 * zoom-to-fit + orbit controls. Pass children to layer overlays in
 * the same scene.
 */
export default function CortexCanvas({
  cortexUrl,
  regionPower = EMPTY_REGION_POWER,
  threshold = 0.5,
  hemisphere = 'both',
  opacity = 1,
  style,
  children,
}: CortexCanvasProps) {
  const boundsRef = useRef<HemiBounds>({
    both: null,
    left: null,
    right: null,
  });
  return (
    <Canvas
      camera={{ position: [1.7, 0.4, 1.7], fov: 32, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
      style={{ background: 'var(--surface-ground)', ...style }}
      onCreated={({ gl }) => {
        // localClipping must be enabled for THREE.Plane clipping to
        // affect specific meshes (vs. the whole renderer).
        gl.localClippingEnabled = true;
      }}
    >
      {/* 3-light setup matching stim-tool's protocol cortex view —
       * ambient floor + warm key + cool fill. Diffuse-only material
       * below means no specular noise; the lighting just rounds the
       * surface form. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={0.55} color={'#ffffff'} />
      <directionalLight position={[-4, 2, -2]} intensity={0.22} color={'#aac4ff'} />
      <directionalLight position={[0, -3, 1]} intensity={0.16} color={'#ffd9b8'} />

      <Suspense fallback={null}>
        <Cortex
          cortexUrl={cortexUrl}
          regionPower={regionPower}
          threshold={threshold}
          hemisphere={hemisphere}
          opacity={opacity}
          boundsRef={boundsRef}
        />
      </Suspense>
      <ZoomToFit hemisphere={hemisphere} boundsRef={boundsRef} />
      {children}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={4}
      />
    </Canvas>
  );
}

/* ── Cortex ────────────────────────────────────────────────────── */

interface CortexParsed {
  geometry: THREE.BufferGeometry;
  regionNames: string[];
  sulcDepth: Float32Array | null;
  /** Bounding sphere of the full cortex (both hemispheres). */
  bsBoth: THREE.Sphere;
  /** Bounding sphere of vertices on the anatomical-left side
   * (world +x after our MNI X negation in the position transform). */
  bsLeft: THREE.Sphere;
  /** Bounding sphere of vertices on the anatomical-right side. */
  bsRight: THREE.Sphere;
}

function Cortex({
  cortexUrl,
  regionPower,
  threshold = 0.5,
  hemisphere = 'both',
  opacity = 1,
  boundsRef,
}: {
  cortexUrl: string;
  regionPower: Readonly<Record<string, number>>;
  threshold?: number;
  hemisphere?: Hemisphere;
  opacity?: number;
  boundsRef?: MutableRefObject<HemiBounds>;
}) {
  const gltf = useLoader(GLTFLoader, cortexUrl);

  const parsed = useMemo<CortexParsed | null>(() => {
    let result: CortexParsed | null = null;
    gltf.scene.traverse((child) => {
      if (result) return;
      const m = child as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;

      const geo = (m.geometry as THREE.BufferGeometry).clone();
      const regionAttr = geo.getAttribute('_regionid');
      const sulcAttr = geo.getAttribute('_sulcdepth');
      const userRegionNames = (m.userData as { regionNames?: string[] })?.regionNames;
      if (!regionAttr || !userRegionNames) return;

      const positions = geo.getAttribute('position') as THREE.BufferAttribute;
      const vertexCount = positions.count;
      const perVertexRegion: string[] = new Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) {
        const idx = regionAttr.getX(i);
        perVertexRegion[i] = userRegionNames[idx] ?? String(idx);
      }

      let sulc: Float32Array | null = null;
      if (sulcAttr) {
        sulc = new Float32Array(sulcAttr.count);
        for (let i = 0; i < sulcAttr.count; i++) sulc[i] = sulcAttr.getX(i);
      }

      // MNI → scene transform. MNI Z (superior) → scene Y, MNI Y
      // (anterior) → scene Z. Negate MNI X so anatomical L lands on
      // scene +x (screen-left in the default camera) — matches the
      // niivue slicer's neurological convention so the 3D brain and
      // slicer agree on which side is which.
      for (let i = 0; i < positions.count; i++) {
        const mx = positions.getX(i);
        const my = positions.getY(i);
        const mz = positions.getZ(i);
        positions.setXYZ(i, -mx * MNI_SCALE, mz * MNI_SCALE, my * MNI_SCALE);
      }
      positions.needsUpdate = true;

      // Drop GLB's pre-baked DK paint and old normals; recompute
      // smooth normals so non-indexed vertices read as a continuous
      // surface rather than facets.
      if (geo.getAttribute('color')) geo.deleteAttribute('color');
      if (geo.getAttribute('normal')) geo.deleteAttribute('normal');
      computeSmoothNormals(geo);
      geo.computeBoundingSphere();

      // Pre-compute hemisphere-specific bounding spheres so the
      // zoom-to-fit pass below can re-frame the camera in O(1) on
      // every hemisphere toggle.
      const bsBoth = new THREE.Sphere();
      geo.boundingSphere ? bsBoth.copy(geo.boundingSphere) : bsBoth.set(new THREE.Vector3(), 1);

      const bsLeft = _hemisphereBoundingSphere(positions, +1);
      const bsRight = _hemisphereBoundingSphere(positions, -1);

      result = {
        geometry: geo,
        regionNames: perVertexRegion,
        sulcDepth: sulc,
        bsBoth,
        bsLeft,
        bsRight,
      };
    });
    return result;
  }, [gltf]);

  /* Publish bounding spheres to the parent's ref so ZoomToFit
   * (a sibling Canvas child) can read them. The ref pattern avoids
   * re-rendering the Canvas tree on bounds changes. */
  useEffect(() => {
    if (!parsed || !boundsRef) return;
    boundsRef.current = {
      both: parsed.bsBoth,
      left: parsed.bsLeft,
      right: parsed.bsRight,
    };
  }, [parsed, boundsRef]);

  /* Compute per-vertex diffuse colors. The lerp formula keeps the
   * cortex anatomically gray everywhere except where activation
   * exceeds the threshold; there it tints toward the heat color
   * still modulated by sulcal depth so relief stays visible.
   *
   * Hot colormap (dark red → red → orange → yellow). Hot's low end
   * blends into the gray cortex rather than reading as a different
   * hue, so the eye separates "active" from "quiet" without a
   * categorical hue jump. */
  const colorAttr = useMemo(() => {
    if (!parsed) return null;
    const { regionNames, sulcDepth } = parsed;
    const n = regionNames.length;
    const out = new Float32Array(n * 3);
    const colormap = hotColormap;

    /* Gamma 0.7 — slight expansion of the mid-range, so parcels at
     * 0.5-0.7 of peak read clearly red instead of muddy dark-red.
     * Couples with the lower 0.2 threshold to give a more punchy
     * activation render. */
    const GAMMA = 0.7;
    const baseR = 0.62;
    const baseG = 0.62;
    const baseB = 0.66;

    for (let i = 0; i < n; i++) {
      const name = regionNames[i];
      const region =
        name.startsWith('lh_') || name.startsWith('rh_') ? name.slice(3) : name;
      const tRaw = clamp01(regionPower[region] ?? 0);
      const denom = 1 - threshold;
      const t =
        tRaw < threshold
          ? 0
          : denom > 0
            ? Math.pow((tRaw - threshold) / denom, GAMMA)
            : tRaw >= 1.0
              ? 1
              : 0;

      const sulc = sulcDepth ? sulcDepth[i] : 0;
      const sulcMod = 0.62 + 0.38 * (sulc * 0.5 + 0.5);

      const [hr, hg, hb] = colormap(tRaw);
      const heatR = (hr / 255) * sulcMod;
      const heatG = (hg / 255) * sulcMod;
      const heatB = (hb / 255) * sulcMod;

      // Lerp from sulc-shaded gray to sulc-shaded heat as t→1.
      out[i * 3] = baseR * sulcMod * (1 - t) + heatR * t;
      out[i * 3 + 1] = baseG * sulcMod * (1 - t) + heatG * t;
      out[i * 3 + 2] = baseB * sulcMod * (1 - t) + heatB * t;
    }

    return new THREE.Float32BufferAttribute(out, 3);
  }, [parsed, regionPower, threshold]);

  const geometry = useMemo(() => {
    if (!parsed || !colorAttr) return null;
    const g = parsed.geometry.clone();
    g.setAttribute('color', colorAttr);
    return g;
  }, [parsed, colorAttr]);

  if (!geometry) return null;

  const lhVisible = hemisphere === 'left' || hemisphere === 'both';
  const rhVisible = hemisphere === 'right' || hemisphere === 'both';

  // Translucency props are applied ONLY when opacity < 1, so the
  // default opaque path stays byte-for-byte unchanged for the
  // activation / dipole / hub-centrality consumers. When < 1 the
  // cortex reads as a glass shell (transparent + depthWrite off) so
  // overlays placed inside the scene read through it.
  const glass =
    opacity < 1
      ? { transparent: true as const, opacity, depthWrite: false as const }
      : {};

  return (
    <group>
      {lhVisible && (
        <mesh geometry={geometry} renderOrder={0}>
          <meshStandardMaterial
            vertexColors
            roughness={0.7}
            metalness={0.1}
            side={THREE.DoubleSide}
            clippingPlanes={LH_CLIP}
            {...glass}
          />
        </mesh>
      )}
      {rhVisible && (
        <mesh geometry={geometry} renderOrder={0}>
          <meshStandardMaterial
            vertexColors
            roughness={0.7}
            metalness={0.1}
            side={THREE.DoubleSide}
            clippingPlanes={RH_CLIP}
            {...glass}
          />
        </mesh>
      )}
    </group>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* Compute a bounding sphere over only the vertices on one side of
 * x=0. xSign=+1 keeps anatomical-left (world +x after the MNI
 * negation), -1 keeps anatomical-right. Falls back to a unit sphere
 * at origin if no vertices match. */
function _hemisphereBoundingSphere(
  positions: THREE.BufferAttribute,
  xSign: 1 | -1,
): THREE.Sphere {
  const n = positions.count;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  let kept = 0;
  for (let i = 0; i < n; i++) {
    const x = positions.getX(i);
    if (xSign > 0 ? x < 0 : x > 0) continue;
    const y = positions.getY(i);
    const z = positions.getZ(i);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
    kept++;
  }
  if (kept === 0) return new THREE.Sphere(new THREE.Vector3(), 1);
  const center = new THREE.Vector3(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  );
  let r2 = 0;
  for (let i = 0; i < n; i++) {
    const x = positions.getX(i);
    if (xSign > 0 ? x < 0 : x > 0) continue;
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const dx = x - center.x;
    const dy = y - center.y;
    const dz = z - center.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > r2) r2 = d2;
  }
  return new THREE.Sphere(center, Math.sqrt(r2));
}

/* Camera fit-to-mesh — recenters OrbitControls' target on the
 * visible-hemisphere bounding sphere and adjusts distance so the
 * sphere fits the viewport with a small margin. Runs once when
 * bounds first land, then on every hemisphere toggle. */
function ZoomToFit({
  hemisphere,
  boundsRef,
}: {
  hemisphere: Hemisphere;
  boundsRef: MutableRefObject<HemiBounds>;
}) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };
  // Re-fit on first bounds-land + every hemisphere change.
  useEffect(() => {
    const bs =
      hemisphere === 'left'
        ? boundsRef.current.left
        : hemisphere === 'right'
          ? boundsRef.current.right
          : boundsRef.current.both;
    if (!bs || !controls) return;
    const fovRad = ((camera.fov ?? 32) * Math.PI) / 180;
    const margin = 1.35; // ~25% breathing room past the sphere
    const distance = (bs.radius / Math.sin(fovRad / 2)) * margin;
    // Keep the user's current view angle — only scale distance.
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.lengthSq() === 0) dir.set(1, 0.4, 1).normalize();
    controls.target.copy(bs.center);
    camera.position.copy(bs.center).add(dir.multiplyScalar(distance));
    camera.updateProjectionMatrix();
    controls.update();
  }, [hemisphere, camera, controls, boundsRef]);
  return null;
}

/* Smooth-normal computation for non-indexed mesh — averages face
 * normals across coincident vertex positions so the cortex reads
 * as a smooth surface rather than visible polygons. Same approach
 * as ProtocolCortexMesh's _computeSmoothNormals. */
function computeSmoothNormals(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const count = pos.count;

  const faceNormals = new Float32Array(count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  for (let f = 0; f < count; f += 3) {
    a.set(pos.getX(f), pos.getY(f), pos.getZ(f));
    b.set(pos.getX(f + 1), pos.getY(f + 1), pos.getZ(f + 1));
    c.set(pos.getX(f + 2), pos.getY(f + 2), pos.getZ(f + 2));
    cb.subVectors(c, b);
    ab.subVectors(a, b);
    cb.cross(ab).normalize();
    for (let j = 0; j < 3; j++) {
      faceNormals[(f + j) * 3] = cb.x;
      faceNormals[(f + j) * 3 + 1] = cb.y;
      faceNormals[(f + j) * 3 + 2] = cb.z;
    }
  }

  const PRECISION = 10000;
  const buckets = new Map<string, [number, number, number]>();
  for (let i = 0; i < count; i++) {
    const kx = Math.round(pos.getX(i) * PRECISION);
    const ky = Math.round(pos.getY(i) * PRECISION);
    const kz = Math.round(pos.getZ(i) * PRECISION);
    const key = `${kx},${ky},${kz}`;
    let entry = buckets.get(key);
    if (!entry) {
      entry = [0, 0, 0];
      buckets.set(key, entry);
    }
    entry[0] += faceNormals[i * 3];
    entry[1] += faceNormals[i * 3 + 1];
    entry[2] += faceNormals[i * 3 + 2];
  }

  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const kx = Math.round(pos.getX(i) * PRECISION);
    const ky = Math.round(pos.getY(i) * PRECISION);
    const kz = Math.round(pos.getZ(i) * PRECISION);
    const e = buckets.get(`${kx},${ky},${kz}`)!;
    const len = Math.hypot(e[0], e[1], e[2]) || 1;
    out[i * 3] = e[0] / len;
    out[i * 3 + 1] = e[1] / len;
    out[i * 3 + 2] = e[2] / len;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}
