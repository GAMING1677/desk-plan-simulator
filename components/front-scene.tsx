import type { PointerEvent } from "react";
import { cm, itemDepth, monitorShape, worldPosition, type Desk, type Item } from "@/lib/desk-model";
import { clipFront, eyeDepth, projectFront, type Vertex } from "@/lib/front-projection";
type Handlers = { onPointerDown: (event: PointerEvent<SVGGElement>) => void; onPointerMove: (event: PointerEvent<SVGGElement>) => void; onPointerUp: () => void; onPointerCancel: () => void };
type Face = { points: Vertex[]; fill: string; stroke: string; item?: Item; label?: string; width?: number; height?: number };
export function FrontScene({ desk, items, zoom, selectedId, invalidItemId, measures, handlers }: { desk: Desk; items: Item[]; zoom: number; selectedId: string; invalidItemId: string | null; measures: boolean; handlers: (item: Item) => Handlers }) {
  const faces: Face[] = [];
  function cuboid(x: number, y: number, z: number, w: number, d: number, h: number, fill: string, stroke: string, item?: Item, label?: string) {
    const p = (a: number, b: number, c: number): Vertex => ({ x:a,y:b,z:c });
    const add = (points: Vertex[], front = false) => faces.push({ points, fill, stroke, item, label: front ? label : undefined, width: front && label ? item?.width : undefined, height: front && label ? item?.height : undefined });
    if (eyeDepth(desk) > y+d) add([p(x,y+d,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x,y+d,z+h)],true);
    if (desk.width/2 < x) add([p(x,y,z),p(x,y+d,z),p(x,y+d,z+h),p(x,y,z+h)]);
    if (desk.width/2 > x+w) add([p(x+w,y+d,z),p(x+w,y,z),p(x+w,y,z+h),p(x+w,y+d,z+h)]);
    if (z>0) add([p(x,y,z),p(x+w,y,z),p(x+w,y+d,z),p(x,y+d,z)]);
    if (z+h<0) add([p(x,y,z+h),p(x,y+d,z+h),p(x+w,y+d,z+h),p(x+w,y,z+h)]);
  }
  cuboid(0,0,-3.75,desk.width,desk.depth,3.75,"#b3c5cf","#7a92a1");
  for (const item of items) {
    const {x,y,z} = worldPosition(items,item);
    const fill = item.kind === "poster" ? "#e5c79d" : item.id === selectedId ? "#d7edf2" : item.supportId ? "#ebe8fa" : "#e2eaf0";
    const stroke = item.id === invalidItemId ? "#d5403b" : item.id === selectedId ? "#137e96" : "#8095a4";
    if (item.kind === "monitor") {
      const m=monitorShape(item);
      cuboid(x+(item.width-m.footWidth)/2,y+m.footStart,z,m.footWidth,m.footDepth,m.footHeight,"#8299a7",stroke,item);
      cuboid(x+(item.width-m.stemWidth)/2,y+m.stemY-m.stemDepth/2,z+m.footHeight,m.stemWidth,m.stemDepth,Math.max(0,m.screenBottom-m.footHeight),"#8299a7",stroke,item);
      cuboid(x,y+m.panelStart,z+m.screenBottom,item.width,m.panelDepth,item.height-m.screenBottom,"#193243",stroke,item,item.name);
    } else if (item.kind === "laptop") {
      cuboid(x,y,z,item.width,item.depth,item.height*.12,fill,stroke,item);
      cuboid(x+item.width*.05,y+item.depth*.08,z+item.height*.12,item.width*.9,Math.min(1.5,item.depth*.1),item.height*.88,"#314958",stroke,item,item.name);
    } else cuboid(x,y,z,item.width,itemDepth(item),item.height,fill,stroke,item,item.name);
  }
  const distance = (face: Face) => face.points.reduce((sum,p)=>sum+(p.x-desk.width/2)**2+(eyeDepth(desk)-p.y)**2+p.z**2,0)/face.points.length;
  faces.sort((a,b)=>distance(b)-distance(a));
  return <>{faces.map((face,index)=> {
    const clipped=clipFront(desk,face.points);
    if (clipped.length<3) return null;
    const points=clipped.map(p=>projectFront(desk,p,zoom));
    const x=points.reduce((sum,p)=>sum+p.x,0)/points.length, y=points.reduce((sum,p)=>sum+p.y,0)/points.length;
    const top=Math.min(...points.map(p=>p.y));
    return <g key={`${face.item?.id ?? "desk"}-${index}`} className={face.item ? "draggable" : undefined} {...(face.item ? handlers(face.item) : {})}>
      <polygon points={points.map(p=>`${p.x},${p.y}`).join(" ")} fill={face.fill} stroke={face.stroke} strokeWidth={face.item?.id===selectedId?2.5:1.5}/>
      {face.label && <text x={x} y={y} textAnchor="middle" className={face.item?.kind==="monitor"||face.item?.kind==="laptop"?"screen-label":"item-label"}>{face.label.replace("27インチ ","")}</text>}
      {measures && face.width && <text x={x} y={top-10} textAnchor="middle" className="object-dimension">{cm(face.width)} × {cm(face.height!)}</text>}
    </g>;
  })}</>;
}
