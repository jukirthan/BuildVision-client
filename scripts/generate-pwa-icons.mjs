import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const root = process.cwd();
const source = path.join(root, "public", "buildvision.png");
const outputDir = path.join(root, "public", "icons");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

await mkdir(outputDir, { recursive: true });

for (const size of [192, 512]) {
  await sharp(source)
    .resize(size, size, { fit: "contain", background: transparent })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, `buildvision-${size}.png`));

  // Maskable icons keep the logo comfortably inside the OS safe zone and use
  // the existing BuildVision ink/blue palette as the adaptive background.
  const logo = await sharp(source)
    .resize(Math.round(size * 0.62), Math.round(size * 0.62), {
      fit: "contain",
      background: transparent,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 2, g: 6, b: 23, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, `buildvision-${size}-maskable.png`));
}

console.log("Generated BuildVision PWA icons in public/icons/");
