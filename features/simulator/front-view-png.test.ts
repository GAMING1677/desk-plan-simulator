import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { frontViewPng } from "./front-view-png";
export const subject = "features/simulator/front-view-png.ts";
function setup(mode: "ok" | "load" | "context" | "blob" = "ok") {
  let image: { onload: () => void; onerror: () => void } | undefined;
  const create = vi.fn().mockReturnValue("blob:svg"),
    revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  vi.stubGlobal(
    "Image",
    class {
      onload!: () => void;
      onerror!: () => void;
      constructor() {
        image = this;
      }
      set src(_: string) {
        queueMicrotask(() =>
          mode === "load" ? this.onerror() : this.onload(),
        );
      }
    },
  );
  const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mode === "context"
      ? null
      : (context as unknown as CanvasRenderingContext2D),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,AA==",
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) =>
    cb(mode === "blob" ? null : new Blob(["png"], { type: "image/png" })),
  );
  return { create, revoke, context };
}
function svg(withCanvas = false) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  if (withCanvas) {
    const foreign = document.createElementNS(
      node.namespaceURI,
      "foreignObject",
    );
    foreign.appendChild(document.createElement("canvas"));
    node.appendChild(foreign);
  }
  return node;
}
spec(
  "PNG-01",
  "FHD生成と原本保持",
  "canvasを含むSVGをPNGへ変換",
  "image/png、1920×1080白背景、原本DOM不変、URL解放",
  async () => {
    const mocks = setup(),
      source = svg(true),
      before = source.outerHTML;
    const result = await frontViewPng(source);
    expect(result.type).toBe("image/png");
    expect(source.outerHTML).toBe(before);
    expect(mocks.context.fillStyle).toBe("#ffffff");
    expect(mocks.context.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    const canvas = mocks.context.drawImage.mock.calls[0][0];
    expect(canvas).toBeDefined();
    expect(mocks.revoke).toHaveBeenCalledExactlyOnceWith("blob:svg");
  },
);
spec(
  "PNG-02",
  "canvasなし",
  "通常のSVGを変換",
  "PNGを返しObject URLを解放",
  async () => {
    const mocks = setup();
    expect((await frontViewPng(svg())).type).toBe("image/png");
    expect(mocks.revoke).toHaveBeenCalledTimes(1);
  },
);
spec(
  "PNG-03",
  "読込と生成失敗",
  "画像読込・contextなし・toBlob失敗",
  "Promiseをreject、各経路でURL解放",
  async () => {
    for (const mode of ["load", "context", "blob"] as const) {
      const mocks = setup(mode);
      await expect(frontViewPng(svg())).rejects.toThrow();
      expect(mocks.revoke).toHaveBeenCalledTimes(1);
      vi.restoreAllMocks();
    }
  },
);
