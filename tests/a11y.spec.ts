import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function axe(page: Page) {
  // Entrance animations start hidden; wait for them so axe sees final colours.
  await page.evaluate(() => document.querySelectorAll('[data-rise], [data-rise-group]').forEach((el) => el.classList.add('in')));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-rise], [data-rise-group] > *')]
    .every((el) => getComputedStyle(el).opacity === '1'));
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const vp of viewports) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`no axe violations · ${vp.name} · motion ${reducedMotion}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ reducedMotion });
      await page.goto('/');
      await axe(page);
    });
  }
}

test('no console errors and every in-page link resolves', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const missing = await page.$$eval('a[href^="#"]', (as) =>
    as.map((a) => a.getAttribute('href') ?? '').filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
  expect(missing).toEqual([]);
  expect(errors).toEqual([]);
});
