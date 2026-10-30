import { chromium } from '../../node_modules/playwright-core/index.mjs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = 'https://money-coder-commercial-accounting.vercel.app/';
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--no-sandbox'],
});
const results = [];

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => new URL(route.request().url()).hostname === 'money-coder-commercial-accounting.vercel.app' ? route.continue() : route.abort());
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    const screenshot = resolve(`artifacts/money-coder-v9/live-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
    await page.waitForTimeout(750);
    const metrics = await page.evaluate(() => ({
      heroHeight: Math.round(document.querySelector('#hero')?.getBoundingClientRect().height ?? 0),
      overflow: document.documentElement.scrollWidth - innerWidth,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
      pendingLazyImages: [...document.images].filter((image) => !image.complete && image.loading === 'lazy').length,
      title: document.title,
    }));
    results.push({ width, status: response?.status(), ...metrics, errors, screenshot });
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(resolve('artifacts/money-coder-v9/live-visual-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (results.some((result) => result.status !== 200 || result.heroHeight < 500 || result.overflow !== 0 || result.brokenImages.length || result.errors.length)) process.exitCode = 1;
