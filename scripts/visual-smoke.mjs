import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const candidates = [process.env.EDGE_PATH, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].filter(Boolean);
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error("Microsoft Edge not found. Set EDGE_PATH to a Chromium executable.");

const output = path.join(process.cwd(), "test-artifacts");
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
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(output, `${viewport.name}-hero.png`), fullPage: false });
    await page.screenshot({ path: path.join(output, `${viewport.name}-full.png`), fullPage: true });
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      dir: document.documentElement.dir,
      ctas: [...document.querySelectorAll("a.premium-button")].map(element => ({ text: element.textContent?.trim(), href: element.getAttribute("href") })),
    }));
    if (metrics.scrollWidth > metrics.viewport) throw new Error(`${viewport.name} has horizontal overflow: ${metrics.scrollWidth}px > ${metrics.viewport}px`);
    if (metrics.dir !== "rtl") throw new Error(`${viewport.name} is not rendered in RTL mode`);
    if (metrics.ctas.some(cta => !cta.text || !cta.href)) throw new Error(`${viewport.name} has a blank or unlinked CTA`);
    if (browserErrors.length) throw new Error(`${viewport.name} browser errors: ${browserErrors.join(" | ")}`);
    console.log(`${viewport.name}: ${metrics.viewport}px, no horizontal overflow, RTL confirmed.`);
    await page.close();
  }

  const reviewPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await reviewPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  for (const section of ["experience", "audiences", "future"]) {
    await reviewPage.locator(`#${section}`).screenshot({ path: path.join(output, `review-${section}.png`) });
  }
  await reviewPage.locator(".signature-cta").screenshot({ path: path.join(output, "review-final-cta.png") });
  await reviewPage.close();

  const interactionPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await interactionPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await interactionPage.locator(".premium-mobile-menu summary").click();
  if (!await interactionPage.locator('.premium-mobile-menu a[href="#experience"]').isVisible()) throw new Error("Mobile navigation did not open accessibly");
  await interactionPage.locator('.premium-mobile-menu a[href="#experience"]').click();
  await interactionPage.waitForFunction(() => window.location.hash === "#experience");
  const registerResponse = await interactionPage.goto("http://localhost:3000/auth/register", { waitUntil: "networkidle" });
  if (registerResponse?.status() !== 200) throw new Error(`Registration CTA route returned ${registerResponse?.status()}`);
  const loginResponse = await interactionPage.goto("http://localhost:3000/auth/login", { waitUntil: "networkidle" });
  if (loginResponse?.status() !== 200) throw new Error(`Login route returned ${loginResponse?.status()}`);
  console.log("Mobile menu, section navigation, registration CTA, and login route confirmed.");
  await interactionPage.close();
} finally {
  await browser.close();
}
