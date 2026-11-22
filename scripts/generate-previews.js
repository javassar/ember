// Script to generate high-resolution iPhone device preview screenshots and an animated GIF for README.

import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import pkg from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = pkg;

const distDir = path.resolve('dist');
const outDir = path.resolve('docs/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// 1. Create lightweight local static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || !path.extname(reqPath)) reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
  }
});

await new Promise((resolve) => server.listen(4173, '127.0.0.1', resolve));
console.log('Preview server running on http://127.0.0.1:4173');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const userDataDir = '/tmp/chrome-ember-preview';
fs.rmSync(userDataDir, { recursive: true, force: true });
fs.mkdirSync(userDataDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  userDataDir,
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=393,852',
    '--force-device-scale-factor=2',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 393,
    height: 852,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // Step 1: Open app (starts on /onboarding) and click "Skip onboarding"
  console.log('Navigating to onboarding...');
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const skipLink = await page.$('.skip-link');
  if (skipLink) {
    console.log('Skipping onboarding...');
    await skipLink.click();
    await new Promise((r) => setTimeout(r, 600));
  }

  // Step 2: Go to /settings and click "Load Sample Content" so library and home have quotes
  console.log('Seeding sample content in Settings...');
  await page.goto('http://127.0.0.1:4173/settings', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const txt = await page.evaluate((el) => el.textContent, btn);
    if (txt && txt.includes('Load Sample Content')) {
      await btn.click();
      console.log('Clicked Load Sample Content!');
      await new Promise((r) => setTimeout(r, 800));
      break;
    }
  }

  // 1. Static Screenshots
  console.log('Capturing Home (Dark)...');
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'home-dark.png') });

  console.log('Capturing Home (Light)...');
  const themeToggle = await page.$('.home-nav button');
  if (themeToggle) {
    await themeToggle.click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, 'home-light.png') });
    await themeToggle.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log('Capturing Library...');
  await page.goto('http://127.0.0.1:4173/library', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'library.png') });

  console.log('Capturing Session...');
  await page.goto('http://127.0.0.1:4173/session/start', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: path.join(outDir, 'session.png') });

  // 2. Multi-Action Interactive Walkthrough GIF
  console.log('Choreographing dynamic animated GIF walkthrough...');
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const targetWidth = 300;
  const targetHeight = 650;
  const frameBuffers = [];
  const delays = [];

  const addFrame = async (delayMs) => {
    const raw = await page.screenshot();
    const buf = await sharp(raw).resize(targetWidth, targetHeight).ensureAlpha().raw().toBuffer();
    frameBuffers.push(buf);
    delays.push(delayMs);
  };

  // 1. Home Screen (Dark)
  await addFrame(900);

  // 2. Toggle to Light Mode
  const toggleBtn = await page.$('.home-nav button');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await addFrame(800);

    // Toggle back to Dark Mode
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 400));
    await addFrame(500);
  }

  // 3. Click "Start" Space Tile
  const startTile = await page.$('.mode-tile--start');
  if (startTile) {
    await startTile.click();
  } else {
    await page.goto('http://127.0.0.1:4173/session/start');
  }

  // 4. Capture expanding breath ritual orb
  await new Promise((r) => setTimeout(r, 400));
  await addFrame(400);
  await new Promise((r) => setTimeout(r, 600));
  await addFrame(400);

  // 5. Arrive at affirmation card
  await new Promise((r) => setTimeout(r, 1200));
  await addFrame(900);

  // 6. Click "This helped" button
  const helpedBtn = await page.$('.session-chrome-bottom button:nth-child(2)');
  if (helpedBtn) {
    await helpedBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await addFrame(800); // Shows "Marked as helpful" toast!
  }

  // 7. Click Next button in session to advance card
  const nextCardBtn = await page.$('.session-chrome-bottom button:nth-child(3)');
  if (nextCardBtn) {
    await nextCardBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await addFrame(900); // Shows next affirmation
  }

  // 8. Return Home
  const closeSessionBtn = await page.$('.session-chrome-top-left a');
  if (closeSessionBtn) {
    await closeSessionBtn.click();
  } else {
    await page.goto('http://127.0.0.1:4173/');
  }
  await new Promise((r) => setTimeout(r, 500));

  // 9. Open Library
  const libraryLink = await page.$('.home-nav a[href="/library"]');
  if (libraryLink) {
    await libraryLink.click();
  } else {
    await page.goto('http://127.0.0.1:4173/library');
  }
  await new Promise((r) => setTimeout(r, 600));
  await addFrame(800); // Library view with all items

  // 10. Filter by "Start" chip
  const startChip = await page.$('.filter-group .ember-chip:nth-child(2)');
  if (startChip) {
    await startChip.click();
    await new Promise((r) => setTimeout(r, 400));
    await addFrame(700); // Filtered to Start space
  }

  // 11. Filter by "Charge" chip
  const chargeChip = await page.$('.filter-group .ember-chip:nth-child(3)');
  if (chargeChip) {
    await chargeChip.click();
    await new Promise((r) => setTimeout(r, 400));
    await addFrame(700); // Filtered to Charge space with red accent
  }

  // 12. Reset to "All Spaces" chip
  const allChip = await page.$('.filter-group .ember-chip:nth-child(1)');
  if (allChip) {
    await allChip.click();
    await new Promise((r) => setTimeout(r, 300));
  }

  // 13. Smoothly scroll down the library list
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'instant' }));
  await new Promise((r) => setTimeout(r, 300));
  await addFrame(500);

  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'instant' }));
  await new Promise((r) => setTimeout(r, 300));
  await addFrame(600);

  // 14. Return Home
  const libBack = await page.$('.library-header-left a');
  if (libBack) {
    await libBack.click();
  } else {
    await page.goto('http://127.0.0.1:4173/');
  }
  await new Promise((r) => setTimeout(r, 500));
  await addFrame(1200); // Final resting frame on Home before loop

  // Assemble into smooth animated GIF
  console.log(`Assembling dynamic GIF with gifenc (${frameBuffers.length} action frames)...`);
  const gif = GIFEncoder();
  for (let i = 0; i < frameBuffers.length; i++) {
    const rawData = frameBuffers[i];
    const palette = quantize(rawData, 256);
    const index = applyPalette(rawData, palette);
    gif.writeFrame(index, targetWidth, targetHeight, {
      palette,
      delay: delays[i],
    });
  }
  gif.finish();

  fs.writeFileSync(path.join(outDir, 'preview.gif'), Buffer.from(gif.bytes()));
  console.log('SUCCESS! Dynamic interactive preview.gif generated in docs/screenshots/');
} catch (err) {
  console.error('Error generating previews:', err);
} finally {
  await browser.close();
  server.close();
}
