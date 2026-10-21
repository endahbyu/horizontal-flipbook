// Small, sharp thumbnails for the Thumbnails panel and the scrubber preview.
// The panel shows pages ~180-360px wide; shrinking the 1920px page images
// that far in the browser looks jagged and downloads every full page.
//
//   node tools/build-thumbs.js   →   assets/books/<book>/thumbs/<name>.webp
//
// Only (re)builds thumbnails that are missing or older than their page.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOKS_DIR = path.join(ROOT, 'assets/books');
const WIDTH = 480; // 2x the widest thumbnail slot, so it stays crisp on retina
const PAGE_FILE = /^(page-\d\d|cover-front|cover-back)\.webp$/;

let built = 0;
for (const book of fs.readdirSync(BOOKS_DIR)) {
  const dir = path.join(BOOKS_DIR, book);
  if (!fs.statSync(dir).isDirectory()) continue;
  const outDir = path.join(dir, 'thumbs');
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(dir).filter((f) => PAGE_FILE.test(f))) {
    const src = path.join(dir, name);
    const out = path.join(outDir, name);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
    await sharp(src)
      .resize({ width: WIDTH, kernel: 'lanczos3' })
      .sharpen({ sigma: 0.6 })          // restores edge contrast lost when shrinking
      .webp({ quality: 82, effort: 6 })
      .toFile(out);
    built++;
  }
}
console.log(`Thumbnails: ${built} built.`);
