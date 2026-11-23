<script setup lang="ts">
// Video block: a self-hosted video with the browser's own controls. Without a source it shows a placeholder.
defineProps<{ caption: string; src?: string; poster?: string }>();
</script>

<template>
  <figure class="video">
    <video v-if="src" :src="src" :poster="poster" controls playsinline preload="metadata" />
    <div v-else class="blank" aria-hidden="true"><span class="play" /></div>
    <figcaption>{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.video { margin: 0; display: grid; gap: .5rem; }
video, .blank { width: 100%; aspect-ratio: 16 / 9; border-radius: calc(var(--radius) / 2); background: #000; }
.blank { display: grid; place-items: center; background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--text) 6%, transparent) 0 10px, transparent 10px 20px), color-mix(in srgb, var(--text) 5%, transparent); }
.play { width: 3.5rem; height: 3.5rem; border-radius: 50%; background: var(--accent-deep); clip-path: none; position: relative; }
.play::after { content: ''; position: absolute; left: 54%; top: 50%; translate: -50% -50%; border-style: solid; border-width: .55rem 0 .55rem .9rem; border-color: transparent transparent transparent var(--on-dark); }
figcaption { font-size: var(--type-small); color: var(--text-muted); }
</style>
