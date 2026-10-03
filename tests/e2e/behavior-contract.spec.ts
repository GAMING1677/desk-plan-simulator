import { test, expect } from "@playwright/test";
import { box, stack } from "../fixtures";
import { layout, load, start } from "./helpers";

test("E2E-SPEC-08 読込サイズ・件数・名前の上限", async ({ page }) => {
  await start(page);
  const items = Array.from({ length: 1000 }, (_, i) =>
    box(`item-${i}`, { x: (i % 100) * 11, y: Math.floor(i / 100) * 11 }),
  );
  const file = {
    format: "desk-plan-layout",
    version: 1,
    name: "a".repeat(120),
    desk: { width: 2000, depth: 200, height: 73 },
    items,
  };
  const input = page.getByLabel(".layout.jsonファイルを選択");
  await input.setInputFiles({
    name: "boundary.layout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.locator(".item-row")).toHaveCount(1000);
  expect((await layout(page)).items).toHaveLength(1000);
  await input.setInputFiles({
    name: "overflow.layout.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...file, items: [...items, box("extra", { x: 1100 })] }),
    ),
  });
  await expect(
    page.getByRole("button", { name: "読み込み失敗" }),
  ).toBeVisible();
  expect((await layout(page)).items).toHaveLength(1000);
  const minimal = Buffer.from(JSON.stringify({ ...file, items: [] }));
  const boundary = Buffer.concat([
    minimal,
    Buffer.alloc(5000000 - minimal.length, " "),
  ]);
  await input.setInputFiles({
    name: "size.layout.json",
    mimeType: "application/json",
    buffer: boundary,
  });
  await expect(
    page.getByRole("button", { name: "読み込みました" }),
  ).toBeVisible();
  expect((await layout(page)).items).toHaveLength(0);
  await input.setInputFiles({
    name: "size.layout.json",
    mimeType: "application/json",
    buffer: Buffer.concat([boundary, Buffer.from(" ")]),
  });
  await expect(
    page.getByRole("button", { name: "読み込み失敗" }),
  ).toHaveAttribute("title", "ファイルが大きすぎます。");
  expect((await layout(page)).items).toHaveLength(0);
});

test("E2E-SPEC-09 空の持ち物・PNG失敗後の回復", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "持ち物リストを書き出す" }).click();
  await expect(
    page.getByRole("button", { name: "クリップボードにコピー" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "閉じる" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "write", {
      configurable: true,
      value: async () => {
        throw Error("denied");
      },
    }),
  );
  await page.getByRole("button", { name: "FHDでコピー" }).click();
  await expect(page.getByRole("button", { name: "コピー失敗" })).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "write", {
      configurable: true,
      value: async (items: ClipboardItem[]) => {
        await items[0].getType("image/png");
      },
    }),
  );
  await page.getByRole("button", { name: "コピー失敗" }).click();
  await expect(
    page.getByRole("button", { name: "コピーしました" }),
  ).toBeVisible();
});

test("E2E-SPEC-10 登録失敗でも起動しUI編集できる", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.assign(document, {
      modelContext: {
        registerTool() {
          throw Error("registration denied");
        },
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "机上レイアウト", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "オブジェクトを追加" }).click();
  await page
    .locator(".add-panel")
    .getByRole("button", { name: "ここに置く" })
    .click();
  await expect(page.locator(".item-row")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("E2E-SPEC-01 入力の確定・取消・境界・エラー回復", async ({ page }) => {
  await start(page);
  await load(page, [box("Book")]);
  const width = page.getByLabel("机の幅");
  await width.fill("200");
  await width.press("Escape");
  expect((await layout(page)).desk.width).toBe(180);
  await width.fill("10000");
  await width.press("Enter");
  expect((await layout(page)).desk.width).toBe(10000);
  for (const value of ["0", "-1", "10001"]) {
    await width.fill(value);
    await width.press("Enter");
    expect((await layout(page)).desk.width).toBe(10000);
  }
  await width.fill("180");
  await width.press("Tab");
  expect((await layout(page)).desk.width).toBe(180);
  const name = page.getByLabel("オブジェクト名");
  await name.fill("  Updated  ");
  await name.press("Enter");
  await expect(page.locator(".item-row.active")).toContainText("Updated");
  await name.fill("   ");
  await name.press("Tab");
  expect((await layout(page)).items[0].name).toBe("Updated");
  const size = page.locator(".inspector").getByLabel("幅", { exact: true });
  await size.fill("0");
  await expect(page.getByRole("alert")).toBeVisible();
  expect((await layout(page)).items[0].width).toBe(10);
  await size.fill("12");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect((await layout(page)).items[0].width).toBe(12);
});

test("E2E-SPEC-02 追加不可・定型・ポスターの切替", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "オブジェクトを追加" }).click();
  const form = page.locator(".add-panel");
  const submit = form.getByRole("button", { name: "ここに置く" });
  await form.getByLabel("名前", { exact: true }).fill(" ");
  await expect(submit).toBeDisabled();
  await form.getByLabel("名前", { exact: true }).fill("New");
  await form.getByLabel("幅", { exact: true }).fill("0");
  await expect(submit).toBeDisabled();
  const preset = form.getByLabel("定型サイズ");
  await preset.selectOption("A4-portrait");
  await expect(form.getByLabel("見た目")).toHaveValue("poster");
  await expect(form.getByLabel("奥行き", { exact: true })).toHaveCount(0);
  const before = [
    await form.getByLabel("幅", { exact: true }).inputValue(),
    await form.getByLabel("高さ", { exact: true }).inputValue(),
  ];
  await form.getByRole("button", { name: "縦横を入れ替え" }).click();
  expect([
    await form.getByLabel("幅", { exact: true }).inputValue(),
    await form.getByLabel("高さ", { exact: true }).inputValue(),
  ]).toEqual(before.reverse());
  await form.getByLabel("幅", { exact: true }).fill("25");
  await expect(preset).toHaveValue("custom");
  await form.getByLabel("見た目").selectOption("box");
  await expect(form.getByLabel("奥行き", { exact: true })).toBeVisible();
  expect(
    Number(await form.getByLabel("奥行き", { exact: true }).inputValue()),
  ).toBeGreaterThan(0.5);
  await submit.click();
  await expect(form).toHaveCount(0);
  await expect(page.locator(".item-row.active")).toContainText("A4");
});

test("E2E-SPEC-03 載せ先候補・解除・最後の物の削除", async ({ page }) => {
  await start(page);
  await load(page, [
    ...stack(),
    box("poster", { kind: "poster", depth: 0.5, x: 100 }),
  ]);
  const support = page.getByLabel("選択物の載せ先");
  expect(
    await support
      .locator("option")
      .evaluateAll((options) =>
        options.map((o) => (o as HTMLOptionElement).value),
      ),
  ).toEqual(["desk"]);
  await page.getByRole("button", { name: /^child / }).click();
  expect(
    await support
      .locator("option")
      .evaluateAll((options) =>
        options.map((o) => (o as HTMLOptionElement).value),
      ),
  ).toEqual(["desk", "base"]);
  const before = (await layout(page)).items.find(
    (i) => i.id === "child",
  )!.world;
  await support.selectOption("desk");
  expect(
    (await layout(page)).items.find((i) => i.id === "child"),
  ).toMatchObject({ supportId: null, world: before });
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "このオブジェクトを削除" }).click();
  await expect(page.locator(".item-row")).toHaveCount(0);
  await expect(page.locator(".inspector .empty-state")).toBeVisible();
});

test("E2E-SPEC-04 外部操作の最新状態・世界座標・不正入力の保持", async ({
  page,
}) => {
  await start(page);
  await load(page, stack());
  await page.evaluate(() =>
    window.__deskTools.move_desk_object.execute({ id: "child", x: 24, y: 20 }),
  );
  const moved = (await layout(page)).items.find((i) => i.id === "child")!;
  expect(moved).toMatchObject({ x: 4, y: 5, world: { x: 24, y: 20, z: 10 } });
  await expect(page.locator(".item-row.active")).toContainText("child");
  const before = await layout(page);
  for (const supportId of ["", "missing", "child", "grandchild", 123]) {
    const error = await page.evaluate(async (value) => {
      try {
        await window.__deskTools.place_desk_object_on.execute({
          id: "child",
          supportId: value,
        });
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    }, supportId);
    expect(error.length).toBeGreaterThan(0);
    expect(await layout(page)).toEqual(before);
    await expect(page.locator(".item-row.active")).toContainText("child");
  }
  for (const input of [
    null,
    [],
    "bad",
    { id: "missing", x: 0, y: 0 },
    { id: "child", x: "0", y: 0 },
  ]) {
    const rejected = await page.evaluate(async (value) => {
      try {
        await window.__deskTools.move_desk_object.execute(value);
        return false;
      } catch {
        return true;
      }
    }, input);
    expect(rejected).toBe(true);
    expect(await layout(page)).toEqual(before);
  }
});

test("E2E-SPEC-05 衝突・面接触・はみ出しの境界", async ({ page }) => {
  await start(page);
  await load(page, [box("A"), box("B", { x: 30 })]);
  await page.evaluate(() =>
    window.__deskTools.move_desk_object.execute({ id: "B", x: 10, y: 0 }),
  );
  expect((await layout(page)).items[1].x).toBe(10);
  const before = await layout(page);
  const rejected = await page.evaluate(async () => {
    try {
      await window.__deskTools.move_desk_object.execute({
        id: "B",
        x: 9.9,
        y: 0,
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(rejected).toBe(true);
  expect(await layout(page)).toEqual(before);
  await page.evaluate(() =>
    window.__deskTools.move_desk_object.execute({ id: "B", x: 179.9, y: 0 }),
  );
  expect((await layout(page)).items[1].x).toBe(179.9);
  const detached = await page.evaluate(async () => {
    try {
      await window.__deskTools.move_desk_object.execute({
        id: "B",
        x: 180,
        y: 0,
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(detached).toBe(true);
});

for (const [name, change] of [
  ["非対応バージョン", { version: 2 }],
  ["名前上限超過", { name: "a".repeat(121) }],
  ["ID重複", { items: [box("A"), box("A", { x: 30 })] }],
  ["載せ先欠落", { items: [box("A", { supportId: "missing" })] }],
  [
    "載せ先循環",
    { items: [box("A", { supportId: "B" }), box("B", { supportId: "A" })] },
  ],
  ["衝突", { items: [box("A"), box("B")] }],
  ["机上限超過", { desk: { width: 10001, depth: 50, height: 73 } }],
] as const) {
  test(`E2E-SPEC-FILE ${name}を拒否して回復する`, async ({ page }) => {
    await start(page);
    await load(page, [box("Original")]);
    const before = await layout(page);
    await page.getByLabel(".layout.jsonファイルを選択").setInputFiles({
      name: "bad.layout.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "desk-plan-layout",
          version: 1,
          desk: before.desk,
          items: [box()],
          ...(change as Record<string, unknown>),
        }),
      ),
    });
    await expect(
      page.getByRole("button", { name: "読み込み失敗" }),
    ).toBeVisible();
    expect(await layout(page)).toEqual(before);
    await load(page, [box("Recovered")]);
    await expect(page.locator(".item-row.active")).toContainText("Recovered");
  });
}

test("E2E-SPEC-06 WebGL非対応でも他の操作が動く", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await start(page);
  await expect(page.getByText(/3D表示を開始できません/)).toBeVisible();
  await load(page, [box("Book")]);
  await expect(page.locator(".item-row")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("E2E-SPEC-07 保存取消・拒否・再試行・変更後の保存状態", async ({
  page,
}) => {
  await start(page);
  await load(page, [box("Book")]);
  await page.getByRole("button", { name: "配置を保存" }).click();
  const panel = page.getByRole("dialog", { name: "配置を保存" });
  for (const error of ["AbortError", "NotAllowedError"]) {
    await page.evaluate((name) => {
      Object.defineProperty(window, "showSaveFilePicker", {
        configurable: true,
        value: async () => {
          throw new DOMException("test", name);
        },
      });
    }, error);
    await panel.getByRole("button", { name: "保存先を選ぶ" }).click();
    await expect(
      panel.getByRole("button", { name: "保存先を選ぶ" }),
    ).toBeEnabled();
    if (error === "AbortError") await expect(panel).not.toHaveClass(/invalid/);
    else await expect(panel).toHaveClass(/invalid/);
  }
  await page.getByLabel("レイアウト名").fill("Recovered");
  const download = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: "ダウンロード", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("Recovered.layout.json");
  await expect(
    page.getByRole("button", { name: "保存しました" }),
  ).toBeVisible();
  await page.getByLabel("オブジェクト名").fill("Changed");
  await page.getByLabel("オブジェクト名").press("Enter");
  await expect(page.getByRole("button", { name: "配置を保存" })).toBeVisible();
});
