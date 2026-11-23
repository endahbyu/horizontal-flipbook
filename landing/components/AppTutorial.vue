<script setup lang="ts">
// Short introduction shown once after loading: a white card per step, the last one enters the experience.
// Like the reference, the scene behind stays clear; the card has two pictures on top, a title, a few lines and a pill button.
const props = defineProps<{ steps: { title: string; text: string; button: string }[] }>();
const emit = defineEmits<{ done: [] }>();
const index = ref(0);
const step = computed(() => props.steps[index.value]);
function next() { if (index.value < props.steps.length - 1) index.value++; else emit('done'); }
</script>

<template>
  <section class="tutorial" aria-live="polite">
    <Transition name="card" mode="out-in">
      <div :key="index" class="card">
        <div class="pictures" aria-hidden="true">
          <span class="cell"><TopicIcon :name="index === 0 ? 'globe' : 'target'" /></span>
          <span class="cell">
            <svg v-if="index === 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="17" rx="5" /><path d="M12 6.5v3" class="wheel" /></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 12V5a1.5 1.5 0 0 1 3 0v6M12.5 10.5V9a1.5 1.5 0 0 1 3 0v2M15.5 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 15a1.5 1.5 0 0 1 2.5-1.6L9.5 16" /></svg>
          </span>
        </div>
        <RiseText tag="h1" :text="step.title" :delay="250" />
        <p class="text">{{ step.text }}</p>
        <button type="button" class="action fill-btn btn-lg" @click="next"><span class="fill" aria-hidden="true" /><span class="knob" aria-hidden="true"><svg class="icon-12 arrow in" viewBox="0 0 12 12"><path d="M2 6h8M7 3l3 3-3 3" /></svg><svg class="icon-12 arrow out" viewBox="0 0 12 12"><path d="M2 6h8M7 3l3 3-3 3" /></svg></span><span class="label">{{ step.button }}</span></button>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
/* the welcome card: sizes and spacing in one place */
.tutorial { --card-width: clamp(20rem, 17rem + 12vw, 27.5rem); --card-inset: .5rem; --card-pad: clamp(1.5rem, 1rem + 1.5vw, 2.25rem); --card-gap: .75rem; --card-picture: clamp(5rem, 4rem + 3vw, 7rem); --card-corner: 34%; }
.tutorial { position: absolute; inset: 0; z-index: var(--z-tutorial); display: grid; place-items: center; padding: var(--frame); }
/* 279×288 at a 1188 px wide window, growing with the window; the lower-left corner is rounded by a third of the width */
.card { width: min(var(--card-width), 100%); /* grows with its text */ padding: var(--card-inset) var(--card-inset) var(--card-pad); border-radius: 0 0 0 var(--card-corner); background: var(--surface); color: var(--accent-deep); text-align: center; display: grid; grid-template-rows: auto auto 1fr auto; justify-items: center; gap: var(--card-gap); box-shadow: 0 20px 60px rgb(0 0 0 / .25); }
.pictures { justify-self: stretch; display: grid; grid-template-columns: 1fr 1fr; margin-bottom: calc(var(--card-gap) * 1.5); border-bottom: 1px solid color-mix(in srgb, var(--accent-deep) 14%, transparent); }
.cell { display: grid; place-items: center; height: var(--card-picture); color: color-mix(in srgb, var(--accent-deep) 55%, var(--surface)); }
.cell + .cell { border-left: 1px solid color-mix(in srgb, var(--accent-deep) 14%, transparent); }
.cell svg { width: 30%; max-width: 34px; }
.wheel { animation: wheel 1.6s var(--ease) infinite; }
@keyframes wheel { 50% { transform: translateY(2.5px); opacity: .4; } }
h1 { padding: 0 var(--card-pad); font-family: var(--font-display); font-size: var(--type-subheading); font-weight: var(--weight-subheading); line-height: var(--leading-heading); text-wrap: balance; }
.text { padding: 0 var(--card-pad); max-width: 32ch; justify-self: center; font-size: var(--type-small); line-height: var(--leading-body); color: color-mix(in srgb, var(--accent-deep) 80%, var(--text)); text-wrap: pretty; }
.action { justify-self: center; margin-top: var(--card-gap); /* the action sits apart from the text: twice the gap between title and text */ display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--accent-deep) 9%, var(--surface)); color: var(--accent-deep); cursor: pointer; transition: gap 1s var(--ease), padding 1s var(--ease); }
.action:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset); }
.knob { display: grid; place-items: center; border-radius: 50%; /* size from fill-button.css */ background: var(--accent-deep); }
.card-enter-active, .card-leave-active { transition: opacity .45s var(--ease), transform .45s var(--ease); }
.card-enter-from { opacity: 0; transform: translateY(14px); }
.card-leave-to { opacity: 0; transform: translateY(-14px); }
@media (prefers-reduced-motion: reduce) { .wheel { animation: none; } }
</style>
