<script setup lang="ts">
// Carousel block: slides you can swipe, scroll or step through with the arrows. Built on native scroll snapping.
//   · row (default): slides side by side, arrows and a count underneath;
//   · vertical: slides stacked in a tall frame, with their captions listed beside it — the captions are linked
//     to the slides: the current one is highlighted, and picking one brings its slide into view.
const props = defineProps<{ slides: { caption: string; src?: string }[]; vertical?: boolean }>();
const track = ref<HTMLElement>();
const index = ref(0);
function onScroll() {
  const el = track.value; if (!el) return;
  index.value = props.vertical ? Math.round(el.scrollTop / el.clientHeight) : Math.round(el.scrollLeft / el.clientWidth);
}
function go(i: number) {
  const el = track.value; if (!el) return;
  const k = Math.max(0, Math.min(props.slides.length - 1, i));
  el.scrollTo(props.vertical ? { top: k * el.clientHeight, behavior: 'smooth' } : { left: k * el.clientWidth, behavior: 'smooth' });
}
</script>

<template>
  <div class="carousel" :class="{ vertical }">
    <ul ref="track" class="track" tabindex="0" aria-label="Image carousel" @scroll.passive="onScroll">
      <li v-for="(s, i) in slides" :key="i">
        <figure>
          <img v-if="s.src" :src="s.src" :alt="s.caption" loading="lazy" />
          <div v-else class="blank" aria-hidden="true" />
          <figcaption v-if="!vertical">{{ s.caption }}</figcaption>
        </figure>
      </li>
    </ul>
    <ol v-if="vertical" class="captions">
      <li v-for="(s, i) in slides" :key="i"><button type="button" :aria-current="i === index" @click="go(i)"><span class="num">{{ String(i + 1).padStart(2, '0') }}</span>{{ s.caption }}</button></li>
    </ol>
    <div v-else class="controls">
      <button type="button" aria-label="Previous slide" :disabled="index === 0" @click="go(index - 1)">←</button>
      <span class="count">{{ index + 1 }} / {{ slides.length }}</span>
      <button type="button" aria-label="Next slide" :disabled="index === slides.length - 1" @click="go(index + 1)">→</button>
    </div>
  </div>
</template>

<style scoped>
.carousel { display: grid; gap: .6rem; min-width: 0; }
.track { list-style: none; margin: 0; padding: 0; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; border-radius: 10px; }
.track::-webkit-scrollbar { display: none; }
.track:focus-visible { outline: 2px solid var(--accent-deep); outline-offset: 3px; }
.track > li { flex: 0 0 100%; scroll-snap-align: start; }
figure { margin: 0; display: grid; gap: .5rem; }
img, .blank { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 10px; }
.blank { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--text) 6%, transparent) 0 10px, transparent 10px 20px), color-mix(in srgb, var(--text) 5%, transparent); }
figcaption { font-size: var(--type-small); color: var(--text-muted); }
.controls { display: flex; align-items: center; gap: .75rem; }
.controls button { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; padding: 0; font-size: var(--icon-size); line-height: 1; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--text) 18%, transparent); background: none; color: var(--text); cursor: pointer; transition: background .2s var(--ease), color .2s var(--ease), opacity .2s; }
.controls button:hover:not(:disabled) { background: var(--accent-deep); color: var(--on-dark); border-color: transparent; }
.controls button:disabled { opacity: .3; cursor: default; }
.controls button:focus-visible, .captions button:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color-on-light); outline-offset: var(--focus-ring-offset); }
.count { font-size: var(--type-small); color: var(--text-muted); font-variant-numeric: tabular-nums; }
/* vertical: a tall frame of stacked slides on the left, the linked captions on the right */
.vertical { grid-template-columns: minmax(0, 419fr) minmax(0, 363fr); gap: 20px; align-items: center; }
.vertical .track { flex-direction: column; overflow: hidden auto; scroll-snap-type: y mandatory; aspect-ratio: 4 / 5; }
.vertical .track > li { flex: 0 0 100%; height: 100%; }
.vertical figure, .vertical img, .vertical .blank { height: 100%; aspect-ratio: auto; }
.captions { list-style: none; margin: 0; padding: 0; display: grid; }
.captions button { display: flex; gap: .9rem; width: 100%; padding: .9rem 0; border: 0; border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); background: none; color: color-mix(in srgb, var(--text) 45%, var(--surface)); font-size: var(--button-font-size); font-weight: var(--button-font-weight); line-height: var(--leading-ui); text-align: left; cursor: pointer; transition: color .3s var(--ease); }
.captions li:last-child button { border-bottom: 1px solid color-mix(in srgb, var(--text) 12%, transparent); }
.captions button[aria-current='true'] { color: var(--accent-deep); }
.num { font-variant-numeric: tabular-nums; font-size: var(--type-caption); padding-top: .1rem; }
@media (max-width: 800px) { .vertical { grid-template-columns: 1fr; } }
</style>
