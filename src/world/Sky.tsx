import { BackSide } from "three";
import { palette } from "./palette";

// A single inverted sphere with a cheap vertical gradient shader.
// No environment map, no post-processing.
const vertexShader = /* glsl */ `
  varying float vH;
  void main() {
    vH = normalize(position).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 top;
  uniform vec3 bottom;
  varying float vH;
  void main() {
    float t = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(mix(bottom, top, pow(t, 0.8)), 1.0);
  }
`;

export function Sky() {
  return (
    <mesh scale={120} frustumCulled={false}>
      <sphereGeometry args={[1, 24, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          top: { value: hexToVec(palette.skyTop) },
          bottom: { value: hexToVec(palette.skyBottom) },
        }}
      />
    </mesh>
  );
}

function hexToVec(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
