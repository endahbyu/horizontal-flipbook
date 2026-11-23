<script setup lang="ts">
// Particle stage.
//   · the shape — tens of thousands of tiny dots on the active topic's shape, lit from one side, with the
//     far side fading into a haze. Its behaviour follows the "Particle Sphere" component: it can be dragged
//     and thrown, the pointer pushes away the dots facing you, and a click scatters them. It turns slowly by
//     itself and gathers into the next shape as you scroll (lib/scrollTravel.ts).
//   · the scenery — the backdrop and the dust that stays put in space (lib/scenery.ts).
import * as THREE from 'three';
import { buildShape, scatter, NUMERALS, type Cloud, type ShapeName, type LandTest } from '~/lib/shapes';
import { loadLandTest } from '~/lib/landMask';
import { makeBackdrop, makeDust } from '~/lib/scenery';
import { shapeVertex, shapeFragment } from '~/lib/shapeShader';
import type { ScrollTravel } from '~/lib/scrollTravel';
import { studio, tileGeometry, iconTexture, makeToken, poseToken, dropToken, TILE_PX, type Token } from '~/lib/tokenMesh';
import { SPOT } from '~/components/TopicToken.vue';

const props = withDefaults(defineProps<{
  shapes: ShapeName[];   // one per topic, in order
  travel: ScrollTravel;
  count?: number;
  active?: boolean;      // false while loading: particles wait scattered, then fly in
  shift?: number;        // slide the picture sideways, as a fraction of the width (makes room for a panel)
  landUrl?: string;
  focused?: boolean;                          // a topic has been entered: move closer, calm the background
  points?: { slug: string; title: string; at?: [number, number]; image?: string }[]; // selectable points shown on the shape while focused; `at` = longitude, latitude on the globe
  card?: boolean;        // show a picture card beside the screen's edge for the point under the pointer
  token?: boolean;       // show the topic's token beside the shape
  tokenHover?: boolean;  // the pointer is on it
  tiles?: number;        // inside a topic: how many page tokens stand in a row under the shape
  tileIcons?: (string | undefined)[]; // each page token's own icon, if its page names one (lib/icons.ts PAGE_ICONS)
  tileHover?: number;    // which of them the pointer is on (-1: none)
  gallery?: boolean;     // the introduction: all six shapes float small around the screen, behind the welcome card
}>(), { gallery: false, count: 10000, active: true, shift: 0, landUrl: '', focused: false, points: () => [], card: false, token: false, tokenHover: false, tiles: 0, tileHover: -1 });
const emit = defineEmits<{ pick: [slug: string] }>();

const host = ref<HTMLElement>();
const markers = ref<HTMLElement[]>([]);
// the point under the pointer (or holding keyboard focus), and the last one shown, so the card keeps its content while it fades out
const hot = ref(-1), shown = ref<{ title: string; image?: string } | null>(null);
watch(hot, (k) => { if (k >= 0 && props.points[k]) shown.value = props.points[k]; });
watch(() => props.points, () => { hot.value = -1; });
const baseURL = useRuntimeConfig().app.baseURL;
const picture = (src?: string) => (src ? (/^(https?:)?\/\//.test(src) ? src : baseURL + src.replace(/^\//, '')) : '');

// stage
const SCALE = 1.2, FOV = 50, INTRO = 3.2;
// The journey runs round a ring. The shapes stand on it, a fifth of a turn apart; the camera travels along the same
// ring, so it flies straight through each shape on its way to the next, and rests a tenth of a turn before one.
const RING = 9.31, STEP = Math.PI * 0.4;
const FOCUS = 5.1, FOCUS_RANGE = 18; // dots at this distance from the camera are sharp; nearer ones swell into discs over this range
const BREATH = 0.022, BREATH_PACE = 10.25; // idle shimmer: how far each particle moves in and out along its surface, and how fast (the quickest ones about 1.6 times a second)
const TURN_SPEED = 0.12; // idle turn, radians per second (about one full turn every 50 seconds)
const SCATTER = 1.05; // leaving a topic: how far each particle drifts out along its own random direction — the shape swells into a cloud about twice its size and fades
// Particle Sphere settings (its defaults plus the supplied preset; frame-based values are per 1/60 s)
const SPEED = 2;              // "speed 20": scales pushing and how fast particles return
const SMOOTH = 0.03;          // "smoothing 10": how quickly the shape catches up with a drag
const THROW_DECAY = 0.96;     // how long a thrown shape keeps turning
const DRAG = 0.0105;          // "drag speed 5": radians per pixel dragged
const RADIUS = 40;            // pointer reach, CSS pixels
const STRENGTH = 15;          // "cursor strength 10"
const CLICK = 10;             // click scatter force
const FRICTION = 0.94, RETURN = 0.015, SCATTER_FRICTION = 0.95;
const NEAR_GLOBE = 0.29, NEAR_OTHER = 0.04, LIFT = 0.22; // entering a topic: how much closer the camera comes (share of its distance), and how far the shape rises
const CARD_H = 195;           // the picture card's height, CSS pixels (matches .card below)
const DOT = 2.4, BLUR = 70;   // a sharp dot's diameter and the extra diameter of a fully blurred one, CSS pixels
// how many of the stage's dots each shape uses: the globe is dense, the others are drawn sparsely so they stay see-through
const SHARE: Record<ShapeName, number> = { globe: 0.15, /* land only covers about a third of its sphere, so this gives it about the same spacing between dots as the other shapes */ flask: 0.26, bottle: 0.26, bulb: 0.26, chain: 0.34, target: 0.28 };
// each shape's resting pose: how far it leans over (radians, anticlockwise as seen on screen) and how far it tips towards the viewer
const POSE: Record<ShapeName, [lean: number, tip: number]> = { globe: [0.12, 0.1], flask: [0.06, 0.1], bottle: [0.06, 0.1], bulb: [0.04, 0.1], chain: [0.03, 0.08], target: [-0.1, 0.25] };
// how large each shape stands, as a multiple of the globe's size: the globe fills a little under half the screen's height, the others about two thirds
const SIZE: Record<ShapeName, number> = { globe: 1, flask: 1.28, bottle: 1.28, bulb: 1.45, chain: 1.5, target: 1.5 };
const PHONE: Record<ShapeName, number> = { globe: 1, flask: 1, bottle: 1, bulb: 0.8, chain: 1, target: 0.68 }; // on phones the wide shapes are drawn smaller still, so they fit the screen's width
type Shape = Cloud & { count: number; lean: number; tip: number; reach: number; spins: boolean };
// lighting: one light, fixed relative to the camera (up, a little to the right, in front), like a studio lamp
const LIGHT = new THREE.Vector3(0.4, 0.75, 0.55).normalize();

let renderer: THREE.WebGLRenderer | undefined;
let balls: THREE.Points | undefined, field: THREE.Points | undefined, backdrop: THREE.Mesh | undefined; // `balls`: the shape's dots
let clouds: Shape[] = [], isLand: LandTest | undefined;
let from: Shape, to: Shape, showing: Shape; // the journey's two shapes, and the one on screen right now
let disperse = 1, shownKey = -1, autoTurn = 0;
let seeds = new Float32Array(0), current = new Float32Array(0), offsets = new Float32Array(0), velocities = new Float32Array(0);
let pair = -1, intro = 0, started = false;
let width = 1, height = 1, frameId = 0, observer: ResizeObserver | undefined, disposed = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
const mount = new THREE.Group(), pivot = new THREE.Group(); // mount: the shape's place on the ring, turned to face the camera; pivot: its own pose inside that
mount.add(pivot); scene.add(mount);
const onRing = (angle: number, out: THREE.Vector3) => out.set(Math.cos(angle) * RING, 0, Math.sin(angle) * RING);
let arrival = 1; // a new shape brightens in over 0.6 s rather than popping on
let scatterT = 1; // 0 = the shape is whole, 1 = scattered; moves at a steady pace, shaped by an ease
const pointer = { px: 0, py: 0, x: 0, y: 0, tx: 0, ty: 0, on: 0, target: 0, inside: false, click: false };
const spin = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, dragging: false, moved: 0, lastX: 0, lastY: 0, lastT: 0 }; // x = turn, y = tilt
let shiftNow = 0, focusNow = 0, leanNow = 0, tipNow = 0, nearNow = 0, liftNow = 0;
// tokens: glossy tiles that live in the scene but keep their place on screen (they ride with the camera)
const TOKEN_DEPTH = 4; // how far in front of the camera they float
const rig = new THREE.Group();
camera.add(rig); scene.add(camera);
// the introduction's gallery: one small cloud per shape, riding with the camera at a fixed place on screen
// (where the reference puts them: flask upper left, globe top, ring upper right, bottle left, chain bottom, bulb right)
const GALLERY: [ShapeName, number, number, number][] = [['flask', 0.2, 0.31, 0.9], ['globe', 0.5, 0.13, -0.2], ['target', 0.86, 0.26, 0.5], ['bottle', 0.12, 0.66, 1], ['chain', 0.44, 0.83, 1.3], ['bulb', 0.86, 0.72, -0.3]];
let gallery: { points: THREE.Points; fx: number; fy: number }[] = [], galleryShow = 0;
let tokenT = 0; // the topic token's arrival, 0 (away) … 1 (in place)
let mainToken: Token | undefined, tileTokens: Token[] = [], tileClock = 0, tokenShape: ShapeName | undefined, framePx = 20;
const icons = new Map<ShapeName, THREE.Texture>();
let anchors: number[] = []; // which particle each point sits on
const colorMain = new THREE.Color(), colorAccent = new THREE.Color(), colorStage = new THREE.Color();

const cssColor = (name: string, fallback: string) => new THREE.Color(getComputedStyle(host.value!).getPropertyValue(name).trim() || fallback);
const wrap = (i: number) => ((i % props.shapes.length) + props.shapes.length) % props.shapes.length;

/** Where the topic's token sits on screen (its centre, CSS pixels) — the same place as its button in TopicToken.vue. */
function tokenSpot(name: ShapeName): [number, number, number] {
  if (width <= 800) { const size = TILE_PX * 0.75; return [Math.max(framePx + 56 + size / 2, width * 0.27), height * 0.67, 0.75]; } // phones: smaller, at the lower left of the shape, clear of the rail and fully on screen
  return [width / 2 + SPOT[name][0] * Math.min(width, height * 1.5) + TILE_PX / 2, height / 2 + SPOT[name][1] * height + TILE_PX / 2, 1];
}
/** Where page token i of n stands — the same row as PageTokens.vue lays out. */
function slot(i: number, n: number): [number, number] {
  const middle = (n - 1) / 2, gap = Math.max(40, Math.min(89.6, width * 0.075));
  return [width / 2 + (i - middle) * (TILE_PX + gap), height * 0.69 + (1 - Math.min(1, Math.abs(i - middle))) * 9];
}
function setTile(t: Token, x: number, y: number, size: number) { // centre in CSS pixels, width in CSS pixels
  const unit = (2 * TOKEN_DEPTH * Math.tan(THREE.MathUtils.degToRad(FOV) / 2)) / height; // scene units per CSS pixel at the tokens' depth
  t.group.position.set((x - width / 2) * unit, -(y - height / 2) * unit, -TOKEN_DEPTH); t.group.scale.setScalar(size * unit);
}
const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function placeTokens(dt: number, time: number, f: number, still: boolean) { // f: how far the journey is from one topic's resting place to the next (0 … 1)
  if (!mainToken) return;
  const name = props.shapes[wrap(Math.round(props.travel.state.progress))] ?? 'globe';
  if (name !== tokenShape) { // the icon changes while the token is out of sight, half-way between two topics
    tokenShape = name;
    if (!icons.has(name)) icons.set(name, iconTexture(name, getComputedStyle(host.value!).getPropertyValue('--accent-deep').trim() || '#2440c9'));
    for (const t of [mainToken, ...tileTokens]) { t.face.map = icons.get(name)!; t.face.needsUpdate = true; t.group.userData.icon = name; }
  }
  const follow = (rate: number) => (still ? 1 : 1 - Math.exp(-dt * rate));
  const [sx, sy, sk] = tokenSpot(name), m = mainToken, bob = still ? 0 : Math.sin(time * 1.26) * 6;
  // the topic's token, as on the reference: it is away for the middle of each journey (0.4 … 0.8); coming back it turns half a
  // turn round and rises from below into place (1.5 s, slowing to a stop), and leaving it does the same in reverse (1 s)
  const on = props.token && intro >= 1 && !(f > 0.4 && f < 0.8);
  tokenT = still ? (on ? 1 : 0) : Math.min(1, Math.max(0, tokenT + (on ? dt / 1.5 : -dt / 1)));
  const arrive = 1 - Math.pow(2, -10 * tokenT), shown = Math.min(1, tokenT * 1.5);
  m.seen = props.token ? shown : Math.max(0, m.seen - dt * 6);
  const swayX = still ? 0 : Math.sin(time * 0.9) * 4, swayY = still ? 0 : Math.sin(time * 0.7 + 1) * 6; // a slow, small rock, as on the reference
  m.turnX += (-5 + swayX + pointer.y * 5 * pointer.on - m.turnX) * follow(6); m.turnY += (-9 + swayY + pointer.x * 7 * pointer.on - m.turnY) * follow(6);
  setTile(m, sx, sy + (1 - arrive) * height * 0.12 + bob, TILE_PX * sk * (0.7 + 0.3 * shown) * (props.tokenHover ? 1.06 : 1));
  poseToken(m, m.seen, m.turnX, m.turnY + (1 - arrive) * 180, still ? 0 : Math.sin(time * 0.6) * 3);
  // page tokens: they leave the topic token's place one after another and line up under the shape
  const n = props.tiles;
  tileClock = n ? tileClock + dt : 0;
  for (let i = 0; i < tileTokens.length; i++) {
    const t = tileTokens[i], on = i < n, middle = (Math.max(n, 1) - 1) / 2;
    const own = props.tileIcons?.[i], key = own ? `page:${own}` : name;
    if (t.group.userData.icon !== key) { // the page's own icon, or else its topic's
      if (own && !icons.has(key as ShapeName)) icons.set(key as ShapeName, iconTexture(name, getComputedStyle(host.value!).getPropertyValue('--accent-deep').trim() || '#2440c9', own));
      t.face.map = icons.get(key as ShapeName) ?? icons.get(name)!; t.face.needsUpdate = true; t.group.userData.icon = key;
    }
    t.seen = on ? Math.min(1, Math.max(0, (tileClock - 0.15 - i * 0.11) / 0.8)) : Math.max(0, t.seen - dt / 0.25);
    if (still && on) t.seen = 1;
    const k = on ? easeOut(t.seen) : 1, [tx, ty] = on ? slot(i, n) : [t.group.userData.x ?? 0, t.group.userData.y ?? 0], hot = props.tileHover === i;
    const x = sx + (tx - sx) * k, y = sy + (ty - sy) * k;
    if (on) { t.group.userData.x = tx; t.group.userData.y = ty; }
    t.turnX += ((hot ? 0 : -8) - t.turnX) * follow(8); t.turnY += ((hot ? 0 : -16 - (i - middle) * 7) - t.turnY) * follow(8);
    setTile(t, x, y - (hot ? 6 : 0) + bob * 0.4 * Math.cos(i * 1.7), TILE_PX * (0.55 + 0.45 * k));
    poseToken(t, on ? Math.min(1, t.seen * 3) : t.seen, t.turnX + (1 - k) * 30, t.turnY - (1 - k) * 50);
  }
}

function drop(o?: THREE.Points) { if (o) { o.removeFromParent(); o.geometry.dispose(); (o.material as THREE.Material).dispose(); } }

function build() {
  drop(balls); drop(field); if (backdrop) { backdrop.removeFromParent(); backdrop.geometry.dispose(); (backdrop.material as THREE.Material).dispose(); }
  resize(); // the screen's width decides how large the shapes are
  const n = props.count;
  clouds = props.shapes.map((name) => { // every shape is stored at full length; the dots it does not use are simply not drawn
    const size = SIZE[name] * (width <= 800 ? PHONE[name] : 1), count = Math.round(n * SHARE[name]), c = buildShape(name, count, isLand), positions = new Float32Array(n * 3), normals = new Float32Array(n * 3);
    for (let i = 0; i < count * 3; i++) { positions[i] = c.positions[i] * SCALE * size; normals[i] = c.normals[i]; }
    return { positions, normals, count, lean: POSE[name][0], tip: POSE[name][1], reach: SCALE * size, spins: name === 'globe' };
  });
  seeds = Float32Array.from({ length: n * 4 }, () => Math.random());
  offsets = new Float32Array(n * 3); velocities = new Float32Array(n * 3);
  const first = clouds[wrap(Math.floor(props.travel.state.progress))];
  from = first; to = first; showing = first;
  current = first.positions.slice(); shownKey = -1;
  pair = -1;

  // the shape's dots: positions and brightness are rewritten every frame
  colorMain.copy(cssColor('--on-dark', '#ffffff')); colorAccent.copy(cssColor('--accent', '#c8d2ff')); colorStage.copy(cssColor('--stage-from', '#2440c9'));
  const dots = new THREE.BufferGeometry();
  dots.setAttribute('position', new THREE.BufferAttribute(current.slice(), 3).setUsage(THREE.DynamicDrawUsage));
  dots.setAttribute('normal', new THREE.BufferAttribute(first.normals.slice(), 3).setUsage(THREE.DynamicDrawUsage));
  dots.setDrawRange(0, first.count);
  dots.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  balls = new THREE.Points(dots, new THREE.ShaderMaterial({
    vertexShader: shapeVertex, fragmentShader: shapeFragment, transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uDot: { value: DOT }, uBlur: { value: BLUR }, uFocus: { value: FOCUS }, uRange: { value: FOCUS_RANGE }, uReach: { value: SCALE }, uLight: { value: LIGHT.clone() }, uFade: { value: 1 },
      uLit: { value: colorMain.clone() }, uShade: { value: colorStage.clone().lerp(colorAccent, 0.5) }, uAccent: { value: colorAccent.clone() },
    },
  }));
  balls.frustumCulled = false;
  pivot.add(balls);

  // scenery: the backdrop sheet, and dust that stays put in space around the ring's five stopping places
  const night = cssColor('--stage-to', '#070c33'), deep = cssColor('--brand-deep', '#101c66');
  backdrop = makeBackdrop(colorStage.clone().lerp(night, 0.1), colorStage.clone().lerp(night, 0.55), colorAccent.clone());
  scene.add(backdrop);
  field = makeDust(Array.from({ length: 5 }, (_, i) => onRing((i + 0.5) * STEP, new THREE.Vector3())), RING, width <= 800, [colorAccent.clone(), colorMain.clone(), deep.lerp(night, 0.3), colorStage.clone().lerp(colorAccent, 0.35)]);
  scene.add(field);
  resize();
}

/** Where every particle is right now: on the shape, or flown out from it along its own random direction.
 *  Leaving a topic scatters the old shape; arriving gathers the new one from the same scatter. */
function place(cloud: Shape, amount: number) {
  const key = clouds.indexOf(cloud) * 10 + amount; // skip the work when nothing changed
  if (key === shownKey) return;
  if (cloud !== showing && balls) { // a different shape: hand its surface directions to the shader, and draw only its dots
    const nr = balls.geometry.getAttribute('normal') as THREE.BufferAttribute; (nr.array as Float32Array).set(cloud.normals); nr.needsUpdate = true;
    balls.geometry.setDrawRange(0, cloud.count);
  }
  shownKey = key; showing = cloud; disperse = amount;
  const a = cloud.positions, out = current, n = out.length / 3;
  if (amount <= 0) { out.set(a); return; }
  const reach = SCATTER * amount;
  for (let i = 0; i < n; i++) {
    const s = i * 4, j = i * 3;
    out[j] = a[j] + (seeds[s + 1] * 2 - 1) * reach; out[j + 1] = a[j + 1] + (seeds[s + 2] * 2 - 1) * reach; out[j + 2] = a[j + 2] + (seeds[s + 3] * 2 - 1) * reach;
  }
}

/** Choose particles for the points. On the globe a point with a location sits on the nearest land particle;
 *  otherwise points are placed on the shape's front, well apart from each other. */
function chooseAnchors() {
  const cloud = clouds[wrap(Math.round(props.travel.state.progress))], k = props.points.length;
  anchors = [];
  if (!cloud || !k) return;
  const p = cloud.positions, n = cloud.count, step = Math.max(1, Math.floor(n / 600)), picked: number[] = [];
  if (props.shapes[wrap(Math.round(props.travel.state.progress))] === 'globe' && props.points.every((pt) => pt.at)) {
    let sx = 0, sz = 0;
    for (const pt of props.points) {
      const lon = (pt.at![0] * Math.PI) / 180, lat = (pt.at![1] * Math.PI) / 180;
      const x = Math.sin(lon) * Math.cos(lat) * SCALE, y = Math.sin(lat) * SCALE, z = Math.cos(lon) * Math.cos(lat) * SCALE;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < n; i++) { const d = (p[i * 3] - x) ** 2 + (p[i * 3 + 1] - y) ** 2 + (p[i * 3 + 2] - z) ** 2; if (d < bestD) { bestD = d; best = i; } }
      picked.push(best); sx += x; sz += z;
    }
    anchors = picked;
    // turn the globe so the middle of the locations faces the viewer
    const facing = -Math.atan2(sx, sz) - autoTurn;
    spin.tx = facing + Math.round((spin.x - facing) / (Math.PI * 2)) * Math.PI * 2; spin.ty = 0; spin.vx = spin.vy = 0;
    return;
  }
  const front = (i: number) => p[i * 3 + 2] > 0.3; // the side that faces the camera once the shape is turned to its front
  let best = -1; // start from the front particle that is highest and most to one side
  for (let i = 0; i < n; i += step) if (front(i) && (best < 0 || p[i * 3 + 1] - p[i * 3] > p[best * 3 + 1] - p[best * 3])) best = i;
  if (best < 0) best = 0;
  picked.push(best);
  while (picked.length < k) {
    let far = 0, farD = -1;
    for (let i = 0; i < n; i += step) {
      if (!front(i)) continue;
      let d = Infinity;
      for (const j of picked) d = Math.min(d, (p[i * 3] - p[j * 3]) ** 2 + (p[i * 3 + 1] - p[j * 3 + 1]) ** 2 + (p[i * 3 + 2] - p[j * 3 + 2]) ** 2);
      if (d > farD) { farD = d; far = i; }
    }
    picked.push(far);
  }
  anchors = picked;
  // turn the shape to its front (the nearest full turn) and level it, so every point starts in view
  spin.tx = -autoTurn + Math.round((spin.x + autoTurn) / (Math.PI * 2)) * Math.PI * 2; spin.ty = 0; spin.vx = spin.vy = 0;
}

/** Keep each point glued to its particle on screen; points on the far side of the shape fade out. */
const anchorAt = new THREE.Vector3();
function placeMarkers() {
  const els = markers.value;
  if (!els.length || !balls) return;
  const centreDepth = camera.position.distanceTo(mount.position);
  for (let k = 0; k < els.length; k++) {
    const i = anchors[k], el = els[k];
    if (i === undefined || !el) continue;
    anchorAt.set(current[i * 3] + offsets[i * 3], current[i * 3 + 1] + offsets[i * 3 + 1], current[i * 3 + 2] + offsets[i * 3 + 2]).applyMatrix4(balls.matrixWorld);
    const near = camera.position.distanceTo(anchorAt) < centreDepth + 0.25;
    anchorAt.project(camera);
    const x = (anchorAt.x * 0.5 + 0.5) * width, y = (-anchorAt.y * 0.5 + 0.5) * height;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.classList.toggle('behind', !near);
    if (k === hot.value) { host.value!.style.setProperty('--hx', `${x.toFixed(1)}px`); host.value!.style.setProperty('--hy', `${y.toFixed(1)}px`); host.value!.style.setProperty('--ty', `${Math.max(72, Math.min(height - CARD_H - 112, y - CARD_H / 2)).toFixed(1)}px`); } // the card and its line follow this point
  }
}

function setPair(index: number) { pair = index; from = clouds[wrap(index)]; to = clouds[wrap(index + 1)]; }

function resize() {
  if (!host.value || !renderer) return;
  width = host.value.clientWidth || 1; height = host.value.clientHeight || 1;
  renderer.setSize(width, height, false);
  framePx = parseFloat(getComputedStyle(host.value).getPropertyValue('--frame')) * parseFloat(getComputedStyle(document.documentElement).fontSize) || 20;
  camera.aspect = width / height;
  mount.scale.setScalar(width <= 800 ? 0.85 : 1); // smaller shapes on phones, so wide ones fit
}

// ---- pointer physics ----
// Each particle has a displacement from its place in the shape, and a scatter velocity.
//   · pointer: particles on the near side, within RADIUS pixels of the pointer on screen, are pushed away from it
//   · click:   particles within RADIUS pixels get a velocity away from the clicked point
//   · always:  displacement and velocity shrink every frame, so particles drift back home
const toScreen = new THREE.Matrix4(), inverse = new THREE.Matrix4(), toCamera = new THREE.Vector3(), clickAt = new THREE.Vector3(), centre = new THREE.Vector3();
const camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), localRight = new THREE.Vector3(), localUp = new THREE.Vector3();

function simulate(df: number, still: boolean, time: number) {
  const pushing = pointer.inside && !still, burst = pointer.click; pointer.click = false;
  const n = offsets.length / 3, p = offsets, v = velocities, h = current;
  const giveBack = RETURN * SPEED * df, keep = Math.pow(FRICTION, df) * (1 - giveBack), keepVelocity = Math.pow(SCATTER_FRICTION, df) * (1 - giveBack);
  let e: number[] = [], g: number[] = [], l: number[] = [], frontZ = 0;
  if (pushing || burst) {
    balls!.updateWorldMatrix(true, false);
    toScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(balls!.matrixWorld);
    e = toScreen.elements; g = balls!.matrixWorld.elements;
    inverse.copy(balls!.matrixWorld).invert(); l = inverse.elements;
    camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize(); camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    localRight.copy(camRight).transformDirection(inverse); localUp.copy(camUp).transformDirection(inverse);
    centre.setFromMatrixPosition(balls!.matrixWorld); toCamera.copy(camera.position).sub(centre).normalize(); frontZ = centre.dot(toCamera);
    if (burst) clickAt.set((pointer.px / width) * 2 - 1, 1 - (pointer.py / height) * 2, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(camera.position.distanceTo(centre)).add(camera.position); // the click, at the shape's distance
  }
  const cx = toCamera.x, cy = toCamera.y, cz = toCamera.z, r2 = RADIUS * RADIUS, pushScale = STRENGTH * SPEED * df * 0.01;
  for (let i = 0; i < n; i++) {
    const ix = i * 3, iy = ix + 1, iz = ix + 2;
    if (pushing || burst) {
      const x = h[ix] + p[ix], y = h[iy] + p[iy], z = h[iz] + p[iz];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * 0.5 + 0.5) * width, sy = (-(e[1] * x + e[5] * y + e[9] * z + e[13]) / w * 0.5 + 0.5) * height;
      const dx = pointer.px - sx, dy = pointer.py - sy, d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0) {
        const d = Math.sqrt(d2), force = (RADIUS - d) / RADIUS;
        const wx = g[0] * x + g[4] * y + g[8] * z + g[12], wy = g[1] * x + g[5] * y + g[9] * z + g[13], wz = g[2] * x + g[6] * y + g[10] * z + g[14];
        if (pushing && wx * cx + wy * cy + wz * cz > frontZ) { // only the side facing the camera reacts
          const k = force * pushScale / d, rx = -dx * k, ry = dy * k; // away from the pointer, in screen directions
          p[ix] += localRight.x * rx + localUp.x * ry; p[iy] += localRight.y * rx + localUp.y * ry; p[iz] += localRight.z * rx + localUp.z * ry;
        }
        if (burst) {
          let ax = wx - clickAt.x, ay = wy - clickAt.y, az = wz - clickAt.z;
          const len = Math.hypot(ax, ay, az);
          if (len > 0.001) {
            const m = (force * CLICK * 0.5) / len; ax *= m; ay *= m; az *= m;
            v[ix] += l[0] * ax + l[4] * ay + l[8] * az; v[iy] += l[1] * ax + l[5] * ay + l[9] * az; v[iz] += l[2] * ax + l[6] * ay + l[10] * az; // world direction → the shape's own space
          }
        }
      }
    }
    p[ix] = p[ix] * keep + v[ix] * df * 0.1; p[iy] = p[iy] * keep + v[iy] * df * 0.1; p[iz] = p[iz] * keep + v[iz] * df * 0.1;
    v[ix] *= keepVelocity; v[iy] *= keepVelocity; v[iz] *= keepVelocity;
  }
  // move every dot to its place plus its displacement; on the shape, each one also breathes in and out along its surface
  const place = balls!.geometry.getAttribute('position') as THREE.BufferAttribute, out = place.array as Float32Array, nr = showing.normals, breathe = still ? 0 : BREATH * (1 - disperse);
  for (let i = 0; i < n; i++) {
    const j = i * 3, pace = seeds[i * 4 + 2], w = breathe * Math.cos(time * BREATH_PACE * pace + Math.PI * pace) * seeds[i * 4]; // each particle at its own pace and depth
    out[j] = h[j] + p[j] + nr[j] * w; out[j + 1] = h[j + 1] + p[j + 1] + nr[j + 1] * w; out[j + 2] = h[j + 2] + p[j + 2] + nr[j + 2] * w;
  }
  place.needsUpdate = true;
}

function locate(e: PointerEvent | MouseEvent) {
  const r = renderer!.domElement.getBoundingClientRect();
  pointer.px = e.clientX - r.left; pointer.py = e.clientY - r.top;
  pointer.tx = (pointer.px / r.width) * 2 - 1; pointer.ty = 1 - (pointer.py / r.height) * 2;
}
function onMove(e: PointerEvent) {
  locate(e); pointer.inside = true; pointer.target = 1;
  if (spin.dragging) { // drag turns the shape; the last movement becomes the throw
    const now = performance.now(), dx = e.clientX - spin.lastX, dy = e.clientY - spin.lastY, gap = now - spin.lastT;
    spin.tx += dx * DRAG; spin.ty = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, spin.ty + dy * DRAG));
    if (gap > 0) { const k = (1000 / 60 / gap) * 0.3; spin.vx = dx * DRAG * k; spin.vy = dy * DRAG * k; }
    spin.moved += Math.abs(dx) + Math.abs(dy);
    spin.lastX = e.clientX; spin.lastY = e.clientY; spin.lastT = now;
  }
}
function onLeave() { pointer.inside = false; pointer.target = 0; }
function onDown(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return; // touch swipes travel between topics instead
  spin.dragging = true; spin.moved = 0; spin.vx = spin.vy = 0; spin.lastX = e.clientX; spin.lastY = e.clientY; spin.lastT = performance.now();
  renderer!.domElement.setPointerCapture(e.pointerId);
}
function onUp(e: PointerEvent) { spin.dragging = false; if (e.pointerType !== 'mouse') onLeave(); }

/** Pose. Every shape starts in its own upright, front-facing pose. On top of that:
 *    · the user can drag it round and throw it;
 *    · the globe turns slowly by itself, every other shape just sways a little;
 *    · it bobs gently up and down. */
function turn(df: number, dt: number, still: boolean, time: number) {
  if (!spin.dragging && (Math.abs(spin.vx) > 0.0001 || Math.abs(spin.vy) > 0.0001)) {
    spin.tx += spin.vx * df; spin.ty = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, spin.ty + spin.vy * df));
    const decay = Math.pow(THROW_DECAY, df); spin.vx *= decay; spin.vy *= decay;
  }
  const k = still ? 1 : 1 - Math.pow(1 - SMOOTH, df);
  spin.x += (spin.tx - spin.x) * k; spin.y += (spin.ty - spin.y) * k;
  const calm = 1 - focusNow; // inside a topic the shape holds still, so its points stay put
  if (!still && showing.spins) autoTurn -= TURN_SPEED * dt * calm; // the globe turns slowly by itself; every other shape only sways a little from side to side
  const sway = still || showing.spins ? 0 : Math.cos(time) * 0.1 * calm;
  const drift = still ? 0 : calm; // floating: a slow nod and roll, and a rise and fall
  const ease = still ? 1 : 1 - Math.exp(-dt * 3);
  leanNow += (showing.lean - leanNow) * ease; tipNow += (showing.tip - tipNow) * ease;
  // the shape turns about its own axis first, then is tipped and leaned over, so it keeps its pose while it turns
  pivot.rotation.set(spin.y + tipNow + Math.sin(time * 0.7) * 0.045 * drift, spin.x + autoTurn + sway, leanNow + Math.cos(time * 0.55) * 0.03 * drift, 'ZXY');
  pivot.position.y = (still ? 0 : Math.sin(time) * 0.07 * (1 - focusNow * 0.6)) + liftNow;
}

onMounted(() => {
  const el = host.value!;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  el.prepend(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerleave', onLeave, { passive: true });
  canvas.addEventListener('pointercancel', onLeave, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('click', (e) => { if (spin.moved < 5) { locate(e); pointer.click = true; } }); // a drag is not a click
  observer = new ResizeObserver(resize); observer.observe(el);
  started = props.active;
  build();
  // tokens: one for the topic, and a small pool for the pages inside it
  renderer.toneMapping = THREE.NeutralToneMapping;
  const room = studio(renderer), tile = tileGeometry(), surface = cssColor('--surface', '#f2f4fb').multiplyScalar(0.82); // a touch darker than the page's white, so its highlights show
  mainToken = makeToken(tile, room, surface); rig.add(mainToken.group);
  tileTokens = Array.from({ length: 6 }, () => { const t = makeToken(tile, room, surface); rig.add(t.group); return t; });
  gallery = GALLERY.map(([name, fx, fy, roll]) => {
    const n = name === 'globe' ? 4000 : 2600, c = buildShape(name, n, isLand), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(c.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(c.normals, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: n * 4 }, () => Math.random()), 4));
    const m = (balls!.material as THREE.ShaderMaterial).clone();
    m.uniforms.uBlur.value = 0; m.uniforms.uFocus.value = TOKEN_DEPTH; m.uniforms.uRange.value = 100; m.uniforms.uReach.value = 1; m.uniforms.uFade.value = 0;
    const points = new THREE.Points(g, m); points.frustumCulled = false; points.rotation.z = roll; points.visible = false; rig.add(points);
    return { points, fx, fy };
  }); // shows at once with a plain sphere for the globe…
  if (props.landUrl) loadLandTest(props.landUrl).then((test) => { if (test && !disposed) { isLand = test; build(); } }); // …and swaps in the continents when they arrive
  // the numeral shape and the token's numeral are drawn from Host Grotesk: redraw them once the font has arrived
  document.fonts?.load('600 200px "Host Grotesk"', '2').then(() => { if (disposed) return; for (const k of Object.keys(NUMERALS)) icons.delete(k as ShapeName); tokenShape = undefined; build(); }).catch(() => {});

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const at = new THREE.Vector3(), aim = new THREE.Vector3(), face = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // the ease used for scattering and gathering: slow start, quick middle, long soft end
  const glide = (t: number) => { let u = t; for (let k = 0; k < 6; k++) { const x = 3 * (1 - u) * (1 - u) * u * 0.45 + 3 * (1 - u) * u * u * 0.25 + u * u * u, dx = 3 * (1 - u) * (1 - u) * 0.45 + 6 * (1 - u) * u * (0.25 - 0.45) + 3 * u * u * (1 - 0.25); u -= (x - t) / Math.max(1e-4, dx); } u = Math.min(1, Math.max(0, u)); return 3 * (1 - u) * u * u + u * u * u; };
  let last = performance.now(), time = Math.random() * 100;
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30), df = dt * 60; last = now;
    if (!still) time += dt;
    const follow = (rate: number) => 1 - Math.exp(-dt * rate);
    const travel = props.travel;
    travel.update(dt);

    // Where the journey is. `f` runs 0 → 1 from one topic's resting place to the next:
    //   0 … 0.5   the camera closes in on the shape, which stays whole, and flies into it;
    //   0.5       the camera is inside the shape: it starts to scatter and fade (one second);
    //   0.6       the next shape takes its place on the ring, still scattered;
    //   0.75 … 1  the next shape gathers (one second) while the camera settles a tenth of a turn before it.
    const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    const p = travel.state.progress, i = Math.floor(p), f = p - i, phase = (f + 0.5) % 1, ahead = f >= 0.6;
    if (i !== pair) setPair(i);
    const shape = ahead ? to : from;
    if (!started) { scatterT = 1; place(shape, 1); }
    else if (intro < 1) { intro = still ? 1 : Math.min(1, intro + dt / INTRO); scatterT = 0; place(shape, 1 - smooth(intro)); } // opening: gather from the scatter
    else {
      const apart = f >= 0.5 && f < 0.6; // only the shape being left scatters (the camera is inside it); the next one is already standing whole in the distance
      scatterT = still ? (apart ? 1 : 0) : Math.min(1, Math.max(0, scatterT + (apart ? dt : -dt)));
      if (shape !== showing) { spin.x = spin.tx = spin.y = spin.ty = spin.vx = spin.vy = 0; autoTurn = 0; scatterT = 0; arrival = 0; } // a new shape always arrives facing front, whole, and brightens in
      place(shape, glide(scatterT));
    }

    // camera: rides the ring; looks a tenth of a turn ahead, drawn towards the shape while it is in view
    pointer.x += (pointer.tx - pointer.x) * follow(1); pointer.y += (pointer.ty - pointer.y) * follow(1); // slow, floaty follow
    pointer.on += (pointer.target - pointer.on) * follow(2);
    focusNow += ((props.focused ? 1 : 0) - focusNow) * follow(2.6);
    // inside a topic: the globe comes much closer, so its places can be picked; every other shape stays its size and rises a little, making room for its page tokens underneath
    const globe = props.shapes[wrap(Math.round(p))] === 'globe', inside = props.focused ? 1 : 0;
    nearNow += ((globe ? NEAR_GLOBE : NEAR_OTHER) * inside - nearNow) * follow(2.6);
    liftNow += ((globe || camera.aspect < 1 ? 0 : LIFT) * inside - liftNow) * follow(2.6);
    const turnAt = p * STEP, shapeAt = ((ahead ? i + 1 : i) + 0.5) * STEP;
    onRing(shapeAt, mount.position);
    onRing(turnAt - (1 - Math.min(1, intro * 1.3)) * 0.35, at).lerp(mount.position, nearNow * Math.min(1, camera.aspect / 1.3)); // on narrow screens it comes in less, so the globe still fits       // during the opening it starts a little further back
    const pulled = 1 - (smooth((phase - 0.1) / 0.6) - smooth((phase - 0.4) / 0.5));
    onRing(phase < 0.1 ? turnAt + STEP / 2 : shapeAt + (turnAt + STEP / 2 - shapeAt) * pulled, aim).lerp(mount.position, focusNow);
    mount.lookAt(onRing(turnAt - 0.02 * Math.PI, face));                                              // the shape keeps facing the camera as it comes round
    const lean = at.distanceTo(aim) * Math.tan(THREE.MathUtils.degToRad(2.25)) * pointer.on;          // the pointer tilts the view by a couple of degrees
    side.subVectors(aim, at).cross(up).normalize();
    camera.position.copy(at).addScaledVector(side, -pointer.x * lean).addScaledVector(up, pointer.y * lean);
    camera.lookAt(aim);
    shiftNow += (props.shift - shiftNow) * follow(4);
    if (Math.abs(shiftNow) > 0.0005) camera.setViewOffset(width, height, shiftNow * width, 0, width, height); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();

    turn(df, dt, still, time);
    const su = (balls!.material as THREE.ShaderMaterial).uniforms, ratio = renderer!.getPixelRatio();
    su.uDot.value = DOT * ratio; su.uBlur.value = BLUR * ratio; su.uReach.value = showing.reach; arrival = still ? 1 : Math.min(1, arrival + dt / 0.6); su.uFade.value = (1 - disperse) * (0.15 + 0.85 * arrival); // scattered dots fade away completely
    simulate(df, still, time);

    placeMarkers();
    placeTokens(dt, time, p - Math.floor(p), still);
    // the gallery: shown while the welcome card is up; on leaving it drifts apart and fades over about a second
    galleryShow = still ? (props.gallery ? 1 : 0) : Math.min(1, Math.max(0, galleryShow + (props.gallery ? dt / 1.2 : -dt / 1.1)));
    const unit = (2 * TOKEN_DEPTH * Math.tan(THREE.MathUtils.degToRad(FOV) / 2)) / height, apart = props.gallery ? 0 : 1 - galleryShow;
    for (const g of gallery) {
      g.points.visible = galleryShow > 0.003;
      if (!g.points.visible) continue;
      const k = 0.115 * Math.min(height, width * 0.9) * unit * (1 + apart * 0.25);
      g.points.position.set((g.fx - 0.5) * width * unit * (1 + apart * 0.35), -(g.fy - 0.5) * height * unit * (1 + apart * 0.35), -TOKEN_DEPTH);
      g.points.scale.setScalar(k); g.points.rotation.y = time * 0.15 + g.fx * 4;
      const gu = (g.points.material as THREE.ShaderMaterial).uniforms; gu.uFade.value = smooth(galleryShow) * 0.9; gu.uDot.value = DOT * ratio * 0.85; gu.uReach.value = k;
    }
    const du = (field!.material as THREE.ShaderMaterial).uniforms, bu = (backdrop!.material as THREE.ShaderMaterial).uniforms;
    du.uTime.value = time; du.uRatio.value = ratio; du.uCalm.value = focusNow; du.uShow.value = 1; // inside a topic the dust clears: the soft discs go, a few small specks stay
    bu.uTime.value = time; bu.uAspect.value = camera.aspect; bu.uSway.value = Math.sin(turnAt);
    renderer!.render(scene, camera);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
});

watch(() => props.active, (on) => { if (on) started = true; });
watch(() => props.points, chooseAnchors, { immediate: true });
watch(() => [props.count, props.shapes.join()], () => { if (renderer) { if (started) intro = 1; build(); } });

onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frameId); observer?.disconnect();
  drop(balls); drop(field);
  for (const g of gallery) { g.points.geometry.dispose(); (g.points.material as THREE.Material).dispose(); }
  if (mainToken) dropToken(mainToken); tileTokens.forEach(dropToken); icons.forEach((t) => t.dispose());
  renderer?.dispose(); renderer?.domElement.remove();
});
</script>

<template>
  <div ref="host" class="stage">
    <TransitionGroup name="marker">
      <button v-for="(p, k) in points" :key="p.slug" ref="markers" type="button" class="marker" :class="{ plain: !card }" :style="{ '--k': k }" :aria-label="p.title"
        @click="emit('pick', p.slug)" @pointerenter="hot = k" @pointerleave="hot = -1" @focus="hot = k" @blur="hot = -1">
        <span class="dot" /><span class="label">{{ p.title }}</span>
      </button>
    </TransitionGroup>
    <!-- picture card for the point under the pointer: it stays by the screen's edge, level with the point, joined to it by a line -->
    <div v-if="card" class="card" :class="{ on: hot >= 0 }" aria-hidden="true">
      <span class="thread" />
      <svg class="outline" viewBox="0 0 290 195" fill="none"><path pathLength="1" d="M.5.5h289v178a16 16 0 0 1-16 16H.5Z" /></svg>
      <span class="photo"><img v-if="shown?.image" :src="picture(shown.image)" alt=""><span v-else class="blank" /></span>
      <span class="place">{{ shown?.title }}</span>
    </div>
  </div>
</template>

<style scoped>
.stage { position: absolute; inset: 0; overflow: hidden; background: var(--stage-to); } /* the backdrop itself is painted in the scene (lib/scenery.ts) */
.stage :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: default; } /* the plain pointer, as on the reference */
.stage :deep(canvas:active) { cursor: grabbing; }

/* points on the shape: placed from the top-left corner by the stage, centred on their particle */
.marker { position: absolute; left: 0; top: 0; z-index: 1; width: 0; height: 0; padding: 0; border: 0; background: none; color: var(--on-dark); cursor: pointer; transition: opacity .3s var(--ease); }
.marker.behind { opacity: 0; pointer-events: none; }
.dot { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle, var(--on-dark) 0 1.5px, var(--brand) 2.2px); border: 3px solid color-mix(in srgb, var(--on-dark) 88%, transparent); background-clip: padding-box; box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 70%, transparent); animation: pulse 2.4s var(--ease) infinite; animation-delay: calc(var(--k) * .3s); transition: transform .25s var(--ease), background .25s var(--ease); }
.marker::before { content: ''; position: absolute; left: -1.4rem; top: -1.4rem; width: 2.8rem; height: 2.8rem; border-radius: 50%; } /* a comfortable area to hit */
.marker:hover .dot, .marker:focus-visible .dot { transform: scale(1.3); }
.marker:focus-visible { outline: none; }
.marker:focus-visible .dot { outline: 2px solid var(--on-dark); outline-offset: 3px; }
.label { position: absolute; left: 1.1rem; top: -.75rem; padding: .25rem .7rem; border-radius: 999px; background: var(--surface); color: var(--text); font-size: var(--button-font-size); font-weight: var(--button-font-weight); white-space: nowrap; opacity: 0; transform: translateX(-6px); transition: opacity .25s var(--ease), transform .25s var(--ease); pointer-events: none; }
.marker.plain:hover .label, .marker.plain:focus-visible .label { opacity: 1; transform: none; } /* without the picture card, the name appears beside the point */

/* picture card: a thin outline that draws itself, a picture that wipes in, the place's name underneath */
.card { --w: 290px; --h: 195px; position: absolute; z-index: 1; right: var(--frame); top: var(--ty, 30%); width: var(--w); height: var(--h); pointer-events: none; opacity: 0; transition: opacity .5s var(--ease); }
.card.on { opacity: 1; }
.outline { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.outline path { stroke: var(--on-dark); stroke-opacity: .28; stroke-width: 1; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset .8s cubic-bezier(.45, 0, .25, 1); }
.card.on .outline path { stroke-dashoffset: 0; }
.photo { position: absolute; inset: 10px; overflow: hidden; border-radius: 0 0 8px 0; clip-path: inset(0 100% 0 0); transition: clip-path .8s cubic-bezier(.45, 0, .25, 1); }
.card.on .photo { clip-path: inset(0); }
.photo img, .blank { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; scale: 1.18; transition: scale .8s cubic-bezier(.45, 0, .25, 1); }
.card.on .photo img, .card.on .blank { scale: 1; }
/* no picture yet: a plain placeholder scene in the brand colours */
.blank { background:
  radial-gradient(60% 90% at 78% 118%, var(--brand-deep) 0 60%, transparent 61%), radial-gradient(70% 80% at 18% 125%, color-mix(in srgb, var(--brand) 70%, var(--brand-deep)) 0 60%, transparent 61%),
  radial-gradient(circle at 72% 30%, var(--surface) 0 7%, transparent 7.5%), linear-gradient(180deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 45%, var(--surface)) 100%); }
.place { position: absolute; left: 0; right: 0; top: calc(100% + 1rem); text-align: center; font-size: var(--type-caption); font-weight: var(--weight-label); line-height: var(--leading-ui); color: var(--on-dark); }
.thread { position: absolute; top: calc(var(--hy, 0px) - var(--ty, 0px)); right: 100%; height: 1px; width: max(0px, calc(100vw - var(--frame) - var(--w) - var(--hx, 0px) - 14px)); background: linear-gradient(90deg, color-mix(in srgb, var(--on-dark) 55%, transparent), color-mix(in srgb, var(--on-dark) 20%, transparent)); clip-path: inset(0 100% 0 0); transition: clip-path .8s cubic-bezier(.45, 0, .25, 1); }
.card.on .thread { clip-path: inset(0); }
.marker-enter-active { transition: opacity .5s var(--ease) calc(.5s + var(--k) * .12s); }
.marker-leave-active { transition: opacity .25s var(--ease); }
.marker-enter-from, .marker-leave-to { opacity: 0; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 70%, transparent); } 70%, 100% { box-shadow: 0 0 0 .9rem transparent; } }
@media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
</style>
