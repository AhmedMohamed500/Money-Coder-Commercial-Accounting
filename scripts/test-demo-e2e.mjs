import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const candidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  process.env.EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error("No Chromium browser found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE.");

const baseUrl = process.env.DEMO_E2E_BASE_URL ?? "http://127.0.0.1:3108";
const output = process.env.DEMO_E2E_OUTPUT ?? path.join(process.cwd(), "artifacts", "demo-final-acceptance");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];
const externalRequests = [];

function observe(page) {
  page.on("pageerror", error => errors.push(`page: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("request", request => {
    const url = new URL(request.url());
    const base = new URL(baseUrl);
    if (url.origin !== base.origin && !["data:", "blob:"].includes(url.protocol)) externalRequests.push(request.url());
  });
}

async function navigate(page, label) {
  await page.locator(".demo-sidebar nav").getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(80);
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "ar-EG" });
  const page = await context.newPage();
  observe(page);
  const response = await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(response?.status(), 200, "/demo must return HTTP 200");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("وضع تجريبي — بيانات افتراضية", { exact: false }).first().waitFor();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl", "demo must render RTL");

  for (const journey of ["مالك الشركة", "مكتب المحاسبة", "المحاسب"]) {
    const tab = page.getByRole("tab", { name: journey, exact: true });
    await tab.click();
    assert.equal(await tab.getAttribute("aria-selected"), "true", `${journey} journey must activate`);
  }

  const screens = [
    "نظرة عامة", "إعداد الشركة", "مركز المكتب", "مركز المستندات", "المراجعة والاعتماد",
    "المحاسبة التجريبية", "كشف البنك", "التقارير المالية", "الخطط والفوترة", "الإعدادات والمساعدة",
  ];
  for (const screen of screens) await navigate(page, screen);
  await navigate(page, "نظرة عامة");
  await page.screenshot({ path: path.join(output, "desktop-overview.png"), fullPage: true });

  await navigate(page, "مركز المستندات");
  await page.getByRole("button", { name: "إضافة عينة", exact: true }).click();
  await page.getByLabel("عنوان العينة").fill("فاتورة قبول نهائي — عينة");
  await page.getByRole("button", { name: "إنشاء سجل العينة", exact: true }).click();
  const documentRow = page.getByRole("row").filter({ hasText: "فاتورة قبول نهائي — عينة" });
  await documentRow.getByRole("button", { name: "فتح المراجعة", exact: true }).click();
  await page.getByRole("heading", { name: "فاتورة قبول نهائي — عينة", exact: true }).waitFor();
  await page.getByLabel("إسناد المراجع").selectOption({ label: "كريم نبيل — مراجع افتراضي" });
  await page.getByRole("button", { name: "بدء المراجعة", exact: true }).click();
  await page.getByLabel("تعليق أو سبب").fill("يرجى استكمال بيان الضريبة في العينة.");
  await page.getByRole("button", { name: "طلب تصحيح", exact: true }).click();
  await page.getByRole("button", { name: "إعادة تقديم", exact: true }).click();
  await page.getByRole("button", { name: "بدء المراجعة", exact: true }).click();
  await page.getByRole("button", { name: "اعتماد", exact: true }).click();
  await page.getByText("معتمد", { exact: true }).first().waitFor();
  await page.screenshot({ path: path.join(output, "desktop-review-approved.png"), fullPage: true });

  await navigate(page, "المحاسبة التجريبية");
  await page.getByRole("tab", { name: "دليل الحسابات", exact: true }).click();
  await page.getByRole("heading", { name: "دليل الحسابات", exact: true }).waitFor();
  await page.getByRole("tab", { name: "قيد يومية", exact: true }).click();
  const debitInputs = page.getByLabel(/مدين السطر/);
  const creditInputs = page.getByLabel(/دائن السطر/);
  await debitInputs.nth(0).fill("250.55");
  await creditInputs.nth(1).fill("250.55");
  await page.getByRole("button", { name: "ترحيل إلى الأستاذ التجريبي", exact: true }).click();
  await page.getByText("تم ترحيل القيد التجريبي وتحديث الأستاذ والتقارير.", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "الأستاذ العام", exact: true }).click();
  await page.getByRole("heading", { name: "الأستاذ العام", exact: true }).waitFor();
  await page.getByRole("tab", { name: "ميزان المراجعة", exact: true }).click();
  await page.getByText("ميزان المراجعة متساوٍ", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, "desktop-accounting-trial.png"), fullPage: true });

  const companySelect = page.locator(".demo-top-actions label").filter({ hasText: "الشركة" }).locator("select");
  await companySelect.selectOption("org-horizon");
  await page.getByRole("heading", { name: "أفق للخدمات — تجريبي", exact: true }).waitFor();
  await navigate(page, "التقارير المالية");
  await page.getByRole("tab", { name: "المركز المالي", exact: true }).click();
  await page.getByText("المعادلة متوازنة", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, "desktop-reports-position.png"), fullPage: true });
  await companySelect.selectOption("org-nile");
  await page.getByRole("heading", { name: "النيل التجارية — تجريبي", exact: true }).waitFor();

  for (const route of ["/api/health", "/dashboard", "/auth/login"]) {
    const blocked = await context.request.get(`${baseUrl}${route}`, { maxRedirects: 0 });
    assert.equal(blocked.status(), 404, `${route} must return 404 in demo-only mode`);
  }

  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.viewport, `desktop horizontal overflow: ${dimensions.scroll} > ${dimensions.viewport}`);
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-EG" });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(`${baseUrl}/demo`, { waitUntil: "networkidle", timeout: 60_000 });
  await mobile.getByRole("button", { name: "فتح قائمة العرض", exact: true }).click();
  await mobile.locator(".demo-mobile-context").waitFor({ state: "visible" });
  await mobile.locator(".demo-mobile-context select").nth(0).selectOption("OFFICE_OWNER");
  await mobile.locator(".demo-sidebar nav").getByRole("button", { name: "مركز المكتب", exact: true }).click();
  await mobile.waitForFunction(() => !document.querySelector(".demo-sidebar")?.classList.contains("is-open"));
  await mobile.waitForTimeout(250);
  await mobile.getByText("مكتب القاهرة للمراجعة — تجريبي", { exact: true }).waitFor();
  const mobileDimensions = await mobile.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(mobileDimensions.scroll <= mobileDimensions.viewport, `mobile horizontal overflow: ${mobileDimensions.scroll} > ${mobileDimensions.viewport}`);
  await mobile.screenshot({ path: path.join(output, "mobile-office.png"), fullPage: true });
  await mobileContext.close();

  assert.deepEqual(externalRequests, [], `demo contacted external origins: ${externalRequests.join(", ")}`);
  assert.deepEqual(errors, [], `browser errors: ${errors.join(" | ")}`);
  console.log(`Demo E2E passed. Screenshots: ${output}`);
} finally {
  await browser.close();
}
