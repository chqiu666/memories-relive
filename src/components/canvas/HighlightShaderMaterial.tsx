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

      // Same size attenuation formula as base — no 1.6x bloat that was
      // causing highlight sprites to overpaint surrounding base pixels.
      gl_PointSize = uSize * uPixelRatio * (150.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 1.0);
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

      // Pure color boost — no halo bleed onto base model.
      vec3 brightColor = vColor * uBrightness;
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
