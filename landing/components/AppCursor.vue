<script setup lang="ts">
// Cursor companion: a ring and a short hint that trail the pointer over the stage.
// It hides over buttons, panels and menus, and never appears on touch screens.
const props = defineProps<{ hint: string; enabled: boolean }>();

const el = ref<HTMLElement>();
const shown = ref(false);
let x = 0, y = 0, tx = 0, ty = 0, frame = 0, seen = false;

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return;
  tx = e.clientX; ty = e.clientY;
  if (!seen) { seen = true; x = tx; y = ty; }
  const over = e.target as Element | null;
  shown.value = !!over && over.tagName === 'CANVAS'; // only over the stage itself
}
const onLeave = () => { shown.value = false; };

onMounted(() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  const tick = () => {
    x += (tx - x) * 0.16; y += (ty - y) * 0.16; // trail behind the pointer
    if (el.value) el.value.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave); });
</script>

<template>
  <div ref="el" class="cursor" :class="{ shown: shown && props.enabled }" aria-hidden="true">
    <span class="halo" /><span class="ring" />
    <Transition name="swap" mode="out-in"><span :key="hint" class="hint">{{ hint }}</span></Transition>
  </div>
</template>

<style scoped>
/* like the reference: a 93 px disc of frosted glass with the hint centred inside, and two faint rings around it */
.cursor { position: fixed; left: 0; top: 0; z-index: var(--z-bar); pointer-events: none; opacity: 0; transition: opacity .35s var(--ease); }
.cursor.shown { opacity: 1; }
.ring { position: absolute; left: -46.5px; top: -46.5px; width: 93px; height: 93px; border-radius: 50%; background: color-mix(in srgb, var(--on-dark) 7%, transparent); backdrop-filter: blur(4px); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--on-dark) 16%, transparent); scale: .7; transition: scale .5s var(--ease); }
.halo { position: absolute; left: -57px; top: -57px; width: 114px; height: 114px; border-radius: 50%; box-shadow: 0 0 0 1px color-mix(in srgb, var(--on-dark) 9%, transparent), 0 0 0 13px color-mix(in srgb, var(--on-dark) 1.5%, transparent), 0 0 0 14px color-mix(in srgb, var(--on-dark) 5%, transparent); scale: .6; transition: scale .6s var(--ease); }
.cursor.shown .ring, .cursor.shown .halo { scale: 1; }
.hint { position: absolute; left: 0; top: 0; translate: -50% -50%; width: 96px; text-align: center; font-size: var(--type-caption); font-weight: var(--font-weight-light); line-height: var(--leading-ui); color: color-mix(in srgb, var(--on-dark) 85%, transparent); white-space: pre-line; }
.swap-enter-active, .swap-leave-active { transition: opacity .2s var(--ease); }
.swap-enter-from, .swap-leave-to { opacity: 0; }
</style>
