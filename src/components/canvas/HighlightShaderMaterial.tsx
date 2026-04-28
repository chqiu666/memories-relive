import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const HighlightShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uPixelRatio: 1,
    uSize: 0.5,
    uBrightness: 1.5,       // brightness multiplier on original vertex color
  },
  // ─── Vertex Shader ───
  /* glsl */ `
    uniform float uPixelRatio;
    uniform float uSize;

    varying vec3 vColor;

    void main() {
      vColor = color;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation (match base model)
      gl_PointSize = uSize * uPixelRatio * (150.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 1.5);
    }
  `,
  // ─── Fragment Shader ───
  // Simple brightness boost — no sweep, no bloom needed
  /* glsl */ `
    uniform float uBrightness;

    varying vec3 vColor;

    void main() {
      // Circular point shape
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;

      float delta = fwidth(r);
      float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);

      // Brighten original color
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
