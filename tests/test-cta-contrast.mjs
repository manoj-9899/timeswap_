import { chromium } from 'playwright';

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseRgb(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

function getContrastRatio(fgStr, bgStr) {
  const fg = parseRgb(fgStr);
  const bg = parseRgb(bgStr);
  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const VIEWPORTS = [
  { name: 'Mobile (390px)', width: 390, height: 844 },
  { name: 'Tablet (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1280px)', width: 1280, height: 800 },
];

async function runCtaAudit() {
  console.log('======================================================');
  console.log('    TimeSwap Issue #5 CTA Button Contrast Audit       ');
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failedAssertions++;
    }
  }

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // 1. Locate the conversion banner CTA
    const startBtn = page.locator('text=Start Swapping Now').first();
    const browseBtn = page.locator('text=Browse Skills First').first();

    assert(await startBtn.isVisible(), `[${vp.name}] "Start Swapping Now" button is visible`);
    assert(await browseBtn.isVisible(), `[${vp.name}] "Browse Skills First" button is visible`);

    // 2. Measure Default State
    const defaultStyles = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Start Swapping Now'));
      const c = window.getComputedStyle(btn);
      return {
        color: c.color,
        backgroundColor: c.backgroundColor,
        classes: btn.className,
      };
    });

    const contrastDefault = getContrastRatio(defaultStyles.color, defaultStyles.backgroundColor);
    console.log(`     [Default State] Color: ${defaultStyles.color}, Bg: ${defaultStyles.backgroundColor}, Contrast: ${contrastDefault.toFixed(2)}:1`);
    assert(contrastDefault >= 4.5, `[${vp.name}] Default contrast ratio ${contrastDefault.toFixed(2)}:1 >= 4.5:1 (WCAG AA requirement)`);
    assert(contrastDefault >= 7.0, `[${vp.name}] Default contrast ratio ${contrastDefault.toFixed(2)}:1 >= 7.0:1 (WCAG AAA requirement)`);
    assert(!defaultStyles.classes.includes('text-white'), `[${vp.name}] Conflicting "text-white" class eliminated from button`);

    // 3. Measure Hover State
    await startBtn.hover();
    await page.waitForTimeout(100);

    const hoverStyles = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Start Swapping Now'));
      const c = window.getComputedStyle(btn);
      return {
        color: c.color,
        backgroundColor: c.backgroundColor,
      };
    });

    const contrastHover = getContrastRatio(hoverStyles.color, hoverStyles.backgroundColor);
    console.log(`     [Hover State] Color: ${hoverStyles.color}, Bg: ${hoverStyles.backgroundColor}, Contrast: ${contrastHover.toFixed(2)}:1`);
    assert(contrastHover >= 4.5, `[${vp.name}] Hover contrast ratio ${contrastHover.toFixed(2)}:1 >= 4.5:1 (Accessible on hover)`);
    assert(contrastHover >= 7.0, `[${vp.name}] Hover contrast ratio ${contrastHover.toFixed(2)}:1 >= 7.0:1 (WCAG AAA on hover)`);

    // 4. Measure Focus State
    const hasFocusRingClass = defaultStyles.classes.includes('focus-visible:outline');
    assert(hasFocusRingClass, `[${vp.name}] Button includes focus-visible accessible outline styling`);

    // 5. Check companion Browse button
    const browseStyles = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Browse Skills First'));
      const c = window.getComputedStyle(btn);
      return {
        color: c.color,
        borderWidth: c.borderWidth,
        borderColor: c.borderColor,
      };
    });
    console.log(`     [Browse Button] Color: ${browseStyles.color}, Border: ${browseStyles.borderWidth} ${browseStyles.borderColor}`);
    assert(browseStyles.color === 'rgb(255, 255, 255)', `[${vp.name}] "Browse Skills First" retains clean white typography`);

    // 6. Test hero CTA buttons
    const heroBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('a')).find(el => el.textContent.includes('Start Swapping Free'));
      if (!btn) return null;
      const c = window.getComputedStyle(btn);
      return { color: c.color, bg: c.backgroundColor };
    });
    if (heroBtn) {
      const heroContrast = getContrastRatio(heroBtn.color, heroBtn.bg);
      console.log(`     [Hero CTA] Color: ${heroBtn.color}, Bg: ${heroBtn.bg}, Contrast: ${heroContrast.toFixed(2)}:1`);
      assert(heroContrast >= 4.5, `[${vp.name}] Hero primary CTA contrast ratio ${heroContrast.toFixed(2)}:1 >= 4.5:1`);
    }

    await page.close();
  }

  // 7. Verify All Major Primary CTAs across App Pages for Contrast
  console.log('\n--- Checking Primary CTAs Across Application Pages ---');
  const ROUTES_TO_CHECK = [
    { name: 'Sign In', path: '/auth/signin', btnText: 'Sign In to TimeSwap' },
    { name: 'Sign Up', path: '/auth/signup', btnText: 'Create Account' },
    { name: 'Help', path: '/help', btnText: 'Send Message' },
  ];

  for (const r of ROUTES_TO_CHECK) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`http://localhost:3000${r.path}`, { waitUntil: 'networkidle' });

    const ctaData = await page.evaluate((text) => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes(text));
      if (!btn) return null;
      const c = window.getComputedStyle(btn);
      return {
        text: btn.textContent.trim(),
        color: c.color,
        bg: c.backgroundColor,
      };
    }, r.btnText);

    if (ctaData) {
      const contrast = getContrastRatio(ctaData.color, ctaData.bg);
      console.log(`     [${r.name}] "${ctaData.text}" - Color: ${ctaData.color}, Bg: ${ctaData.bg}, Contrast: ${contrast.toFixed(2)}:1`);
      assert(contrast >= 4.5, `[${r.name}] Primary CTA contrast ratio ${contrast.toFixed(2)}:1 >= 4.5:1 (WCAG AA)`);
    } else {
      console.warn(`     [${r.name}] Could not find CTA with text "${r.btnText}"`);
    }

    await page.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('   CTA Button Contrast Audit Summary:');
  console.log(`   Total Assertions: ${totalAssertions}`);
  console.log(`   Passed:           ${passedAssertions}`);
  console.log(`   Failed:           ${failedAssertions}`);
  console.log('======================================================\n');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runCtaAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
