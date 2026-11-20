import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { start } from 'local-postgres/tmp';
import { chromium } from 'playwright-core';

const root = process.cwd();
const output = path.join(root, 'artifacts', 'phase2a2');
mkdirSync(output, { recursive: true });
const preview = mkdtempSync(path.join(root, 'artifacts', 'money-coder-phase2a2-preview-'));
const migrationWorkspace = mkdtempSync(path.join(os.tmpdir(), 'money-coder-phase2a2-migrations-'));
const binaryCache = path.join(root, '.cache', 'local-postgres', 'embedded-postgres', 'windows-x64');
const binary = existsSync(binaryCache) ? readdirSync(binaryCache).sort().at(-1) : null;
if (!binary) throw new Error('Cached PostgreSQL 17 is unavailable; no download attempted.');
const originalPath = process.env.PATH ?? '';
const safePath = `${path.join(binaryCache, binary, 'native', 'bin')}${path.delimiter}${originalPath}`;
process.env.PATH = safePath;
const port = 3218;
const url = `http://localhost:${port}`;
let postgres, server, browser, client;
let serverLog = '';

function sanitizedEnvironment(databaseUrl) {
  const names = ['SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA'];
  const env = Object.fromEntries(names.filter(name => process.env[name]).map(name => [name, process.env[name]]));
  return { ...env, PATH: safePath, DATABASE_URL: databaseUrl, AUTH_SECRET: 'phase2a2-isolated-preview-secret-32-characters', APP_URL: url, NEXT_TELEMETRY_DISABLED: '1', PRIVATE_STORAGE_UPLOAD_MODE: 'disabled', NODE_ENV: 'production', PRISMA_GENERATE_SKIP_AUTOINSTALL: '1' };
}

async function visit(page, target, expected = 200) {
  const response = await page.goto(`${url}${target}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (response?.status() !== expected) throw new Error(`Unexpected status ${response?.status()} at ${target}`);
  await page.waitForTimeout(200);
}

async function capture(page, file, width, height = 900) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(180);
  const result = await page.evaluate(() => ({ overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), heading: document.querySelector('h1')?.textContent?.trim() ?? '', brokenLinks: [...document.querySelectorAll('a[href]')].filter(anchor => !anchor.getAttribute('href')).length }));
  const screenshot = path.join(output, file);
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
  return { file, width, ...result, screenshot };
}

try {
  for (const name of ['src', 'public', 'prisma']) cpSync(path.join(root, name), path.join(preview, name), { recursive: true });
  cpSync(path.join(root, 'prisma'), path.join(migrationWorkspace, 'prisma'), { recursive: true });
  for (const name of ['package.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs']) cpSync(path.join(root, name), path.join(preview, name));
  const nextConfig = path.join(preview, 'next.config.ts');
  writeFileSync(nextConfig, readFileSync(nextConfig, 'utf8').replace('poweredByHeader: false,', 'poweredByHeader: false,\n  devIndicators: false,'));
  symlinkSync(path.join(root, 'node_modules'), path.join(preview, 'node_modules'), 'junction');
  writeFileSync(path.join(preview, 'src', 'app', 'layout.tsx'), 'import "./globals.css"; export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }');

  postgres = await start({ dataDir: path.join(preview, 'postgres'), host: true, timeout: 0, prewarm: false, postgresOptions: '-c unix_socket_directories=', postgres: { version: '17', strategy: 'local-only' } });
  const env = sanitizedEnvironment(postgres.dsn);
  const migration = spawnSync(process.execPath, [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy', '--schema', path.join(migrationWorkspace, 'prisma', 'schema.prisma')], { cwd: migrationWorkspace, env, encoding: 'utf8', windowsHide: true });
  if (migration.status !== 0) throw new Error('Isolated migrations failed.');
  process.env.DATABASE_URL = postgres.dsn;
  client = new PrismaClient();
  const ownerToken = randomUUID();
  const staffToken = randomUUID();
  const owner = await client.user.create({ data: { email: `owner-${randomUUID()}@test.local`, displayName: 'مدير الشركة التجريبية', passwordHash: 'local-preview-only', emailVerifiedAt: new Date() } });
  const staff = await client.user.create({ data: { email: `staff-${randomUUID()}@test.local`, displayName: 'محاسب المكتب التجريبي', passwordHash: 'local-preview-only', emailVerifiedAt: new Date() } });
  const company = await client.organization.create({ data: {
    type: 'COMMERCIAL_COMPANY', legalName: 'شركة القاهرة التجارية التجريبية', tradeName: 'شركة القاهرة التجارية', createdById: owner.id,
    memberships: { create: { userId: owner.id, role: 'COMPANY_OWNER' } },
    profile: { create: { responsiblePerson: 'مدير الشركة', businessActivity: 'تجارة وتوزيع', legalEntityType: 'شركة ذات مسؤولية محدودة' } },
    accountingSettings: { create: { baseCurrency: 'EGP', inventoryMethod: 'PERIODIC' } },
    fiscalYears: { create: { name: '2026', startsAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2026-12-31T23:59:59.000Z') } },
    bankAccounts: { create: { bankName: 'بنك تجريبي', accountName: 'الحساب التشغيلي', accountNumber: 'TEST-001', currency: 'EGP' } },
  } });
  const office = await client.organization.create({ data: { type: 'ACCOUNTING_OFFICE', legalName: 'مكتب المحاسبة التجريبي', createdById: staff.id, memberships: { create: { userId: staff.id, role: 'OFFICE_ACCOUNTANT', permissions: ['accounting:chart:view'] } } } });
  const officeMember = await client.organizationMembership.findUniqueOrThrow({ where: { userId_organizationId: { userId: staff.id, organizationId: office.id } } });
  const engagement = await client.officeCompanyEngagement.create({ data: { officeOrganizationId: office.id, companyOrganizationId: company.id, requestedById: staff.id, status: 'ACTIVE', acceptedAt: new Date(), permissions: ['organization:view', 'accounting:chart:view'] } });
  await client.engagementStaff.create({ data: { engagementId: engagement.id, membershipId: officeMember.id, userId: staff.id, permissions: ['organization:view', 'accounting:chart:view'] } });
  for (const [user, token] of [[owner, ownerToken], [staff, staffToken]]) await client.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 86_400_000) } });

  env.NODE_ENV = 'development';
  server = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--webpack', '-p', String(port)], { cwd: preview, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { serverLog = `${serverLog}${String(chunk)}`.slice(-8000); });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error('Isolated preview exited before startup.');
    try { const response = await fetch(`${url}/auth/login`, { signal: AbortSignal.timeout(1500) }); if (response.ok) { ready = true; break; } } catch { /* startup */ }
    await delay(1000);
  }
  if (!ready) throw new Error(`Preview startup failed: ${serverLog.replaceAll(postgres.dsn, '[temporary database]')}`);

  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--no-sandbox', '--disable-background-networking', '--disable-sync'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'money_coder_session', value: ownerToken, url }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort());
  const results = [];

  await visit(page, `/company/${company.id}`);
  await page.getByRole('heading', { name: 'لوحة تشغيل الشركة' }).waitFor();
  if (await client.chartInstallation.count({ where: { organizationId: company.id } }) !== 0) throw new Error('Dashboard unexpectedly initialized chart.');
  if (await page.locator('a[aria-current="page"]').filter({ hasText: 'لوحة الشركة' }).count() !== 1) throw new Error('Dashboard active navigation is missing.');
  for (const width of [1920, 1440, 1024, 768, 390, 360]) results.push(await capture(page, `dashboard-${width}.png`, width, width <= 768 ? 844 : 900));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'فتح قائمة الشركة' }).click();
  results.push(await capture(page, 'mobile-navigation-390.png', 390, 844));
  await page.keyboard.press('Escape');
  if (await page.getByRole('button', { name: 'فتح قائمة الشركة' }).getAttribute('aria-expanded') !== 'false') throw new Error('Mobile navigation did not close with Escape.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByText('المراحل القادمة').first().click();
  if (await page.getByRole('link', { name: 'أرصدة أول المدة' }).count()) throw new Error('Planned module incorrectly navigates.');
  results.push(await capture(page, 'sidebar-expanded-1440.png', 1440));
  await visit(page, `/company/${company.id}/settings`);
  await page.getByRole('heading', { name: 'إعدادات الشركة' }).waitFor();
  for (const label of ['البيانات الأساسية', 'القانونية والضريبية', 'العنوان والتواصل', 'الإعداد المحاسبي', 'الحسابات البنكية', 'المراجعة والمستندات']) {
    await page.getByRole('button', { name: new RegExp(label) }).first().click();
  }
  results.push(await capture(page, 'settings-1440.png', 1440));
  results.push(await capture(page, 'settings-390.png', 390, 844));
  await visit(page, `/company/${company.id}/settings?step=0`);
  for (let attempt = 0; attempt < 12 && !await page.getByRole('textbox', { name: 'رقم السجل التجاري' }).count(); attempt++) {
    await page.getByRole('button', { name: /2\. القانونية والضريبية/ }).click();
    await page.waitForTimeout(250);
  }
  await page.getByRole('textbox', { name: 'رقم السجل التجاري' }).waitFor({ timeout: 3000 });
  await page.getByRole('button', { name: /1\. البيانات الأساسية/ }).click();
  await page.getByRole('textbox', { name: 'الاسم التجاري' }).waitFor();
  await page.getByRole('textbox', { name: 'الاسم التجاري' }).fill('تغيير غير محفوظ');
  let guardDialogs = 0;
  page.once('dialog', dialog => { guardDialogs++; return dialog.dismiss(); });
  await page.getByRole('link', { name: 'العودة إلى لوحة الشركة' }).click();
  if (!page.url().includes('/settings')) throw new Error(`Unsaved settings navigation was not blocked; dialogs=${guardDialogs}.`);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: 'العودة إلى لوحة الشركة' }).click();
  await page.getByRole('heading', { name: 'لوحة تشغيل الشركة' }).waitFor();
  await visit(page, `/company/${company.id}/settings?step=4`);
  await page.getByText('بنك تجريبي').waitFor();
  await visit(page, `/company/${company.id}/accounting/chart-of-accounts`);
  if (await client.chartInstallation.count({ where: { organizationId: company.id } }) !== 0) throw new Error('Normal chart navigation initialized accounts.');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'إنشاء الدليل التجاري' }).click();
  await page.getByText('تم إنشاء دليل الحسابات التجاري بنجاح').waitFor();
  if (await client.chartAccount.count({ where: { organizationId: company.id } }) !== 226) throw new Error('Expected 226 installed accounts.');
  await page.getByPlaceholder('ابحث بالكود أو الاسم العربي أو الإنجليزي').fill('111001');
  await page.getByRole('button', { name: /الخزينة الرئيسية/ }).click();
  results.push(await capture(page, 'chart-details-1440.png', 1440));
  results.push(await capture(page, 'chart-mobile-390.png', 390, 844));
  results.push(await capture(page, 'chart-mobile-360.png', 360, 844));
  await visit(page, `/company/${company.id}/accounting/chart-of-accounts?view=audit`);
  await page.getByRole('heading', { name: 'سجل التعديلات على دليل الحسابات' }).waitFor();
  results.push(await capture(page, 'audit-1440.png', 1440));
  await visit(page, `/company/${company.id}`);
  if (!await page.getByText('226').count()) throw new Error('Dashboard did not show actual chart count.');

  await context.clearCookies();
  await context.addCookies([{ name: 'money_coder_session', value: staffToken, url }]);
  await visit(page, `/company/${company.id}`);
  await page.getByText('وصول عبر تفويض مكتب محاسبة').first().waitFor();
  results.push(await capture(page, 'delegated-office-1440.png', 1440));
  if (await page.getByRole('link', { name: 'إعدادات الشركة' }).count() === 0) throw new Error('Delegated company settings link missing.');
  await client.officeCompanyEngagement.update({ where: { id: engagement.id }, data: { status: 'REVOKED', revokedAt: new Date() } });
  await visit(page, `/company/${company.id}`, 404);

  writeFileSync(path.join(output, 'visual-results.json'), JSON.stringify({ results, errors, companyId: company.id, accountCount: 226, isolated: true }, null, 2));
  if (results.some(result => result.overflow > 0 || result.brokenLinks > 0) || errors.length) throw new Error(`Visual QA failed: ${JSON.stringify({ results: results.filter(item => item.overflow > 0), errors })}`);
  await browser.close();
  browser = null;
  server.kill();
  await new Promise(resolve => server.once('exit', resolve));
  server = null;
  env.NODE_ENV = 'production';
  const build = spawnSync(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build', '--webpack'], { cwd: preview, env, encoding: 'utf8', windowsHide: true, timeout: 180_000 });
  writeFileSync(path.join(output, 'build-results.json'), JSON.stringify({ status: build.status, passed: build.status === 0, output: String(build.stdout).slice(-2500), errors: String(build.stderr).slice(-1500) }, null, 2));
  if (build.status !== 0) throw new Error('Isolated production build failed; see build-results.json.');
  process.stdout.write(JSON.stringify({ pass: true, screenshots: results.length, widths: [1920, 1440, 1024, 768, 390, 360], accountCount: 226, errors }));
} finally {
  if (browser) await browser.close();
  if (server) { server.kill(); await delay(600); }
  if (client) await client.$disconnect();
  if (postgres) await postgres.stop({ force: true });
  const resolved = path.resolve(preview);
  if (!resolved.startsWith(path.resolve(root, 'artifacts') + path.sep) || !path.basename(resolved).startsWith('money-coder-phase2a2-preview-')) throw new Error('Refusing to clean an unexpected preview path.');
  const moduleLink = path.join(resolved, 'node_modules');
  if (existsSync(moduleLink)) { if (!lstatSync(moduleLink).isSymbolicLink()) throw new Error('Unexpected preview node_modules target.'); rmSync(moduleLink, { force: true }); }
  rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  const resolvedMigration = path.resolve(migrationWorkspace);
  if (!resolvedMigration.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolvedMigration).startsWith('money-coder-phase2a2-migrations-')) throw new Error('Refusing to clean an unexpected migration path.');
  rmSync(resolvedMigration, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  process.env.PATH = originalPath;
}
