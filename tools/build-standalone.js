// Build one self-contained HTML file per book: the reader with every page
// image, font, stylesheet, script and the page-turn sound inlined, so it opens
// by double-click with no server and no internet.
//
//   node tools/build-standalone.js   →   downloads/MCMC-P2630-<Book>.html
//
// The landing page is not included; the "Homepage" link and the download
// button are removed from the standalone copy.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'downloads');

// Reader page → download file name.
export const BOOKS = {
  strategy: { html: 'strategy.html', file: 'MCMC-P2630-Strategy-Plan.html' },
  'action-plan': { html: 'action-plan.html', file: 'MCMC-P2630-Action-Plan.html' },
};

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel));
const dataUri = (rel) => `data:${MIME[path.extname(rel)]};base64,${read(rel).toString('base64')}`;
// Keep inlined code from closing the surrounding <script> or <style> early.
const safeScript = (code) => code.replace(/<\/script/gi, '<\\/script');
const safeStyle = (css) => css.replace(/<\/style/gi, '<\\/style');

function loadManifest(bookId) {
  const sandbox = {};
  new Function('window', read('js/pages.js').toString())(sandbox);
  const manifest = sandbox.FLIPBOOK_MANIFESTS[bookId];
  if (!manifest) throw new Error(`No pages found for book "${bookId}"`);
  return manifest;
}

function inlineManifest(bookId) {
  const m = loadManifest(bookId);
  const inline = {
    coverFront: m.coverFront && dataUri(m.coverFront),
    coverBack: m.coverBack && dataUri(m.coverBack),
    pages: m.pages.map(dataUri),
  };
  return `window.FLIPBOOK_MANIFESTS = ${JSON.stringify({ [bookId]: inline })};`;
}

function inlineStylesheet(rel) {
  // Rewrite url(../assets/...) references (fonts) to data URIs.
  const css = read(rel).toString().replace(/url\("?\.\.\/(assets\/[^")]+)"?\)/g, (_, asset) => `url("${dataUri(asset)}")`);
  return `<style>\n${safeStyle(css)}\n</style>`;
}

function buildBook(bookId, { html, file }) {
  let page = read(html).toString();

  // Reader only: no way back to the landing page, no download-of-itself.
  page = page.replace(/\s*<a class="reader-back"[\s\S]*?<\/a>/, '');
  page = page.replace(/\s*<a class="reader-download"[\s\S]*?<\/a>/, '');
  // Font preloads point at files that no longer exist.
  page = page.replace(/\s*<link rel="preload"[^>]*>/g, '');

  page = page.replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g, (_, href) => inlineStylesheet(href));

  page = page.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
    let code = src === 'js/pages.js' ? inlineManifest(bookId) : read(src).toString();
    if (src === 'js/reader-sound.js') {
      code = code.replace('"assets/sounds/page-turn.mp3"', JSON.stringify(dataUri('assets/sounds/page-turn.mp3')));
    }
    return `<script>\n${safeScript(code)}\n</script>`;
  });

  page = page.replace('<body class="reader"', '<body class="reader is-standalone"');
  page = page.replace('<!-- Generated from one template', '<!-- Standalone download, built by tools/build-standalone.js. Generated from one template');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, file);
  fs.writeFileSync(out, page);
  return { out, bytes: fs.statSync(out).size };
}

for (const [bookId, book] of Object.entries(BOOKS)) {
  const { out, bytes } = buildBook(bookId, book);
  console.log(`${path.relative(ROOT, out)}  ${(bytes / 1048576).toFixed(1)} MB`);
}
