const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('\n🔍 Inspecting Staging Homepage Structure\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  try {
    console.log('Loading homepage...');
    await page.goto('https://staging.example.com/', { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'verifier/screenshots/staging-homepage-inspection.png', fullPage: true });
    console.log('✅ Screenshot saved\n');

    // Get all links
    console.log('📋 All Links Found on Page:');
    console.log('─────────────────────────────────────────────────────\n');

    const links = await page.locator('a').all();
    const linkData = [];

    for (let i = 0; i < Math.min(links.length, 50); i++) {
      try {
        const link = links[i];
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        const isVisible = await link.isVisible();

        if (href && isVisible) {
          linkData.push({ index: i, text: text?.trim(), href, isVisible });
          console.log(`${i + 1}. ${href}`);
          if (text) console.log(`   Text: "${text.trim()}"`);
          console.log(`   Visible: ${isVisible}\n`);
        }
      } catch (error) {
        // Skip error links
      }
    }

    // Check for navigation elements
    console.log('🔍 Looking for Navigation Elements:');
    console.log('─────────────────────────────────────────────────────\n');

    const navSelectors = [
      'nav',
      'navbar',
      '[role="navigation"]',
      '.navbar',
      '.nav',
      '#navbar',
      '#nav'
    ];

    for (const selector of navSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`✅ Found: ${selector}`);
        }
      } catch (error) {
        console.log(`❌ Not found: ${selector}`);
      }
    }

    // Check specific links we're looking for
    console.log('\n🎯 Checking for Specific Links:');
    console.log('─────────────────────────────────────────────────────\n');

    const targetLinks = [
      { name: 'Marketplace', href: '/marketplace' },
      { name: 'Services', href: '/services' },
      { name: 'FAQ', href: '/faq' },
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Buy Data', href: '/buy-data' },
      { name: 'Airtime', href: '/airtime' }
    ];

    for (const target of targetLinks) {
      try {
        const link = page.locator(`a[href="${target.href}"]`).first();
        const exists = await link.count();
        const text = exists > 0 ? await link.textContent() : 'N/A';
        const visible = exists > 0 ? await link.isVisible() : false;

        console.log(`${target.name} (${target.href}):`);
        console.log(`   Found: ${exists > 0 ? 'YES' : 'NO'}`);
        if (exists > 0) {
          console.log(`   Visible: ${visible}`);
          console.log(`   Text: "${text?.trim() || 'N/A'}"`);
        }
        console.log();
      } catch (error) {
        console.log(`${target.name}: ERROR - ${error.message}\n`);
      }
    }

    // Save link data
    const outputFile = 'verifier/page-inspection-results.json';
    fs.writeFileSync(outputFile, JSON.stringify({ links: linkData, timestamp: new Date() }, null, 2));
    console.log(`💾 Link data saved to: ${outputFile}\n`);

  } catch (error) {
    console.error('\n❌ Inspection failed:', error.message);
  } finally {
    await browser.close();
  }

  console.log('═══════════════════════════════════════════════════════\n');
})();
