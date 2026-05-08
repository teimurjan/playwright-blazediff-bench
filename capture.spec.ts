import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '3840x2160', width: 3840, height: 2160 },
];

const FIXTURES_DIR = join(__dirname, 'fixtures');

for (const v of VIEWPORTS) {
  test(`capture ${v.name}`, async ({ page }) => {
    test.setTimeout(60_000);

    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto('https://blazediff.dev', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    const outDir = join(FIXTURES_DIR, v.name);
    mkdirSync(outDir, { recursive: true });

    const baseline = await page.screenshot({ animations: 'disabled' });
    writeFileSync(join(outDir, 'baseline.png'), baseline);

    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = '__blazediff_bench_overlay__';
      d.style.cssText =
        'position:fixed;top:0;left:0;width:2px;height:2px;background:#f00;z-index:99999;pointer-events:none';
      document.body.appendChild(d);
    });

    const current = await page.screenshot({ animations: 'disabled' });
    writeFileSync(join(outDir, 'current.png'), current);
  });
}

test('capture fullpage-3840', async ({ page }) => {
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.goto('https://blazediff.dev', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const outDir = join(FIXTURES_DIR, 'fullpage-3840');
  mkdirSync(outDir, { recursive: true });

  const baseline = await page.screenshot({ fullPage: true, animations: 'disabled' });
  writeFileSync(join(outDir, 'baseline.png'), baseline);

  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__blazediff_bench_overlay__';
    d.style.cssText =
      'position:fixed;top:0;left:0;width:2px;height:2px;background:#f00;z-index:99999;pointer-events:none';
    document.body.appendChild(d);
  });

  const current = await page.screenshot({ fullPage: true, animations: 'disabled' });
  writeFileSync(join(outDir, 'current.png'), current);
});
