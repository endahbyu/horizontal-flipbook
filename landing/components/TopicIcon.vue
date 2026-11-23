<script setup lang="ts">
// Line icon for a topic. One simple drawing per shape (lib/icons.ts), in the current text colour; numbered topics (lib/shapes.ts NUMERALS) show their numeral.
import type { ShapeName } from '~/lib/shapes';
import { ICONS } from '~/lib/icons';
import { NUMERALS } from '~/lib/shapes';
defineProps<{ name: ShapeName }>();
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- numbered topics show their numeral, in the site's typeface (light weight, to sit with the line icons) -->
    <text v-if="NUMERALS[name]" x="12" y="12.6" text-anchor="middle" dominant-baseline="central" font-family="'Host Grotesk', sans-serif" font-weight="350" font-size="16" fill="currentColor" stroke="none">{{ NUMERALS[name] }}</text>
    <path v-for="d in ICONS[name]" v-else :key="d" :d="d" />
  </svg>
</template>
