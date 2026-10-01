import { useEffect, useRef, useState, type PointerEvent } from "react";
import { BoxGeometry, DirectionalLight, EdgesGeometry, HemisphereLight, LineBasicMaterial, LineSegments, Mesh, MeshLambertMaterial, Raycaster, Scene, Vector2, WebGLRenderer } from "three";
import { cm, itemDepth, monitorShape, worldPosition, type Desk, type Item } from "@/lib/desk-model";
import { createFrontCamera, FRONT_HEIGHT, FRONT_WIDTH, projectFront } from "@/lib/front-projection";
type DragElement = SVGGElement | HTMLCanvasElement;
type Handlers = { onPointerDown: (event: PointerEvent<DragElement>) => void; onPointerMove: (event: PointerEvent<DragElement>) => void; onPointerUp: () => void; onPointerCancel: () => void };
export function FrontScene({ desk, items, zoom, offset, selectedId, invalidItemId, measures, handlers }: { desk: Desk; items: Item[]; zoom: number; offset: { x:number; y:number }; selectedId: string; invalidItemId: string | null; measures: boolean; handlers: (item: Item) => Handlers }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef(createFrontCamera(desk,zoom,offset));
  const activeItem = useRef<Item | null>(null);
  const [error,setError] = useState(false);
  useEffect(() => {
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas:canvasRef.current!, antialias:true, alpha:true, preserveDrawingBuffer:true });
    } catch { setError(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(FRONT_WIDTH,FRONT_HEIGHT,false);
    renderer.setClearColor(0xffffff,0);
    rendererRef.current=renderer;
    return () => { renderer.dispose(); rendererRef.current=null; };
  },[]);
  useEffect(() => {
    const renderer=rendererRef.current;
    if (!renderer) return;
    const scene=new Scene();
    const geometries: (BoxGeometry | EdgesGeometry)[]=[];
    const materials: (MeshLambertMaterial | LineBasicMaterial)[]=[];
    scene.add(new HemisphereLight(0xffffff,0xb3c5cf,2.5));
    const light=new DirectionalLight(0xffffff,2);light.position.set(-100,300,300);scene.add(light);
    function box(x:number,y:number,z:number,w:number,d:number,h:number,fill:string,stroke:string,item?:Item) {
      if (h<=0) return;
      const geometry=new BoxGeometry(w,h,d);geometries.push(geometry);
      const material=new MeshLambertMaterial({color:fill});materials.push(material);
      const mesh=new Mesh(geometry,material);mesh.position.set(x+w/2,z+h/2,y+d/2);
      mesh.userData.itemId=item?.id;scene.add(mesh);
      const edges=new EdgesGeometry(geometry);geometries.push(edges);
      const edgeMaterial=new LineBasicMaterial({color:stroke});materials.push(edgeMaterial);
      const lines=new LineSegments(edges,edgeMaterial);lines.position.copy(mesh.position);scene.add(lines);
    }
    box(0,0,-3.75,desk.width,desk.depth,3.75,"#b3c5cf","#7a92a1");
    for (const item of items) {
      const {x,y,z}=worldPosition(items,item);
      const fill=item.kind==="poster"?"#e5c79d":item.id===selectedId?"#d7edf2":item.supportId?"#ebe8fa":"#e2eaf0";
      const stroke=item.id===invalidItemId?"#d5403b":item.id===selectedId?"#137e96":"#8095a4";
      if (item.kind==="monitor") {
        const m=monitorShape(item);
        box(x+(item.width-m.footWidth)/2,y+m.footStart,z,m.footWidth,m.footDepth,m.footHeight,"#8299a7",stroke,item);
        box(x+(item.width-m.stemWidth)/2,y+m.stemY-m.stemDepth/2,z+m.footHeight,m.stemWidth,m.stemDepth,m.screenBottom-m.footHeight,"#8299a7",stroke,item);
        box(x,y+m.panelStart,z+m.screenBottom,item.width,m.panelDepth,item.height-m.screenBottom,"#193243",stroke,item);
      } else if (item.kind==="laptop") {
        box(x,y,z,item.width,item.depth,item.height*.12,fill,stroke,item);
        box(x+item.width*.05,y+item.depth*.08,z+item.height*.12,item.width*.9,Math.min(1.5,item.depth*.1),item.height*.88,"#314958",stroke,item);
      } else box(x,y,z,item.width,itemDepth(item),item.height,fill,stroke,item);
    }
    const camera=createFrontCamera(desk,zoom,offset);
    scene.updateMatrixWorld(true);
    renderer.render(scene,camera);
    sceneRef.current=scene;cameraRef.current=camera;
    return () => { geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sceneRef.current=null; };
  },[desk,items,zoom,offset,selectedId,invalidItemId]);
  function hit(event: PointerEvent<HTMLCanvasElement>) {
    const bounds=event.currentTarget.getBoundingClientRect();
    const ray=new Raycaster();
    ray.setFromCamera(new Vector2((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2),cameraRef.current);
    const meshes=sceneRef.current?.children.filter(object=>object instanceof Mesh) ?? [];
    const first=ray.intersectObjects(meshes,false)[0];
    return items.find(item=>item.id===first?.object.userData.itemId);
  }
  return <>
    <foreignObject x="0" y="0" width={FRONT_WIDTH} height={FRONT_HEIGHT}>
      <canvas ref={canvasRef} aria-label="固定カメラによる机と持ち物の3D表示" style={{width:"100%",height:"100%",display:"block",touchAction:"none"}}
        onPointerDown={(event)=> { if (event.button!==0 || !event.isPrimary) return; const item=hit(event);if (!item) return;event.stopPropagation();activeItem.current=item;handlers(item).onPointerDown(event); }}
        onPointerMove={(event)=> { if (activeItem.current) handlers(activeItem.current).onPointerMove(event); }}
        onPointerUp={()=> { if (activeItem.current) handlers(activeItem.current).onPointerUp();activeItem.current=null; }}
        onPointerCancel={()=> { if (activeItem.current) handlers(activeItem.current).onPointerCancel();activeItem.current=null; }}
        onLostPointerCapture={()=> { if (activeItem.current) handlers(activeItem.current).onPointerCancel();activeItem.current=null; }}/>
    </foreignObject>
    {error && <text x={FRONT_WIDTH/2} y={FRONT_HEIGHT/2} textAnchor="middle">3D表示を開始できません。WebGL対応のブラウザで開いてください。</text>}
    {items.map(item=> {
      const world=worldPosition(items,item);
      const point=projectFront(desk,{x:world.x+item.width/2,y:world.y+itemDepth(item),z:world.z+item.height},zoom);
      return <g key={item.id} style={{pointerEvents:"none"}} transform={`translate(${offset.x} ${offset.y})`}>
        {measures && <text x={point.x} y={point.y-10} textAnchor="middle" className="object-dimension">{item.name} · {cm(item.width)} × {cm(item.height)}</text>}
      </g>;
    })}
  </>;
}
