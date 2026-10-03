import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { box } from "../fixtures";
import { layout, load, start } from "./helpers";
test("E2E-FILE-01 保存と再読込、同一ファイル再選択", async ({ page }) => {
  await start(page);
  await load(page, [box("Book")]);
  const before = await layout(page);
  await page.getByRole("button", { name: "配置を保存" }).click();
  await page.getByLabel("レイアウト名").fill("Room");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "ダウンロード", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("Room.layout.json");
  const bytes = await readFile((await download.path())!);
  const file = JSON.parse(bytes.toString());
  expect(file.items).toEqual(before.items.map(({ world, ...item }) => item));
  await page.getByRole("button", { name: "初期配置に戻す" }).click();
  for (let i = 0; i < 2; i++) {
    await page
      .getByLabel(".layout.jsonファイルを選択")
      .setInputFiles({
        name: "Room.layout.json",
        mimeType: "application/json",
        buffer: bytes,
      });
    await expect(page.locator(".item-row")).toHaveCount(1);
    expect((await layout(page)).items).toEqual(before.items);
  }
});
test("E2E-FILE-02 不正ファイル後も配置を保つ", async ({ page }) => {
  await start(page);
  await load(page, [box("Book")]);
  const before = await layout(page);
  await page
    .getByLabel(".layout.jsonファイルを選択")
    .setInputFiles({
      name: "bad.layout.json",
      mimeType: "application/json",
      buffer: Buffer.from("{"),
    });
  await expect(
    page.getByRole("button", { name: "読み込み失敗" }),
  ).toBeVisible();
  expect(await layout(page)).toEqual(before);
});
test("E2E-FILE-03 持ち物コピーと失敗表示", async ({ page }) => {
  await start(page);
  await load(page, [box("本*"), box("B", { x: 30 })]);
  await page.getByRole("button", { name: "持ち物リストを書き出す" }).click();
  await page.getByRole("button", { name: "クリップボードにコピー" }).click();
  await expect(page.getByRole("status")).toHaveText("コピーしました");
  expect(
    (await page.evaluate(() => navigator.clipboard.readText())).replace(
      /\r\n/g,
      "\n",
    ),
  ).toBe("1. 本\\*\n2. B");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: async () => {
        throw Error("denied");
      },
    });
  });
  await page.getByRole("button", { name: "クリップボードにコピー" }).click();
  await expect(page.getByRole("status")).toContainText(
    "コピーできませんでした",
  );
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("E2E-FILE-04 実WebGLのFHD PNGコピー", async ({ page }) => {
  await start(page);
  await load(page, [box("Book")]);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "write", {
      configurable: true,
      value: async (items: ClipboardItem[]) => {
        const blob = await items[0].getType("image/png");
        const bitmap = await createImageBitmap(blob);
        window.__copiedImage = {
          type: blob.type,
          width: bitmap.width,
          height: bitmap.height,
        };
        bitmap.close();
      },
    });
  });
  await page.getByRole("button", { name: "FHDでコピー" }).click();
  await expect(
    page.getByRole("button", { name: "コピーしました" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__copiedImage)).toEqual({
    type: "image/png",
    width: 1920,
    height: 1080,
  });
});
