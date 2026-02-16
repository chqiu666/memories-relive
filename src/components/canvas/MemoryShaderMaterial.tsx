import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend, ReactThreeFiber } from '@react-three/fiber'

const MemoryShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(0.1, 0.1, 0.2), // Dark atmospheric base
    uHighlightColor: new THREE.Color(1.5, 1.5, 2.0), // Bright bluish white for traces
    uPixelRatio: 1,
    uSize: 40, // Base point size
    uDepth: 0, // For potential future depth effects
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    
    attribute float aTraceMask; // 0 or 1, identifies trace points
    attribute vec3 aRandom; // Random values for noise/variation
    
    varying vec2 vUv;
    varying float vTraceMask;
    varying float vDepth;

    // Simplex noise function (simplified)
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

    void main() {
      vUv = uv;
      vTraceMask = aTraceMask;
      
      vec3 pos = position;
      
      // Wave effect: Sine wave based on time and position
      // Stronger at center or specific areas could be controlled by another attribute
      float noiseFreq = 0.5;
      float noiseAmp = 0.05;
      float wave = sin(uTime * 1.5 + pos.x * noiseFreq + pos.y * noiseFreq) * noiseAmp;
      
      // Apply wave only slightly to keep shape recognizable, 
      // maybe more intense for "unstable" memories
      pos.y += wave;
      pos.z += wave * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vDepth = -mvPosition.z;

      // Size attenuation: Points smaller when further away
      // gl_PointSize = uSize * uPixelRatio * (1.0 / -mvPosition.z);
      gl_PointSize = uSize * (10.0 / -mvPosition.z) * uPixelRatio;
      
      // Trace points slightly larger - DISABLED
      // if (vTraceMask > 0.5) {
      //   gl_PointSize *= 1.5;
      // }
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uHighlightColor;
    
    varying float vTraceMask;
    varying float vDepth;

    void main() {
      // Circular point shape
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;
      float delta = fwidth(r);
      float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);

      // Defualt color
      vec3 finalColor = uColor;
      
      // Trace Highlight Flow Effect - DISABLED
      // if (vTraceMask > 0.5) {
      //   // Flowing light effect using time
      //   float flow = sin(uTime * 3.0 + vDepth * 0.5); // Flow along depth
      //   flow = smoothstep(-0.2, 0.2, flow); // Sharpen flow
      //   
      //   // Mix highlight based on flow
      //   finalColor = mix(uColor, uHighlightColor, flow * 0.8 + 0.2);
      //   
      //   // Add glow bloom (simple brightness boost)
      //   finalColor *= 2.0;
      // }

      // Chromatic Aberration (Simulated shift based on screen position/coord)
      // For points, true chromatic aberration is hard in fragment shader on single point, 
      // but we can color shift based on screen position or depth.
      // Simple fake: slight RGB split at edges of point
      // vec3 shiftColor = finalColor;
      // shiftColor.r *= 1.0 + length(cxy) * 0.1;
      // shiftColor.b *= 1.0 - length(cxy) * 0.1;
      
      // Vignette (distance from center of screen)
      // gl_FragCoord integration...

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
)

extend({ MemoryShaderMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      memoryShaderMaterial: any // ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof MemoryShaderMaterial>
    }
  }
}

export { MemoryShaderMaterial }
