<script setup lang="ts">
// Text that rises into view word by word, each word sliding up from behind its own line, one after another.
// Screen readers get the plain text once; the split words are hidden from them.
const props = withDefaults(defineProps<{ text: string; tag?: string; delay?: number; step?: number }>(), { tag: 'span', delay: 0, step: 45 });
const words = computed(() => props.text.split(/(\s+)/).filter((w) => w.length));
</script>

<template>
  <component :is="tag" class="rise" :aria-label="text">
    <template v-for="(w, i) in words" :key="i + w"><span v-if="/^\s+$/.test(w)" aria-hidden="true">{{ ' ' }}</span><span v-else class="mask" aria-hidden="true"><span class="word" :style="{ animationDelay: `${delay + i * step / 2}ms` }">{{ w }}</span></span></template>
  </component>
</template>

<style scoped>
.mask { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: .08em; margin-bottom: -.08em; }
.word { display: inline-block; animation: rise .8s cubic-bezier(.45, 0, .25, 1) both; }
@keyframes rise { from { transform: translateY(105%); } }
@media (prefers-reduced-motion: reduce) { .word { animation: none; } }
</style>
