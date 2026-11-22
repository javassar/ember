// Script to generate SVG and PNG placeholder icons with a soft ember glow.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve(process.cwd(), 'public/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function createEmberSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.08;
  const radius = size / 2;
  const orbRadius = (size / 2) - padding;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="baseGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#16161F"/>
      <stop offset="100%" stop-color="#0B0B10"/>
    </radialGradient>
    <radialGradient id="emberGlow" cx="50%" cy="46%" r="48%">
      <stop offset="0%" stop-color="#F4B97A" stop-opacity="1"/>
      <stop offset="45%" stop-color="#FF6B6B" stop-opacity="0.85"/>
      <stop offset="78%" stop-color="#FF6B6B" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#0B0B10" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="coreHighlight" cx="48%" cy="44%" r="22%">
      <stop offset="0%" stop-color="#FFF5EA" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="#F4B97A" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#F4B97A" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background Base -->
  <rect width="${size}" height="${size}" fill="url(#baseGrad)" />

  <!-- Soft Outer Ember Glow -->
  <circle cx="${radius}" cy="${radius}" r="${orbRadius}" fill="url(#emberGlow)" />

  <!-- Inner Core Warmth -->
  <circle cx="${radius}" cy="${radius}" r="${orbRadius * 0.5}" fill="url(#coreHighlight)" />
</svg>
`.trim();
}

async function generateAllIcons() {
  const sizes = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-512x512-maskable.png', size: 512, maskable: true },
    { name: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
  ];

  // Write master SVG favicon
  const svg512 = createEmberSvg(512, false);
  fs.writeFileSync(path.join(outputDir, 'favicon.svg'), svg512);
  console.log('✓ Generated public/icons/favicon.svg');

  // Convert SVG to PNG for each icon target
  for (const item of sizes) {
    const svg = createEmberSvg(item.size, item.maskable);
    const buffer = Buffer.from(svg);
    await sharp(buffer)
      .png()
      .toFile(path.join(outputDir, item.name));
    console.log(`✓ Generated public/icons/${item.name}`);
  }
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
