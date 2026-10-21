import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: '320px (iPhone SE 1st gen)', width: 320, height: 640 },
  { name: '360px (Android Common)', width: 360, height: 800 },
  { name: '375px (iPhone SE 2nd/3rd / Mini)', width: 375, height: 812 },
  { name: '390px (iPhone 14/15/16)', width: 390, height: 844 },
  { name: '430px (iPhone 14/15 Pro Max)', width: 430, height: 932 },
  { name: '768px (iPad / Tablet)', width: 768, height: 1024 },
  { name: '1280px (Desktop)', width: 1280, height: 800 },
];

async function verifyFooter() {
  console.log('======================================================');
  console.log('   TimeSwap Issue #4 Footer Verification Suite        ');
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failedTests++;
    }
  }

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const data = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      const nav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');
      const navBox = nav ? nav.getBoundingClientRect() : null;
      const isMobileNavVisible = navBox && navBox.height > 0 && window.innerWidth < 768;

      // Check horizontal overflow
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const bodyWidth = document.body.scrollWidth;
      const hasHorizontalOverflow = docWidth > winWidth || bodyWidth > winWidth;

      // Check all elements in footer
      const footerBox = footer.getBoundingClientRect();
      const allTextElements = Array.from(footer.querySelectorAll('p, a, span')).filter(
        el => el.children.length === 0 && el.textContent.trim().length > 0
      );

      const itemsBehindNav = [];
      let minClearanceAboveNav = Infinity;

      for (const el of allTextElements) {
        const box = el.getBoundingClientRect();
        if (isMobileNavVisible) {
          const overlap = box.bottom - navBox.top;
          if (overlap > 0) {
            itemsBehindNav.push({
              text: el.textContent.trim(),
              overlap,
              boxBottom: Math.round(box.bottom),
              navTop: Math.round(navBox.top),
            });
          }
          const clearance = navBox.top - box.bottom;
          if (clearance < minClearanceAboveNav) {
            minClearanceAboveNav = clearance;
          }
        }
      }

      // Check feature strip
      const featureTexts = Array.from(footer.querySelectorAll('span')).filter(s => 
        s.children.length === 0 && ['Refined Light Theme Only', 'Zero Platform Fees', 'Pure Reciprocal Learning'].includes(s.textContent.trim())
      );

      const featurePositions = featureTexts.map(f => {
        const b = f.getBoundingClientRect();
        return {
          text: f.textContent.trim(),
          top: Math.round(b.top),
          bottom: Math.round(b.bottom),
          left: Math.round(b.left),
          right: Math.round(b.right),
          height: Math.round(b.height),
          width: Math.round(b.width),
        };
      });

      // Check all footer links
      const links = Array.from(footer.querySelectorAll('a')).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim(),
        visible: a.getBoundingClientRect().height > 0,
      }));

      // Copyright
      const copyright = footer.querySelector('p.leading-relaxed');
      const copyrightBox = copyright ? copyright.getBoundingClientRect() : null;

      return {
        docWidth,
        winWidth,
        hasHorizontalOverflow,
        isMobileNavVisible,
        navBoxTop: navBox ? Math.round(navBox.top) : null,
        navBoxHeight: navBox ? Math.round(navBox.height) : null,
        footerHeight: Math.round(footerBox.height),
        footerBottom: Math.round(footerBox.bottom),
        minClearanceAboveNav: Math.round(minClearanceAboveNav),
        itemsBehindNav,
        featurePositions,
        linksCount: links.length,
        allLinksVisible: links.every(l => l.visible),
        copyrightText: copyright ? copyright.textContent.trim() : '',
        copyrightBottom: copyrightBox ? Math.round(copyrightBox.bottom) : null,
      };
    });

    // Assertions
    assert(!data.hasHorizontalOverflow, `No horizontal overflow (docWidth: ${data.docWidth}px vs winWidth: ${data.winWidth}px)`);
    assert(data.allLinksVisible && data.linksCount >= 14, `All ${data.linksCount} footer links are rendered and visible`);
    assert(data.featurePositions.length === 3, `All 3 feature statements rendered ("Refined Light Theme Only", "Zero Platform Fees", "Pure Reciprocal Learning")`);
    assert(data.itemsBehindNav.length === 0, `Zero footer elements obscured by bottom navigation (${data.itemsBehindNav.length} obscured)`);

    if (data.isMobileNavVisible) {
      assert(data.minClearanceAboveNav >= 20, `Generous clearance above mobile nav: ${data.minClearanceAboveNav}px >= 20px`);
      console.log(`     Nav Height: ${data.navBoxHeight}px, Nav Top: ${data.navBoxTop}px`);
      console.log(`     Min clearance to nav top: ${data.minClearanceAboveNav}px`);
    } else {
      console.log(`     Desktop/Tablet: Mobile nav hidden as intended`);
    }

    console.log(`     Footer height: ${data.footerHeight}px (was >1100px on mobile)`);
    console.log(`     Feature strip rows:`, data.featurePositions.map(f => `${f.text} [y:${f.top}-${f.bottom}]`).join(' | '));

    // Take screenshot for visual QA
    await page.screenshot({ path: `/home/manoj/.gemini/antigravity-cli/brain/508e2001-282f-407d-b89e-fa4072e28a50/scratch/verify-footer-${vp.width}.png` });

    await page.close();
  }

  // Cross-route regression check for shared bottom navigation
  console.log('\n--- Cross-Route Regression Audit for Bottom Navigation & Footer ---');
  for (const path of ['/discover', '/help', '/members/m1']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const check = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      const nav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');
      if (!footer || !nav) return { ok: true, clearance: 999 };
      const navTop = nav.getBoundingClientRect().top;
      const textEls = Array.from(footer.querySelectorAll('p, a, span')).filter(
        el => el.children.length === 0 && el.textContent.trim().length > 0
      );
      let minClearance = Infinity;
      for (const el of textEls) {
        const b = el.getBoundingClientRect();
        const clearance = navTop - b.bottom;
        if (clearance < minClearance) minClearance = clearance;
      }
      return { ok: minClearance > 15, clearance: Math.round(minClearance) };
    });

    assert(check.ok, `Route ${path} footer ends cleanly above navigation with ${check.clearance}px clearance`);
    await page.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('   Verification Suite Summary:');
  console.log(`   Total Tests:  ${totalTests}`);
  console.log(`   Passed:       ${passedTests}`);
  console.log(`   Failed:       ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

verifyFooter().catch(err => {
  console.error(err);
  process.exit(1);
});
