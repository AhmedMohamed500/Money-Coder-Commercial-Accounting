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
    { name: "desktop", width: 1440, height: 1000 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(output, `${viewport.name}-playwright.png`), fullPage: false });
    const metrics = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, dir: document.documentElement.dir }));
    if (metrics.scrollWidth > metrics.viewport) throw new Error(`${viewport.name} has horizontal overflow: ${metrics.scrollWidth}px > ${metrics.viewport}px`);
    if (metrics.dir !== "rtl") throw new Error(`${viewport.name} is not rendered in RTL mode`);
    console.log(`${viewport.name}: ${metrics.viewport}px, no horizontal overflow, RTL confirmed.`);
    await page.close();
  }
} finally {
  await browser.close();
}
