import * as THREE from 'three';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { useRef } from 'react';

// A standard vertex shader for react-three-fiber
const DitherGlowVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Updated fragment shader with 3-layer pixel size and animation toggle
const DitherGlowFragmentShader = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_glitch_amount;
  uniform vec4 u_box_rect; // x, y, width, height
  uniform vec3 u_glow_color;
  uniform float u_pixel_size1;
  uniform float u_pixel_size2;
  uniform float u_pixel_size3;
  uniform bool u_animate;

  float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  mat4 bayer4 = mat4(
      0.0, 8.0, 2.0, 10.0,
      12.0, 4.0, 14.0, 6.0,
      3.0, 11.0, 1.0, 9.0,
      15.0, 7.0, 13.0, 5.0
  );

  float bayer(vec2 coord) {
      float x = mod(coord.x, 4.0);
      float y = mod(coord.y, 4.0);
      if (x < 1.0) {
          if (y < 1.0) return bayer4[0][0];
          if (y < 2.0) return bayer4[0][1];
          if (y < 3.0) return bayer4[0][2];
          return bayer4[0][3];
      } else if (x < 2.0) {
          if (y < 1.0) return bayer4[1][0];
          if (y < 2.0) return bayer4[1][1];
          if (y < 3.0) return bayer4[1][2];
          return bayer4[1][3];
      } else if (x < 3.0) {
          if (y < 1.0) return bayer4[2][0];
          if (y < 2.0) return bayer4[2][1];
          if (y < 3.0) return bayer4[2][2];
          return bayer4[2][3];
      } else {
          if (y < 1.0) return bayer4[3][0];
          if (y < 2.0) return bayer4[3][1];
          if (y < 3.0) return bayer4[3][2];
          return bayer4[3][3];
      }
      return 0.0; 
  }

  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  void main() {
    vec2 frag_coord = gl_FragCoord.xy;
    vec2 box_pos = u_box_rect.xy;
    vec2 box_size = u_box_rect.zw;
    vec2 box_center = box_pos + box_size * 0.5;
    float current_time = u_animate ? u_time : 0.0;

    if (u_animate && u_glitch_amount > 0.0) {
      float glitch_rand = rand(vec2(frag_coord.y, current_time * 0.1));
      if (glitch_rand > (1.0 - u_glitch_amount * 0.1)) {
          float offset = (rand(vec2(current_time, frag_coord.y)) - 0.5) * 20.0 * u_glitch_amount;
          frag_coord.x += offset;
      }
    }

    vec2 p = frag_coord - box_center;
    float dist = sdBox(p, box_size * 0.5);

    if (dist <= 0.0) {
      discard;
    }

    float glow_width = 80.0;
    if (u_animate) {
      glow_width += sin(current_time * 0.8) * 20.0;
    }
    float glow = clamp(1.0 - dist / glow_width, 0.0, 1.0);

    // Layered pixel size
    float pixel_size;
    if (dist < 40.0) {
      pixel_size = u_pixel_size1;
    } else if (dist < 80.0) {
      pixel_size = u_pixel_size2;
    } else {
      pixel_size = u_pixel_size3;
    }

    vec2 pixel_coord = floor(gl_FragCoord.xy / pixel_size);
    float dither_threshold = bayer(pixel_coord) / 16.0;

    float final_intensity = glow > dither_threshold ? 1.0 : 0.0;

    if (final_intensity == 0.0) {
      discard;
    }

    gl_FragColor = vec4(u_glow_color * final_intensity, final_intensity);
  }
`;

const DitherGlowMaterial = shaderMaterial(
  // Uniforms
  {
    u_time: 0,
    u_resolution: new THREE.Vector2(),
    u_glitch_amount: 0.03,
    u_box_rect: new THREE.Vector4(),
    u_glow_color: new THREE.Color(),
    u_pixel_size1: 8.0,
    u_pixel_size2: 4.0,
    u_pixel_size3: 2.0,
    u_animate: true,
  },
  // Vertex Shader
  DitherGlowVertexShader,
  // Fragment Shader
  DitherGlowFragmentShader
);

extend({ DitherGlowMaterial });

interface DitherGlowR3FProps {
  glitchAmount: number;
  boxRect: { x: number; y: number; width: number; height: number; } | null;
  glowColor: [number, number, number];
  pixelSize1: number;
  pixelSize2: number;
  pixelSize3: number;
  animate: boolean;
}

const Scene: React.FC<DitherGlowR3FProps> = (props) => {
  const materialRef = useRef<any>();
  const { viewport, size } = useThree();

  useFrame((state) => {
    if (props.animate && materialRef.current) {
      materialRef.current.u_time = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      {/* @ts-ignore */}
      <ditherGlowMaterial 
        ref={materialRef} 
        u_resolution={new THREE.Vector2(size.width, size.height)}
        u_glitch_amount={props.glitchAmount}
        u_box_rect={props.boxRect ? new THREE.Vector4(props.boxRect.x, props.boxRect.y, props.boxRect.width, props.boxRect.height) : new THREE.Vector4()}
        u_glow_color={new THREE.Color(...props.glowColor)}
        u_pixel_size1={props.pixelSize1}
        u_pixel_size2={props.pixelSize2}
        u_pixel_size3={props.pixelSize3}
        u_animate={props.animate}
        transparent={true}
      />
    </mesh>
  );
};

const DitherGlowR3F: React.FC<DitherGlowR3FProps> = (props) => {
  return (
    <Canvas orthographic>
      <Scene {...props} />
    </Canvas>
  );
};

export default DitherGlowR3F;