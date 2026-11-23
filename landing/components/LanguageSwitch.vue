<script setup lang="ts">
// Language switch: shows the current language's code; opens a short list to pick another.
const props = defineProps<{ locales: { code: string; label: string; short?: string }[]; current: string; label: string; plain?: boolean }>(); // plain: a small text link that opens upwards (footer)
const emit = defineEmits<{ pick: [code: string] }>();
const open = ref(false);
// the short form shown on the button (BM for Bahasa Melayu, EN for English); the full name is read out with it
const currentLocale = computed(() => props.locales.find((l) => l.code === props.current));
const short = computed(() => currentLocale.value?.short ?? props.current.toUpperCase());
const root = ref<HTMLElement>();
const onOutside = (e: Event) => { if (root.value && !root.value.contains(e.target as Node)) open.value = false; };
onMounted(() => document.addEventListener('pointerdown', onOutside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside));
function pick(code: string) { open.value = false; if (code !== props.current) emit('pick', code); }
</script>

<template>
  <div ref="root" class="lang" :class="{ plain }" @keydown.esc.stop="open = false">
    <button type="button" class="toggle" aria-haspopup="listbox" :aria-expanded="open" @click="open = !open">
      {{ short }}<span class="sr-only"> — {{ label }}: {{ currentLocale?.label }}</span><span class="arrow" :class="{ up: open }" aria-hidden="true" />
    </button>
    <Transition name="drop">
      <ul v-if="open" role="listbox" :aria-label="label">
        <li v-for="l in locales" :key="l.code" role="option" :aria-selected="l.code === current">
          <button type="button" :lang="l.code" @click="pick(l.code)">{{ l.label }}</button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.lang { position: relative; }
.toggle { display: inline-flex; align-items: center; gap: .45rem; height: 2.5rem; padding: 0 .9rem; border-radius: 999px; border: 1px solid var(--glass-line); background: var(--glass); backdrop-filter: blur(12px); color: var(--on-dark); cursor: pointer; }
.toggle:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset); }
.toggle:hover { background: color-mix(in srgb, var(--on-dark) 18%, transparent); }
.arrow { width: 0; height: 0; border: .28rem solid transparent; border-top-color: currentColor; margin-top: .25rem; transition: rotate .3s var(--ease); transform-origin: 50% 25%; }
.arrow.up { rotate: 180deg; }
ul { position: absolute; right: 0; top: calc(100% + .4rem); margin: 0; padding: .35rem; list-style: none; min-width: 11rem; border-radius: .9rem; background: var(--surface); color: var(--text); box-shadow: 0 18px 50px rgb(0 0 0 / .35); }
li button { width: 100%; padding: .55rem .75rem; border: 0; border-radius: .6rem; background: none; color: inherit; font-size: var(--button-font-size); font-weight: var(--button-font-weight); text-align: left; cursor: pointer; }
li button:hover { background: color-mix(in srgb, var(--accent-deep) 9%, transparent); }
li[aria-selected='true'] button { font-weight: var(--button-font-weight-current); color: var(--accent-deep); }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.plain .toggle { height: auto; padding: .4rem 0; border: 0; border-radius: 0; background: none; backdrop-filter: none; }
.plain .toggle:hover { background: none; text-decoration: underline; }
.plain ul { top: auto; bottom: calc(100% + .6rem); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.drop-enter-active, .drop-leave-active { transition: opacity .2s var(--ease), transform .2s var(--ease); }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
