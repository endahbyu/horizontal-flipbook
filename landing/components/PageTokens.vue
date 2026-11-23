<script setup lang="ts">
// Inside a topic: its pages as a row of tokens under the shape, each with its title beneath.
// The tokens themselves are drawn in the scene (ParticleStage.vue); here are their unseen buttons and their titles.
// (On phones the same pages are offered by LevelSlider instead.)
defineProps<{ pages: { slug: string; title: string; soon?: boolean }[]; soonLabel?: string }>();
const emit = defineEmits<{ pick: [slug: string]; hover: [index: number] }>();
onBeforeUnmount(() => emit('hover', -1));
</script>

<template>
  <ul class="row" aria-label="Pages in this topic">
    <li v-for="(p, i) in pages" :key="p.slug" :style="{ '--i': i, '--dip': 1 - Math.min(1, Math.abs(i - (pages.length - 1) / 2)) }">
      <button type="button" :aria-label="p.soon ? `${p.title} (${soonLabel ?? 'coming soon'})` : p.title" :aria-disabled="p.soon || undefined" :class="{ soon: p.soon }" @click="emit('pick', p.slug)" @pointerenter="emit('hover', i)" @pointerleave="emit('hover', -1)" @focus="emit('hover', i)" @blur="emit('hover', -1)" />
      <span class="name" aria-hidden="true">{{ p.title }}</span>
    </li>
  </ul>
</template>

<style scoped>
/* keep in step with the tokens' places in ParticleStage.vue (slot()) */
.row { position: absolute; z-index: var(--z-ui); left: 0; right: 0; top: calc(69% - 42px); margin: 0; padding: 0; list-style: none; display: flex; justify-content: center; gap: clamp(2.5rem, 7.5vw, 5.6rem); pointer-events: none; }
li { position: relative; width: 84px; display: flex; flex-direction: column; align-items: center; gap: 1.6rem; translate: 0 calc(var(--dip) * 9px); pointer-events: auto; }
button { width: 84px; height: 84px; padding: 0; border: 0; border-radius: 8px 32px 8px 32px; background: none; cursor: pointer; }
button.soon { cursor: default; }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
.name { flex: none; width: 11rem; text-align: center; font-size: var(--button-font-size); font-weight: var(--button-font-weight); line-height: var(--leading-ui); color: var(--on-dark); text-wrap: balance; animation: show .5s var(--ease) both; animation-delay: calc(.7s + var(--i) * 110ms); }
@keyframes show { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .name { animation: none; } }
</style>
