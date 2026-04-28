import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const MemoryShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Vector3(0.8, 0.85, 0.9), // Fallback display-space color (light grey-blue)
    uPixelRatio: 1,
    uSize: 0.5, // Base point size
  },
  // ─── Vertex Shader ───
  /* glsl */ `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;

    attribute float aTraceMask;
    // 'color' attribute is automatically injected by Three.js when vertexColors is enabled

    varying vec3 vColor;
    varying float vDepth;

    void main() {
      vColor = color;

      vec3 pos = position;

      // Subtle wave animation
      float wave = sin(uTime * 0.8 + pos.x * 0.3 + pos.y * 0.3) * 0.02;
      pos.y += wave;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      vDepth = -mvPosition.z;

      // Size attenuation
      gl_PointSize = uSize * uPixelRatio * (150.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 1.0);
    }
  `,
  // ─── Fragment Shader ───
  /* glsl */ `
    uniform vec3 uColor;

    varying vec3 vColor;
    varying float vDepth;

    void main() {
      // Circular point shape
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;

      float delta = fwidth(r);
      float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);

      // PLYLoader from three-stdlib stores vertex colors as normalized sRGB.
      // Convert to linear here so direct rendering and EffectComposer agree.
      vec3 colorSRGB = (length(vColor) > 0.01) ? vColor : uColor;
      vec3 finalColor = sRGBTransferEOTF(vec4(max(colorSRGB, vec3(0.0)), 1.0)).rgb;

      gl_FragColor = vec4(finalColor, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
)

extend({ MemoryShaderMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      memoryShaderMaterial: any
    }
  }
}

export { MemoryShaderMaterial }
