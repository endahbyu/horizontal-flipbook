// Static, client-rendered site. The base path comes from NUXT_APP_BASE_URL and the site address from
// NUXT_PUBLIC_SITE_URL (both set by the deploy workflow; the page is served from the read/ folder next to strategy.html).
const base = process.env.NUXT_APP_BASE_URL || '/';
const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL || '') + base;
const description = 'Demo site description. One sentence that says what this experience is about.'; // keep in step with ui.description in the content file

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/styles/tokens.css', '~/assets/styles/base.css', '~/assets/styles/fill-button.css'],
  app: {
    head: {
      title: 'MCMC P2630',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'robots', content: 'noindex, nofollow' }, // review build: keep out of search engines until launch
        { name: 'description', content: description },
        // link previews (these are read from the static page, so they are site-wide, not per page)
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'MCMC P2630' },
        { property: 'og:description', content: description },
        { property: 'og:image', content: `${siteUrl}share.jpg?v=2` }, // bump ?v= whenever share.jpg changes, so chat apps fetch the new picture instead of their cached one
        { property: 'og:image:width', content: '1200' }, { property: 'og:image:height', content: '630' }, { property: 'og:image:alt', content: 'MCMC P2630' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [ // the client's mark; strokes are thickened at these sizes so they stay visible
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${base}favicon-32.png` },
        { rel: 'icon', type: 'image/png', sizes: '64x64', href: `${base}favicon-64.png` },
        { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` },
      ],
    },
  },
});
