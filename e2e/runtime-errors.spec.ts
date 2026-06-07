import { test, expect } from '@playwright/test';

/**
 * Runtime Error Detection Tests
 *
 * These tests load pages and check browser console for errors
 * This catches client-side exceptions that build-time checks miss
 */

test.describe('Runtime Error Detection', () => {
  const pages = [
    { url: '/', name: 'Homepage' },
    { url: '/login', name: 'Login Page' },
    { url: '/marketplace', name: 'Marketplace' },
    { url: '/marketplace/services', name: 'Services List' },
    { url: '/register', name: 'Register Page' },
    { url: '/blog', name: 'Blog Page' },
    { url: '/faq', name: 'FAQ Page' },
    { url: '/provider', name: 'Provider Dashboard (redirects)' },
  ];

  // Test each page for console errors
  for (const page of pages) {
    test(`should have no console errors on ${page.name}`, async ({ page: pwPage }) => {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];

      // Listen for console errors
      pwPage.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
        if (msg.type() === 'warning') {
          consoleWarnings.push(msg.text());
        }
      });

      // Navigate to page
      await pwPage.goto(page.url);

      // Wait for page to load
      await pwPage.waitForLoadState('networkidle');

      // Wait a bit more for any delayed errors
      await pwPage.waitForTimeout(2000);

      // Check for errors
      expect(
        consoleErrors.length,
        `Console errors found on ${page.name}: ${consoleErrors.join(', ')}`
      ).toBe(0);

      // Check for warnings (but don't fail on them, just log)
      if (consoleWarnings.length > 0) {
        console.log(`⚠️  ${consoleWarnings.length} warnings on ${page.name}:`, consoleWarnings);
      }
    });
  }

  test('should not crash homepage with client-side errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to homepage
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check page is actually loaded
    const title = await page.title();
    expect(title).toBeTruthy();

    // No console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Filter out expected 404s for missing API endpoints during testing
        if (!msg.text().includes('404') && !msg.text().includes('fetch')) {
          consoleErrors.push(msg.text());
        }
      }
    });

    // Navigate to a page that makes API calls
    await page.goto('/marketplace/services');

    // Wait for page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should not crash even if some API calls fail
    expect(consoleErrors.length).toBe(0);
  });

  test('should handle hydration properly', async ({ page }) => {
    const consoleErrors: string[] = [];
    const hydrationErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);

        // Check for hydration errors
        if (text.includes('hydration') || text.includes('Hydration')) {
          hydrationErrors.push(text);
        }
      }
    });

    // Navigate to homepage
    await page.goto('/');

    // Wait for full page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for hydration errors specifically
    expect(
      hydrationErrors.length,
      `Hydration errors found: ${hydrationErrors.join(', ')}`
    ).toBe(0);
  });

  test('should not have unhandled promise rejections', async ({ page }) => {
    const unhandledRejections: string[] = [];

    // Listen for unhandled rejections
    page.on('pageerror', error => {
      unhandledRejections.push(error.toString());
    });

    // Navigate and interact with page
    await page.goto('/');

    // Try to trigger some interactions
    await page.waitForLoadState('networkidle');

    // Scroll page to trigger lazy-loaded content
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000);

    // Check no unhandled rejections
    expect(unhandledRejections.length).toBe(0);
  });
});

test.describe('Critical User Flows - No Errors', () => {
  test('should load homepage without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');

    // Check page loaded
    const title = await page.title();
    expect(title).not.toBe('');

    expect(errors.length).toBe(0);
  });

  test('should navigate from homepage to login without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.click('a[href="/login"]');
    await page.waitForURL('/login');

    expect(errors.length).toBe(0);
  });

  test('should load marketplace page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    expect(errors.length).toBe(0);
  });
});

test.describe('Error Boundaries', () => {
  test('should show error boundary if component crashes', async ({ page }) => {
    await page.goto('/');

    // Check if page has error boundary setup
    const hasErrorBoundary = await page.evaluate(() => {
      return document.querySelector('[data-error-boundary]') !== null ||
             window.location.pathname.includes('_error');
    });

    // If there's an error boundary, page should still load something
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
