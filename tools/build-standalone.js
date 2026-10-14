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
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'downloads');

// Reader page → download file name.
export const BOOKS = {
  strategy: { html: 'strategy.html', file: 'MCMC-P2630-Strategy-Plan.html' },
  'action-plan': { html: 'action-plan.html', file: 'MCMC-P2630-Action-Plan.html' },
};

// Page images are re-encoded for the download only (the website keeps the
// originals): 1600px wide is still sharp on laptop screens, and WebP quality 75
// keeps small text crisp while cutting the file to roughly a quarter.
const DOWNLOAD_IMAGE = { width: 1600, quality: 75 };

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel));
const dataUri = (rel) => `data:${MIME[path.extname(rel)]};base64,${read(rel).toString('base64')}`;
// Keep inlined code from closing the surrounding <script> or <style> early.
const safeScript = (code) => code.replace(/<\/script/gi, '<\\/script');
const safeStyle = (css) => css.replace(/<\/style/gi, '<\\/style');

async function imageDataUri(rel) {
  const buffer = await sharp(path.join(ROOT, rel))
    .resize({ width: DOWNLOAD_IMAGE.width, withoutEnlargement: true })
    .webp({ quality: DOWNLOAD_IMAGE.quality, effort: 5 })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString('base64')}`;
}

function loadManifest(bookId) {
  const sandbox = {};
  new Function('window', read('js/pages.js').toString())(sandbox);
  const manifest = sandbox.FLIPBOOK_MANIFESTS[bookId];
  if (!manifest) throw new Error(`No pages found for book "${bookId}"`);
  return manifest;
}

// Every page is written once, as a plain <img>. Without JavaScript (iPhone
// Files / Quick Look previews never run scripts) the reader still sees the
// whole book as a scrolling column of pages. With JavaScript, the manifest
// below reads those same images back, so nothing is embedded twice.
async function staticPages(bookId) {
  const m = loadManifest(bookId);
  const entries = [
    m.coverFront && ['front', m.coverFront, 'Front cover'],
    ...m.pages.map((rel, i) => [`p${i}`, rel, `Page ${String(i + 2).padStart(2, '0')}`]),
    m.coverBack && ['back', m.coverBack, 'Back cover'],
  ].filter(Boolean);
  const imgs = await Promise.all(entries.map(async ([id, rel, alt]) =>
    `<img id="sp-${id}" src="${await imageDataUri(rel)}" alt="${alt}" width="1600" height="900" decoding="async">`));
  const html = `<div class="static-pages" id="staticPages">\n${imgs.join('\n')}\n</div>`;
  const manifest = `(function () {
  var q = function (id) { var el = document.getElementById("sp-" + id); return el ? el.getAttribute("src") : null; };
  var pages = [];
  for (var i = 0; i < ${m.pages.length}; i++) pages.push(q("p" + i));
  window.FLIPBOOK_MANIFESTS = { ${JSON.stringify(bookId)}: { coverFront: q("front"), coverBack: q("back"), pages: pages } };
  document.documentElement.classList.remove("no-js");
})();`;
  return { html, manifest };
}

// Shown only when scripts don't run: the pages as a simple scrolling column.
const NO_JS_CSS = `<style>
.static-pages{ display: none; }
.no-js .static-pages{ display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.no-js .static-pages img{ display: block; width: 100%; height: auto; box-shadow: 0 2px 10px rgb(0 0 0 / 0.12); }
.no-js .book-wrap, .no-js .reader-notice{ display: none !important; }
.no-js body.reader{ height: auto; overflow: auto; }
</style>`;

function inlineStylesheet(rel) {
  // Rewrite url(../assets/...) references (fonts) to data URIs.
  const css = read(rel).toString().replace(/url\("?\.\.\/(assets\/[^")]+)"?\)/g, (_, asset) => `url("${dataUri(asset)}")`);
  return `<style>\n${safeStyle(css)}\n</style>`;
}

async function buildBook(bookId, { html, file }) {
  let page = read(html).toString();

  // Reader only: no way back to the landing page, no download-of-itself.
  page = page.replace(/\s*<a class="reader-back"[\s\S]*?<\/a>/, '');
  page = page.replace(/\s*<a class="reader-download"[\s\S]*?<\/a>/, '');
  // Font preloads point at files that no longer exist.
  page = page.replace(/\s*<link rel="preload"[^>]*>/g, '');
  page = page.replace(/<link rel="icon" type="image\/png" href="([^"]+)">/, (_, href) =>
    `<link rel="icon" type="image/png" href="data:image/png;base64,${read(href).toString('base64')}">`);

  page = page.replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g, (_, href) => inlineStylesheet(href));
  page = page.replace('</head>', `${NO_JS_CSS}\n  </head>`);
  page = page.replace('<html lang="en">', '<html lang="en" class="no-js">');
  // The "needs JavaScript" notice is replaced by the static pages.
  page = page.replace(/\s*<noscript>[\s\S]*?<\/noscript>/, '');

  const { html: pagesHtml, manifest } = await staticPages(bookId);
  page = page.replace('    <script src="js/vendor/', `    ${pagesHtml}\n    <script src="js/vendor/`);
  page = page.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
    let code = src === 'js/pages.js' ? manifest : read(src).toString();
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
  const { out, bytes } = await buildBook(bookId, book);
  console.log(`${path.relative(ROOT, out)}  ${(bytes / 1048576).toFixed(1)} MB`);
}
