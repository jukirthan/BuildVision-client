/**
 * One-off asset optimizer: shrinks the brand photography so pages load fast.
 * - Caps width at 1920px (largest size next/image ever requests here).
 * - Re-encodes JPEGs with mozjpeg; converts the huge hero PNG to WebP.
 * Run from frontend/: node scripts/optimize-assets.mjs
 */
import sharp from "sharp";
import { readdir, stat, rename, unlink } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/assets");
const MAX_WIDTH = 1920;

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function optimize(file) {
  const full = path.join(DIR, file);
  const before = (await stat(full)).size;
  const ext = path.extname(file).toLowerCase();
  const img = sharp(full).resize({ width: MAX_WIDTH, withoutEnlargement: true });

  if (ext === ".png") {
    // Photographic PNG — WebP is dramatically smaller with no visible loss.
    const out = full.replace(/\.png$/i, ".webp");
    await img.webp({ quality: 82 }).toFile(out);
    await unlink(full);
    const after = (await stat(out)).size;
    console.log(`${file} -> ${path.basename(out)}  ${kb(before)} -> ${kb(after)}`);
  } else if (ext === ".jpg" || ext === ".jpeg") {
    const tmp = `${full}.tmp`;
    await img.jpeg({ quality: 72, mozjpeg: true }).toFile(tmp);
    const after = (await stat(tmp)).size;
    if (after < before) {
      await unlink(full);
      await rename(tmp, full);
      console.log(`${file}  ${kb(before)} -> ${kb(after)}`);
    } else {
      await unlink(tmp);
      console.log(`${file}  already optimal (${kb(before)})`);
    }
  }
}

const files = await readdir(DIR);
for (const f of files) {
  if (/\.(png|jpe?g)$/i.test(f)) await optimize(f);
}
console.log("done");
