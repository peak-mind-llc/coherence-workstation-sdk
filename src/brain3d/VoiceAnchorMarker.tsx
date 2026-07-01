/**
 * VoiceAnchorMarker — a small r3f sphere rendered at an MNI coordinate,
 * intended for placing voice anchors on the CortexCanvas scene.
 *
 * The marker matches the look of the IcSourceLocCanvas "pin" (a solid
 * sphere at the centroid) plus an optional soft additive-blend halo blob
 * (the gaussian falloff orb from ProbabilityBlob) for emphasis.
 *
 * Use `mniToScene` from CortexCanvas to stay in the same coordinate frame
 * as the cortex mesh. Pass `scale` to drive a basin-scale dial — it
 * multiplies the base radius without affecting the pin dot size.
 *
 * Render this inside a `<CortexCanvas>` children prop so it shares the
 * same Three.js scene.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { mniToScene, MNI_SCALE } from './CortexCanvas';

export interface VoiceAnchorMarkerProps {
  /** MNI coordinate [x, y, z] in millimetres. */
  mni: [number, number, number];
  /** Sphere color — e.g. the result of voiceColor(voiceId). */
  color: string;
  /** Base halo radius in scene units (default 2). Scaled by `scale`. */
  radius?: number;
  /** Dial multiplier applied to the halo radius (default 1). */
  scale?: number;
  /**
   * Opacity of the solid pin dot (default 1 — opaque, matching the
   * IcSourceLocCanvas pin). The halo's alpha is governed by its own
   * gaussian falloff shader and is NOT affected by this prop.
   */
  pinOpacity?: number;
  /**
   * When true, renders the gaussian soft-blob halo (additive blending,
   * same shader as IcSourceLocCanvas ProbabilityBlob). Default false —
   * just the solid pin dot is rendered.
   */
  softBlob?: boolean;
}

/**
 * An r3f mesh group that renders:
 *   1. A tiny solid "pin" sphere at the MNI centroid (always shown).
 *   2. An optional larger soft halo with gaussian radial falloff
 *      (additive blending, matching the ProbabilityBlob in IcSourceLocCanvas).
 *
 * Must be rendered as a child of a `<CortexCanvas>` (or any r3f `<Canvas>`).
 */
export function VoiceAnchorMarker({
  mni,
  color,
  radius = 2,
  scale = 1,
  pinOpacity = 1,
  softBlob = false,
}: VoiceAnchorMarkerProps) {
  const scenePos = useMemo(
    () => mniToScene(mni[0], mni[1], mni[2]),
    [mni[0], mni[1], mni[2]],
  );

  // Soft halo material: additive blending + gaussian falloff via custom
  // fragment shader — mirrors ProbabilityBlob in IcSourceLocCanvas exactly.
  const blobMaterial = useMemo(() => {
    if (!softBlob) return null;
    const threeColor = new THREE.Color(color);
    const mat = new THREE.MeshBasicMaterial({
      color: threeColor,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vLocalPos;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\nvLocalPos = position;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vLocalPos;`,
        )
        .replace(
          '#include <output_fragment>',
          `
          float r = length(vLocalPos);
          float t = clamp(r, 0.0, 1.0);
          // Steeper falloff and lower peak alpha — subtle haze, not a
          // bright orb. Matches IcSourceLocCanvas ProbabilityBlob.
          float falloff = exp(-4.0 * t * t);
          gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a * falloff * 0.22);
          `,
        );
    };
    return mat;
  }, [softBlob, color]);

  return (
    <group position={scenePos} renderOrder={2}>
      {/* Soft halo blob — optional, mirrors ProbabilityBlob shader */}
      {softBlob && blobMaterial && (
        <mesh material={blobMaterial}>
          <sphereGeometry args={[radius * scale, 24, 24]} />
        </mesh>
      )}
      {/* Solid pin dot at the centroid — always shown */}
      <mesh>
        <sphereGeometry args={[1.0 * MNI_SCALE, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={pinOpacity} toneMapped={false} />
      </mesh>
    </group>
  );
}
