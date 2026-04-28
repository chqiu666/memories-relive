import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const HighlightShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uPixelRatio: 1,
    uSize: 0.5,
    uBrightness: 1.5, // color boost on highlight points (driven by hlGlowIntensity)
  },
  // Vertex shader — MUST match MemoryShaderMaterial's wave so highlights move
  // in lockstep with the base model.
  /* glsl */ `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;

    varying vec3 vColor;

    void main() {
      vColor = color;

      vec3 pos = position;
      // Identical wave to base model
      float wave = sin(uTime * 0.8 + pos.x * 0.3 + pos.y * 0.3) * 0.02;
      pos.y += wave;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Slightly larger than base (1.3x) so highlights pop visually
      // without flooding the base model — the previous 1.6x version
      // bled noticeably onto surrounding pixels.
      gl_PointSize = uSize * 1.3 * uPixelRatio * (150.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 1.5);
    }
  `,
  /* glsl */ `
    uniform float uBrightness;

    varying vec3 vColor;

    void main() {
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r2 = dot(cxy, cxy);
      if (r2 > 1.0) discard;

      // Soft circular sprite (matches base alpha falloff)
      float delta = fwidth(r2);
      float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r2);

      // Lift dark colors more than bright ones (sqrt gamma curve) so
      // low-saturation highlight PLYs (e.g. concrete-grey on grey base)
      // become visible without overblowing already-bright colors.
      vec3 lifted = sqrt(max(vColor, vec3(0.0)));
      vec3 brightColor = lifted * uBrightness;
      gl_FragColor = vec4(brightColor, alpha);
    }
  `
)

extend({ HighlightShaderMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      highlightShaderMaterial: any
    }
  }
}

export { HighlightShaderMaterial }
