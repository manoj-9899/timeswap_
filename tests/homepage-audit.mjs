import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: 'Mobile XS (SE/Mini)', width: 320, height: 640 },
  { name: 'Mobile S (Android 360)', width: 360, height: 800 },
  { name: 'Mobile M (iPhone Mini)', width: 375, height: 812 },
  { name: 'Mobile L (iPhone 14/15)', width: 390, height: 844 },
  { name: 'Mobile XL (Pro Max)', width: 430, height: 932 },
  { name: 'Tablet (iPad)', width: 768, height: 1024 },
  { name: 'Desktop Baseline', width: 1440, height: 900 },
];

async function runHomepageAudit() {
  console.log('========================================================');
  console.log('          TimeSwap Homepage Responsive Audit            ');
  console.log('========================================================\n');

  const browser = await chromium.launch({ headless: true });
  let hasAnyFailure = false;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.width < 768 
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    // 1. Check Horizontal Overflow
    const overflowMetrics = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const bodyWidth = document.body.scrollWidth;
      return {
        docWidth,
        winWidth,
        bodyWidth,
        hasOverflow: docWidth > winWidth || bodyWidth > winWidth,
      };
    });

    // 2. Measure Hero typography, stats, and Dial Header
    const layoutMetrics = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h1Rect = h1?.getBoundingClientRect();
      const h1FontSize = h1 ? window.getComputedStyle(h1).fontSize : 'N/A';

      // Stats row
      const stats = Array.from(document.querySelectorAll('div.border-t.border-line > div'));
      const statsInfo = stats.map(s => {
        const title = s.querySelector('.font-editorial')?.textContent?.trim();
        const sub = s.querySelector('.text-ink-muted')?.textContent?.trim();
        const rect = s.getBoundingClientRect();
        return { title, sub, width: Math.round(rect.width), height: Math.round(rect.height) };
      });

      // Dial header
      const dialTitle = document.evaluate(
        "//span[contains(text(), 'The Reciprocal Equilibrium Engine')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      const dialTitleRect = dialTitle?.getBoundingClientRect();

      // Duration buttons
      const durationBtns = Array.from(document.querySelectorAll('button')).filter(b => 
        ['60m', '120m', '180m'].includes(b.textContent?.trim() || '')
      );
      const btnMetrics = durationBtns.map(b => {
        const rect = b.getBoundingClientRect();
        return { text: b.textContent.trim(), width: Math.round(rect.width), height: Math.round(rect.height) };
      });

      // Footer position vs bottom of document
      const footer = document.querySelector('footer');
      const footerRect = footer?.getBoundingClientRect();
      const footerStyle = footer ? window.getComputedStyle(footer) : null;
      const footerPaddingBottom = footerStyle ? footerStyle.paddingBottom : '0px';

      return {
        h1FontSize,
        h1Height: h1Rect ? Math.round(h1Rect.height) : 0,
        statsInfo,
        dialTitleRect: dialTitleRect ? { width: Math.round(dialTitleRect.width), height: Math.round(dialTitleRect.height) } : null,
        btnMetrics,
        footerPaddingBottom,
      };
    });

    console.log(`\n[Viewport: ${vp.name} (${vp.width}x${vp.height})]`);
    console.log(`  Overflow: ${overflowMetrics.hasOverflow ? 'FAILED (' + (overflowMetrics.docWidth - overflowMetrics.winWidth) + 'px)' : 'PASSED (0px)'}`);
    console.log(`  Hero H1 Font Size: ${layoutMetrics.h1FontSize}, Height: ${layoutMetrics.h1Height}px`);
    console.log(`  Stats Layout: ${layoutMetrics.statsInfo.length} items evaluated`);
    for (const stat of layoutMetrics.statsInfo) {
      console.log(`    - "${stat.title}" / "${stat.sub}" (${stat.width}x${stat.height}px)`);
    }
    console.log(`  Dial Engine Title Width: ${layoutMetrics.dialTitleRect?.width}px, Height: ${layoutMetrics.dialTitleRect?.height}px`);
    console.log(`  Duration Buttons Touch Sizes:`, layoutMetrics.btnMetrics);
    console.log(`  Footer padding-bottom: ${layoutMetrics.footerPaddingBottom}`);

    if (overflowMetrics.hasOverflow) {
      hasAnyFailure = true;
    }

    // Capture screenshot if requested
    if (process.env.SAVE_SCREENSHOTS === '1') {
      const screenshotPath = `tests/screenshot-home-${vp.width}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot saved: ${screenshotPath}`);
    }

    await context.close();
  }

  await browser.close();

  if (hasAnyFailure) {
    console.error('\n❌ AUDIT FAILED: Overflow detected on some viewports!');
    process.exit(1);
  } else {
    console.log('\n✅ ALL HOMEPAGE VIEWPORT CHECKS PASSED WITH ZERO OVERFLOW!');
  }
}

runHomepageAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
