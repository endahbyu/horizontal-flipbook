// Shader for the shape's particles. Each particle is a tiny dot of a fixed size on screen.
//   · light: every dot is shaded from the direction its surface faces, the way a lit ball would be
//     (soft light from the upper right, a highlight, a bright rim), so the shape reads as a solid form;
//   · depth: dots on the far side are a little smaller and fainter;
//   · focus: dots that come nearer than the focus distance grow into soft discs, so flying into a
//     shape fills the view with large blurred grains.

export const shapeVertex = /* glsl */ `
uniform float uDot;        // diameter of a sharp dot, in device pixels
uniform float uBlur;       // extra diameter of a fully blurred dot, in device pixels
uniform float uFocus;      // distance from the camera that is perfectly sharp
uniform float uRange;      // distance over which blur builds up
uniform float uReach;      // the shape's radius, for telling its near side from its far side
uniform vec3 uLight;       // direction towards the light, as the camera sees it

attribute vec4 aSeed;

varying float vBright;
varying float vBlur;
varying float vSeed;
varying float vHaze;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;

  // the lit ball
  float bright = 0.7;
  vec3 n = normalMatrix * normal;
  if (dot(n, n) > 0.01) {
    n = normalize(n);
    float wrap = dot(n, uLight) * 0.5 + 0.5;                                  // light wraps round to the shadow side
    float shine = pow(max(dot(reflect(-uLight, n), vec3(0.0, 0.0, 1.0)), 0.0), 10.0);
    float rim = pow(1.0 - abs(n.z), 3.0);
    bright = clamp(0.42 + 0.5 * pow(wrap, 1.4) + 0.4 * shine + 0.18 * rim, 0.0, 1.0);
  }
  if (aSeed.x > 0.88) bright = min(1.0, bright + 0.35);                       // a few grains always catch the light

  float centre = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;
  float near = clamp(((mv.z - centre) / uReach + 0.5) / 0.9, 0.0, 1.0);       // 1 on the side facing the camera, 0 at the back
  vHaze = 0.55 + 0.45 * near;

  float away = length(mv.xyz) - uFocus;
  float blur = smoothstep(0.0, uRange, abs(away)) * (away < 0.0 ? 1.0 : 0.04); // only dots nearer than the focus blur fully
  gl_PointSize = uDot * (0.8 + aSeed.w * 0.5) * (0.8 + 0.2 * near) + blur * uBlur * (0.75 + aSeed.y * 0.25);
  vBright = bright; vBlur = blur; vSeed = aSeed.z;
}
`;

export const shapeFragment = /* glsl */ `
uniform vec3 uLit;         // colour of a fully lit dot
uniform vec3 uShade;       // colour of a dot in shadow
uniform vec3 uAccent;      // colour of the occasional tinted grain
uniform float uFade;       // overall visibility (drops while the shape scatters)

varying float vBright;
varying float vBlur;
varying float vSeed;
varying float vHaze;

void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float sharp = smoothstep(1.0, 0.55, r);                                          // a crisp dot with a soft edge
  float disc = smoothstep(1.0, 0.86, r) * (0.7 + 0.3 * smoothstep(0.3, 1.0, r));   // a flat disc with a brighter rim
  vec3 colour = mix(uShade, uLit, vBright);
  if (vSeed > 0.9) colour = mix(colour, uAccent, 0.75);
  // close up, a dot stays a solid pale grain; only when the camera is almost touching it does it thin out into a faint disc
  float grain = smoothstep(1.0, mix(0.55, 0.8, smoothstep(0.0, 0.15, vBlur)), r);
  float alpha = grain * mix((0.6 + 0.4 * vBright) * vHaze, 1.0, smoothstep(0.0, 0.06, vBlur)) * (1.0 - vBlur * (0.7 + 0.2 * vSeed));
  colour = mix(colour, uLit, smoothstep(0.0, 0.06, vBlur) * 0.7);
  gl_FragColor = vec4(colour, alpha * uFade);
}
`;
