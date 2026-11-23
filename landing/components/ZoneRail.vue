<script setup lang="ts">
// Navigation rail: one icon per topic. Icons further from the active topic are fainter.
// A short line above the active icon fills as you scroll towards the next topic.
// Pointing at the rail reveals every topic's name; the one under the pointer stands out.
// Vertical on the left on wide screens, horizontal along the bottom on phones.
import type { Zone } from '~/composables/useSite';
import type { ScrollTravel } from '~/lib/scrollTravel';

const props = defineProps<{ zones: Zone[]; active: number; travel: ScrollTravel }>();
defineEmits<{ select: [index: number] }>();

const rail = ref<HTMLElement>();
const fade = (i: number) => { const n = props.zones.length, d = Math.min(Math.abs(i - props.active), n - Math.abs(i - props.active)); return d === 0 ? 1 : d === 1 ? 0.6 : d === 2 ? 0.4 : 0.3; };

// the fill follows the scroll position directly (no re-render): half full when resting on a topic
let frame = 0;
onMounted(() => {
  const tick = () => {
    const p = props.travel.state.progress, f = Math.abs(p - Math.round(p)) * 2; // 0 on a topic, 1 half-way to the next
    rail.value?.style.setProperty('--fill', (0.5 + f * 0.5).toFixed(3));
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <nav ref="rail" class="rail" aria-label="Topics">
    <span class="glow" aria-hidden="true" />
    <ul>
      <li v-for="(z, i) in zones" :key="z.id" class="stop" :class="{ active: i === active }" :style="{ '--fade': fade(i) }">
        <span class="line" aria-hidden="true"><span class="line-fill" /></span>
        <button type="button" :aria-current="i === active ? 'true' : undefined" @click="$emit('select', i)">
          <TopicIcon :name="z.shape" class="glyph" />
          <span class="name">{{ z.title }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.rail { position: absolute; z-index: var(--z-ui); left: calc(var(--frame) + 26px); /* measured: icons start 46 px from the edge, 56 px apart */ top: 50%; transform: translateY(-50%); }
.glow { position: absolute; left: 50%; top: 50%; width: 22rem; height: 30rem; translate: -50% -50%; border-radius: 50%; background: color-mix(in srgb, var(--stage-to) 55%, transparent); filter: blur(90px); pointer-events: none; }
ul { position: relative; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 29px; }
.stop { display: flex; flex-direction: column; align-items: flex-start; }
.line { display: block; width: 1px; height: 0; margin-left: 13px; background: var(--glass-line); overflow: hidden; transition: height .5s var(--ease), margin-bottom .55s var(--ease); }
.stop.active .line { height: 2.4rem; margin-bottom: 29px; }
.line-fill { display: block; width: 100%; height: 100%; background: var(--on-dark); transform-origin: top; transform: scaleY(var(--fill, .5)); }
button { position: relative; display: flex; align-items: center; gap: .9rem; padding: 0; border: 0; background: none; color: var(--on-dark); cursor: pointer; opacity: var(--fade); transition: opacity .5s var(--ease); }
.glyph { flex: none; width: var(--icon-size); height: var(--icon-size); stroke-width: var(--icon-stroke); }
.name { font-size: var(--button-font-size); font-weight: var(--button-font-weight); white-space: nowrap; opacity: 0; transform: translateX(-6px); transition: opacity .35s var(--ease), transform .35s var(--ease); pointer-events: none; }
button::before { content: ''; position: absolute; left: -9px; top: -9px; width: 44px; height: 44px; } /* a 44 px area to tap, around the 27 px icon */
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; border-radius: 6px; }
.stop.active .name { font-weight: var(--button-font-weight-current); }

@media (hover: hover) {
  ul:hover button { opacity: .35; }            /* pointing at the rail: every name appears, all dimmed… */
  ul:hover .name { opacity: 1; transform: none; pointer-events: auto; }
  ul:hover button:hover { opacity: 1; }        /* …except the one under the pointer */
}
ul:focus-within .name { opacity: 1; transform: none; }

@media (max-width: 800px) { /* phones keep the rail upright on the left, a little smaller, without names */
  .rail { left: var(--frame); }
  .glow, .name { display: none; }
  ul { gap: 1.15rem; }
  .line { margin-left: .68rem; }
  .stop.active .line { height: 1.6rem; margin-bottom: 1.15rem; }
}
</style>
