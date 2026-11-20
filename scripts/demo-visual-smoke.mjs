import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const candidates = [process.env.EDGE_PATH, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].filter(Boolean);
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error("Microsoft Edge not found. Set EDGE_PATH to a Chromium executable.");

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3107";
const output = path.join(process.cwd(), "artifacts", "demo-phase2-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });

try {
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 900 },
    { name: "desktop", width: 1440, height: 1000 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && !message.text().includes("/_next/hmr")) errors.push(message.text());
    });
    const response = await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.locator(".demo-app").waitFor();
    const metrics = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, dir: document.querySelector(".demo-app")?.getAttribute("dir") }));
    if (response?.status() !== 200) throw new Error(`${viewport.name}: HTTP ${response?.status()}`);
    if (metrics.scrollWidth > metrics.width) throw new Error(`${viewport.name}: horizontal overflow ${metrics.scrollWidth} > ${metrics.width}`);
    if (metrics.dir !== "rtl") throw new Error(`${viewport.name}: RTL missing`);
    if (errors.length) throw new Error(`${viewport.name}: ${errors.join(" | ")}`);
    await page.screenshot({ path: path.join(output, `${viewport.name}-full.png`), fullPage: true, animations: "disabled" });
    console.log(`${viewport.name}: HTTP 200, RTL, no horizontal overflow or browser errors.`);
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const interactionFailures = [];
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("/_next/hmr")) interactionFailures.push(message.text()); });
  page.on("pageerror", error => interactionFailures.push(error.message));
  page.on("requestfailed", request => interactionFailures.push(`${request.url()} ${request.failure()?.errorText}`));
  page.on("response", response => { if (response.status() >= 400) interactionFailures.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle", timeout: 60_000 });
  const bankNavigation = page.locator('.demo-sidebar button').filter({ hasText: "كشف البنك" });
  await bankNavigation.click();
  await page.locator(".demo-steps").waitFor({ state: "visible" });
  const firstRow = page.locator(".demo-table tbody tr").first();
  await firstRow.locator("select").selectOption("org-nile-4110");
  await firstRow.getByRole("button", { name: "إنشاء مسودة" }).click();
  await page.getByRole("button", { name: /اعتماد وترحيل تجريبي/ }).click();
  await page.getByRole("button", { name: "كشف البنك", exact: true }).click();
  await expectText(page, "مُرحّل");
  await page.getByRole("button", { name: "التقارير المالية", exact: true }).click();
  await expectText(page, "تقارير العرض مبنية فقط");
  if (interactionFailures.length) throw new Error(`Interaction browser failures: ${interactionFailures.join(" | ")}`);
  console.log("Bank statement scenario completed through human review, posting and reports.");
  await page.close();
} finally {
  await browser.close();
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible" });
}
