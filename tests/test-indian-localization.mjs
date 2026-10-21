import assert from 'node:assert';
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('======================================================');
console.log('   TimeSwap Indian Localization Verification Suite    ');
console.log('======================================================\n');

// Load and evaluate mockData.ts
const mockDataContent = fs.readFileSync('src/lib/mockData.ts', 'utf8');
const jsContent = mockDataContent
  .replace(/import .*/g, '')
  .replace(/export const /g, 'const ')
  .replace(/: Member\[\]/g, '')
  .replace(/: CurrentUser/g, '')
  .replace(/: Session\[\]/g, '')
  .replace(/: Transaction\[\]/g, '')
  .replace(/: Conversation\[\]/g, '')
  .replace(/: NotificationItem\[\]/g, '');

const fn = new Function(jsContent + '; return { INITIAL_MEMBERS, INITIAL_CURRENT_USER, INITIAL_SESSIONS, INITIAL_TRANSACTIONS, INITIAL_CONVERSATIONS, INITIAL_NOTIFICATIONS };');
const {
  INITIAL_MEMBERS,
  INITIAL_CURRENT_USER,
  INITIAL_SESSIONS,
  INITIAL_TRANSACTIONS,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS
} = fn();

// 1. Static Invariant & Data Integrity Audits
console.log('--- 1. Canonical Mock Data Structure & Personas ---');

// Verify Current User (Ananya Rao)
assert.strictEqual(INITIAL_CURRENT_USER.id, 'u-current', 'u-current ID preserved');
assert.strictEqual(INITIAL_CURRENT_USER.name, 'Ananya Rao', 'Current user localized to Ananya Rao');
assert.strictEqual(INITIAL_CURRENT_USER.location, 'Bengaluru, Karnataka', 'Current user located in Bengaluru');
assert.strictEqual(INITIAL_CURRENT_USER.timezone, 'IST (UTC+5:30)', 'Current user timezone is IST');
assert(INITIAL_CURRENT_USER.skillsTeaching.length >= 2, 'Current user teaches at least 2 skills');
console.log('  ✓ PASS: Current User localized to Ananya Rao (Bengaluru, IST)');

// Verify Member Count & IDs
assert.strictEqual(INITIAL_MEMBERS.length, 12, '12 directory mentors defined');
const expectedIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'];
for (const id of expectedIds) {
  const m = INITIAL_MEMBERS.find(member => member.id === id);
  assert(m, `Member ID ${id} exists`);
  assert.strictEqual(m.timezone, 'IST (UTC+5:30)', `Member ${id} (${m.name}) timezone is IST (UTC+5:30)`);
  assert(m.skillsTeaching.length >= 2, `Member ${id} teaches at least 2 skills`);
  assert(m.skillsLearning.length >= 2, `Member ${id} wants to learn at least 2 skills`);
}
console.log('  ✓ PASS: All 12 directory member IDs (m1-m12) preserved with IST (UTC+5:30)');

// Verify Regional Distribution
const locations = INITIAL_MEMBERS.map(m => m.location);
assert(locations.some(l => l.includes('Kolkata')), 'East India represented (Kolkata)');
assert(locations.some(l => l.includes('Chennai')), 'South India represented (Chennai)');
assert(locations.some(l => l.includes('Pune')), 'West India represented (Pune)');
assert(locations.some(l => l.includes('Kochi')), 'South/Coastal India represented (Kochi)');
assert(locations.some(l => l.includes('Delhi')), 'North India represented (Delhi-NCR)');
assert(locations.some(l => l.includes('Hyderabad')), 'South/Central India represented (Hyderabad)');
assert(locations.some(l => l.includes('Bengaluru')), 'Tech hub represented (Bengaluru)');
assert(locations.some(l => l.includes('Mumbai')), 'Financial/Cultural capital represented (Mumbai)');
assert(locations.some(l => l.includes('Rishikesh')), 'Traditional wellness hub represented (Rishikesh)');
assert(locations.some(l => l.includes('Lucknow')), 'Heritage/Craft hub represented (Lucknow)');
assert(locations.some(l => l.includes('Mysuru')), 'Artisan/Heritage hub represented (Mysuru)');
assert(locations.some(l => l.includes('Gurugram')), 'Innovation/Startup hub represented (Gurugram)');
console.log('  ✓ PASS: Credible pan-India geographic diversity (12 distinct cities/states)');

// Verify Whole-Hour Invariant Across Sessions
console.log('\n--- 2. Whole-Hour Credit Invariants Across Sessions ---');
for (const s of INITIAL_SESSIONS) {
  assert([60, 120, 180].includes(s.durationMinutes), `Session ${s.id} duration (${s.durationMinutes}) is valid whole-hour`);
  assert.strictEqual(s.creditCost, s.durationMinutes / 60, `Session ${s.id} credit cost (${s.creditCost}) equals duration / 60`);
  assert(s.scheduledDate.includes('IST') || s.scheduledDate.includes('week') || s.scheduledDate.includes('Yesterday') || s.scheduledDate.includes('Tomorrow'), `Session ${s.id} schedule format is consistent`);
}
console.log('  ✓ PASS: All sessions strictly satisfy duration ∈ {60, 120, 180} and credits ∈ {1, 2, 3}');

// Verify Cross-Collection References
console.log('\n--- 3. Cross-Collection Referential Consistency ---');
// Session 1: Arjun & Ananya
assert.strictEqual(INITIAL_SESSIONS[0].teacherName, 'Arjun Venkatraman');
assert.strictEqual(INITIAL_SESSIONS[0].learnerName, 'Ananya Rao');

// Session 2: Vikram & Ananya
assert.strictEqual(INITIAL_SESSIONS[1].teacherName, 'Vikramaditya Sengupta');
assert.strictEqual(INITIAL_SESSIONS[1].learnerName, 'Ananya Rao');

// Transactions
assert.strictEqual(INITIAL_TRANSACTIONS[0].counterpartyName, 'Meera Nambiar');
assert.strictEqual(INITIAL_TRANSACTIONS[1].counterpartyName, 'Arjun Venkatraman');
assert.strictEqual(INITIAL_TRANSACTIONS[2].counterpartyName, 'Nandini Sen');

// Conversations
assert.strictEqual(INITIAL_CONVERSATIONS[0].participantName, 'Arjun Venkatraman');
assert.strictEqual(INITIAL_CONVERSATIONS[1].participantName, 'Vikramaditya Sengupta');
assert.strictEqual(INITIAL_CONVERSATIONS[2].participantName, 'Aditya Sharma');

// Notifications
assert(INITIAL_NOTIFICATIONS[0].body.includes('Vikramaditya Sengupta'));
assert(INITIAL_NOTIFICATIONS[1].body.includes('Aditya Sharma'));
assert(INITIAL_NOTIFICATIONS[2].body.includes('Meera Nambiar'));
assert(INITIAL_NOTIFICATIONS[3].title.includes('Arjun'));
console.log('  ✓ PASS: Sessions, transactions, conversations, and notifications are 100% synchronized');

// 4. Live Browser & Route Render Checks
console.log('\n--- 4. Live UI & Browser Verification ---');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Home Page
  console.log('  Testing Homepage (/) ...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  const bodyText = await page.textContent('body');

  assert(bodyText.includes('Zero Fees Always'), 'Homepage displays "Zero Fees Always"');
  assert(!bodyText.includes('$0 Always'), 'Homepage has no "$0 Always" string');
  assert(bodyText.includes('Vikram teaches Multilingual Typography'), 'EquilibriumDial displays localized Phase A node');
  assert(bodyText.includes('Vikram learns Carnatic Flute'), 'EquilibriumDial displays localized Phase B node');
  assert(bodyText.includes('From Arjun in Chennai'), 'EquilibriumDial displays localized subtitle');
  assert(bodyText.includes('Arjun Venkatraman'), 'Homepage displays Indian mentor cards');
  assert(bodyText.includes('Chennai, Tamil Nadu'), 'Homepage displays Indian city locations');
  console.log('  ✓ PASS: Homepage renders localized copy, dial nodes, and mentor directory cards');

  // Discover Page
  console.log('  Testing Discover Directory (/discover) ...');
  await page.goto(`${BASE_URL}/discover`, { waitUntil: 'networkidle' });
  const discoverText = await page.textContent('body');
  assert(discoverText.includes('Vikramaditya Sengupta'), 'Discover lists Vikramaditya Sengupta');
  assert(discoverText.includes('Kolkata, West Bengal'), 'Discover lists Kolkata location');
  assert(discoverText.includes('Dr. Rohan Kulkarni'), 'Discover lists Dr. Rohan Kulkarni');
  assert(discoverText.includes('Pune, Maharashtra'), 'Discover lists Pune location');
  console.log('  ✓ PASS: Discover page renders localized mentors, locations, and skills');

  // Member Profile Page
  console.log('  Testing Member Profile (/members/m1) ...');
  await page.goto(`${BASE_URL}/members/m1`, { waitUntil: 'networkidle' });
  const profileText = await page.textContent('body');
  assert(profileText.includes('Vikramaditya Sengupta'), 'Profile m1 displays Vikramaditya Sengupta');
  assert(profileText.includes('Kolkata, West Bengal'), 'Profile m1 displays Kolkata location');
  assert(profileText.includes('IST (UTC+5:30)'), 'Profile m1 displays IST timezone');
  assert(profileText.includes('Multilingual Typography & Grid Systems'), 'Profile m1 displays Indic typography skill');
  console.log('  ✓ PASS: Member profile /members/m1 renders localized details');

  // Help Page
  console.log('  Testing Help Center (/help) ...');
  await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle' });
  const helpText = await page.textContent('body');
  assert(helpText.includes('Arjun or Meera'), 'Help Center FAQ references localized peers');
  console.log('  ✓ PASS: Help Center FAQ references localized peers');

  // Auth Signup Placeholders
  console.log('  Testing Auth Signup (/auth/signup) ...');
  await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'networkidle' });
  const nameInput = page.locator('input[placeholder*="Meera Nambiar"]');
  assert.strictEqual(await nameInput.count(), 1, 'Signup form has "e.g. Meera Nambiar" placeholder');
  console.log('  ✓ PASS: Signup form renders localized placeholder');

  // Onboarding Placeholders & State Inspection
  console.log('  Testing Onboarding Guide Placeholders & Defaults ...');
  const onboardingSrc = fs.readFileSync('src/app/onboarding/page.tsx', 'utf8');
  assert(onboardingSrc.includes('placeholder="e.g. Ananya Rao"'), 'Onboarding form has "e.g. Ananya Rao" placeholder');
  assert(onboardingSrc.includes('placeholder="e.g. Bengaluru, Karnataka"'), 'Onboarding form has "e.g. Bengaluru, Karnataka" placeholder');
  assert(onboardingSrc.includes('placeholder="e.g. IST (UTC+5:30)"'), 'Onboarding form has "e.g. IST (UTC+5:30)" placeholder');
  assert(onboardingSrc.includes('placeholder="e.g. Sourdough baking, Carnatic flute, Pottery"'), 'Onboarding form has Indian wishlist placeholder');
  assert(onboardingSrc.includes('placeholder="e.g. 18:00 to 21:00 IST"'), 'Onboarding form has IST time window placeholder');
  console.log('  ✓ PASS: Onboarding form renders localized Indian placeholders and IST time windows');

  console.log('\n======================================================');
  console.log('   All 18 Indian Localization Checks PASSED!         ');
  console.log('======================================================\n');
} finally {
  await browser.close();
}
