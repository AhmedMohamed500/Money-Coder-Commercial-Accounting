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
const output = path.join(root, 'artifacts', 'phase2a');
mkdirSync(output, { recursive: true });
const preview = mkdtempSync(path.join(root, 'artifacts', 'money-coder-phase2a-preview-'));
const migrationWorkspace = mkdtempSync(path.join(os.tmpdir(), 'money-coder-phase2a-migrations-'));
const binaryCache = path.join(root, '.cache', 'local-postgres', 'embedded-postgres', 'windows-x64');
const binary = existsSync(binaryCache) ? readdirSync(binaryCache).sort().at(-1) : null;
if (!binary) throw new Error('Cached PostgreSQL binary is unavailable. This preview does not download tools.');
const binDir = path.join(binaryCache, binary, 'native', 'bin');
const originalPath = process.env.PATH ?? '';
const safePath = `${binDir}${path.delimiter}${originalPath}`;
process.env.PATH = safePath;
const port = 3217;
const url = `http://localhost:${port}`;
let postgres;
let server;
let browser;
let client;
let serverLog = '';

function sanitizedEnvironment(databaseUrl) {
  const names = ['SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA'];
  const env = Object.fromEntries(names.filter(name => process.env[name]).map(name => [name, process.env[name]]));
  return { ...env, PATH: safePath, DATABASE_URL: databaseUrl, AUTH_SECRET: 'phase2a-isolated-preview-secret-32-characters', APP_URL: url, NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production', PRISMA_GENERATE_SKIP_AUTOINSTALL: '1' };
}

try {
  cpSync(path.join(root, 'src'), path.join(preview, 'src'), { recursive: true });
  cpSync(path.join(root, 'public'), path.join(preview, 'public'), { recursive: true });
  cpSync(path.join(root, 'prisma'), path.join(preview, 'prisma'), { recursive: true });
  cpSync(path.join(root, 'prisma'), path.join(migrationWorkspace, 'prisma'), { recursive: true });
  for (const name of ['package.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs']) cpSync(path.join(root, name), path.join(preview, name));
  const nextConfigFile = path.join(preview, 'next.config.ts');
  writeFileSync(nextConfigFile, readFileSync(nextConfigFile, 'utf8').replace('poweredByHeader: false,', 'poweredByHeader: false,\n  devIndicators: false,'));
  symlinkSync(path.join(root, 'node_modules'), path.join(preview, 'node_modules'), 'junction');
  writeFileSync(path.join(preview, 'src', 'app', 'layout.tsx'), 'import "./globals.css"; export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }');

  postgres = await start({ dataDir: path.join(preview, 'postgres'), host: true, timeout: 0, prewarm: false, postgresOptions: '-c unix_socket_directories=', postgres: { version: '17', strategy: 'local-only' } });
  const env = sanitizedEnvironment(postgres.dsn);
  const migration = spawnSync(process.execPath, [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy', '--schema', path.join(migrationWorkspace, 'prisma', 'schema.prisma')], { cwd: migrationWorkspace, env, encoding: 'utf8', windowsHide: true });
  if (migration.status !== 0) throw new Error('Isolated migration failed.');
  process.env.DATABASE_URL = postgres.dsn;
  client = new PrismaClient();
  const token = randomUUID();
  const user = await client.user.create({ data: { email: `phase2a-${randomUUID()}@test.local`, displayName: 'مدير تجريبي', passwordHash: 'local-preview-only', emailVerifiedAt: new Date() } });
  const company = await client.organization.create({ data: { type: 'COMMERCIAL_COMPANY', legalName: 'شركة القاهرة التجارية التجريبية', tradeName: 'شركة القاهرة التجارية', createdById: user.id, memberships: { create: { userId: user.id, role: 'COMPANY_OWNER' } }, accountingSettings: { create: { baseCurrency: 'EGP', inventoryMethod: 'PERIODIC' } } } });
  await client.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 86_400_000) } });

  env.NODE_ENV = 'development';
  server = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--webpack', '-p', String(port)], { cwd: preview, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { serverLog = `${serverLog}${String(chunk)}`.slice(-6000); });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (server.exitCode !== null) throw new Error('Isolated Next preview exited before becoming ready.');
    try { const response = await fetch(`${url}/auth/login`, { signal: AbortSignal.timeout(1500) }); if (response.ok) { ready = true; break; } } catch { /* wait for startup */ }
    await delay(1000);
  }
  if (!ready) throw new Error(`Isolated Next preview did not become ready: ${serverLog.replaceAll(postgres.dsn, '[temporary database]')}`);

  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'money_coder_session', value: token, url }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort());
  const response = await page.goto(`${url}/company/${company.id}/accounting/chart-of-accounts`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (response?.status() !== 200) throw new Error(`Chart preview returned ${response?.status()}`);
  await page.getByRole('button', { name: 'إنشاء الدليل التجاري' }).waitFor({ timeout: 15_000 }).catch(async () => { throw new Error(`Chart setup not visible at ${page.url()}: ${(await page.locator('body').innerText()).slice(0, 500)}. ${serverLog.slice(-1000)}`); });
  await page.getByRole('button', { name: 'إنشاء الدليل التجاري' }).click();
  await page.getByText('تم إنشاء دليل الحسابات التجاري بنجاح').waitFor();
  await page.getByPlaceholder('ابحث بالكود أو الاسم العربي أو الإنجليزي').fill('111001');
  await page.getByRole('button', { name: /الخزينة الرئيسية/ }).click();
  await page.getByPlaceholder('ابحث بالكود أو الاسم العربي أو الإنجليزي').fill('');
  await page.getByRole('button', { name: 'توسيع الأصول المتداولة' }).click();
  await page.getByRole('button', { name: 'توسيع النقدية والبنوك' }).click();
  const results = [];
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: width > 1000 ? 900 : 844 });
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, title: document.title, chartRows: document.querySelectorAll('[aria-label="شجرة دليل الحسابات"] button').length }));
    const screenshot = path.join(output, `chart-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
    results.push({ width, ...metrics, screenshot });
  }
  await page.getByRole('button', { name: /إضافة حساب/ }).first().click();
  await page.getByText('إضافة حساب أو مجموعة').waitFor();
  await page.getByRole('button', { name: /سجل التعديلات/ }).click();
  await page.getByText('سجل التعديلات على دليل الحسابات').waitFor();
  await page.screenshot({ path: path.join(output, 'audit-mobile-390.png'), fullPage: true, animations: 'disabled' });
  writeFileSync(path.join(output, 'visual-results.json'), JSON.stringify({ results, errors, accountCount: await client.chartAccount.count({ where: { organizationId: company.id } }) }, null, 2));
  if (results.some(item => item.overflow !== 0 || item.chartRows < 8) || errors.length) throw new Error('Visual QA failed.');
  server.kill(); await delay(1000); server = null;
  env.NODE_ENV = 'production';
  const build = spawnSync(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build', '--webpack'], { cwd: preview, env, encoding: 'utf8', windowsHide: true, timeout: 180_000 });
  writeFileSync(path.join(output, 'build-results.json'), JSON.stringify({ status: build.status, passed: build.status === 0, output: String(build.stdout).slice(-2500), errors: String(build.stderr).slice(-1500) }, null, 2));
  if (build.status !== 0) throw new Error(`Isolated Next build failed: ${String(build.stdout).slice(-2500)} ${String(build.stderr).slice(-1000)}`.replaceAll(postgres.dsn, '[temporary database]'));
  process.stdout.write(JSON.stringify({ pass: true, widths: results.map(item => item.width), accountCount: await client.chartAccount.count({ where: { organizationId: company.id } }), errors }));
} finally {
  if (browser) await browser.close();
  if (server) { server.kill(); await delay(500); }
  if (client) await client.$disconnect();
  if (postgres) await postgres.stop({ force: true });
  const resolved = path.resolve(preview);
  if (!resolved.startsWith(path.resolve(root, 'artifacts') + path.sep) || !path.basename(resolved).startsWith('money-coder-phase2a-preview-')) throw new Error('Refusing to clean unexpected preview path.');
  const moduleLink = path.join(resolved, 'node_modules');
  if (existsSync(moduleLink)) {
    if (!lstatSync(moduleLink).isSymbolicLink()) throw new Error('Refusing to clean preview with unexpected node_modules target.');
    rmSync(moduleLink, { force: true });
  }
  rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  const resolvedMigration = path.resolve(migrationWorkspace);
  if (!resolvedMigration.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolvedMigration).startsWith('money-coder-phase2a-migrations-')) throw new Error('Refusing to clean unexpected migration path.');
  rmSync(resolvedMigration, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  process.env.PATH = originalPath;
}
