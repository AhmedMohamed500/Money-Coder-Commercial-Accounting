import { chromium } from '../../node_modules/playwright-core/index.mjs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--no-sandbox'] });
const results = [];
const check = (name, value) => { results.push({ name, pass: Boolean(value) }); if (!value) throw new Error(`FAIL: ${name}`); };
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
const external = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/*', route => { const host = new URL(route.request().url()).hostname; if (host === 'money-coder-commercial-accounting.vercel.app') return route.continue(); external.push(host); return route.abort(); });
await page.goto('https://money-coder-commercial-accounting.vercel.app/', { waitUntil: 'load' });
check('hero has height', await page.locator('#hero').evaluate(node => node.getBoundingClientRect().height > 600));
check('registration and login links', await page.locator('.mc9-hero-actions a').first().getAttribute('href') === '/auth/register' && await page.locator('.mc9-login').getAttribute('href') === '/auth/login');

await page.locator('#business-dna').getByRole('button', { name: 'مدير مالي' }).click();
check('persona changes command view', (await page.locator('.mc9-command-content').textContent()).includes('السيولة تحت عينك'));
await page.locator('#business-dna').getByRole('button', { name: 'مصنع' }).click();
check('sector changes company and scene', (await page.locator('.mc9-command-top').textContent()).includes('مصنع النيل') && (await page.locator('.mc9-dna-scene img').getAttribute('src')).includes('factory'));
await page.locator('#command-center .mc9-command-nav').getByRole('button', { name: 'الحسابات المسجلة' }).click();
check('command navigation shows registered accounts', (await page.locator('.mc9-command-content').textContent()).includes('من غير ادعاء رصيد حي'));
await page.locator('#command-center .mc9-command-nav').getByRole('button', { name: /استثناءات المراجعة/ }).focus();
await page.keyboard.press('Enter');
check('command navigation works by keyboard', (await page.locator('.mc9-command-content').textContent()).includes('مستند داعم مطلوب'));
await page.locator('#command-center .mc9-command-nav').getByRole('button', { name: 'نظرة عامة' }).click();
await page.locator('.mc9-metric-drill').click();
check('financial x-ray opens source detail', (await page.locator('.mc9-command-content').textContent()).includes('42,500 + 56,700'));

await page.locator('.mc9-trail-sidebar').getByRole('button', { name: /سداد مورد/ }).click();
check('money trail changes transaction', (await page.locator('.mc9-trail-stage').textContent()).includes('5,500'));
for (let i = 0; i < 3; i++) await page.locator('.mc9-trail-controls').getByRole('button', { name: /التالي/ }).click();
check('money trail journal is balanced', (await page.locator('.mc9-journal').textContent()).includes('الموردون') && (await page.locator('.mc9-journal tfoot').textContent()).includes('5,500'));
await page.locator('.mc9-trail-controls').getByRole('button', { name: 'تجاوز الحركة' }).click();
check('money trail skip reaches impact', (await page.locator('.mc9-trail-stage').textContent()).includes('الأثر المقصود'));
await page.locator('.mc9-trail-controls').getByRole('button', { name: 'إعادة الرحلة' }).click();
await page.waitForTimeout(1200);
check('money trail play advances', await page.locator('.mc9-trail-progress [aria-current="step"]').count() === 1 && (await page.locator('.mc9-trail-stage').textContent()).includes('حقول'));
await page.locator('.mc9-trail-controls').getByRole('button', { name: /إيقاف مؤقت/ }).click();

await page.locator('#bank-statement').getByRole('button', { name: /شاهد معالجة كشف بنك تجريبي/ }).click();
await page.waitForTimeout(1100);
check('bank statement demo advances', (await page.locator('.mc9-bank-stage-head').textContent()).includes('استخراج الحقول'));
await page.locator('.mc9-bank-controls').getByRole('button', { name: /إيقاف مؤقت/ }).click();
await page.locator('.mc9-bank-flow').getByRole('button', { name: /جدول منظّم/ }).click();
check('Horizon table has 15 rows', await page.locator('.mc9-bank-table-scroll tbody tr').count() === 15);
await page.locator('.mc9-bank-row-select').nth(8).focus();
await page.keyboard.press('Enter');
check('bank transaction selection works by keyboard', (await page.locator('.mc9-bank-selected').textContent()).includes('HTB-260209'));
await page.locator('.mc9-bank-flow').getByRole('button', { name: /مطابقة الرصيد/ }).click();
check('bank reconciliation is displayed', (await page.locator('.mc9-bank-reconcile').textContent()).includes('66,190'));

await page.locator('.mc9-pocket-tabs').getByRole('button', { name: /النبض المالي/ }).click();
check('Pocket CFO financial view changes', (await page.locator('.mc9-cfo-content').textContent()).includes('66,190'));
await page.locator('.mc9-pocket-tabs').getByRole('button', { name: /المراجعة/ }).click();
check('Pocket CFO review view changes', (await page.locator('.mc9-cfo-content').textContent()).includes('HTB-260209'));
await page.locator('.mc9-pocket-tabs').getByRole('button', { name: /الفريق/ }).click();
check('Pocket CFO team view changes', (await page.locator('.mc9-cfo-content').textContent()).includes('أحمد سالم'));

await page.locator('#decision-lab input[aria-label="المدفوعات المتوقعة"]').focus();
await page.keyboard.press('End');
check('Decision Lab warns on negative balance', await page.locator('.mc9-scenario-warning').count() === 1);
await page.locator('.mc9-decision-input-head').getByRole('button', { name: /رجّع الافتراضات/ }).click();
check('Decision Lab reset works', (await page.locator('.mc9-decision-results > strong').textContent()).includes('60,000') && await page.locator('.mc9-scenario-warning').count() === 0);
await page.locator('.mc9-industry-tabs').getByRole('button', { name: 'مصنع' }).click();
check('factory math is consistent', (await page.locator('.mc9-factory-math').textContent()).includes('220,000') && (await page.locator('.mc9-factory-math').textContent()).includes('50,000'));

await page.locator('.mc9-tour-link').click();
check('guided tour opens', await page.locator('.mc9-tour').count() === 1);
for (let i = 0; i < 4; i++) await page.locator('.mc9-tour-actions').getByRole('button', { name: /التالي/ }).click();
check('guided tour opens Excel illustration', (await page.locator('.mc9-bank-stage').textContent()).includes('Excel preview'));
await page.locator('.mc9-tour-head').getByRole('button', { name: 'إغلاق الجولة' }).click();
check('guided tour closes', await page.locator('.mc9-tour').count() === 0);
check('demo made no external requests', external.length === 0);
check('no browser errors', errors.length === 0);
await page.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await mobile.route('**/*', route => new URL(route.request().url()).hostname === 'money-coder-commercial-accounting.vercel.app' ? route.continue() : route.abort());
await mobile.goto('https://money-coder-commercial-accounting.vercel.app/', { waitUntil: 'load' });
await mobile.locator('.mc9-mobile-menu summary').click();
check('mobile menu opens', await mobile.locator('.mc9-mobile-menu').getAttribute('open') !== null);
await mobile.locator('.mc9-mobile-menu nav').getByRole('link', { name: 'مختبر القرار' }).click();
check('mobile menu closes after navigation', await mobile.locator('.mc9-mobile-menu').getAttribute('open') === null);
check('mobile has no overflow', await mobile.evaluate(() => document.documentElement.scrollWidth - innerWidth === 0));
await mobile.close();
await browser.close();
await writeFile(resolve('artifacts/money-coder-v9/live-functional-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.filter(result => result.pass).length, failed: results.filter(result => !result.pass).length, results }));
