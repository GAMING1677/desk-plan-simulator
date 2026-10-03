import { test, expect } from "@playwright/test";
import { box } from "../fixtures";
import { layout, load, start } from "./helpers";
import { projectFront } from "../../lib/front-projection";
test("E2E-DIAGRAM-01 上面の実SVG変換とcapture", async ({ page }) => {
  await start(page);
  await load(page, [box("A", { x: 20, y: 15 })]);
  const group = page.locator(
    'svg[aria-label="机とオブジェクトの上面図"] g.draggable',
  );
  const coordinates = await group.evaluate((g) => {
    const svg = (g as SVGElement).ownerSVGElement!,
      matrix = svg.getScreenCTM()!,
      p = new DOMPoint(96 + 25 * 4, 72 + 20 * 4).matrixTransform(matrix),
      next = new DOMPoint(96 + 35 * 4, 72 + 25 * 4).matrixTransform(matrix);
    return { x: p.x, y: p.y, nx: next.x, ny: next.y };
  });
  await page.mouse.move(coordinates.x, coordinates.y);
  await page.mouse.down();
  await page.mouse.move(coordinates.nx, coordinates.ny, { steps: 5 });
  await page.mouse.up();
  expect((await layout(page)).items[0]).toMatchObject({ x: 30, y: 20 });
  await page.mouse.move(coordinates.nx + 100, coordinates.ny + 100);
  expect((await layout(page)).items[0]).toMatchObject({ x: 30, y: 20 });
});
test("E2E-DIAGRAM-02 正面のraycastと物のドラッグ", async ({ page }) => {
  await start(page);
  await load(page, [
    box("A", { x: 60, y: 20, width: 30, depth: 20, height: 30 }),
    box("B", { x: 110, y: 10 }),
  ]);
  await page.locator(".item-row").filter({ hasText: "B" }).click();
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const projected = projectFront(
    { width: 180, depth: 50, height: 73 },
    { x: 75, y: 40, z: 15 },
    100,
  );
  const point = await canvas.evaluate((c, p) => {
    const rect = c.getBoundingClientRect();
    return {
      x: rect.left + (p.x / 1600) * rect.width,
      y: rect.top + (p.y / 900) * rect.height,
    };
  }, projected);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await expect(page.locator(".item-row.active")).toContainText("A");
  await page.mouse.move(point.x + 15, point.y - 8, { steps: 4 });
  await page.mouse.up();
  const item = (await layout(page)).items[0];
  expect(item.x).not.toBe(60);
  expect(item.y).toBe(20);
  expect(item.z).toBeGreaterThan(0);
});
test("E2E-DIAGRAM-03 パン・全体表示・寸法切替", async ({ page }) => {
  await start(page);
  await load(page, [box()]);
  const svg = page.locator(".front-pannable");
  await svg.scrollIntoViewIfNeeded();
  const rect = await svg.boundingBox();
  await page.mouse.move(rect!.x + 10, rect!.y + 10);
  await page.mouse.down();
  await page.mouse.move(rect!.x + 40, rect!.y + 30);
  await expect(svg).toHaveClass(/is-panning/);
  await page.mouse.up();
  await expect(svg).not.toHaveClass(/is-panning/);
  await page.getByRole("slider").fill("150");
  await expect(page.getByRole("slider")).toHaveValue("150");
  await page.getByRole("button", { name: "全体を表示" }).click();
  await expect(page.getByRole("slider")).not.toHaveValue("150");
  await page.getByRole("checkbox", { name: "寸法を表示" }).uncheck();
  await expect(page.locator(".object-dimension,.desk-dimension")).toHaveCount(
    0,
  );
});
