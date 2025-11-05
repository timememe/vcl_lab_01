
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pixel_size;
uniform float u_glitch_amount;
uniform vec4 u_box_rect; // x, y, width, height
uniform vec3 u_glow_color;

// Pseudo-random number generator
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// 8x8 Bayer matrix
mat4 bayer4 = mat4(
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
);

float bayer(vec2 coord) {
    float x = mod(coord.x, 4.0);
    float y = mod(coord.y, 4.0);
    
    // Manual matrix lookup
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

// Signed Distance Function for a box
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main() {
  // Use the actual fragment coordinate for higher precision distance calculation
  vec2 frag_coord = gl_FragCoord.xy;

  // Box properties from uniform
  vec2 box_pos = u_box_rect.xy;
  vec2 box_size = u_box_rect.zw;
  vec2 box_center = box_pos + box_size * 0.5;

  // --- Glitch Effect ---
  float glitch_rand = rand(vec2(frag_coord.y, u_time * 0.1));
  if (glitch_rand > (1.0 - u_glitch_amount * 0.1)) {
      float offset = (rand(vec2(u_time, frag_coord.y)) - 0.5) * 20.0 * u_glitch_amount;
      frag_coord.x += offset;
  }

  // --- SDF Calculation ---
  vec2 p = frag_coord - box_center;
  float dist = sdBox(p, box_size * 0.5);

  // Discard fragment if it's inside the box
  if (dist <= 0.0) {
    discard;
  }

  // --- Glow Calculation ---
  float glow_width = 80.0 + sin(u_time * 0.8) * 20.0;
  float glow = 1.0 - smoothstep(0.0, glow_width, dist);
  // Fade out glow at the edges of the canvas to avoid hard cuts
  glow *= smoothstep(u_resolution.x * 0.5, u_resolution.x * 0.4, abs(gl_FragCoord.x - u_resolution.x * 0.5));
  glow *= smoothstep(u_resolution.y * 0.5, u_resolution.y * 0.4, abs(gl_FragCoord.y - u_resolution.y * 0.5));

  // --- Dithering ---
  vec2 pixel_coord = floor(gl_FragCoord.xy / u_pixel_size);
  float dither_threshold = bayer(pixel_coord) / 16.0;

  // --- Final Color ---
  float final_intensity = glow > dither_threshold ? 1.0 : 0.0;

  if (final_intensity == 0.0) {
    discard;
  }

  gl_FragColor = vec4(u_glow_color * final_intensity, final_intensity);
}
