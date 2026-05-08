import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '3840x2160', width: 3840, height: 2160 },
];

for (const v of VIEWPORTS) {
  test(`screenshot ${v.name}`, async ({ page }) => {
    test.setTimeout(60_000);

    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto('https://blazediff.dev', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot(`${v.name}.png`, { animations: 'disabled' });
  });
}
