<script setup lang="ts">
// The topic's token is drawn inside the scene (ParticleStage.vue, lib/tokenMesh.ts). This is its handle:
// an unseen button lying exactly over it, so it can be pressed, hovered and reached with the keyboard.
import type { ShapeName } from '~/lib/shapes';
defineProps<{ icon: ShapeName; label: string; visible: boolean }>();
defineEmits<{ open: []; hover: [on: boolean] }>();
</script>
<script lang="ts">
// where the token floats for each shape, as a fraction of the screen from its centre (it tucks in beside the shape's outline)
export const SPOT: Record<ShapeName, [number, number]> = { globe: [0.227, 0.095], flask: [-0.2, 0.12], bottle: [-0.2, 0.12], bulb: [-0.27, 0.14], chain: [-0.166, 0.095], target: [-0.282, 0.12] };
</script>

<template>
  <button type="button" class="handle" :class="{ visible }" :style="{ '--sx': SPOT[icon][0], '--sy': SPOT[icon][1] }" :aria-label="label" :tabindex="visible ? 0 : -1"
    @click="$emit('open')" @pointerenter="$emit('hover', true)" @pointerleave="$emit('hover', false)" @focus="$emit('hover', true)" @blur="$emit('hover', false)" />
</template>

<style scoped>
.handle { position: absolute; z-index: var(--z-ui); left: calc(50% + var(--sx, .16) * min(100vw, 150vh)); top: calc(50% + var(--sy, .1) * 100vh); width: 84px; height: 84px; padding: 0; border: 0; border-radius: 8px 32px 8px 32px; background: none; cursor: pointer; pointer-events: none; }
.handle.visible { pointer-events: auto; }
.handle:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
@media (max-width: 800px) { .handle { left: max(calc(var(--frame) + 56px), calc(27% - 31.5px)); top: calc(67% - 31.5px); width: 63px; height: 63px; } } /* matches the token's place in ParticleStage.vue (tokenSpot) */
</style>
