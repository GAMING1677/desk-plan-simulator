import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
if (typeof HTMLDialogElement !== "undefined") {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value() {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value() {
      this.removeAttribute("open");
    },
  });

  // jsdom does not implement SVG coordinate conversion or pointer capture; browser tests cover the real APIs.
  Object.defineProperty(SVGSVGElement.prototype, "createSVGPoint", {
    configurable: true,
    value() {
      return {
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: this.x, y: this.y };
        },
      };
    },
  });
  Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value() {
      return {
        inverse() {
          return {};
        },
      };
    },
  });
  for (const name of ["setPointerCapture", "releasePointerCapture"])
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      value() {},
    });
  Object.defineProperty(Element.prototype, "hasPointerCapture", {
    configurable: true,
    value() {
      return true;
    },
  });
  if (typeof PointerEvent === "undefined") {
    class TestPointerEvent extends MouseEvent {
      readonly pointerId: number;
      readonly isPrimary: boolean;
      constructor(type: string, options: PointerEventInit = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
        this.isPrimary = options.isPrimary ?? true;
      }
    }
    Object.defineProperty(globalThis, "PointerEvent", {
      configurable: true,
      value: TestPointerEvent,
    });
  }
}
