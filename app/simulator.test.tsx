import { render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import Simulator from "./simulator";
vi.mock("@/components/front-scene", () => ({
  FrontScene: () => <text>Scene</text>,
}));
export const subject = "app/simulator.tsx";
spec(
  "ENTRY-01",
  "公開入口",
  "appのdefault exportを表示",
  "ブランド・3図・未選択案内が各1つ",
  () => {
    render(<Simulator />);
    expect(screen.getByText("DESK PLAN")).toBeInTheDocument();
    for (const name of ["上面図", "正面図", "側面図"])
      expect(screen.getByText(name)).toBeInTheDocument();
    expect(
      screen.getByText("図または一覧からオブジェクトを選択してください。"),
    ).toBeInTheDocument();
  },
);
