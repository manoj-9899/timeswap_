import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  console.log('[Icons] Launching Playwright to render high-res PWA icons...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const outDir = path.resolve(process.cwd(), 'public/icons');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Standard icon SVG (Full bleed rounded rect with equilibrium symbol)
  const standardSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <rect width="512" height="512" rx="112" fill="#347A5C"/>
      <circle cx="192" cy="256" r="96" stroke="#FFFFFF" stroke-width="40" fill="none"/>
      <circle cx="320" cy="256" r="96" stroke="#FAF9F6" stroke-width="40" fill="none"/>
      <!-- subtle central intersection glow -->
      <path d="M 256,180 A 96,96 0 0,0 256,332 A 96,96 0 0,0 256,180" fill="rgba(255,255,255,0.15)"/>
    </svg>
  `;

  // 2. Maskable icon SVG (with safe area zone - 80% size centered within full-bleed canvas)
  const maskableSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <!-- Full bleed background to ensure no white edges on any device mask -->
      <rect width="512" height="512" fill="#347A5C"/>
      <!-- Equilibrium circles placed safely within the inner 80% circle (radius ~200) -->
      <circle cx="208" cy="256" r="76" stroke="#FFFFFF" stroke-width="32" fill="none"/>
      <circle cx="304" cy="256" r="76" stroke="#FAF9F6" stroke-width="32" fill="none"/>
      <path d="M 256,196 A 76,76 0 0,0 256,316 A 76,76 0 0,0 256,196" fill="rgba(255,255,255,0.18)"/>
    </svg>
  `;

  const sizes = [
    { name: 'icon-192.png', size: 192, svg: standardSvg },
    { name: 'icon-512.png', size: 512, svg: standardSvg },
    { name: 'apple-touch-icon.png', size: 180, svg: standardSvg },
    { name: 'icon-maskable-512.png', size: 512, svg: maskableSvg },
  ];

  for (const item of sizes) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: ${item.size}px;
              height: ${item.size}px;
              background: transparent;
              overflow: hidden;
            }
            svg {
              width: 100%;
              height: 100%;
              display: block;
            }
          </style>
        </head>
        <body>
          ${item.svg}
        </body>
      </html>
    `;

    await page.setViewportSize({ width: item.size, height: item.size });
    await page.setContent(html);
    const dest = path.join(outDir, item.name);
    await page.screenshot({ path: dest, omitBackground: false });
    console.log(`  ✓ Generated ${item.name} (${item.size}x${item.size})`);
  }

  // Also copy apple-touch-icon to public root for default iOS crawlers
  fs.copyFileSync(path.join(outDir, 'apple-touch-icon.png'), path.resolve(process.cwd(), 'public/apple-touch-icon.png'));
  console.log(`  ✓ Copied apple-touch-icon.png to public/`);

  await browser.close();
  console.log('[Icons] Icon generation completed successfully.');
}

generateIcons().catch((err) => {
  console.error('[Icons] Error generating icons:', err);
  process.exit(1);
});
