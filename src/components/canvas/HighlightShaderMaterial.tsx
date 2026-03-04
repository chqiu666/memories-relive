import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const HighlightShaderMaterial = shaderMaterial(
    {
        uTime: 0,
        uPixelRatio: 1,
        uSize: 0.5,
        uBrightness: 2.5,       // glow multiplier
        uWaveAmplitude: 0.03,   // how much points float
        uWaveSpeed: 1.2,        // animation speed
    },
  // ─── Vertex Shader ───
  /* glsl */ `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    uniform float uWaveAmplitude;
    uniform float uWaveSpeed;

    varying vec3 vColor;
    varying float vDepth;

    void main() {
      vColor = color;

      vec3 pos = position;

      // Smooth sine-wave vertical float based on world position
      float wave = sin(uTime * uWaveSpeed + pos.x * 2.0 + pos.z * 1.5) * uWaveAmplitude;
      wave += sin(uTime * uWaveSpeed * 0.7 + pos.z * 3.0) * uWaveAmplitude * 0.5;
      pos.y += wave;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // ── Anti-flicker depth bias ──
      // Pull highlight layer slightly toward camera in clip space
      // to prevent z-fighting with the base model without disabling depth
      gl_Position.z -= 0.005 * gl_Position.w;

      vDepth = -mvPosition.z;

      // Size attenuation
      gl_PointSize = uSize * uPixelRatio * (150.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 1.5);
    }
  `,
  // ─── Fragment Shader ───
  /* glsl */ `
    uniform float uBrightness;

    varying vec3 vColor;
    varying float vDepth;

    void main() {
      // Circular point shape
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;

      float delta = fwidth(r);
      float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);

      // Self-illumination: boost vertex color for glow
      vec3 glowColor = vColor * uBrightness;

      // Soft edge falloff for additive blending
      float edgeFade = 1.0 - smoothstep(0.3, 1.0, r);
      alpha *= edgeFade;

      gl_FragColor = vec4(glowColor, alpha);
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
