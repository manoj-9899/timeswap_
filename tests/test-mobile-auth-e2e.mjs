import { chromium } from 'playwright';

const MOBILE_VIEWPORTS = [
  { name: 'Mobile XS (SE/Mini)', width: 320, height: 640 },
  { name: 'Mobile M (iPhone X/11/12/13 mini)', width: 375, height: 812 },
  { name: 'Mobile L (iPhone 14/15/16)', width: 390, height: 844 },
  { name: 'Mobile XL (Pro Max/Plus)', width: 430, height: 932 },
];

const BASE_URL = 'http://localhost:3000';

async function runMobileAuthE2ETests() {
  console.log('======================================================');
  console.log('  TimeSwap Integrated Mobile & Auth E2E Test Suite    ');
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

  // =========================================================================
  // Group 1: Guest State & Protected Route Redirections on Mobile
  // =========================================================================
  console.log('[Test Group 1] Guest Mobile Navigation & Edge Route Protection...');
  
  for (const vp of MOBILE_VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();

    // 1. Visit landing page as guest
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    // Guest bottom nav should have 4 items: Home, Explore, Help, Sign In
    const guestNavLinks = await page.$$eval('nav[aria-label="Mobile Bottom Navigation"] a', els => 
      els.map(el => el.textContent?.trim())
    );
    assert(
      guestNavLinks.some(t => t.includes('Home')) && 
      guestNavLinks.some(t => t.includes('Explore')) && 
      guestNavLinks.some(t => t.includes('Help')) && 
      guestNavLinks.some(t => t.includes('Sign In')),
      `[${vp.name}] Guest bottom navigation renders Home, Explore, Help, and Sign In`
    );
    assert(
      !guestNavLinks.some(t => t.includes('Wallet')) && !guestNavLinks.some(t => t.includes('Dashboard')),
      `[${vp.name}] Guest bottom navigation hides Wallet and Dashboard tabs`
    );

    // Check 0px horizontal overflow on landing page
    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
    assert(overflow === 0, `[${vp.name}] Landing page has 0px horizontal overflow`);

    // 2. Protected routes redirect to /auth/signin with ?next= parameter
    const protectedRoutes = ['/dashboard', '/wallet', '/sessions', '/messages', '/profile', '/settings'];
    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      const currentUrl = page.url();
      assert(
        currentUrl.includes('/auth/signin'),
        `[${vp.name}] Accessing ${route} as guest redirects to signin`
      );
      assert(
        currentUrl.includes(`next=${encodeURIComponent(route)}`),
        `[${vp.name}] Preserves destination next=${route}`
      );
    }

    await context.close();
  }

  // =========================================================================
  // Group 2: Open-Redirect Defense in Browser
  // =========================================================================
  console.log('\n[Test Group 2] Open-Redirect Defense & Destination Sanitization...');
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();

    // 1. External HTTPS URL in callback is sanitized to internal fallback
    await page.goto(`${BASE_URL}/auth/callback?code=mock_token&next=https://malicious-phishing.com/steal`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const cbUrl = page.url();
    assert(
      !cbUrl.includes('malicious-phishing.com'),
      'Callback sanitizes external https destination and rejects phishing redirect'
    );
    assert(
      cbUrl.includes('/dashboard') || cbUrl.includes('/auth/signin'),
      'Callback redirects safely to internal route'
    );

    // 2. Protocol-relative // URL in callback is sanitized
    await page.goto(`${BASE_URL}/auth/callback?code=mock_token&next=//evil.com/hack`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const cbUrl2 = page.url();
    assert(
      !cbUrl2.includes('//evil.com'),
      'Callback sanitizes protocol-relative //evil.com destination'
    );

    // 3. Valid internal relative path is preserved in callback
    await page.goto(`${BASE_URL}/auth/callback?code=mock_token&next=%2Fwallet`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const cbUrl3 = page.url();
    assert(
      cbUrl3.includes('/wallet') || cbUrl3.includes('/auth/signin'),
      'Honors valid relative next=/wallet parameter'
    );

    await context.close();
  }

  // =========================================================================
  // Group 3: Auth Forms Mobile Keyboard Ergonomics & Validation
  // =========================================================================
  console.log('\n[Test Group 3] Mobile Auth Forms & Keyboard Ergonomics...');
  {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await context.newPage();

    // 1. Sign In Form
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    assert(await emailInput.count() > 0, 'Sign In has type="email" input for mobile email keyboard');
    assert(await passwordInput.count() > 0, 'Sign In has type="password" input');

    // Password visibility toggle
    const toggleButton = page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]');
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      const isText = await page.locator('input[placeholder="Enter password"]').getAttribute('type');
      assert(isText === 'text', 'Password toggle switches to visible text');
      await toggleButton.click();
      const isPassword = await page.locator('input[placeholder="Enter password"]').getAttribute('type');
      assert(isPassword === 'password', 'Password toggle switches back to hidden password');
    }

    // Input touch height standard (>= 40px)
    const emailHeight = await emailInput.evaluate(el => el.getBoundingClientRect().height);
    assert(emailHeight >= 40, `Sign In email input height meets mobile touch standard: ${emailHeight}px`);

    // Test invalid credentials submission
    await emailInput.fill('audit-tester@timeswap-invalid-domain.org');
    await passwordInput.fill('WrongPassword123!');
    const signinSubmit = page.locator('button:has-text("Sign In to TimeSwap")');
    await signinSubmit.click();
    await page.waitForSelector('.text-status-error', { timeout: 4000 }).catch(() => null);

    const signinError = page.locator('.text-status-error');
    assert(await signinError.count() > 0, 'Live signin displays status-error banner on invalid credentials');

    // 2. Sign Up Form Validation
    await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]');

    const nameInput = page.locator('input[placeholder*="Maya Lin"]');
    const signupEmail = page.locator('input[type="email"]');
    const signupPass = page.locator('input[placeholder*="At least 8 characters"]');
    const confirmPass = page.locator('input[placeholder*="Repeat password"]');
    const skillInput = page.locator('input[placeholder*="Sourdough"]');
    const submitBtn = page.locator('button:has-text("Create Account")');

    assert(await confirmPass.count() > 0, 'Sign Up provides confirmPassword field');

    // Test password length validation (< 8 chars)
    await nameInput.fill('Test User');
    await signupEmail.fill('test@example.com');
    await signupPass.fill('short');
    await confirmPass.fill('short');
    await skillInput.fill('Calligraphy');
    await submitBtn.click();
    await page.waitForTimeout(300);

    const errorMsg = await page.locator('.text-status-error').textContent();
    assert(errorMsg?.includes('8 characters'), 'Sign Up enforces minimum 8 character password constraint');

    // Test password mismatch
    await signupPass.fill('validPassword123!');
    await confirmPass.fill('differentPassword123!');
    await submitBtn.click();
    await page.waitForTimeout(300);

    const mismatchMsg = await page.locator('.text-status-error').textContent();
    assert(mismatchMsg?.includes('do not match'), 'Sign Up enforces password match verification');

    // 3. Forgot Password Form
    await page.goto(`${BASE_URL}/auth/forgot-password`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]');
    assert(await page.locator('input[type="email"]').count() > 0, 'Forgot password provides email input');

    // 4. Reset Password Protection (Without active token)
    await page.goto(`${BASE_URL}/auth/reset-password`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const resetWarning = page.locator('text=No Active Reset Session');
    assert(await resetWarning.count() > 0, 'Reset password without active session displays security warning alert');

    await context.close();
  }

  // =========================================================================
  // Group 4: Mobile Sticky Booking Bar & Modal Bottom Sheet
  // =========================================================================
  console.log('\n[Test Group 4] Mobile Sticky Booking Bar & Modal Bottom Sheet...');
  for (const vp of MOBILE_VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // Member detail page has public profile view with sticky CTA
    await page.goto(`${BASE_URL}/members/m1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    // Verify main content bottom spacer
    const hasBottomSpacer = await page.$eval('main#main-content', el => 
      el.classList.contains('content-bottom-nav-spacer')
    );
    assert(hasBottomSpacer, `[${vp.name}] Main content container has .content-bottom-nav-spacer applied`);

    // Verify Sticky Booking Bar
    const stickyBookingBar = page.locator('aside[aria-label="Mobile quick book action"]');
    assert(await stickyBookingBar.count() > 0, `[${vp.name}] Member profile renders sticky mobile booking CTA`);

    // Click Request Exchange to open Bottom Sheet Modal
    const requestBtn = stickyBookingBar.locator('button:has-text("Request Exchange")');
    if (await requestBtn.count() > 0) {
      await requestBtn.click();
      await page.waitForTimeout(300);

      // Check if modal bottom sheet is visible
      const modalDialog = page.locator('[role="dialog"]');
      assert(await modalDialog.count() > 0, `[${vp.name}] Request exchange opens slide-up modal bottom sheet`);

      // Check for bottom sheet drag handle indicator
      const dragHandle = modalDialog.locator('.rounded-full.bg-line');
      assert(await dragHandle.count() > 0, `[${vp.name}] Modal bottom sheet renders tactile drag handle`);

      // Close modal cleanly
      const cancelBtn = modalDialog.locator('button:has-text("Cancel")');
      await cancelBtn.click();
      await page.waitForTimeout(200);
      assert(await page.locator('[role="dialog"]').count() === 0, `[${vp.name}] Modal closes cleanly without lingering backdrop`);
    }

    await context.close();
  }

  // =========================================================================
  // Group 5: Mobile Navigation Drawer & Navbar Ergonomics
  // =========================================================================
  console.log('\n[Test Group 5] Mobile Navigation Drawer & Header Ergonomics...');
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    // Open mobile hamburger menu
    const menuBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    assert(await menuBtn.count() > 0, 'Header renders mobile menu button on 375px viewport');
    await menuBtn.click();
    await page.waitForTimeout(300);

    // Verify mobile drawer open
    const mobileDrawer = page.locator('nav[aria-label="Mobile Navigation Menu"]');
    assert(await mobileDrawer.count() > 0, 'Mobile navigation drawer slides into view');

    // Verify links in drawer
    const drawerLinks = await page.$$eval('nav[aria-label="Mobile Navigation Menu"] a', els => els.map(el => el.textContent?.trim()));
    assert(
      drawerLinks.some(t => t.includes('Explore Skills')) && drawerLinks.some(t => t.includes('How It Works')),
      'Mobile drawer contains expected public navigation routes'
    );

    // Close mobile drawer
    await menuBtn.click();
    await page.waitForTimeout(300);
    assert(await page.locator('nav[aria-label="Mobile Navigation Menu"]').count() === 0, 'Mobile drawer closes on toggle click');

    await context.close();
  }

  // =========================================================================
  // Group 6: Auth Callback Edge Cases & Redirect Handlers
  // =========================================================================
  console.log('\n[Test Group 6] Auth Callback Edge Cases & Redirect Handlers...');
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Missing code parameter
    await page.goto(`${BASE_URL}/auth/callback`, { waitUntil: 'domcontentloaded' });
    assert(page.url().includes('Missing') || page.url().includes('error='), 'Callback without code redirects with missing token error');

    // 2. Supabase error parameters forwarded
    await page.goto(`${BASE_URL}/auth/callback?error=access_denied&error_description=Confirmation+link+expired`, { waitUntil: 'domcontentloaded' });
    assert(page.url().includes('error=Confirmation+link+expired'), 'Callback forwards Supabase error_description to signin');

    // 3. Recovery type with invalid code
    await page.goto(`${BASE_URL}/auth/callback?code=invalid_test_code&type=recovery`, { waitUntil: 'domcontentloaded' });
    assert(page.url().includes('/auth/reset-password') || page.url().includes('/auth/signin'), 'Recovery callback routes safely');

    await context.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('   Integrated Mobile & Auth E2E Summary:');
  console.log(`   Total Assertions: ${totalAssertions}`);
  console.log(`   Passed:           ${passedAssertions}`);
  console.log(`   Failed:           ${failedAssertions}`);
  console.log('======================================================\n');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runMobileAuthE2ETests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
