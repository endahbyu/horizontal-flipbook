// Scroll-driven travel between topics.
// Scrolling does not set a position; it pushes. The push builds speed, the speed fades by itself,
// there is a top speed (so one long scroll still moves one topic at a time), and the journey slows down
// over the last stretch before each topic, so it tends to come to rest there. It is never pulled back. The topics form a loop: after the last comes the first.
// `progress` is a plain number that keeps counting (…, 5.9, 6.0, 6.1 …); whole numbers are topics.
// The numbers below are per frame at 60 frames a second.

const WHEEL_SMOOTHING = 0.1;   // each frame, a tenth of the outstanding wheel distance is taken up
const WHEEL_LIMIT = 100;       // …but never more than this many pixels in one frame
const PUSH = 0.00025;           // pixels → acceleration
const PUSH_FRICTION = 0.9, PUSH_LIMIT = 0.1;
const SPEED_FRICTION = 0.95, SPEED_LIMIT = 2;
const SPEED_TO_TOPICS = 0.3;   // speed 1 covers this many topics a second; at top speed one topic takes about 1.7 s
const SETTLE_AFTER = 100;      // milliseconds without input before settling starts
const SETTLE_SECONDS = 10;     // seconds per topic of distance while settling (half a topic away → 5 s)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ramp = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1);

export function createScrollTravel(stops: number, onIndex: (index: number) => void, onSettled: (settled: boolean) => void) {
  const state = { progress: 0, velocity: 0, direction: 1 };
  let pending = 0, push = 0;
  let target: number | null = null, origin = 0, elapsed = 0, duration = 1, gentle = false;
  let lastInput = -1000, index = 0, settled = true, enabled = false;
  const wrap = (i: number) => ((i % stops) + stops) % stops;

  /** Start a timed journey to a position. `gentle` = the slow settle after scrolling; otherwise a deliberate trip. */
  const travelTo = (to: number, settle = false) => {
    target = to; origin = state.progress; elapsed = 0; gentle = settle;
    const distance = Math.abs(to - origin);
    duration = settle ? Math.max(0.5, SETTLE_SECONDS * distance) : 0.9 + 1.3 * Math.sqrt(Math.min(3, distance));
    state.velocity = 0; push = 0; pending = 0;
  };

  return {
    state,
    get stops() { return stops; },
    set stops(n: number) { stops = Math.max(1, n); },
    setEnabled(on: boolean) { enabled = on; if (!on) { state.velocity = 0; push = 0; pending = 0; } },
    /** Feed a wheel or touch movement (pixels). */
    impulse(pixels: number) {
      if (!enabled) return;
      if (target !== null) { target = null; } // scrolling interrupts a journey
      pending += pixels; lastInput = performance.now();
    },
    /** Travel to a topic by the shortest way round the loop. */
    goTo(i: number) {
      const base = Math.round(state.progress), offset = wrap(i) - wrap(base);
      travelTo(base + (offset > stops / 2 ? offset - stops : offset < -stops / 2 ? offset + stops : offset));
    },
    step(direction: number) { if (enabled) travelTo(Math.round(target ?? state.progress) + direction); },
    jump(i: number) { target = null; state.progress = wrap(i); state.velocity = 0; push = 0; pending = 0; }, // be there at once, no journey
    nearest: () => wrap(Math.round(state.progress)),
    /** Call once per frame. */
    update(dt: number) {
      const before = state.progress, frames = dt * 60;
      if (target !== null) {
        elapsed += dt;
        const t = Math.min(1, elapsed / duration);
        const e = gentle ? 1 - (1 - t) * (1 - t) : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // settle: quick then slow; trip: slow, quick, slow
        state.progress = origin + (target - origin) * e;
        if (t >= 1) { state.progress = target; target = null; }
      } else {
        // the wheel distance is taken up a little each frame, which turns jerky input into a smooth push
        const taken = pending * (1 - Math.pow(1 - WHEEL_SMOOTHING, frames)); pending -= taken;
        push += clamp(taken, -WHEEL_LIMIT * frames, WHEEL_LIMIT * frames) * PUSH;
        push = clamp(push * Math.pow(PUSH_FRICTION, frames), -PUSH_LIMIT, PUSH_LIMIT);
        state.velocity = clamp((state.velocity + push * frames) * Math.pow(SPEED_FRICTION, frames), -SPEED_LIMIT, SPEED_LIMIT);
        // a gentle, gradual drag over the last stretch before a topic's resting place, so the journey tends to come to rest
        // there. (The reference brakes hard in a narrow band, which reads as a hitch — a stutter — when you keep scrolling.)
        const f = state.progress - Math.floor(state.progress), along = (f + 0.5) % 1;
        const near = Math.sin(Math.PI * ramp(along, 0.1, 0.5)); // a smooth rise and fall, peaking just before the resting place
        state.velocity *= Math.pow(1 - 0.015 * near, frames);
        state.progress += state.velocity * dt * SPEED_TO_TOPICS;
        // no pull back to a topic: the journey rests wherever the scrolling leaves it, even close up against a shape.
        // The one exception is the stretch where the old shape has scattered and the next has not gathered yet:
        // left there, the screen would stay empty, so the journey drifts on in the direction it was going.
        if (performance.now() - lastInput > SETTLE_AFTER && Math.abs(pending) < 1 && Math.abs(state.velocity) < 0.25 && f > 0.48 && f < 0.82) state.progress += state.direction * dt * 0.22;
      }
      const moved = state.progress - before;
      if (Math.abs(moved) > 1e-5) state.direction = Math.sign(moved);
      const i = wrap(Math.round(state.progress));
      if (i !== index) { index = i; onIndex(i); }
      const nowSettled = Math.abs(state.progress - Math.round(state.progress)) < 0.06;
      if (nowSettled !== settled) { settled = nowSettled; onSettled(settled); }
    },
  };
}
export type ScrollTravel = ReturnType<typeof createScrollTravel>;
