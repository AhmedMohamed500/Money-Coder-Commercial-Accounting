import { chromium } from '../../node_modules/playwright-core/index.mjs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('artifacts/money-coder-v9');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--no-sandbox'] });
const widths = [1920, 1693, 1440, 1280, 1024, 768, 430, 390, 360];
const results = [];
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const errors = [];
  const blocked = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    blocked.push(url.hostname);
    return route.abort();
  });
  const response = await page.goto('http://127.0.0.1:3199/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  for (const img of await page.locator('img').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(element => element.decode().catch(() => {})); }
  await page.evaluate(() => scrollTo(0, 0));
  const metrics = await page.evaluate(() => {
    const hero = document.querySelector('#hero');
    const sections = [...document.querySelectorAll('main > section')].map(node => ({ id: node.id, height: Math.round(node.getBoundingClientRect().height) }));
    return { title: document.querySelector('h1')?.textContent, overflow: document.documentElement.scrollWidth - innerWidth, heroHeight: Math.round(hero?.getBoundingClientRect().height ?? 0), brokenImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.currentSrc), sections };
  });
  if ([1920, 1440, 768, 390, 360].includes(width)) await page.screenshot({ path: resolve(output, width >= 1440 ? `full-desktop-${width}.png` : width === 768 ? 'full-tablet-768.png' : `full-mobile-${width}.png`), fullPage: true });
  if ([1440, 390].includes(width)) {
    for (const [id, filename] of [['hero','hero'],['command-center','command-center'],['money-trail','money-trail'],['bank-statement','bank-statement'],['pocket-cfo','pocket-cfo'],['decision-lab','decision-lab'],['industries','industry'],['start','final-cta']]) {
      await page.locator(`#${id}`).screenshot({ path: resolve(output, `${filename}-${width}.png`) });
    }
  }
  results.push({ width, status: response.status(), ...metrics, errors, blocked });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results));
if (results.some(result => result.status !== 200 || result.overflow > 1 || result.heroHeight < 300 || result.brokenImages.length || result.errors.length || result.blocked.length)) process.exitCode = 1;
