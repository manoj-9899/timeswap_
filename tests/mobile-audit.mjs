import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: 'Mobile XS (SE/Mini)', width: 320, height: 640 },
  { name: 'Mobile S (Android common)', width: 360, height: 800 },
  { name: 'Mobile M (iPhone X/11/12/13 mini)', width: 375, height: 812 },
  { name: 'Mobile L (iPhone 14/15/16)', width: 390, height: 844 },
  { name: 'Mobile XL (Pro Max/Plus)', width: 430, height: 932 },
  { name: 'Tablet (iPad Mini/Air)', width: 768, height: 1024 },
  { name: 'Desktop Baseline', width: 1440, height: 900 },
];

const ROUTES = [
  { name: 'Landing Page', path: '/' },
  { name: 'Discover', path: '/discover' },
  { name: 'Member Profile', path: '/members/m1' },
  { name: 'Sign In', path: '/auth/signin' },
  { name: 'Sign Up', path: '/auth/signup' },
  { name: 'Forgot Password', path: '/auth/forgot-password' },
  { name: 'Reset Password', path: '/auth/reset-password' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Sessions', path: '/sessions' },
  { name: 'Wallet', path: '/wallet' },
  { name: 'Messages', path: '/messages' },
  { name: 'Notifications', path: '/notifications' },
  { name: 'User Profile', path: '/profile' },
  { name: 'Settings', path: '/settings' },
  { name: 'Saved Mentors', path: '/saved' },
  { name: 'Onboarding', path: '/onboarding' },
  { name: 'Help', path: '/help' },
  { name: 'Offline', path: '/offline' },
];

async function runMobileAudit() {
  console.log('======================================================');
  console.log('       TimeSwap Comprehensive Mobile UX Audit         ');
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.width < 768 
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    for (const r of ROUTES) {
      try {
        await page.goto(`http://localhost:3000${r.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(300);

        const metrics = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const bodyWidth = document.body.scrollWidth;
          const hasOverflow = docWidth > winWidth || bodyWidth > winWidth;
          const overflowDiff = Math.max(docWidth - winWidth, bodyWidth - winWidth);

          // Find overflowing elements if any
          let overflowingElements = [];
          if (hasOverflow) {
            const allElements = Array.from(document.querySelectorAll('*'));
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.right > winWidth + 1) {
                overflowingElements.push({
                  tag: el.tagName,
                  className: (el.className || '').toString().slice(0, 50),
                  right: Math.round(rect.right),
                  excess: Math.round(rect.right - winWidth),
                });
              }
            }
          }

          return {
            docWidth,
            winWidth,
            hasOverflow,
            overflowDiff,
            overflowingElements: overflowingElements.slice(0, 3),
          };
        });

        if (metrics.hasOverflow) {
          console.error(`  ✗ [OVERFLOW] ${r.name} (${r.path}): ${metrics.overflowDiff}px overflow (doc: ${metrics.docWidth}px vs win: ${metrics.winWidth}px)`);
          if (metrics.overflowingElements.length > 0) {
            console.error(`     Culprits:`, JSON.stringify(metrics.overflowingElements));
          }
          results.push({ viewport: vp.name, route: r.name, path: r.path, overflow: metrics.overflowDiff, status: 'FAIL' });
        } else {
          results.push({ viewport: vp.name, route: r.name, path: r.path, overflow: 0, status: 'PASS' });
        }
      } catch (err) {
        console.warn(`  ⚠️ [ERROR] ${r.name} (${r.path}): ${err.message}`);
        results.push({ viewport: vp.name, route: r.name, path: r.path, error: err.message, status: 'ERROR' });
      }
    }

    await context.close();
  }

  await browser.close();

  const totalChecks = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log('\n======================================================');
  console.log(`   Mobile Audit Summary:`);
  console.log(`   Total Checks: ${totalChecks}`);
  console.log(`   Passed (No Overflow): ${passed}`);
  console.log(`   Failed (Overflow Detected): ${failed}`);
  console.log(`   Errors/Timeouts: ${errors}`);
  console.log('======================================================\n');
}

runMobileAudit().catch(console.error);
