import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import { Harness } from "@/tests/controller-fixture";
import { DiagramWorkspace } from "./DiagramWorkspace";
vi.mock("@/components/front-scene", () => ({
  FrontScene: () => <text>Scene</text>,
}));
export const subject = "features/simulator/components/DiagramWorkspace.tsx";
spec(
  "VIEWS-01",
  "三面図と寸法切替",
  "図を表示して寸法チェックを解除",
  "上面・正面・側面が1つずつ、寸法ラベルを全て消す",
  () => {
    const { container } = render(
      <Harness Component={DiagramWorkspace} items={[box()]} />,
    );
    for (const name of ["上面図", "正面図", "側面図"])
      expect(screen.getByText(name)).toBeInTheDocument();
    expect(
      container.querySelectorAll(".object-dimension").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("checkbox", { name: "寸法を表示" }));
    expect(
      container.querySelectorAll(".object-dimension,.desk-dimension"),
    ).toHaveLength(0);
  },
);
