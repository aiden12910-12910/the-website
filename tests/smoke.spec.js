const { test, expect } = require('@playwright/test');

test('page loads without JS errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('http://localhost:3000/index.html');
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});

test('calculator buttons exist', async ({ page }) => {
  await page.goto('http://localhost:3000/index.html');
  await expect(page.locator('#win-panel-scientific')).toBeVisible();
  await expect(page.locator('button', { hasText: 'sin' })).toBeVisible();
});
