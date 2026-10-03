import { test, expect } from "@playwright/test";
import { box, stack } from "../fixtures";
import { add, layout, load, start } from "./helpers";
test("E2E-EDIT-01 4種類の追加・編集・削除・初期化", async ({ page }) => {
  await start(page);
  for (const [name, kind] of [
    ["Box", "box"],
    ["Monitor", "monitor"],
    ["Poster", "poster"],
    ["Laptop", "laptop"],
  ] as const)
    await add(page, name, kind);
  expect((await layout(page)).items.map((i) => i.kind)).toEqual([
    "box",
    "monitor",
    "poster",
    "laptop",
  ]);
  const inspector = page.locator(".inspector");
  await inspector.getByLabel("オブジェクト名").fill("Notebook");
  await inspector.getByLabel("オブジェクト名").press("Enter");
  await inspector.getByLabel("幅", { exact: true }).fill("28");
  await expect(page.locator(".item-row.active")).toContainText("Notebook");
  expect((await layout(page)).items.at(-1)?.width).toBe(28);
  await inspector
    .getByRole("button", { name: "このオブジェクトを削除" })
    .click();
  await expect(page.locator(".item-row")).toHaveCount(3);
  await page.getByRole("button", { name: "初期配置に戻す" }).click();
  await expect(page.locator(".item-row")).toHaveCount(0);
  expect((await layout(page)).desk.width).toBe(180);
});
test("E2E-EDIT-02 載せ先衝突の理由と配置保持", async ({ page }) => {
  await start(page);
  await load(page, [
    box("base"),
    box("existing", { supportId: "base" }),
    box("A", { x: 50 }),
  ]);
  await page.getByRole("button", { name: /^A / }).click();
  const before = await layout(page);
  await page.getByLabel("選択物の載せ先").selectOption("base");
  await expect(page.getByRole("alert")).toContainText("重なる");
  await expect(page.getByLabel("選択物の載せ先")).toHaveValue("desk");
  expect((await layout(page)).items).toEqual(before.items);
});
test("E2E-EDIT-03 台削除で世界位置保持、名前Escapeと机境界", async ({
  page,
}) => {
  await start(page);
  await load(page, stack());
  const before = await layout(page);
  await page.getByRole("button", { name: /^base / }).click();
  const input = page.getByLabel("オブジェクト名");
  await input.fill("temporary");
  await input.press("Escape");
  expect((await layout(page)).items[0].name).toBe("base");
  await page.getByRole("button", { name: "このオブジェクトを削除" }).click();
  const after = await layout(page);
  expect(after.items.map((i) => i.world)).toEqual(
    before.items.slice(1).map((i) => i.world),
  );
  expect(after.items[0].supportId).toBeNull();
  const width = page.getByLabel("机の幅");
  await width.fill("0");
  await width.press("Enter");
  await expect(page.getByLabel("机の幅")).toHaveValue("180");
});
