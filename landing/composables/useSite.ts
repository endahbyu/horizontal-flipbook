// Shared state for the whole experience: content and its language, which screen is showing, which topic is active,
// and which page (if any) is open in the side panel. The open page is mirrored in the URL hash,
// so a link to a page works on any static host.
import type { ShapeName } from '~/lib/shapes';

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'columns'; left: string; right: string }
  | { type: 'figure'; caption: string; src?: string }
  | { type: 'carousel'; slides: { caption: string; src?: string }[]; vertical?: boolean }
  | { type: 'spacer'; size?: 's' | 'm' | 'l' }
  | { type: 'rule' }
  | { type: 'stat'; value: string; text: string }
  | { type: 'video'; caption: string; src?: string; poster?: string }
  | { type: 'button'; label: string; to: string };
export type Page = { slug: string; title: string; lead?: string; blocks: Block[]; at?: [longitude: number, latitude: number]; image?: string; icon?: string; href?: string; soon?: boolean }; // `at` places the page's point on the globe; `image` is the picture on that point's hover card
export type Zone = { id: string; title: string; summary: string; shape: ShapeName; pages: Page[] };
export type Site = {
  ui: { brand: string; loading: string; tutorial: { title: string; text: string; button: string }[]; menu: string; menuShort: string; close: string; open: string; hintScroll: string; hintPointer: string; hintFocus: string; cursorExplore: string; cursorFocus: string; description: string; soundOn: string; soundOff: string; language: string; soon?: string };
  zones: Zone[];
  extras?: Page[]; // pages that belong to no topic, linked from the footer (imprint, privacy, …)
};
type Phase = 'loading' | 'tutorial' | 'explore';

export function useSite() {
  const site = useState<Site | null>('site', () => null);
  const locales = useState<{ code: string; label: string; short?: string; param?: string }[]>('locales', () => []);
  const locale = useState('locale', () => 'en');
  const phase = useState<Phase>('phase', () => 'loading');
  const zoneIndex = useState('zone', () => 0);
  const menuOpen = useState('menu', () => false);
  const pageSlug = useState<string | null>('page', () => null);
  const fromMenu = useState('fromMenu', () => false); // the open page was picked in the menu: closing it goes back there
  const focused = useState('focused', () => false); // true once a topic has been entered: the stage moves closer and shows the topic's points

  const zones = computed(() => site.value?.zones ?? []);
  const zone = computed(() => zones.value[zoneIndex.value]);
  const page = computed(() => {
    for (const z of zones.value) { const p = z.pages.find((x) => x.slug === pageSlug.value); if (p) return p; }
    return site.value?.extras?.find((x) => x.slug === pageSlug.value) ?? null;
  });

  async function load() {
    const base = useRuntimeConfig().app.baseURL;
    locales.value = await $fetch<{ code: string; label: string; short?: string; param?: string }[]>(`${base}content/locales.json`);
    // language: the address (?lang=…) wins, then the last choice on this device, then the first in the list
    let wanted = new URLSearchParams(location.search).get('lang');
    if (!wanted) { try { wanted = localStorage.getItem('lang'); } catch { /* private window */ } }
    // the address may name a language by its code (ms) or by the form people know (bm for Bahasa Melayu)
    const found = locales.value.find((l) => l.code === wanted || l.param === wanted);
    await setLocale(found ? found.code : locales.value[0].code, false);
    const fromHash = () => { const slug = location.hash.replace(/^#\/?/, ''); if (slug) openPage(slug, false); else pageSlug.value = null; };
    fromHash();
    window.addEventListener('hashchange', fromHash); // back/forward and pasted links
  }
  /** Switch language: load that language's content, keep the same topic and page open. */
  async function setLocale(code: string, remember = true) {
    const base = useRuntimeConfig().app.baseURL;
    site.value = await $fetch<Site>(`${base}content/${code}.json`);
    locale.value = code; document.documentElement.lang = code;
    if (remember) {
      try { localStorage.setItem('lang', code); } catch { /* private window */ }
      const url = new URL(location.href);
      if (code === locales.value[0].code) url.searchParams.delete('lang'); else url.searchParams.set('lang', locales.value.find((l) => l.code === code)?.param ?? code); // ?lang=bm for Malay; the page itself stays marked lang="ms", the standard code (bm would mean Bambara)
      history.replaceState(null, '', url);
    }
  }
  function goToZone(i: number) {
    zoneIndex.value = Math.max(0, Math.min(zones.value.length - 1, i));
  }
  function openPage(slug: string, updateHash = true, viaMenu = false) {
    fromMenu.value = viaMenu;
    const i = zones.value.findIndex((z) => z.pages.some((p) => p.slug === slug));
    if (i < 0 && !site.value?.extras?.some((p) => p.slug === slug)) return;
    if (i >= 0) zoneIndex.value = i; // footer pages leave the topic where it is
    pageSlug.value = slug; menuOpen.value = false;
    if (updateHash) history.replaceState(null, '', `#/${slug}`);
  }
  function closePage() {
    pageSlug.value = null;
    if (fromMenu.value) { menuOpen.value = true; fromMenu.value = false; } // like the reference: back to the menu it was opened from
    history.replaceState(null, '', location.pathname + location.search);
  }

  return { site, locales, locale, phase, zones, zone, zoneIndex, menuOpen, page, pageSlug, focused, fromMenu, load, setLocale, goToZone, openPage, closePage };
}
