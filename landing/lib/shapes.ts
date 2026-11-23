// Particle shapes, computed in code (no model files). Every shape is a cloud of points scattered
// evenly over a surface, plus the direction each point's surface faces (its normal), so the stage can light it.
// All shapes fit the same box (longest side = 2), so they can be blended one-to-one.

export type ShapeName = 'globe' | 'flask' | 'bottle' | 'bulb' | 'chain' | 'target';
/** Shapes drawn as numerals in Host Grotesk instead of their object (the keys stay, so the content files keep working). */
export const NUMERALS: Partial<Record<ShapeName, string>> = { flask: '2', bottle: '6', bulb: '30' };
export type Cloud = { positions: Float32Array; normals: Float32Array };
export type LandTest = (lon: number, lat: number) => boolean;

function normalize(v: number[]) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

/** Small seeded random generator, so a shape looks the same on every load. */
function seededRandom(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Collects points, then centres the cloud and fits it into the shared box. */
function collector(count: number) {
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  let n = 0;
  return {
    get full() { return n >= count; },
    add(x: number, y: number, z: number, nx: number, ny: number, nz: number) {
      if (n >= count) return;
      const l = Math.hypot(nx, ny, nz) || 1;
      positions[n * 3] = x; positions[n * 3 + 1] = y; positions[n * 3 + 2] = z;
      normals[n * 3] = nx / l; normals[n * 3 + 1] = ny / l; normals[n * 3 + 2] = nz / l; n++;
    },
    done(fit = true): Cloud {
      if (fit) {
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < count * 3; i++) { const a = i % 3; if (positions[i] < min[a]) min[a] = positions[i]; if (positions[i] > max[a]) max[a] = positions[i]; }
        const k = 2 / Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1e-4);
        for (let i = 0; i < count * 3; i++) { const a = i % 3; positions[i] = (positions[i] - (min[a] + max[a]) / 2) * k; }
      }
      return { positions, normals };
    },
  };
}

/** A ring bent into an oval, as a tube. Used for chain links and plain rings. */
function tube(out: ReturnType<typeof collector>, n: number, rand: () => number, a: number, b: number, r: number, place: (p: number[]) => number[], turn: (v: number[]) => number[]) {
  for (let i = 0; i < n; i++) {
    const u = rand() * Math.PI * 2, v = rand() * Math.PI * 2;
    const N = normalize([b * Math.cos(u), a * Math.sin(u), 0]);
    const nrm = [Math.cos(v) * N[0], Math.cos(v) * N[1], Math.sin(v)];
    const p = place([a * Math.cos(u) + r * nrm[0], b * Math.sin(u) + r * nrm[1], r * nrm[2]]), q = turn(nrm);
    out.add(p[0], p[1], p[2], q[0], q[1], q[2]);
  }
}

// ---- the six shapes ----

/** Globe: random points on a sphere, kept only where there is land.
 *  Without land data it is a plain dotted sphere. */
export function globe(count: number, isLand?: LandTest): Cloud {
  const rand = seededRandom(3), out = collector(count);
  for (let guard = 0; !out.full && guard < count * 40; guard++) {
    const y = rand() * 2 - 1, a = rand() * Math.PI * 2, s = Math.sqrt(1 - y * y), x = Math.cos(a) * s, z = Math.sin(a) * s;
    if (isLand && !isLand((Math.atan2(x, z) * 180) / Math.PI, (Math.asin(y) * 180) / Math.PI)) continue;
    const lift = 1 + (rand() - 0.5) * 0.012;
    out.add(x * lift, y * lift, z * lift, x, y, z);
  }
  return out.done(false);
}

/** A character in Host Grotesk (the site's typeface), as a thick solid: dots spread over its front and back faces and
 *  round its sides. Drawn from the font on a canvas, so it needs the font loaded (the stage rebuilds once it is). */
export function glyph(count: number, char = '2', depth = 0.36): Cloud {
  const rand = seededRandom(61), out = collector(count), N = 240;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${N * 0.86}px "Host Grotesk", sans-serif`;
  const wide = ctx.measureText(char).width; if (wide > N * 0.9) ctx.font = `600 ${(N * 0.86 * N * 0.9) / wide}px "Host Grotesk", sans-serif`; // two digits: shrink to fit the canvas
  ctx.fillText(char, N / 2, N / 2 + N * 0.04);
  const alpha = ctx.getImageData(0, 0, N, N).data, inside = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && alpha[(y * N + x) * 4 + 3] > 127;
  const fill: number[] = [], edge: number[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inside(x, y)) continue;
    fill.push(x, y);
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) edge.push(x, y);
  }
  if (!fill.length) return out.done();
  const toX = (x: number) => (x - N / 2) / (N / 2), toY = (y: number) => (N / 2 - y) / (N / 2), half = depth / 2;
  const faceShare = fill.length / (fill.length + edge.length * depth * N * 0.5); // faces and sides get dots in proportion to their areas
  while (!out.full) {
    if (rand() < faceShare) { // a face: anywhere inside the letter, front or back
      const k = Math.floor(rand() * (fill.length / 2)) * 2, front = rand() < 0.5;
      out.add(toX(fill[k] + rand()), toY(fill[k + 1] + rand()), front ? half : -half, 0, 0, front ? 1 : -1);
    } else { // a side: along the outline, at any depth, facing outwards
      const k = Math.floor(rand() * (edge.length / 2)) * 2, x = edge[k], y = edge[k + 1];
      let nx = 0, ny = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!inside(x + dx, y + dy)) { nx += dx; ny -= dy; }
      out.add(toX(x + rand()), toY(y + rand()), (rand() * 2 - 1) * half, nx || 0.01, ny, 0); // anywhere within the outline pixel, so the sides don't show the pixel grid
    }
  }
  return out.done();
}

/** A hardback book in A4 landscape (297 × 210, about 1.41 : 1), standing upright and turned a little so its spine shows on
 *  the left: two covers that stand slightly proud of the page block, a rounded spine, and beside it the hinge — a groove pressed
 *  into each cover between two raised ribs — so it reads like a real hardcover. */
export function book(count: number): Cloud {
  const rand = seededRandom(43), out = collector(count);
  const W = 2, H = W / 1.414, D = 0.24, r = D / 2, inset = 0.035, yaw = 0.42;
  const x0 = -W / 2 + r, R = W / 2, T = H / 2, B = -H / 2;
  const turn = (x: number, y: number, z: number): [number, number, number] => [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)];
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => { const p = turn(x, y, z), n = turn(nx, ny, nz); out.add(p[0], p[1], p[2], n[0], n[1], n[2]); };
  const coverW = R - x0, pageD = D - 2 * inset - 0.03;
  // the hinge's profile across a cover: a raised rib next to the spine, then a pressed-in groove
  const hinge = (u: number) => (u > 0.02 && u < 0.08 ? 0.014 * Math.sin(Math.PI * (u - 0.02) / 0.06) : 0) + (u > 0.08 && u < 0.17 ? -0.04 * Math.sin(Math.PI * (u - 0.08) / 0.09) : 0);
  const slope = (u: number) => (u > 0.08 && u < 0.17 ? -Math.cos(Math.PI * (u - 0.08) / 0.09) * 0.9 : 0);
  const parts: [string, number][] = [['front', coverW * H], ['back', coverW * H], ['spine', Math.PI * r * H],
    ['top', 2.2 * pageD * (R - inset - x0)], ['bottom', 2.2 * pageD * (R - inset - x0)], ['fore', 2.2 * pageD * (H - 2 * inset)]];
  const total = parts.reduce((t, [, a]) => t + a, 0);
  // outlines: the covers' edges, the spine's top and bottom curves and the hinge lines get extra dots, so the form reads clearly
  for (let i = 0; i < Math.round(count * 0.26) && !out.full; i++) {
    const side = rand() < 0.7 ? 1 : -1, z = side * D / 2, k = rand(), j = () => (rand() - 0.5) * 0.015;
    switch (Math.floor(rand() * 6)) {
      case 0: put(x0 + k * coverW, T + j(), z, 0, 1, side); break;
      case 1: put(x0 + k * coverW, B + j(), z, 0, -1, side); break;
      case 2: put(R + j(), B + k * H, z, 1, 0, side); break;
      case 3: { const a = Math.PI / 2 + k * Math.PI, y = rand() < 0.5 ? T : B; put(x0 + Math.cos(a) * r, y + j(), Math.sin(a) * r, Math.cos(a), Math.sign(y), Math.sin(a)); break; }
      default: { const u = rand() < 0.5 ? 0.085 : 0.165; put(x0 + u, B + k * H, side * (D / 2 - 0.012), side * slope(u), 0, side); } // the groove's two edges
    }
  }
  while (!out.full) {
    let pick = rand() * total, part = parts[0][0];
    for (const [name, area] of parts) { if (pick < area) { part = name; break; } pick -= area; }
    const y = B + rand() * H;
    if (part === 'front' || part === 'back') {
      const u = rand() * coverW, sign = part === 'front' ? 1 : -1;
      put(x0 + u, y, sign * (D / 2 + hinge(u)), slope(u), 0, sign);
    } else if (part === 'spine') {
      const a = Math.PI / 2 + rand() * Math.PI; put(x0 + Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(a), 0, Math.sin(a));
    } else {
      const z = (rand() * 2 - 1) * (pageD / 2);
      if (part === 'fore') put(R - inset, B + inset + rand() * (H - 2 * inset), z, 1, 0, 0);
      else put(x0 + rand() * (R - inset - x0), part === 'top' ? T - inset : B + inset, z, 0, part === 'top' ? 1 : -1, 0);
    }
  }
  return out.done();
}

/** Target: one broad ring. */
export function target(count: number): Cloud {
  const rand = seededRandom(53), out = collector(count), same = (v: number[]) => v;
  tube(out, count, rand, 1, 1, 0.22, same, same);
  return out.done();
}

/** Loose cloud far around the centre: where particles wait before the opening animation. */
export function scatter(count: number, inner: number, outer: number): Cloud {
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3); // no surface, so no normals: lit evenly
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = inner + Math.random() * (outer - inner);
    positions[i * 3] = Math.cos(a) * s * r; positions[i * 3 + 1] = u * r; positions[i * 3 + 2] = Math.sin(a) * s * r;
  }
  return { positions, normals };
}

export function buildShape(name: ShapeName, count: number, isLand?: LandTest): Cloud {
  switch (name) {
    case 'globe': return globe(count, isLand);
    case 'flask': return glyph(count, NUMERALS.flask);
    case 'bottle': return glyph(count, NUMERALS.bottle);
    case 'bulb': return glyph(count, NUMERALS.bulb);
    case 'chain': return book(count); // the sixth topic is a book (A4 landscape hardcover; its key stays 'chain' so the content files need no change)
    case 'target': return target(count);
  }
}
