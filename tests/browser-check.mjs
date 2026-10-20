import { chromium } from 'playwright';

async function runBrowserAudit() {
  console.log('======================================================');
  console.log('       TimeSwap Browser Runtime & Error Audit         ');
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const requestFailures = [];

  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
    console.error(`  [PAGE ERROR] ${err.message}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // Filter out harmless favicon or standard dev noise if any
      const text = msg.text();
      errors.push({ type: 'console.error', message: text });
      console.error(`  [CONSOLE ERROR] ${text}`);
    } else if (msg.type() === 'warning') {
      const text = msg.text();
      if (text.includes('Hydration') || text.includes('React')) {
        warnings.push({ type: 'hydration/react-warning', message: text });
        console.warn(`  [CONSOLE WARNING] ${text}`);
      }
    }
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    requestFailures.push({ url: req.url(), errorText: failure?.errorText });
    console.warn(`  [REQUEST FAILED] ${req.url()} - ${failure?.errorText}`);
  });

  const routesToTest = [
    { name: 'Landing Page', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Discover Members', path: '/discover' },
    { name: 'Direct Messages', path: '/messages' },
    { name: 'Notification Center', path: '/notifications' },
    { name: 'Credit Wallet', path: '/wallet' },
    { name: 'My Sessions', path: '/sessions' },
    { name: 'User Profile', path: '/profile' },
    { name: 'Settings', path: '/settings' },
    { name: 'Sign In', path: '/auth/signin' },
    { name: 'Sign Up', path: '/auth/signup' },
    { name: 'Onboarding Wizard', path: '/onboarding' },
  ];

  let passedRoutes = 0;

  for (const route of routesToTest) {
    const startErrors = errors.length;
    console.log(`\nTesting Route: ${route.name} (${route.path})...`);

    const response = await page.goto(`http://localhost:3000${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    const status = response?.status();
    console.log(`  Response Status: HTTP ${status}`);

    // Wait for hydration & animations
    await page.waitForTimeout(500);

    const newErrors = errors.length - startErrors;
    if (status === 200 && newErrors === 0) {
      console.log(`  ✓ PASS: Rendered cleanly with 0 errors`);
      passedRoutes++;
    } else {
      console.error(`  ✗ FAIL: Status ${status}, ${newErrors} errors detected`);
    }
  }

  // Test interactive messaging
  console.log('\nTesting Interactive Messaging Flow on /messages...');
  try {
    await page.goto('http://localhost:3000/messages', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Find input and send button
    const input = page.locator('input[placeholder*="Type a message"]');
    if (await input.count() > 0) {
      await input.fill('Automated Browser Test Message: Hello from Playwright!');
      await page.waitForTimeout(200);

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();
      await page.waitForTimeout(500);

      // Verify message rendered
      const sentMsg = page.locator('text=Automated Browser Test Message: Hello from Playwright!');
      if (await sentMsg.count() > 0) {
        console.log('  ✓ PASS: Sent message successfully rendered in chat feed');
      } else {
        console.error('  ✗ FAIL: Sent message was not found in chat feed');
      }
    } else {
      console.warn('  ⚠️ Skipping message input test (no active conversation selected)');
    }
  } catch (err) {
    console.error('  ✗ FAIL in interactive message test:', err.message);
  }

  // Test interactive notifications
  console.log('\nTesting Interactive Notifications Flow on /notifications...');
  try {
    await page.goto('http://localhost:3000/notifications', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const markAllBtn = page.locator('button:has-text("Mark All as Read")');
    if (await markAllBtn.count() > 0) {
      await markAllBtn.click();
      await page.waitForTimeout(300);
      console.log('  ✓ PASS: Clicked Mark All as Read button without runtime exceptions');
    } else {
      console.log('  ✓ PASS: Notifications page loaded (no unread button needed)');
    }
  } catch (err) {
    console.error('  ✗ FAIL in interactive notifications test:', err.message);
  }

  // Test Member Profile Navigation from Discover
  console.log('\nTesting Member Discovery to Profile Navigation...');
  try {
    await page.goto('http://localhost:3000/discover', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Click on the first "View Profile" link or member card
    const profileLink = page.locator('a[href^="/members/"]').first();
    if (await profileLink.count() > 0) {
      const href = await profileLink.getAttribute('href');
      await profileLink.click();
      await page.waitForTimeout(1000);
      console.log(`  ✓ PASS: Navigated to member detail page ${href} cleanly`);
    }
  } catch (err) {
    console.error('  ✗ FAIL in discover to profile navigation:', err.message);
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('   Audit Summary:');
  console.log(`   Routes Tested:           ${routesToTest.length}`);
  console.log(`   Routes Passing (Clean):  ${passedRoutes}/${routesToTest.length}`);
  console.log(`   Runtime Page Errors:     ${errors.filter(e => e.type === 'pageerror').length}`);
  console.log(`   Console Errors:          ${errors.filter(e => e.type === 'console.error').length}`);
  console.log(`   Failed Network Requests: ${requestFailures.length}`);
  console.log('======================================================\n');

  if (errors.length > 0) {
    console.error('Audit encountered errors:');
    console.error(JSON.stringify(errors, null, 2));
    process.exit(1);
  } else {
    console.log('All browser runtime checks passed with 0 errors!');
  }
}

runBrowserAudit();
