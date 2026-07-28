const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const pub = path.join(__dirname, "..", "public");
const src = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-LENOVO-Desktop-3D/assets/c__Users_LENOVO_Desktop_3D_ChatGPT_Image_Jul_20__2026__01_57_49_PM.png"
);

async function main() {
  if (!fs.existsSync(src)) {
    throw new Error("Logo source not found: " + src);
  }
  const meta = await sharp(src).metadata();
  console.log("input", meta.width, meta.height);

  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const avg = (r + g + b) / 3;
    if (max < 18 && avg < 14) {
      data[i + 3] = 0;
    } else if (
      max < 36 &&
      avg < 26 &&
      Math.abs(r - g) < 8 &&
      Math.abs(g - b) < 8
    ) {
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, (max - 12) / 24));
    }
  }

  const transparent = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const trimmed = await sharp(transparent).trim({ threshold: 10 }).png().toBuffer();
  const tmeta = await sharp(trimmed).metadata();
  console.log("trimmed", tmeta.width, tmeta.height);

  const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };

  await sharp(trimmed)
    .resize(1024, 1024, { fit: "contain", background: transparentBg })
    .png({ compressionLevel: 9 })
    .toFile(path.join(pub, "buildvision.png"));

  await sharp(trimmed)
    .resize(640, 640, { fit: "contain", background: transparentBg })
    .webp({ quality: 92 })
    .toFile(path.join(pub, "buildvision.webp"));

  await sharp(trimmed)
    .resize(160, 160, { fit: "contain", background: transparentBg })
    .png()
    .toFile(path.join(pub, "buildvision-sm.png"));

  await sharp(trimmed)
    .resize(64, 64, { fit: "contain", background: transparentBg })
    .png()
    .toFile(path.join(pub, "favicon.png"));

  await sharp(trimmed)
    .resize(32, 32, { fit: "contain", background: transparentBg })
    .png()
    .toFile(path.join(pub, "favicon-32.png"));

  await sharp(trimmed)
    .resize(180, 180, { fit: "contain", background: transparentBg })
    .png()
    .toFile(path.join(pub, "apple-touch-icon.png"));

  const shadeSvg = Buffer.from(`<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g1" cx="35%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#7C3AED" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="72%" cy="32%" r="48%">
      <stop offset="0%" stop-color="#E879F9" stop-opacity="0.75"/>
      <stop offset="55%" stop-color="#C026D3" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g1)"/>
  <rect width="800" height="600" fill="url(#g2)"/>
  <path d="M110 430 Q400 50 690 430" fill="none" stroke="#60A5FA" stroke-width="20" stroke-opacity="0.55" stroke-linecap="round"/>
  <path d="M150 450 Q400 110 650 450" fill="none" stroke="#D946EF" stroke-width="10" stroke-opacity="0.4" stroke-linecap="round"/>
</svg>`);

  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: transparentBg,
    },
  })
    .composite([{ input: shadeSvg, top: 0, left: 0 }])
    .blur(26)
    .webp({ quality: 82 })
    .toFile(path.join(pub, "brand-shade.webp"));

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
