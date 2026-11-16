import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { cp, mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { start } from "local-postgres/tmp";

const root = process.cwd();
const temp = await mkdtemp(path.join(os.tmpdir(), "money-coder-browser-"));
const pgRoot = await mkdtemp(path.join(root, ".cache", "pg-browser-"));
const safePrisma = path.join(temp, "prisma");
const fixturePath = path.join(temp, "fixture.json");
const output = path.join(root, "artifacts", "phase2d1-browser");
await mkdir(safePrisma); await mkdir(output, { recursive: true });
await cp(path.join(root, "prisma", "schema.prisma"), path.join(safePrisma, "schema.prisma"));
await cp(path.join(root, "prisma", "migrations"), path.join(safePrisma, "migrations"), { recursive: true });
process.env.LOCAL_POSTGRES_SKIP_DOWNLOAD = "1";
const cachedBin = path.join(root, ".cache", "local-postgres", "embedded-postgres", "windows-x64", "17.10.0-beta.17", "native", "bin");
if (process.platform === "win32" && existsSync(path.join(cachedBin, "postgres.exe"))) process.env.PATH = `${cachedBin}${path.delimiter}${process.env.PATH ?? process.env.Path ?? ""}`;
const edge = [process.env.EDGE_PATH, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].filter(Boolean).find(existsSync);
if (!edge) throw new Error("Microsoft Edge not found");
const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(DATABASE|DIRECT_URL|NEON|SMTP|AWS|S3|STORAGE|PRIVATE_STORAGE|AUTH_SECRET|APP_URL)/i.test(name)));
let postgres; let server; let browser; let serverLog = "";
let loginSequence = 1;
function run(command, args, env, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
}
async function ready(url) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Next.js server did not become ready");
}
async function login(email, password) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, extraHTTPHeaders: { "x-forwarded-for": `10.20.0.${loginSequence++}` } });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  await page.goto("http://localhost:3117/auth/login", { waitUntil: "networkidle" });
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(password);
  const loginResponse = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  const response = await loginResponse;
  if (!response.ok()) throw new Error(`Login API returned ${response.status()}: ${(await response.json()).error ?? "unknown"}`);
  if (!(await context.cookies()).some(cookie => cookie.name === "money_coder_session")) throw new Error("Login succeeded but the secure session cookie was not stored by Edge");
  await page.waitForURL(/\/dashboard/);
  return { context, page };
}
try {
  postgres = await start({ dataDir: pgRoot, keep: true, host: true, timeout: 0, prewarm: false, postgresOptions: process.platform === "win32" ? "-c unix_socket_directories=" : undefined, postgres: { version: "17", strategy: "local-only" } });
  const env = { ...cleanEnvironment, DATABASE_URL: postgres.dsn, AUTH_SECRET: "isolated-browser-secret-at-least-32-characters", APP_URL: "http://localhost:3117", PRIVATE_STORAGE_UPLOAD_MODE: "disabled", AUTOMATION_MODE: "MOCK", BROWSER_FIXTURE_PATH: fixturePath };
  run(process.execPath, [path.join(root, "node_modules/prisma/build/index.js"), "migrate", "deploy", "--schema", path.join(safePrisma, "schema.prisma")], env, temp);
  run(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), path.join(root, "scripts/seed-accounting-browser.ts")], env);
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-p", "3117", "-H", "127.0.0.1"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", data => { serverLog += data; }); server.stderr.on("data", data => { serverLog += data; });
  await ready("http://localhost:3117/auth/login");
  browser = await chromium.launch({ executablePath: edge, headless: true });

  const accountant = await login(fixture.users.accountant, fixture.password);
  const openingUrl = `http://localhost:3117/company/${fixture.companyId}/accounting/opening-balances`;
  await accountant.page.goto(openingUrl, { waitUntil: "networkidle" });
  await accountant.page.getByLabel("السنة المالية").selectOption(fixture.fiscalYearId);
  await accountant.page.getByRole("button", { name: "إنشاء أو فتح مسودة" }).click();
  await accountant.page.getByRole("heading", { name: "أرصدة الحسابات" }).waitFor();
  for (const [code, side, amount] of [["111001", "مدين", "1000"], ["320001", "دائن", "1000"]]) {
    const row = accountant.page.locator("table tbody tr").filter({ hasText: code }).first();
    await row.getByLabel(new RegExp(`^${side} `)).fill(amount);
    const saved = accountant.page.waitForResponse(response => response.url().includes("/opening-balances/") && response.url().endsWith("/lines") && response.request().method() === "PUT");
    await row.getByRole("button", { name: "حفظ" }).click(); await saved;
  }
  await accountant.page.getByRole("button", { name: "تقديم للمراجعة" }).click(); await accountant.page.getByText("بانتظار المراجعة", { exact: true }).first().waitFor();
  await accountant.context.close();
  const openingManager = await login(fixture.users.manager, fixture.password); await openingManager.page.goto(openingUrl, { waitUntil: "networkidle" });
  await openingManager.page.getByRole("button", { name: "تسجيل المراجعة" }).click();
  const approveOpening = openingManager.page.getByRole("button", { name: "اعتماد وقفل" }); await approveOpening.waitFor();
  openingManager.page.once("dialog", dialog => void dialog.accept()); await approveOpening.click(); await openingManager.page.getByText("نسخة معتمدة ومقفلة", { exact: true }).first().waitFor(); await openingManager.context.close();
  const openingOwner = await login(fixture.users.owner, fixture.password); await openingOwner.page.goto(openingUrl, { waitUntil: "networkidle" });
  openingOwner.page.once("dialog", dialog => void dialog.accept()); await openingOwner.page.getByRole("button", { name: "ترحيل القيد الافتتاحي" }).click(); await openingOwner.page.getByText("تم ترحيل الأرصدة الافتتاحية إلى الأستاذ العام.").waitFor();
  await openingOwner.page.screenshot({ path: path.join(output, "00-opening-posted.png"), fullPage: true }); await openingOwner.context.close();

  const journalAccountant = await login(fixture.users.accountant, fixture.password);
  await journalAccountant.page.goto(`http://localhost:3117/company/${fixture.companyId}/accounting/journal-entries/new`, { waitUntil: "networkidle" });
  await journalAccountant.page.locator('select[name="fiscalYearId"]').selectOption(fixture.fiscalYearId);
  await journalAccountant.page.locator('input[name="transactionDate"]').fill("2026-11-10");
  await journalAccountant.page.locator('input[name="postingDate"]').fill("2026-11-10");
  await journalAccountant.page.locator('input[name="reference"]').fill("E2E-JV-001");
  await journalAccountant.page.locator('input[name="description"]').fill("قيد رحلة المتصفح الموثقة");
  const rows = journalAccountant.page.locator("tbody tr");
  await rows.nth(0).locator("select").selectOption(fixture.cashId); await rows.nth(0).locator('input[inputmode="decimal"]').nth(0).fill("250.75");
  await rows.nth(1).locator("select").selectOption(fixture.capitalId); await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill("250.75");
  await journalAccountant.page.getByRole("button", { name: "حفظ المسودة" }).click();
  await journalAccountant.page.waitForURL(/journal-entries\/[0-9a-f-]+$/); const entryUrl = journalAccountant.page.url();
  await journalAccountant.page.getByRole("button", { name: "تقديم للمراجعة" }).click();
  await journalAccountant.page.getByText("بانتظار المراجعة", { exact: true }).waitFor();
  await journalAccountant.context.close();

  const manager = await login(fixture.users.manager, fixture.password); await manager.page.goto(entryUrl, { waitUntil: "networkidle" });
  await manager.page.getByRole("button", { name: "اعتماد القيد" }).click(); await manager.page.getByText("معتمد", { exact: true }).waitFor(); await manager.context.close();
  const owner = await login(fixture.users.owner, fixture.password); await owner.page.goto(entryUrl, { waitUntil: "networkidle" });
  await owner.page.getByRole("button", { name: "ترحيل نهائي" }).click(); await owner.page.getByText("مرحّل", { exact: true }).waitFor();
  await owner.page.screenshot({ path: path.join(output, "01-posted-journal.png"), fullPage: true });
  const ledgerUrl = `http://localhost:3117/company/${fixture.companyId}/accounting/general-ledger?accountId=${fixture.cashId}&fiscalYearId=${fixture.fiscalYearId}&from=2026-11-01&to=2026-11-30`;
  await owner.page.goto(ledgerUrl, { waitUntil: "networkidle" }); await owner.page.getByText("250.75").first().waitFor();
  const ledgerDownload = owner.page.waitForEvent("download"); await owner.page.getByRole("link", { name: "تصدير Excel" }).click(); await ledgerDownload;
  const trialUrl = `http://localhost:3117/company/${fixture.companyId}/accounting/trial-balance?fiscalYearId=${fixture.fiscalYearId}&from=2026-11-01&to=2026-11-30&view=DETAILED`;
  await owner.page.goto(trialUrl, { waitUntil: "networkidle" }); await owner.page.getByText("ميزان المراجعة متطابق حسابيًا.").waitFor();
  const trialDownload = owner.page.waitForEvent("download"); await owner.page.getByRole("link", { name: "تصدير Excel" }).click(); await trialDownload;
  await owner.page.screenshot({ path: path.join(output, "02-trial-balance.png"), fullPage: true }); await owner.context.close();

  const viewer = await login(fixture.users.viewer, fixture.password); await viewer.page.goto(entryUrl, { waitUntil: "networkidle" });
  if (await viewer.page.getByRole("button", { name: /ترحيل|اعتماد|عكس|تقديم/ }).count()) throw new Error("Viewer received a mutation action"); await viewer.context.close();
  const office = await login(fixture.users.officeStaff, fixture.password); await office.page.goto(entryUrl, { waitUntil: "networkidle" });
  await office.page.getByText("E2E-JV-001", { exact: true }).waitFor(); if (await office.page.getByRole("button", { name: /ترحيل|اعتماد|عكس|تقديم/ }).count()) throw new Error("Delegated office viewer received a mutation action");
  await office.page.screenshot({ path: path.join(output, "03-delegated-office-view.png"), fullPage: true }); await office.context.close();
  const outsider = await login(fixture.users.outsider, fixture.password); const isolated = await outsider.page.goto(entryUrl, { waitUntil: "networkidle" }); if (isolated?.status() !== 404) throw new Error(`Cross-company route returned ${isolated?.status()}`); await outsider.context.close();

  const reversing = await login(fixture.users.manager, fixture.password); await reversing.page.goto(entryUrl, { waitUntil: "networkidle" }); let prompt = 0;
  reversing.page.on("dialog", async dialog => { prompt++; await dialog.accept(prompt === 1 ? "عكس موثق من رحلة المتصفح" : "2026-11-11"); });
  await reversing.page.getByRole("button", { name: "إنشاء قيد عكس" }).click(); await reversing.page.waitForURL(url => url.href !== entryUrl); const reversalUrl = reversing.page.url(); await reversing.context.close();
  const reversalAccountant = await login(fixture.users.accountant, fixture.password); await reversalAccountant.page.goto(reversalUrl, { waitUntil: "networkidle" }); await reversalAccountant.page.getByRole("button", { name: "تقديم للمراجعة" }).click(); await reversalAccountant.page.getByText("بانتظار المراجعة", { exact: true }).waitFor(); await reversalAccountant.context.close();
  const reversalOwner = await login(fixture.users.owner, fixture.password); await reversalOwner.page.goto(reversalUrl, { waitUntil: "networkidle" }); await reversalOwner.page.getByRole("button", { name: "اعتماد القيد" }).click(); await reversalOwner.page.getByText("معتمد", { exact: true }).waitFor(); await reversalOwner.page.getByRole("button", { name: "ترحيل نهائي" }).click(); await reversalOwner.page.getByText("مرحّل", { exact: true }).waitFor();
  await reversalOwner.page.goto(`http://localhost:3117/company/${fixture.companyId}/accounting/periods?fiscalYearId=${fixture.fiscalYearId}`, { waitUntil: "networkidle" }); await reversalOwner.page.getByRole("heading", { name: "الفترات المحاسبية" }).waitFor(); await reversalOwner.page.screenshot({ path: path.join(output, "04-accounting-periods.png"), fullPage: true }); await reversalOwner.context.close();
  process.stdout.write("Authenticated browser journeys passed for opening balances, accountant, manager, owner, viewer, delegated office staff, exports, reversal, and tenant isolation.\n");
} catch (error) {
  if (server) process.stderr.write(`Next server output:\n${serverLog ?? ""}\n`);
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  if (postgres) await postgres.stop({ force: true });
  const resolvedTemp = await realpath(temp).catch(() => null); if (resolvedTemp?.startsWith(await realpath(os.tmpdir()))) await rm(resolvedTemp, { recursive: true, force: true });
  const resolvedPg = await realpath(pgRoot).catch(() => null); const cacheRoot = await realpath(path.join(root, ".cache")).catch(() => null); if (resolvedPg && cacheRoot && resolvedPg.startsWith(cacheRoot + path.sep)) await rm(resolvedPg, { recursive: true, force: true }).catch(() => {});
}
