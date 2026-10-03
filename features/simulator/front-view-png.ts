import { FRONT_WIDTH, FRONT_HEIGHT } from "@/lib/front-projection";
import { FHD_WIDTH, FHD_HEIGHT } from "./constants";
export function frontViewPng(source: SVGSVGElement): Promise<Blob> {
  const svg = source.cloneNode(true) as SVGSVGElement;
  const renderedCanvas = source.querySelector("canvas");
  const foreignObject = svg.querySelector("foreignObject");
  if (renderedCanvas && foreignObject) {
    const raster = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "image",
    );
    raster.setAttribute("x", "0");
    raster.setAttribute("y", "0");
    raster.setAttribute("width", String(FRONT_WIDTH));
    raster.setAttribute("height", String(FRONT_HEIGHT));
    raster.setAttribute("href", renderedCanvas.toDataURL("image/png"));
    foreignObject.replaceWith(raster);
  }
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(FHD_WIDTH));
  svg.setAttribute("height", String(FHD_HEIGHT));
  const styles = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "style",
  );
  styles.textContent = `svg{font-family:Arial,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif}
    .measure-line{stroke:#7b9cad;stroke-width:1}.desk-dimension{fill:#376473;font-size:13px;font-weight:700}
    .object-dimension{fill:#147d95;font-size:12px;font-weight:700;paint-order:stroke;stroke:white;stroke-width:3px}
    .item-label{fill:#284f5e;font-size:13px;font-weight:700}.screen-label{fill:#d4e5ea;font-size:12px}`;
  svg.insertBefore(styles, svg.firstChild);
  const svgUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(svgUrl);
      const canvas = document.createElement("canvas");
      canvas.width = FHD_WIDTH;
      canvas.height = FHD_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("画像を作成できません。"));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, FHD_WIDTH, FHD_HEIGHT);
      context.drawImage(image, 0, 0, FHD_WIDTH, FHD_HEIGHT);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("画像を作成できません。")),
        "image/png",
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("正面図を読み込めません。"));
    };
    image.src = svgUrl;
  });
}
