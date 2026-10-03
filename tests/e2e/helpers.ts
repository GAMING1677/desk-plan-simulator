import { expect, type Page } from "@playwright/test";
import type { Item, Desk } from "@/lib/desk-model";
import { DEFAULT_DESK } from "@/lib/desk-model";
import type { BrowserTool } from "@/features/simulator/types";
declare global {
  interface Window {
    __deskTools: Record<string, BrowserTool>;
    __copiedImage?: { type: string; width: number; height: number };
  }
}
export async function start(page: Page) {
  await page.addInitScript(() => {
    window.__deskTools = {};
    Object.assign(document, {
      modelContext: {
        registerTool(tool: BrowserTool, { signal }: { signal: AbortSignal }) {
          window.__deskTools[tool.name] = tool;
          signal.addEventListener("abort", () => {
            if (window.__deskTools[tool.name] === tool)
              delete window.__deskTools[tool.name];
          });
        },
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "机上レイアウト", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Object.keys(window.__deskTools).length))
    .toBe(4);
}
export async function layout(page: Page) {
  return page.evaluate(() =>
    window.__deskTools.read_desk_layout.execute({}),
  ) as Promise<{
    desk: Desk;
    items: (Item & { world: { x: number; y: number; z: number } })[];
  }>;
}
export async function load(page: Page, items: Item[], desk = DEFAULT_DESK) {
  await page
    .getByLabel(".layout.jsonファイルを選択")
    .setInputFiles({
      name: "fixture.layout.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "desk-plan-layout",
          version: 1,
          desk,
          items,
          name: "Fixture",
        }),
      ),
    });
  await expect(
    page.getByRole("button", { name: "読み込みました" }),
  ).toBeVisible();
}
export async function add(
  page: Page,
  name: string,
  kind: Item["kind"] = "box",
) {
  await page.getByRole("button", { name: "オブジェクトを追加" }).click();
  const form = page.locator(".add-panel");
  await form.getByRole("combobox", { name: /見た目/ }).selectOption(kind);
  await form.getByLabel("名前", { exact: true }).fill(name);
  await form.getByRole("button", { name: "ここに置く" }).click();
  await expect(page.locator(".item-row.active")).toContainText(name);
}
