import fs from 'fs';
import path from 'path';

function runPWATests() {
  console.log('======================================================');
  console.log('       TimeSwap Production PWA Test Suite            ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Group 1: Web App Manifest Validation
  // --------------------------------------------------------------------------
  console.log('[Test Group 1] Web App Manifest Verification...');
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
  assert(fs.existsSync(manifestPath), 'public/manifest.json exists on disk');

  const manifestTsPath = path.resolve(process.cwd(), 'src/app/manifest.ts');
  assert(fs.existsSync(manifestTsPath), 'src/app/manifest.ts App Router metadata route exists');

  let manifestData;
  try {
    manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(true, 'Manifest parses as valid JSON');
  } catch (e) {
    assert(false, `Manifest JSON parsing failed: ${e.message}`);
  }

  if (manifestData) {
    assert(manifestData.name.includes('TimeSwap'), 'Manifest name includes "TimeSwap"');
    assert(manifestData.short_name === 'TimeSwap', 'Manifest short_name is "TimeSwap"');
    assert(manifestData.start_url === '/', 'Manifest start_url is "/"');
    assert(manifestData.display === 'standalone', 'Manifest display is "standalone"');
    assert(manifestData.theme_color === '#347A5C', 'Manifest theme_color is brand evergreen (#347A5C)');
    assert(manifestData.background_color === '#FAF9F6', 'Manifest background_color is brand canvas (#FAF9F6)');
    assert(Array.isArray(manifestData.icons) && manifestData.icons.length >= 4,
      'Manifest contains at least 4 icon configurations');
  }

  // --------------------------------------------------------------------------
  // Group 2: Icon Assets & Dimensions Verification
  // --------------------------------------------------------------------------
  console.log('\n[Test Group 2] Icon Assets & Dimensional Checks...');
  if (manifestData && manifestData.icons) {
    for (const icon of manifestData.icons) {
      const iconPath = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
      assert(fs.existsSync(iconPath), `Icon file exists: ${icon.src}`);

      const stats = fs.statSync(iconPath);
      assert(stats.size > 500, `Icon file is non-empty (${stats.size} bytes): ${icon.src}`);

      // Verify PNG magic header (89 50 4E 47 0D 0A 1A 0A)
      const buffer = fs.readFileSync(iconPath);
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      assert(isPng, `Icon has valid PNG signature: ${icon.src}`);
    }

    const has192 = manifestData.icons.some(i => i.sizes === '192x192');
    const has512 = manifestData.icons.some(i => i.sizes === '512x512' && (!i.purpose || i.purpose === 'any'));
    const hasMaskable = manifestData.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable');
    const hasApple = fs.existsSync(path.resolve(process.cwd(), 'public/apple-touch-icon.png'));

    assert(has192, 'Manifest defines required standard 192x192 icon');
    assert(has512, 'Manifest defines required standard 512x512 icon');
    assert(hasMaskable, 'Manifest defines required maskable 512x512 icon');
    assert(hasApple, 'iOS apple-touch-icon.png exists at public root');
  }

  // --------------------------------------------------------------------------
  // Group 3: Service Worker Security & Caching Policy Audit
  // --------------------------------------------------------------------------
  console.log('\n[Test Group 3] Service Worker Security & Cache Policy Audit...');
  const swPath = path.resolve(process.cwd(), 'public/sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js service worker script exists');

  const swContent = fs.readFileSync(swPath, 'utf8');

  // Security Rule 1: Never cache mutations
  assert(swContent.includes("request.method !== 'GET'") || swContent.includes('request.method != "GET"'),
    'Security Rule 1: Non-GET requests (POST, PUT, PATCH, DELETE) bypass service worker caching');

  // Security Rule 2: Never cache Supabase endpoints (private user data, wallet balances, RPCs)
  assert(swContent.includes('supabase.co'),
    'Security Rule 2: Supabase API gateway requests bypass service worker caching');

  // Security Rule 3: Never cache authentication callbacks
  assert(swContent.includes('/auth/callback'),
    'Security Rule 3: Authentication callbacks bypass service worker caching');

  // Strategy A: Next.js immutable static assets
  assert(swContent.includes('/_next/static/'),
    'Strategy A: Immutable Next.js static revisioned chunks are cached efficiently');

  // Strategy B: Navigation requests fallback to /offline
  assert(swContent.includes("request.mode === 'navigate'") && swContent.includes('/offline'),
    'Strategy B: Failed navigation requests return dedicated /offline fallback page');

  // Cache Lifecycle: Cache cleanup on activate
  assert(swContent.includes('self.clients.claim()') && swContent.includes('caches.delete'),
    'Lifecycle: Obsolete caches pruned on activate and immediate control claimed');

  // Secret Exposure Check: Ensure no credentials or tokens are embedded in sw.js
  const forbiddenPatterns = [/sb_[a-z0-9_-]+/i, /eyJ[a-zA-Z0-9_-]{20,}/, /secret/i, /service_role/i];
  let leakFound = false;
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(swContent)) {
      leakFound = true;
      break;
    }
  }
  assert(!leakFound, 'Zero secrets or credential tokens embedded in service worker script');

  // --------------------------------------------------------------------------
  // Group 4: Offline Fallback Experience & Integrity
  // --------------------------------------------------------------------------
  console.log('\n[Test Group 4] Offline Experience & Safe Messaging...');
  const offlinePagePath = path.resolve(process.cwd(), 'src/app/offline/page.tsx');
  assert(fs.existsSync(offlinePagePath), 'src/app/offline/page.tsx offline route exists');

  const offlineContent = fs.readFileSync(offlinePagePath, 'utf8');
  assert(offlineContent.includes('offline'), 'Offline page clearly informs user of offline state');
  assert(offlineContent.includes('reload') || offlineContent.includes('Retry'), 'Offline page provides a retry connection action');
  assert(offlineContent.includes('Safe Offline Mode') || offlineContent.includes('No transactions'),
    'Offline page explicitly clarifies that state changes/transactions are not queued');

  // --------------------------------------------------------------------------
  // Group 5: Client-Side Registration Component
  // --------------------------------------------------------------------------
  console.log('\n[Test Group 5] Service Worker Registration Component...');
  const swCompPath = path.resolve(process.cwd(), 'src/components/ServiceWorkerRegister.tsx');
  assert(fs.existsSync(swCompPath), 'ServiceWorkerRegister client component exists');

  const swCompContent = fs.readFileSync(swCompPath, 'utf8');
  assert(swCompContent.includes("'use client'"), 'Component is marked with "use client" directive');
  assert(swCompContent.includes("navigator.serviceWorker.register('/sw.js'"),
    'Component registers /sw.js with correct scope');

  const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('ServiceWorkerRegister'), 'RootLayout embeds ServiceWorkerRegister component');
  assert(layoutContent.includes("manifest: '/manifest.webmanifest'"), 'RootLayout metadata includes webmanifest reference');
  assert(layoutContent.includes("themeColor: '#347A5C'"), 'RootLayout viewport defines brand theme color');

  console.log('\n======================================================');
  console.log(`   PWA Validation Summary:`);
  console.log(`   Total Assertions: ${passed + failed}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPWATests();
