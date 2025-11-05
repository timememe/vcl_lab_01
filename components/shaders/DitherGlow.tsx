
import React, { useRef, useEffect } from 'react';
import vertexShaderSource from './DitherGlow.vert?raw';
import fragmentShaderSource from './DitherGlow.frag?raw';

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

interface DitherGlowProps {
  pixelSize: number;
  glitchAmount: number;
  boxRect: { x: number; y: number; width: number; height: number; } | null;
  glowColor: [number, number, number];
}

const DitherGlow: React.FC<DitherGlowProps> = ({ pixelSize, glitchAmount, boxRect, glowColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformLocationsRef = useRef<{
    resolution: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    pixelSize: WebGLUniformLocation | null;
    glitchAmount: WebGLUniformLocation | null;
    boxRect: WebGLUniformLocation | null;
    glowColor: WebGLUniformLocation | null;
  } | null>(null);
  const positionAttributeLocationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;
    programRef.current = program;

    positionAttributeLocationRef.current = gl.getAttribLocation(program, "a_position");
    uniformLocationsRef.current = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      pixelSize: gl.getUniformLocation(program, "u_pixel_size"),
      glitchAmount: gl.getUniformLocation(program, "u_glitch_amount"),
      boxRect: gl.getUniformLocation(program, "u_box_rect"),
      glowColor: gl.getUniformLocation(program, "u_glow_color"),
    };

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    let animationFrameId: number;
    let startTime = performance.now();

    const render = (currentTime: number) => {
      const time = (currentTime - startTime) * 0.001; // convert to seconds

      const currentGl = glRef.current;
      const currentProgram = programRef.current;
      const currentUniformLocations = uniformLocationsRef.current;
      const currentPositionAttributeLocation = positionAttributeLocationRef.current;

      if (!currentGl || !currentProgram || !currentUniformLocations || currentPositionAttributeLocation === null) {
        return;
      }

      currentGl.viewport(0, 0, currentGl.canvas.width, currentGl.canvas.height);
      currentGl.clear(currentGl.COLOR_BUFFER_BIT);

      currentGl.useProgram(currentProgram);

      currentGl.enableVertexAttribArray(currentPositionAttributeLocation);
      currentGl.bindBuffer(currentGl.ARRAY_BUFFER, positionBuffer);
      currentGl.vertexAttribPointer(currentPositionAttributeLocation, 2, currentGl.FLOAT, false, 0, 0);

      currentGl.uniform2f(currentUniformLocations.resolution, currentGl.canvas.width, currentGl.canvas.height);
      currentGl.uniform1f(currentUniformLocations.time, time);

      currentGl.drawArrays(currentGl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Empty dependency array for initial setup

  useEffect(() => {
    const currentGl = glRef.current;
    const currentProgram = programRef.current;
    const currentUniformLocations = uniformLocationsRef.current;

    if (currentGl && currentProgram && currentUniformLocations) {
      currentGl.useProgram(currentProgram);
      currentGl.uniform1f(currentUniformLocations.pixelSize, pixelSize);
      currentGl.uniform1f(currentUniformLocations.glitchAmount, glitchAmount);
      currentGl.uniform3fv(currentUniformLocations.glowColor, glowColor);
      if (boxRect) {
        currentGl.uniform4f(currentUniformLocations.boxRect, boxRect.x, boxRect.y, boxRect.width, boxRect.height);
      }
    }
  }, [pixelSize, glitchAmount, boxRect, glowColor]); // Dependencies for uniform updates

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }} />;
};

export default DitherGlow;
