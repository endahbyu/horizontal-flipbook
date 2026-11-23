<script setup lang="ts">
// Opening screen, built the way the reference's works, with the client's rounded-triangle mark:
//   1. six outlines of the mark, nested far out around the centre, open out one after another;
//   2. the innermost outline is traced in the brand colour as the content loads;
//   3. the mark grows in, steps left, and the two title lines slide out to its right, left to right;
//   4. once ready, the outlines take on the brand colour, fading outwards;
//   5. leaving: the titles slide back, the mark returns to the centre and fades as a hole the shape of the mark
//      opens from the middle and grows until it uncovers the whole stage behind.
// `ready` fires (7.4 timeline seconds in, ÷ TEMPO in real time, once the colour has run through every outline) when the opening has finished and loading is complete; set `done` to play the leaving part;
// `gone` fires when the screen is fully open.
const props = defineProps<{ progress: number; label: string; brand: string; done: boolean }>();
const emit = defineEmits<{ ready: []; reveal: []; gone: [] }>(); // reveal: the hole has opened far enough for what is behind to start (about 2 s into leaving)

const root = ref<HTMLElement>(), canvas = ref<HTMLCanvasElement>(), mark = ref<HTMLElement>();
const top = ref<HTMLElement>(), bottom = ref<HTMLElement>();
const logo = `${useRuntimeConfig().app.baseURL}logo-color.png`;
const titleTop = computed(() => props.brand.split(' ')[0] ?? props.brand);
const titleBottom = computed(() => props.brand.split(' ').slice(1).join(' '));
const gone = ref(false);

// the mark's outline: a triangle with rounded corners, MARK px wide (the size the mark is shown at)
const MARK = 84, RATIO = 280 / 320; // the mark's width on screen, desktop (60 px on phones)
// the whole sequence runs this many times faster than the timings written below (which follow the reference's own);
// the reference takes ±7 s to open and ±5 s to clear, which felt slow — this brings it to ±3.9 s and ±2.6 s
const TEMPO = 1.9;
function outline() {
  const w = MARK, h = MARK * RATIO, r = w * 0.17, p = new Path2D();
  const A = [w * 0.52, 0], B = [w, h], C = [0, h];
  p.moveTo((A[0] + B[0]) / 2, (A[1] + B[1]) / 2);
  p.arcTo(B[0], B[1], C[0], C[1], r); p.arcTo(C[0], C[1], A[0], A[1], r); p.arcTo(A[0], A[1], B[0], B[1], r); p.closePath();
  return { p, w, h, length: 3.05 * w };
}

// easing: the reference's "custom" curve (slow start, long soft end) and an expo in-out for the sideways moves
function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number) => {
    let u = t;
    for (let i = 0; i < 6; i++) { const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3, d = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2); u -= (x - t) / (d || 1e-4); u = Math.min(1, Math.max(0, u)); }
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
  };
}
const soft = bezier(0.45, 0, 0.25, 1);
const expo = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2);
const span = (t: number, start: number, length: number) => Math.min(1, Math.max(0, (t - start) / length));

// outline sizes, as multiples of the mark (the reference's ring spacing)
const hex = (s: string) => { const m = s.replace('#', ''); const f = m.length === 3 ? m.split('').map((x) => x + x).join('') : m; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0); };
const RINGS = [1, 1.76, 2.43, 3.31, 4.05, 5]; // relative to the innermost outline (the reference's spacing: about 30%, 52%, 72%, 98%… of the screen's width)
let frame = 0, opened = 0, leaving = -1, readySent = false, revealSent = false, still = false;

function draw(now: number) {
  const c = canvas.value, el = root.value; if (!c || !el) return;
  const ctx = c.getContext('2d')!, ratio = Math.min(devicePixelRatio || 1, 2), W = el.clientWidth, H = el.clientHeight;
  if (c.width !== Math.round(W * ratio)) { c.width = Math.round(W * ratio); c.height = Math.round(H * ratio); }
  // the innermost outline takes 36% of the width (a little roomier than the reference, as a triangle narrows towards its top), never more than 58% of the height
  const small = W <= 800, inner = Math.min((small ? 0.66 : 0.36) * W, (0.58 * H) / RATIO) / MARK, // on phones the innermost outline takes two thirds of the width, so the titles never touch it
    markSize = small ? 60 / 84 : 1, { p, w, h, length } = outline();
  const css = getComputedStyle(el), surface = hex(css.getPropertyValue('--surface').trim() || '#f2f4fb'), brand = hex(css.getPropertyValue('--brand').trim() || '#2440c9');
  const mix = (a: number[], b: number[], f: number) => `rgb(${a.map((v, j) => Math.round(v * f + b[j] * (1 - f))).join(',')})`, faint = brand.map((v, j) => v * 0.12 + surface[j] * 0.88);
  const t = still ? 99 : ((now - opened) / 1000) * TEMPO, out = leaving < 0 ? -1 : still ? 99 : ((now - leaving) / 1000) * TEMPO;

  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = mix(surface, surface, 1); ctx.fillRect(0, 0, c.width, c.height);
  // each outline is placed with its centroid (two thirds of the way down) on the centre, so the mark and its titles sit in the wide part of the triangle
  const ring = (scale: number) => { ctx.setTransform(ratio * scale, 0, 0, ratio * scale, (W / 2 - (w * scale) / 2) * ratio, (H / 2 - ((h * 2) / 3) * scale + 2) * ratio); ctx.lineWidth = 1 / scale; }; // scale: in multiples of the mark's size
  // the outlines: they start drawn in to two thirds and open out one after another, inner ones last; on leaving they rush outwards
  RINGS.forEach((base, i) => {
    const size = base * inner;
    let s = size / 1.5 + (size - size / 1.5) * soft(span(t, (RINGS.length - 1 - i) * 0.1, 1.2));
    if (out >= 0) s *= 1 + 9 * soft(span(out, 1.2 + i * 0.1, 2.5));
    ring(s);
    const fade = Math.max(0.6, 1 - i * 0.08), tint = soft(span(t, 5.2 + i * 0.2, 1)); // the colour runs outwards, ring after ring, until every outline is blue
    ctx.strokeStyle = mix(brand, faint, tint * fade);
    ctx.setLineDash([]); ctx.stroke(p);
    if (i === 0) { // the loading trace, on the innermost outline
      ctx.strokeStyle = mix(brand, brand, 1); ctx.setLineDash([length * Math.min(1, props.progress), length * 2]); ctx.stroke(p); ctx.setLineDash([]);
    }
  });
  // the hole: a cut-out the shape of the mark, from the size of the mark up to a hundred times that
  if (out >= 1.2) {
    const s = 0.98 * markSize * (1 + 99 * soft(span(out, 1.45, 3.5)));
    ring(s); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(p); ctx.globalCompositeOperation = 'source-over';
  }

  // the mark and the titles (DOM, so they stay crisp)
  const m = mark.value;
  if (m) {
    const grow = soft(span(t, 1.2, 1.2)), side = expo(span(t, 2.2, 1.2)), back = out >= 0 ? expo(span(out, 0, 1.2)) : 0;
    // the mark steps aside by half of what stands to its right (gap + titles), so the pair as a whole sits in the middle of the
    // outline, with equal room on both sides — rather than the mark alone sitting on the centre line
    const titles = top.value?.closest('.title') as HTMLElement | null, room = titles ? titles.offsetWidth + (small ? 12 : 18) : (small ? 110 : 170);
    const shift = (-room / 2) * side * (1 - back), lift = out >= 1.45 ? soft(span(out, 1.45, 1.2)) : 0;
    m.style.transform = `translateX(${shift}px) scale(${(0.6 + 0.4 * grow) * (1 + lift * 5)})`;
    m.style.opacity = String(grow * (1 - lift));
    [top.value, bottom.value].forEach((line, i) => {
      if (!line) return;
      const come = soft(span(t, 2.55 + i * 0.3, 1.2)), go = out >= 0 ? expo(span(out, 0, 1.2)) : 0;
      line.style.transform = `translateX(${(-101 * (1 - come) - 101 * go).toFixed(2)}%)`;
    });
  }
  if (!readySent && t >= 7.4 && props.progress >= 1) { readySent = true; emit('ready'); } // only once the outermost outline has turned blue (5.2 + 5 × 0.2 + 1 s)
  if (!revealSent && out >= 2.1) { revealSent = true; emit('reveal'); }
  if (out >= 4.95) { gone.value = true; emit('gone'); return; }
  frame = requestAnimationFrame(draw);
}

onMounted(() => {
  still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  opened = performance.now(); frame = requestAnimationFrame(draw);
});
watch(() => props.done, (d) => { if (d && leaving < 0) { leaving = performance.now(); if (still) { gone.value = true; emit('gone'); } } });
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div v-if="!gone" ref="root" class="loader" :class="{ leaving: done }" role="status" aria-live="polite">
    <span class="sr-only">{{ done ? '' : `${brand} — ${label}` }}</span>
    <canvas ref="canvas" aria-hidden="true" />
    <div ref="mark" class="mark" aria-hidden="true">
      <img :src="logo" alt="" width="320" height="280" decoding="async">
      <p class="title">
        <span class="line"><span ref="top" class="text">{{ titleTop }}</span></span>
        <span class="line"><span ref="bottom" class="text">{{ titleBottom }}</span></span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.loader { position: absolute; inset: 0; z-index: var(--z-loader); pointer-events: auto; }
.loader.leaving { pointer-events: none; } /* the stage can be reached as soon as the hole starts to open */
canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.mark { position: absolute; left: 50%; top: 50%; width: 84px; margin: -36.75px 0 0 -42px; opacity: 0; will-change: transform, opacity; }
.mark img { display: block; width: 100%; height: auto; }
/* the two title lines, to the right of the mark; each slides out from behind its own edge, left to right */
.title { position: absolute; left: calc(100% + 18px); top: 50%; width: max-content; translate: 0 -50%; display: grid; gap: 1px; font-family: var(--font-display); font-weight: var(--weight-display); font-size: var(--type-lockup); line-height: var(--leading-display); color: var(--brand); white-space: nowrap; }
.line { display: block; overflow: hidden; }
.text { display: block; transform: translateX(-101%); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 800px) { .mark { width: 60px; margin: -26.25px 0 0 -30px; } .title { left: calc(100% + 12px); } }
@media (prefers-reduced-motion: reduce) { .mark { opacity: 1; } .text { transform: none; } }
</style>
