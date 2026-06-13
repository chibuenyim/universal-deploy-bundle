const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('\n🔍 SIMPLE Link Click Test - No Waits\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  const tests = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Airtime', href: '/purchase/airtime' },
    { name: 'Data', href: '/purchase/data' },
    { name: 'Blog', href: '/blog' }
  ];

  try {
    console.log('Loading home page...\n');
    await page.goto('https://staging.example.com/');
    await page.waitForTimeout(2000);

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      console.log(`\n${i + 1}. Testing: ${test.name} (${test.href})`);

      results.totalTests++;

      try {
        // Find link by href
        const link = page.locator(`a[href="${test.href}"]`).first();

        const count = await link.count();
        if (count === 0) {
          console.log('   ❌ Link not found');
          results.failed++;
          results.details.push({ test: test.name, status: 'FAIL', reason: 'Not found' });
          continue;
        }

        // Get URL before
        const before = page.url();

        // Click directly without waiting for stability
        await link.click();

        // Wait brief moment for navigation
        await page.waitForTimeout(2000);

        // Check if navigated
        const after = page.url();

        if (after.includes(test.href) || after.includes(test.href.replace('/', '').replace('/', ''))) {
          console.log(`   ✅ PASS - Click worked!`);
          console.log(`      → ${after}`);
          results.passed++;
          results.details.push({ test: test.name, status: 'PASS', url: after });
        } else {
          console.log(`   ❌ FAIL - No navigation`);
          console.log(`      Before: ${before}`);
          console.log(`      After: ${after}`);
          results.failed++;
          results.details.push({ test: test.name, status: 'FAIL', reason: 'No navigation' });
        }

        // Return to home
        if (i < tests.length - 1) {
          await page.goto('https://staging.example.com/');
          await page.waitForTimeout(1000);
        }

      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message.substring(0, 100)}`);
        results.failed++;
        results.details.push({ test: test.name, status: 'ERROR', error: error.message });

        // Return to home anyway
        await page.goto('https://staging.example.com/');
        await page.waitForTimeout(1000);
      }
    }

  } catch (error) {
    console.error('\nTest failed:', error.message);
  } finally {
    await browser.close();
  }

  // Results
  console.log('\n\n📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total: ${results.totalTests}`);
  console.log(`Pass: ${results.passed}`);
  console.log(`Fail: ${results.failed}`);
  console.log(`Success: ${results.totalTests > 0 ? ((results.passed / results.totalTests) * 100).toFixed(1) : 0}%\n`);

  const rate = results.totalTests > 0 ? (results.passed / results.totalTests) * 100 : 0;

  if (rate >= 70) {
    console.log('✅✅✅ LINKS ARE WORKING! ✅✅✅');
    console.log('Client-side navigation is functional.\n');
  } else if (rate >= 40) {
    console.log('⚠️  PARTIAL - Some links work\n');
  } else {
    console.log('❌❌❌ LINKS NOT WORKING! ❌❌❌\n');
  }

  // Save
  fs.writeFileSync('verifier/simple-click-results.json', JSON.stringify(results, null, 2));
  console.log('Results saved to: verifier/simple-click-results.json\n');
})();
