<script setup lang="ts">
// Phone-sized helper inside a topic: the topic's pages as a row of chips you can swipe through.
// Tapping a chip opens that page — easier than hitting a small point on the shape with a thumb.
defineProps<{ pages: { slug: string; title: string }[] }>();
defineEmits<{ pick: [slug: string] }>();
</script>

<template>
  <ul class="slider" aria-label="Pages in this topic">
    <li v-for="(p, i) in pages" :key="p.slug" :style="{ '--i': i }">
      <button type="button" @click="$emit('pick', p.slug)"><span class="dot" aria-hidden="true" />{{ p.title }}</button>
    </li>
  </ul>
</template>

<style scoped>
.slider { position: absolute; z-index: var(--z-ui); left: 0; right: 0; bottom: calc(var(--frame) + 4.25rem + 2.75rem); margin: 0; padding: .25rem var(--frame); list-style: none; display: flex; gap: .6rem; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 var(--frame); scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.slider::-webkit-scrollbar { display: none; }
li { flex: none; scroll-snap-align: start; animation: rise .5s var(--ease) both; animation-delay: calc(.35s + var(--i) * 80ms); }
button { display: inline-flex; align-items: center; gap: .6rem; max-width: 72vw; padding: .7rem 1.1rem .7rem .8rem; border-radius: 999px; border: 1px solid var(--glass-line); background: var(--glass); backdrop-filter: blur(12px); color: var(--on-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.dot { flex: none; width: .7rem; height: .7rem; border-radius: 50%; background: var(--accent); border: 2px solid var(--on-dark); }
button:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset); }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } }
@media (prefers-reduced-motion: reduce) { li { animation: none; } }
</style>
