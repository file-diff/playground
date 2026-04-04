import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const baseUrl = process.env.GAME_URL || "http://127.0.0.1:8000";
const outputPath = path.resolve(
  process.env.GAME_PHOTO_PATH || "artifacts/snake-game-photo.png"
);

async function playGame(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const moves = ["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"];

  for (const move of moves) {
    await page.keyboard.press(move);
    await page.waitForTimeout(450);
  }
}

async function saveCapturedPhoto(page) {
  await page.getByRole("button", { name: "Take Photo" }).click();
  await page.locator("#photo-preview").waitFor({ state: "visible" });

  const bytes = await page.locator("#photo-preview").evaluate(async (image) => {
    const response = await fetch(image.src);
    const buffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(bytes));
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 520, height: 820 } });
  await playGame(page);
  await saveCapturedPhoto(page);
} finally {
  await browser.close();
}
