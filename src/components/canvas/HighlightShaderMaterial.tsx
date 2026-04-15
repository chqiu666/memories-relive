import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const HighlightShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uPixelRatio: 1,
    uSize: 0.5,
    uBrightness: 0.35,      // low base for additive — glow comes from blending, not brightness
    uSweepSpeed: 0.8,       // how fast the light band sweeps
    uSweepWidth: 2.0,       // width of the sweep band
  },
  // ─── Vertex Shader ───
  // NO position displacement — highlight points are locked to base model
  /* glsl */ `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;

    varying vec3 vColor;
    varying vec3 vWorldPos;

    void main() {
      vColor = color;

      vec3 pos = position;

      // Match base model wave animation exactly
      float wave = sin(uTime * 0.8 + pos.x * 0.3 + pos.y * 0.3) * 0.02;
      pos.y += wave;

      vWorldPos = pos;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation (match base model)
      gl_PointSize = uSize * uPixelRatio * (150.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 1.5);
    }
  `,
  // ─── Fragment Shader ───
  // iOS-style light sweep: a bright band sweeps across the surface over time
  /* glsl */ `
    uniform float uTime;
    uniform float uBrightness;
    uniform float uSweepSpeed;
    uniform float uSweepWidth;

    varying vec3 vColor;
    varying vec3 vWorldPos;

    void main() {
      // Circular point shape
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;

      float delta = fwidth(r);
      float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);

      // Light sweep: a band of brightness that moves across the model
      // Uses world-space diagonal (x + z) for sweep direction
      float sweepPos = vWorldPos.x + vWorldPos.z;
      float sweepCenter = uTime * uSweepSpeed;
      float sweepDist = abs(sweepPos - sweepCenter);

      // Wrap sweep using mod so it repeats smoothly
      float period = 20.0;
      float wrappedCenter = mod(sweepCenter, period) - period * 0.5;
      sweepDist = abs(sweepPos - wrappedCenter);

      // Smooth intensity falloff from sweep center
      float sweepIntensity = smoothstep(uSweepWidth, 0.0, sweepDist);

      // Base highlight: original color * brightness
      // Sweep adds extra glow on top
      float totalBright = uBrightness + sweepIntensity * 0.4;
      vec3 glowColor = vColor * totalBright;

      // Soft edge for additive blending
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
