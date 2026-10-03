import { test, expect } from "@playwright/test";
import { box, stack } from "../fixtures";
import { load, start } from "./helpers";
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
] as const) {
  test(`E2E-VISUAL-${name} 表示・操作到達・画像比較`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await start(page);
    await expect.soft(page).toHaveScreenshot(`${name}-empty.png`, {
      fullPage: true,
    });
    await load(page, [
      ...stack(),
      box("Monitor", {
        kind: "monitor",
        x: 80,
        width: 30,
        depth: 20,
        height: 30,
      }),
      box("Poster", { kind: "poster", x: 120, depth: 0.5, height: 40 }),
      box("Laptop", {
        kind: "laptop",
        x: 145,
        width: 30,
        depth: 20,
        height: 20,
      }),
    ]);
    await expect.soft(page).toHaveScreenshot(`${name}-objects.png`, {
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "配置を保存" }).click();
    await expect(page.getByLabel("レイアウト名")).toBeFocused();
    await expect.soft(page).toHaveScreenshot(`${name}-save-panel.png`, {
      fullPage: true,
    });
    await page.getByRole("button", { name: "キャンセル" }).click();
    await page.getByRole("button", { name: "持ち物リストを書き出す" }).click();
    await expect(
      page.getByRole("dialog", { name: "持ち物を書き出す" }),
    ).toBeVisible();
    await expect.soft(page).toHaveScreenshot(`${name}-inventory.png`, {
      fullPage: true,
    });
    await page.getByRole("button", { name: "閉じる" }).click();
  });
}
