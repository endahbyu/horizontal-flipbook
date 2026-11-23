// Scenery around the shapes: the backdrop and the dust.
//   · backdrop — a slanted two-tone gradient with slow drifting cloud, a darker pool behind the shape, two soft
//     beams of light and a little grain, painted on one screen-filling sheet behind everything;
//   · dust — specks that stay where they are in space: a wide flat layer the whole journey passes through,
//     a gathering of drifting bands around each stopping place, and a thin shell of dark specks far out.
//     They hold still; they only stream past when the camera travels. Every speck has a fixed size on
//     screen; the ones nearer or farther than the focus distance swell into soft, tinted discs.
import * as THREE from 'three';

const noise = /* glsl */ `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float cloud(vec2 p) {
  float sum = 0.0, weight = 0.5;
  for (int i = 0; i < 4; i++) {
    vec2 c = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    sum += weight * mix(mix(hash(c), hash(c + vec2(1.0, 0.0)), f.x), mix(hash(c + vec2(0.0, 1.0)), hash(c + vec2(1.0, 1.0)), f.x), f.y);
    p = p * 2.03 + 17.0; weight *= 0.5;
  }
  return sum;
}`;

export function makeBackdrop(light: THREE.Color, dark: THREE.Color, beam: THREE.Color) {
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAspect: { value: 1 }, uSway: { value: 0 }, uLight: { value: light }, uDark: { value: dark }, uBeam: { value: beam } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform float uTime, uAspect, uSway;
uniform vec3 uLight, uDark, uBeam;
varying vec2 vUv;
${noise}
void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // slanted gradient: light in one corner, dark in the opposite one
  float a = -2.4586; vec2 q = vUv - 0.5; float along = clamp(q.x * sin(a) + q.y * cos(a) + 0.5, 0.0, 1.0);
  vec3 colour = mix(uLight, uDark, along);
  // slow cloud, lifting patches towards the light tone
  colour = mix(colour, uLight, smoothstep(0.3, 0.85, cloud(p * 1.6 + uTime * 0.03)) * 0.75);
  // a darker pool a little right of the middle, behind the shape
  float pool = smoothstep(0.239, 1.439, 1.0 - distance(p, vec2(0.5 * uAspect + 0.2, 0.49)));
  colour = mix(colour, uDark, (1.0 - pow(1.0 - pool, 5.0)) * 0.85);
  // two soft beams, falling from the upper right to the lower left; they swing a little as the journey goes round
  float tilt = radians(54.0); vec2 b = p - vec2(0.5 * uAspect, 0.5);
  float across = b.x * cos(tilt) + b.y * sin(tilt) + uSway * 0.12, down = -b.x * sin(tilt) + b.y * cos(tilt);
  float streak = cloud(vec2(across * 9.0, down * 0.6 + uTime * 0.01));
  float beams = exp(-pow((across + 0.08) / 0.16, 2.0)) + 0.7 * exp(-pow((across - 0.42) / 0.11, 2.0));
  colour += uBeam * beams * (0.55 + 0.45 * streak) * 0.34 * smoothstep(-0.9, 0.5, down);
  colour += (hash(gl_FragCoord.xy) - 0.5) * 0.018; // a fixed grain, so the gradient never bands (it no longer flickers)
  gl_FragColor = vec4(colour, 1.0);
}`,
  }));
  sheet.frustumCulled = false; sheet.renderOrder = -100;
  return sheet;
}

/** Curved, fraying bands of specks around a point — dust caught in a draught. */
function bands(out: number[], centre: THREE.Vector3, count: number, kind: () => [number, number, number]) {
  const rnd = Math.random, gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5, v = new THREE.Vector3();
  const list = Array.from({ length: 7 }, () => {
    const a = rnd() * Math.PI * 2, r = 1.6 + rnd() * 2.6;
    const dir = new THREE.Vector3(Math.cos(a + Math.PI / 2) + (rnd() - 0.5) * 0.7, (rnd() - 0.35) * 0.7, Math.sin(a + Math.PI / 2) + (rnd() - 0.5) * 0.7).normalize();
    return { at: new THREE.Vector3(Math.cos(a) * r, (rnd() - 0.5) * 2.4, Math.sin(a) * r), dir, across: new THREE.Vector3(-dir.y, dir.x, 0).normalize(), length: 3 + rnd() * 4, width: 0.5 + rnd() * 0.9, wave: rnd() * 6 };
  });
  for (let i = 0; i < count; i++) {
    const b = list[i % list.length], t = gauss() * 0.5, w = b.width * (0.4 + Math.abs(t) * 2.4); // tight in the middle, fraying towards the ends
    v.copy(b.at).addScaledVector(b.dir, t * b.length).addScaledVector(b.across, Math.sin(t * 5 + b.wave) * 0.35);
    v.x += gauss() * w; v.y += gauss() * w; v.z += gauss() * w;
    if (v.length() < 1.7) v.setLength(1.7 + rnd() * 1.2); // nothing inside the shape itself
    out.push(centre.x + v.x, centre.y + v.y, centre.z + v.z, ...kind());
  }
}

/** All the dust, in world space. `places` are the stopping places on the ring; `ring` is its radius. */
/** The client's spectrum, from its artwork: top to bottom. */
// Weighted towards the warm end, so yellow and orange balance the pink, violet and blue: yellow and amber take the top half,
// then one stop each for pink and violet, and blue across the bottom.
const SPECTRUM = ['#ffc21a', '#ffc21a', '#ffb21c', '#ff9a1f', '#ff7a2a', '#ff4d6a', '#7a5cff', '#1e8bff'];

export function makeDust(places: THREE.Vector3[], ring: number, sparse: boolean, colours: THREE.Color[]) {
  const rnd = Math.random, data: number[] = []; // x, y, z, sharp size, blur size, colour index
  const layer = sparse ? 5000 : 15000, reach = ring * 2.2;
  for (let i = 0; i < layer; i++) data.push((rnd() * 2 - 1) * reach, (rnd() * 2 - 1) * 3.4, (rnd() * 2 - 1) * reach, 3, 24, i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0); // the wide flat layer: a third dark, the rest pale
  for (let i = 0; i < (sparse ? 1500 : 4500); i++) { // more along the ring itself, where the camera travels, so there is always something drifting past close by
    const a = rnd() * Math.PI * 2, r = ring + (rnd() * 2 - 1) * 2.6;
    data.push(Math.cos(a) * r, (rnd() * 2 - 1) * 1.8, Math.sin(a) * r, 3, 26, i % 4 === 0 ? 2 : i % 4 === 1 ? 1 : 0);
  }
  for (let i = 0; i < (sparse ? 260 : 700); i++) { // a few specks right along the camera's path: close by they show as large, soft, tinted discs (the reference's bokeh)
    const a = rnd() * Math.PI * 2, r = ring + (rnd() * 2 - 1) * 1.3;
    data.push(Math.cos(a) * r, (rnd() * 2 - 1) * 1.1, Math.sin(a) * r, 4, 56, i % 3 === 0 ? 3 : 0);
  }
  for (const place of places) bands(data, place, sparse ? 900 : 2400, () => { const r = rnd(); return [3.5, 16, r < 0.6 ? 0 : r < 0.75 ? 3 : r < 0.85 ? 2 : 1]; });
  for (let i = 0; i < 1000; i++) { // the far shell of dark specks
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = ring * 0.89;
    data.push(Math.cos(a) * s * r, u * r, Math.sin(a) * s * r, 4.5, 10, 2);
  }
  const n = data.length / 6, position = new Float32Array(n * 3), kind = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { position.set(data.slice(i * 6, i * 6 + 3), i * 3); kind.set(data.slice(i * 6 + 3, i * 6 + 6), i * 3); for (let k = 0; k < 4; k++) seed[i * 4 + k] = rnd(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3)); g.setAttribute('aKind', new THREE.BufferAttribute(kind, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const points = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uRatio: { value: 1 }, uFocus: { value: 4.46 }, uRange: { value: 6.5 }, uCalm: { value: 0 }, uShow: { value: 1 }, uColours: { value: colours }, uSpectrum: { value: SPECTRUM.map((h) => new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)) }, uSpectrumShare: { value: 0.45 } /* the hex values as they are (no linear conversion), so yellow stays yellow */ },
    vertexShader: /* glsl */ `
uniform float uTime, uRatio, uFocus, uRange, uCalm;
attribute vec3 aKind; attribute vec4 aSeed;
varying float vBlur; varying float vTint; varying vec2 vSeed; varying float vBand;
void main() {
  vec3 p = position; // the dust holds still, so the shape in front stands out (it only seems to move as the camera travels)
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float away = length(mv.xyz) - uFocus, amount = smoothstep(0.0, uRange, abs(away));
  float front = away < 0.0 ? amount : 0.0, back = away > 0.0 ? amount : 0.0;
  if (back > 0.9) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);                                   // too far: not drawn
  gl_PointSize = (aKind.x * (1.0 - 0.45 * uCalm) + front * aKind.y * (0.75 + 0.25 * aSeed.z) * (1.0 - uCalm) + back * aSeed.x) * uRatio;
  vBlur = clamp(front + back, 0.0, 1.0); vTint = aKind.z; vSeed = aSeed.xy;
  vBand = clamp(0.5 - 0.5 * gl_Position.y / gl_Position.w, 0.0, 1.0); // 0 at the top of the screen, 1 at the bottom
}`,
    fragmentShader: /* glsl */ `
uniform vec3 uColours[4]; uniform vec3 uSpectrum[8]; uniform float uCalm, uShow, uSpectrumShare;
varying float vBand;
varying float vBlur; varying float vTint; varying vec2 vSeed;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float soft = 1.0 - smoothstep(0.28 + 0.6 * vBlur, 1.0, r);          // a speck with a soft edge; a blurred one is a flat disc
  vec3 tint = vTint < 0.5 ? uColours[0] : vTint < 1.5 ? uColours[1] : vTint < 2.5 ? uColours[2] : uColours[3];
  // the client's spectrum (yellow at the top of the screen through orange, red, pink, magenta, violet to blue at the bottom),
  // laid out in order like the lines in its artwork; it colours some of the specks and most of the soft discs, never the shapes
  bool spectral = vSeed.y < uSpectrumShare + 0.35 * vBlur;
  if (spectral) {
    float k = vBand * 7.0; int a = int(floor(k)); float f = fract(k);
    vec3 band = uSpectrum[0];
    for (int n = 0; n < 7; n++) if (n == a) band = mix(uSpectrum[n], uSpectrum[n + 1], f);
    if (a >= 7) band = uSpectrum[7];
    tint = band;
  }
  vec3 colour = mix(mix(tint, vec3(1.0), spectral ? 0.18 : vTint > 1.5 && vTint < 2.5 ? 0.0 : 0.55), tint, smoothstep(0.0, 0.5, vBlur)); // sharp specks are nearly white, blurred discs take their tint
  float alpha = soft * 0.85 * (1.0 - vBlur * (0.55 + 0.25 * vSeed.x)) * (1.0 - uCalm * (0.35 + 0.65 * smoothstep(0.0, 0.25, vBlur))) * uShow;
  if (spectral) alpha *= 0.95; // coloured dust shows clearly as many colours, yet its specks stay smaller and dimmer than the white shape in front
  if (alpha < 0.03) discard;
  gl_FragColor = vec4(colour, alpha);
}`,
  }));
  points.frustumCulled = false; points.renderOrder = -1;
  return points;
}
