import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const candidates = [process.env.EDGE_PATH, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].filter(Boolean);
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error("Microsoft Edge not found. Set EDGE_PATH to a Chromium executable.");

const baseUrl = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const output = path.join(process.cwd(), "artifacts", "final-landing-visual-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });

try {
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 900 },
    { name: "laptop", width: 1280, height: 900 },
    { name: "desktop", width: 1440, height: 1000 },
    { name: "wide", width: 1920, height: 1080 },
  ]) {
    const page = await browser.newPage({ viewport });
    const browserErrors = [];
    page.on("pageerror", error => browserErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") {
        const location = message.location();
        browserErrors.push(`${message.text()}${location.url ? ` — ${location.url}` : ""}`);
      }
    });
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator(".mcf-hero").waitFor({ state: "visible" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * .75) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      await Promise.race([
        Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }))),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
      window.scrollTo(0, 0);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, `${viewport.name}-hero.png`), fullPage: false });
    await page.addStyleTag({ content: ".mcf-header{position:absolute!important;width:100%!important}" });
    await page.screenshot({ path: path.join(output, `${viewport.name}-full.png`), fullPage: true });
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      dir: document.documentElement.dir,
      ctas: [...document.querySelectorAll("a.mcf-button")].map(element => ({ text: element.textContent?.trim(), href: element.getAttribute("href") })),
      readinessLabels: [...document.querySelectorAll(".mcf-feature-rail small, .mce-step-copy em")].map(element => element.textContent?.trim()),
      approvedBlocks: {
        financialTwin: Boolean(document.querySelector("#financial-twin .mce-dashboard-frame")),
        documentJourney: Boolean(document.querySelector("#workflow .mce-journey-panel")),
        mobileReporting: Boolean(document.querySelector("#mobile-reporting .mce-phone")),
        security: Boolean(document.querySelector("#security .mce-security-grid")),
        startPaths: Boolean(document.querySelector("#plans .mce-plan-grid")),
        faq: Boolean(document.querySelector("#faq .mce-faq-list")),
        socialProof: Boolean(document.querySelector(".mcf-social-proof")),
        testimonial: Boolean(document.querySelector(".mcf-testimonial")),
        restaurants: [...document.querySelectorAll(".mcf-industry-grid strong")].some(element => element.textContent?.includes("المطاعم والكافيهات")),
        truthfulFooter: [...document.querySelectorAll(".mcf-footer-social small")].some(element => element.textContent?.includes("لا توجد حسابات")),
      },
    }));
    if (metrics.scrollWidth > metrics.viewport) throw new Error(`${viewport.name} has horizontal overflow: ${metrics.scrollWidth}px > ${metrics.viewport}px`);
    if (metrics.dir !== "rtl") throw new Error(`${viewport.name} is not rendered in RTL mode`);
    if (metrics.ctas.some(cta => !cta.text || !cta.href)) throw new Error(`${viewport.name} has a blank or unlinked CTA`);
    if (!metrics.readinessLabels.includes("متاح الآن") || !metrics.readinessLabels.includes("ضمن Financial Twin")) throw new Error(`${viewport.name} does not distinguish live and planned functionality`);
    if (Object.values(metrics.approvedBlocks).some(value => !value)) throw new Error(`${viewport.name} is missing an approved design block`);
    if (browserErrors.length) throw new Error(`${viewport.name} browser errors: ${browserErrors.join(" | ")}`);
    console.log(`${viewport.name}: ${metrics.viewport}px, no horizontal overflow, RTL confirmed.`);
    await page.close();
  }

  const reviewPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await reviewPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await reviewPage.locator(".mcf-hero").waitFor({ state: "visible" });
  for (const section of ["financial-twin", "offices", "workflow", "mobile-reporting", "industries", "roles", "security", "plans", "faq"]) {
    await reviewPage.locator(`#${section}`).screenshot({ path: path.join(output, `review-${section}.png`) });
  }
  await reviewPage.locator(".mcf-final").screenshot({ path: path.join(output, "review-final-cta.png") });
  await reviewPage.locator(".mcf-benefits").screenshot({ path: path.join(output, "review-benefits-and-proof.png") });
  await reviewPage.close();

  const interactionPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await interactionPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await interactionPage.locator(".mcf-hero").waitFor({ state: "visible" });
  await interactionPage.locator(".mcf-menu summary").click();
  if (!await interactionPage.locator('.mcf-menu a[href="#offices"]').isVisible()) throw new Error("Mobile navigation did not open accessibly");
  await interactionPage.locator('.mcf-menu a[href="#offices"]').click();
  await interactionPage.waitForFunction(() => window.location.hash === "#offices");
  const singleCompanyTab = interactionPage.getByRole("tab", { name: "شركة واحدة" });
  await singleCompanyTab.click();
  if (await singleCompanyTab.getAttribute("aria-selected") !== "true") throw new Error("Accounting-office workflow tabs did not update");
  if (!await interactionPage.locator("#offices").getByText("مراجعة المستندات", { exact: true }).isVisible()) throw new Error("Single-company review capabilities did not render");
  const revenueTab = interactionPage.getByRole("tab", { name: "الإيرادات", exact: true });
  await revenueTab.click();
  if (await revenueTab.getAttribute("aria-selected") !== "true") throw new Error("Financial Twin dashboard tabs did not update");
  const extractionStep = interactionPage.getByRole("button", { name: /استخراج البيانات/ });
  await extractionStep.click();
  if (await extractionStep.getAttribute("aria-pressed") !== "true") throw new Error("Document journey did not update");
  const flowTab = interactionPage.getByRole("tab", { name: "الإيراد والمصروف", exact: true });
  await flowTab.click();
  if (await flowTab.getAttribute("aria-selected") !== "true") throw new Error("Mobile reporting preview tabs did not update");
  await interactionPage.getByRole("button", { name: /التصنيع والإنتاج/ }).click();
  if (await interactionPage.getByRole("button", { name: /التصنيع والإنتاج/ }).getAttribute("aria-pressed") !== "true") throw new Error("Industry selector did not update");
  const registerResponse = await interactionPage.goto(`${baseUrl}/auth/register`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (registerResponse?.status() !== 200) throw new Error(`Registration CTA route returned ${registerResponse?.status()}`);
  const loginResponse = await interactionPage.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (loginResponse?.status() !== 200) throw new Error(`Login route returned ${loginResponse?.status()}`);
  console.log("Interactive dashboard, office modes, document journey, mobile preview, navigation, and account routes confirmed.");
  await interactionPage.close();
} finally {
  await browser.close();
}
