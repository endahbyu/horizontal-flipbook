<script setup lang="ts">
// One page, shown over the scene the way the reference does it:
//   · the scene stays visible on the left, blurred under a veil of the brand colour;
//   · a white sheet slides in from the right and covers the rest, with a square close button at its left edge;
//   · the page opens on a large picture (its first figure, or a placeholder) with a small label, then a rule,
//     the title in large type rising into view, and the page's blocks underneath. A closing call to action
//     sits in a pale box at the end.
import type { Page } from '~/composables/useSite';
const props = defineProps<{ page: Page | null; topic?: string; closeLabel: string }>();
const emit = defineEmits<{ close: []; go: [slug: string] }>();
const body = ref<HTMLElement>();
watch(() => props.page?.slug, () => nextTick(() => body.value?.scrollTo({ top: 0 })));
const baseURL = useRuntimeConfig().app.baseURL;
const place = computed(() => !!props.page?.at); // a location on the globe: its page opens on the title, with the lead as a small subtitle, and the picture underneath
const hero = computed(() => { const b = props.page?.blocks[0]; return b?.type === 'figure' ? b : null; });
const rest = computed(() => {
  const list = props.page ? (hero.value ? props.page.blocks.slice(1) : props.page.blocks) : [];
  // a picture followed by text sits beside it, picture on the left, as on the reference
  const out: (typeof list[number] | { type: 'pair'; figure: Extract<typeof list[number], { type: 'figure' }>; text: string })[] = [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i], n = list[i + 1];
    if (b.type === 'figure' && n?.type === 'text') { out.push({ type: 'pair', figure: b, text: n.text }); i++; } else out.push(b);
  }
  return out;
});
// scrolling with a wheel glides: each turn of the wheel moves a target, and the page eases towards it
let goal = -1, frame = 0;
function glide() {
  const el = body.value; if (!el) return;
  const d = goal - el.scrollTop;
  if (Math.abs(d) < 0.5) { el.scrollTop = goal; goal = -1; return; }
  el.scrollTop += d * 0.1; frame = requestAnimationFrame(glide);
}
function onWheel(e: WheelEvent) {
  const el = body.value; if (!el || e.ctrlKey || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  e.preventDefault();
  if (goal < 0) goal = el.scrollTop;
  goal = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, goal + e.deltaY * (e.deltaMode === 1 ? 100 / 6 : 1)));
  cancelAnimationFrame(frame); frame = requestAnimationFrame(glide);
}
watch(() => props.page?.slug, () => { goal = -1; cancelAnimationFrame(frame); });
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <Transition name="sheet" :duration="900">
    <div v-if="page" class="sheet">
      <div class="veil" aria-hidden="true" @click="emit('close')" />
      <button type="button" class="close" :aria-label="closeLabel" @click="emit('close')"><svg class="icon-12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg></button>
      <aside class="panel" role="dialog" aria-modal="false" :aria-label="page.title">
        <div ref="body" class="body" @wheel="onWheel">
          <Transition name="swap" mode="out-in">
            <article :key="page.slug">
              <template v-if="place">
                <RiseText tag="h2" class="place-title" :text="page.title" :delay="450" />
                <p v-if="page.lead" class="subtitle">{{ page.lead }}</p>
                <hr class="first">
              </template>
              <figure class="hero">
                <img v-if="hero?.src" :src="hero.src" :alt="hero.caption" />
                <div v-else class="blank" aria-hidden="true" />
                <p class="chip"><img class="chip-mark" :src="`${baseURL}logo-color.png`" alt="" width="320" height="280">{{ topic }}</p>
              </figure>
              <template v-if="!place">
                <hr>
                <RiseText tag="h2" :text="page.title" :delay="450" />
                <p v-if="page.lead" class="lead">{{ page.lead }}</p>
              </template>
              <div v-else class="gap" />
              <div class="blocks">
                <template v-for="(b, i) in rest" :key="i">
                  <div v-if="b.type === 'pair'" class="pair">
                    <figure class="figure"><img v-if="b.figure.src" :src="b.figure.src" :alt="b.figure.caption" loading="lazy" /><div v-else class="blank" aria-hidden="true" /><figcaption>{{ b.figure.caption }}</figcaption></figure>
                    <p class="text">{{ b.text }}</p>
                  </div>
                  <h3 v-else-if="b.type === 'heading'">{{ b.text }}</h3>
                  <p v-else-if="b.type === 'text'" class="text">{{ b.text }}</p>
                  <div v-else-if="b.type === 'columns'" class="columns"><p>{{ b.left }}</p><p>{{ b.right }}</p></div>
                  <figure v-else-if="b.type === 'figure'" class="figure">
                    <img v-if="b.src" :src="b.src" :alt="b.caption" loading="lazy" />
                    <div v-else class="blank" aria-hidden="true" />
                    <figcaption>{{ b.caption }}</figcaption>
                  </figure>
                  <BlockCarousel v-else-if="b.type === 'carousel'" :slides="b.slides" :vertical="b.vertical" />
                  <div v-else-if="b.type === 'spacer'" class="spacer" :class="b.size ?? 'm'" aria-hidden="true" />
                  <hr v-else-if="b.type === 'rule'" class="rule">
                  <div v-else-if="b.type === 'stat'" class="stat"><p class="value">{{ b.value }}</p><p class="stat-text">{{ b.text }}</p></div>
                  <BlockVideo v-else-if="b.type === 'video'" :caption="b.caption" :src="b.src" :poster="b.poster" />
                  <div v-else-if="b.type === 'button'" class="callout">
                    <p class="callout-title">{{ b.label }}</p>
                    <button type="button" class="cta fill-btn btn-md" @click="emit('go', b.to)"><span class="fill" aria-hidden="true" /><span class="knob" aria-hidden="true"><svg class="icon-12 arrow in" viewBox="0 0 12 12"><path d="M2 6h8M7 3l3 3-3 3" /></svg><svg class="icon-12 arrow out" viewBox="0 0 12 12"><path d="M2 6h8M7 3l3 3-3 3" /></svg></span><span class="label">{{ b.label }}</span></button>
                  </div>
                </template>
              </div>
            </article>
          </Transition>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
/* measured on the reference at 1188×850: the sheet starts at 306 px (25.76%), 8 px from the other edges, corners 0 20px */
.sheet { --edge: 25.76%; --ease-sheet: cubic-bezier(.45, 0, .25, 1); position: absolute; inset: 0; z-index: var(--z-panel); }
.veil { position: absolute; inset: 0; background: color-mix(in srgb, var(--stage-from) 30%, transparent); backdrop-filter: blur(10px); transition: opacity .85s var(--ease-sheet), backdrop-filter .85s var(--ease-sheet); }
.panel { position: absolute; top: 8px; right: 8px; bottom: 8px; left: var(--edge); border-radius: 0 20px; background: var(--surface); color: var(--text); overflow: hidden; transition: transform .85s var(--ease-sheet); }
.close { position: absolute; z-index: 1; left: calc(var(--edge) - 68px); top: calc(50% - 30px); display: grid; place-items: center; width: 60px; height: 60px; padding: 0; border: 0; border-radius: 0 10px; background: var(--surface); color: var(--accent-deep); cursor: pointer; transition: transform .85s var(--ease-sheet), opacity .5s var(--ease-sheet); }
.close svg { fill: none; stroke: currentColor; stroke-width: var(--icon-stroke); stroke-linecap: round; transition: rotate .4s var(--ease); }
.close:hover svg { rotate: 90deg; }
.body { height: 100%; overflow-y: auto; overscroll-behavior: contain; padding: 8px 8px 4rem; }
article { display: grid; justify-items: center; }
.hero { position: relative; justify-self: stretch; margin: 32px 0 0; }
.hero > img, .hero > .blank { /* direct children only: the label's little logo must keep its own size */ display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 10px; }
.chip { position: absolute; left: 10px; top: 10px; display: flex; align-items: center; gap: .5rem; padding: .35rem .7rem .35rem .4rem; border-radius: 4px; background: var(--surface); color: var(--text); font-size: var(--type-caption); }
.chip-mark { width: 1.15rem; height: auto; }
hr:not(.rule) { justify-self: stretch; margin: 1.4rem 0 0; border: 0; border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); }
h2 { max-width: 16em; margin: 4.4rem 1.5rem 4rem; text-align: center; font-family: var(--font-display); font-size: var(--type-display); line-height: var(--leading-display); letter-spacing: var(--tracking-display); font-weight: var(--weight-display); color: var(--accent-deep); text-wrap: balance; }
.lead { max-width: 30rem; margin: -2rem 1.5rem 3rem; text-align: center; font-size: var(--type-lead); color: var(--text-muted); text-wrap: pretty; }
.blocks { width: 100%; max-width: 54rem; display: grid; gap: 2rem; padding: 0 clamp(0px, 2vw, 1.5rem); }
.text, .columns p { font-size: var(--type-body); line-height: var(--leading-body); color: color-mix(in srgb, var(--text) 62%, var(--surface)); text-wrap: pretty; }
.text { max-width: 23rem; justify-self: end; }
h3 { font-family: var(--font-display); font-size: var(--type-heading); line-height: var(--leading-heading); font-weight: var(--weight-heading); color: var(--accent-deep); margin-top: 1rem; }
.columns { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.pair { display: grid; grid-template-columns: 419fr 363fr; gap: 20px; align-items: start; }
.pair .figure { max-width: none; }
.pair .text { max-width: none; justify-self: stretch; }
.figure { margin: 0; display: grid; gap: .5rem; max-width: 26rem; }
.figure img, .figure .blank { width: 100%; aspect-ratio: 419 / 270; object-fit: cover; border-radius: 10px; }
figcaption { font-size: var(--type-small); color: var(--text-muted); }
/* no picture yet: a plain placeholder scene in the brand colours */
.blank { background: radial-gradient(60% 90% at 78% 118%, color-mix(in srgb, var(--brand-deep) 30%, var(--surface)) 0 60%, transparent 61%), radial-gradient(70% 80% at 18% 125%, color-mix(in srgb, var(--brand) 18%, var(--surface)) 0 60%, transparent 61%), linear-gradient(180deg, color-mix(in srgb, var(--accent) 22%, var(--surface)), color-mix(in srgb, var(--accent) 8%, var(--surface))); }
.spacer.s { height: 1rem; } .spacer.m { height: 3rem; } .spacer.l { height: 6rem; }
.rule { margin: 0; border: 0; border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); }
.place-title { margin: 3.6rem 1.5rem .4rem; font-size: var(--type-title); }
.subtitle { font-size: var(--type-small); color: var(--text-muted); }
hr.first { margin-top: 2.2rem; }
.gap { height: 2.5rem; }
/* a large figure with a line of explanation under it, after a short rule */
.stat { max-width: 15rem; padding-top: 1.2rem; border-top: 1px solid color-mix(in srgb, var(--text) 30%, transparent); }
.value { font-family: var(--font-display); font-size: var(--type-title); line-height: var(--leading-display); color: var(--accent-deep); }
.stat-text { margin-top: .6rem; font-size: var(--type-small); line-height: var(--leading-body); color: var(--accent-deep); }
.callout { justify-self: stretch; display: grid; justify-items: center; gap: 1.6rem; margin-top: 2rem; padding: 3.5rem 1.5rem; border-radius: 6px; background: color-mix(in srgb, var(--text) 7%, var(--surface)); text-align: center; }
.callout-title { max-width: 18em; font-family: var(--font-display); font-size: var(--type-callout); line-height: var(--leading-heading); font-weight: var(--weight-heading); color: var(--accent-deep); text-wrap: balance; }
.cta { display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: var(--surface); color: var(--accent-deep); cursor: pointer; transition: gap .6s var(--ease); }
.knob { display: grid; place-items: center; border-radius: 50%; /* size from fill-button.css */ background: var(--accent-deep); }
button:focus-visible { outline: 2px solid var(--accent-deep); outline-offset: 3px; }
/* opening: the veil and blur come up while the sheet slides in from the right; its content fades in once it has arrived */
.sheet-enter-from .veil, .sheet-leave-to .veil { opacity: 0; }
.sheet-enter-from .panel, .sheet-leave-to .panel { transform: translateX(calc(100% + 16px)); }
.sheet-enter-from .close, .sheet-leave-to .close { transform: translateX(calc(100vw - var(--edge))); opacity: 0; }
.sheet-enter-active .body { animation: show .45s var(--ease) .55s both; }
@keyframes show { from { opacity: 0; } }
.swap-enter-active, .swap-leave-active { transition: opacity .3s var(--ease); }
.swap-enter-from, .swap-leave-to { opacity: 0; }
@media (max-width: 800px) {
  .sheet { --edge: 8px; }
  .panel { top: 4.5rem; }
  .close { left: auto; right: 8px; top: 8px; width: 44px; height: 44px; }
  .columns, .pair { grid-template-columns: 1fr; }
  .text { justify-self: start; }
  h2 { margin: 2.5rem 1rem 2.5rem; }
}
</style>
