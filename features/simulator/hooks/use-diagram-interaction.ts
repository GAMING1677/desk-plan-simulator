import { useRef, useState, type PointerEvent } from "react";
import {
  itemDepth,
  rounded,
  updateItem,
  worldPosition,
  type Item,
} from "@/lib/desk-model";
import { projectFront, unprojectFront } from "@/lib/front-projection";
import type { DragState, View } from "../types";
import { DIAGRAM_SCALE } from "../constants";
import type { LayoutEditor } from "./use-layout-editor";
export function useDiagramInteraction(
  editor: Pick<
    LayoutEditor,
    | "setSelectedId"
    | "setInvalidItemId"
    | "deskRef"
    | "itemsRef"
    | "applyCandidate"
  >,
) {
  const { setSelectedId, setInvalidItemId, deskRef, itemsRef, applyCandidate } =
    editor;
  const [frontZoom, setFrontZoom] = useState(100);
  const [frontOffset, setFrontOffset] = useState({ x: 0, y: 0 });
  const [frontPanning, setFrontPanning] = useState(false);
  const frontPan = useRef<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const dragging = useRef<DragState | null>(null);
  function point(
    event: PointerEvent<SVGGElement | SVGSVGElement | HTMLCanvasElement>,
  ) {
    const svg =
      event.currentTarget instanceof SVGSVGElement
        ? event.currentTarget
        : event.currentTarget instanceof HTMLCanvasElement
          ? event.currentTarget.closest("svg")!
          : event.currentTarget.ownerSVGElement!;
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM()!.inverse());
  }
  function beginFrontPan(event: PointerEvent<SVGSVGElement>) {
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      (event.target as Element).closest(".draggable")
    )
      return;
    const p = point(event);
    frontPan.current = {
      pointerId: event.pointerId,
      x: p.x,
      y: p.y,
      offsetX: frontOffset.x,
      offsetY: frontOffset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setFrontPanning(true);
  }
  function moveFrontPan(event: PointerEvent<SVGSVGElement>) {
    const pan = frontPan.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const p = point(event);
    setFrontOffset({
      x: pan.offsetX + p.x - pan.x,
      y: pan.offsetY + p.y - pan.y,
    });
  }
  function endFrontPan(event: PointerEvent<SVGSVGElement>) {
    if (frontPan.current?.pointerId !== event.pointerId) return;
    frontPan.current = null;
    setFrontPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function beginDrag(
    event: PointerEvent<SVGGElement | HTMLCanvasElement>,
    item: Item,
    view: View,
  ) {
    const p = point(event);
    dragging.current = {
      id: item.id,
      view,
      pointerX: p.x,
      pointerY: p.y,
      itemX: item.x,
      itemY: item.y,
      itemZ: item.z,
      linked: Boolean(item.supportId),
    };
    setSelectedId(item.id);
    setInvalidItemId(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<SVGGElement | HTMLCanvasElement>) {
    const active = dragging.current;
    if (!active) return;
    const p = point(event);
    const dx = (p.x - active.pointerX) / DIAGRAM_SCALE;
    const dy = (p.y - active.pointerY) / DIAGRAM_SCALE;
    let change: Partial<Item>;
    const draggedItem = itemsRef.current.find((item) => item.id === active.id);
    if (active.view === "front" && draggedItem) {
      const world = worldPosition(itemsRef.current, draggedItem);
      const origin = {
        x: world.x + active.itemX - draggedItem.x,
        y: world.y + itemDepth(draggedItem),
        z: world.z + active.itemZ - draggedItem.z,
      };
      const start = projectFront(deskRef.current, origin, frontZoom);
      const next = unprojectFront(
        deskRef.current,
        {
          x: start.x + p.x - active.pointerX,
          y: start.y + p.y - active.pointerY,
        },
        origin.y,
        frontZoom,
      );
      change = {
        x: rounded(active.itemX + next.x - origin.x),
        ...(active.linked
          ? {}
          : { z: rounded(Math.max(0, active.itemZ + next.z - origin.z)) }),
      };
    } else {
      change =
        active.view === "side"
          ? {
              y: rounded(active.itemY + dx),
              ...(active.linked
                ? {}
                : { z: rounded(Math.max(0, active.itemZ - dy)) }),
            }
          : { x: rounded(active.itemX + dx), y: rounded(active.itemY + dy) };
    }
    applyCandidate(
      updateItem(itemsRef.current, active.id, change, deskRef.current),
      active.id,
    );
  }
  function dragHandlers(item: Item, view: View) {
    return {
      onPointerDown: (event: PointerEvent<SVGGElement | HTMLCanvasElement>) =>
        beginDrag(event, item, view),
      onPointerMove: moveDrag,
      onPointerUp: () => {
        dragging.current = null;
      },
      onPointerCancel: () => {
        dragging.current = null;
      },
    };
  }
  return {
    frontZoom,
    setFrontZoom,
    frontOffset,
    setFrontOffset,
    frontPanning,
    setFrontPanning,
    frontPan,
    dragging,
    point,
    beginFrontPan,
    moveFrontPan,
    endFrontPan,
    beginDrag,
    moveDrag,
    dragHandlers,
  };
}
