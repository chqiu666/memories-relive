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

      // Match base point size 1:1 — any larger sprite bleeds the
      // (now very bright) highlight color onto surrounding base pixels
      // and reads as whitewash on the main model.
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

      // Lift in display space, then convert the PLY sRGB color into
      // linear output so EffectComposer doesn't encode it a second time.
      vec3 liftedSRGB = sqrt(max(vColor, vec3(0.0)));
      vec3 brightSRGB = liftedSRGB * uBrightness;
      vec3 brightColor = sRGBTransferEOTF(vec4(max(brightSRGB, vec3(0.0)), 1.0)).rgb;

      gl_FragColor = vec4(brightColor, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
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
