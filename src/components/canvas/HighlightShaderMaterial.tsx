import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const HighlightShaderMaterial = shaderMaterial(
  {
    uPixelRatio: 1,
    uSize: 0.5,
    uBrightness: 1.5,   // color boost on highlight points (driven by hlGlowIntensity)
    uHaloStrength: 0.6, // soft outer halo intensity (faux glow without bloom)
  },
  /* glsl */ `
    uniform float uPixelRatio;
    uniform float uSize;

    varying vec3 vColor;

    void main() {
      vColor = color;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Slightly larger than base model points so the halo extends past the underlying surface
      gl_PointSize = uSize * 1.6 * uPixelRatio * (150.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 2.0);
    }
  `,
  /* glsl */ `
    uniform float uBrightness;
    uniform float uHaloStrength;

    varying vec3 vColor;

    void main() {
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r2 = dot(cxy, cxy);
      if (r2 > 1.0) discard;

      // Inner core: full brightness within ~50% radius
      float core = 1.0 - smoothstep(0.25, 0.55, r2);
      // Outer halo: soft glow falloff from 0.55 → 1.0
      float halo = (1.0 - smoothstep(0.55, 1.0, r2)) * uHaloStrength;

      vec3 brightColor = vColor * uBrightness;

      // Core fully opaque, halo translucent — fakes a glow without bloom
      float alpha = core + halo * 0.7;
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
