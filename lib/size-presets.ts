import { POSTER_PANEL_DEPTH, rounded, type Item } from "./desk-model";

export type SizePreset = {
  id: string;
  label: string;
  name: string;
  category: "paper-a" | "paper-b" | "monitor" | "laptop";
  kind: Item["kind"];
  width: number;
  depth: number;
  height: number;
};

const paperSizes = [
  ["A5", 14.8, 21],
  ["A4", 21, 29.7],
  ["A3", 29.7, 42],
  ["A2", 42, 59.4],
  ["A1", 59.4, 84.1],
  ["A0", 84.1, 118.9],
  ["B5", 18.2, 25.7],
  ["B4", 25.7, 36.4],
  ["B3", 36.4, 51.5],
  ["B2", 51.5, 72.8],
  ["B1", 72.8, 103],
  ["B0", 103, 145.6],
] as const;

const paperPresets: SizePreset[] = paperSizes.map(([size, short, long]) => ({
  id: `${size}-portrait`,
  label: `${size} · 幅 ${short} × 高さ ${long} cm`,
  name: `${size} ポスター・コルクボード`,
  category: size.startsWith("A") ? "paper-a" : "paper-b",
  kind: "poster",
  width: short,
  depth: POSTER_PANEL_DEPTH,
  height: long,
}));

const monitorPresets: SizePreset[] = [18.5, 19, 21.5, 22, 23.8, 24, 25, 27, 28, 31.5, 32, 40, 43].map((inches) => {
  const diagonal = inches * 2.54;
  const screenWidth = rounded(diagonal * 16 / Math.sqrt(16 ** 2 + 9 ** 2));
  const screenHeight = diagonal * 9 / Math.sqrt(16 ** 2 + 9 ** 2);
  return {
    id: `monitor-${inches}`,
    label: `${inches}インチ · 幅 ${screenWidth} × 高さ ${rounded(screenHeight / 0.78)} cm`,
    name: `${inches}インチ モニター`,
    category: "monitor",
    kind: "monitor",
    width: screenWidth,
    depth: 20,
    height: rounded(screenHeight / 0.78),
  };
});

// Representative chassis footprints and open heights; actual models vary.
const laptopPresets: SizePreset[] = [
  [11.6, 28, 19.5, 19],
  [13.3, 30.5, 21.5, 21],
  [14, 32, 22.5, 22],
  [15.6, 36, 25, 24],
  [16, 36, 25, 25],
  [17.3, 40, 28, 27],
].map(([inches, width, depth, height]) => ({
  id: `laptop-${inches}`,
  label: `${inches}インチ · ${width} × ${depth} × ${height} cm（目安）`,
  name: `${inches}インチ ノートPC`,
  category: "laptop",
  kind: "laptop",
  width,
  depth,
  height,
}));

export const SIZE_PRESETS: SizePreset[] = [...paperPresets, ...monitorPresets, ...laptopPresets];
