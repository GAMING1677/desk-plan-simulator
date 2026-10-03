import { test, expect } from "@playwright/test";
import { start } from "./helpers";
test("E2E-BOOT-01 公開入口と実WebGLで起動する", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(page.locator(".item-row")).toHaveCount(0);
  for (const name of ["上面図", "正面図", "側面図"])
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page
      .locator("canvas")
      .evaluate((canvas) =>
        Boolean((canvas as HTMLCanvasElement).getContext("webgl2")),
      ),
  ).toBe(true);
  await expect(page.getByText(/3D表示を開始できません/)).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".item-row")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("E2E-BOOT-02 メタ情報と成果物が初期状態に一致する", async ({
  page,
  request,
}) => {
  await start(page);
  await expect(page).toHaveTitle("机上レイアウトシミュレータ");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("#root")).toHaveCount(1);
  const description = await page
    .locator('meta[property="og:description"]')
    .getAttribute("content");
  expect(description).not.toContain("モニター２台");
  expect((await request.get("/favicon.svg")).ok()).toBe(true);
  expect((await request.get("/og-default-layout.png")).ok()).toBe(true);
});
