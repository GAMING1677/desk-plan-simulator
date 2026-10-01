import { PerspectiveCamera, Vector3 } from "three";
import { type Desk } from "./desk-model";
export const FRONT_VIEW_DISTANCE = 300;
export const FRONT_EYE_HEIGHT = 150;
export const FRONT_WIDTH = 920;
export const FRONT_HEIGHT = 720;
export type Vertex = { x: number; y: number; z: number };
export const eyeDepth = (desk: Desk) => desk.depth + FRONT_VIEW_DISTANCE;
export const eyeHeight = (desk: Desk) => FRONT_EYE_HEIGHT - desk.height;
const BASE_FOCAL = 4 * FRONT_VIEW_DISTANCE;
// A level camera keeps upright surfaces vertical. Lens shift frames the desktop
// without tilting the camera; pan only shifts the image, never the viewpoint.
export function createFrontCamera(desk: Desk, zoom: number, offset = { x: 0, y: 0 }) {
  const camera = new PerspectiveCamera(2*Math.atan(FRONT_HEIGHT/(2*BASE_FOCAL))*180/Math.PI, FRONT_WIDTH/FRONT_HEIGHT, 1, 50000);
  camera.position.set(desk.width/2, eyeHeight(desk), eyeDepth(desk));
  camera.lookAt(desk.width/2, eyeHeight(desk), 0);
  camera.zoom = zoom/100;
  const shift = eyeHeight(desk)*BASE_FOCAL/(FRONT_VIEW_DISTANCE+desk.depth/2);
  camera.setViewOffset(FRONT_WIDTH, FRONT_HEIGHT, -offset.x, shift*camera.zoom-offset.y, FRONT_WIDTH, FRONT_HEIGHT);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}
export function projectFront(desk: Desk, point: Vertex, zoom: number) {
  const p = new Vector3(point.x,point.z,point.y).project(createFrontCamera(desk,zoom));
  return { x: (p.x+1)*FRONT_WIDTH/2, y: (1-p.y)*FRONT_HEIGHT/2 };
}
export function unprojectFront(desk: Desk, screen: { x: number; y: number }, depth: number, zoom: number): Vertex {
  const camera = createFrontCamera(desk,zoom);
  const ray = new Vector3(screen.x/FRONT_WIDTH*2-1, 1-screen.y/FRONT_HEIGHT*2, 0.5).unproject(camera).sub(camera.position).normalize();
  const t = (depth-camera.position.z)/ray.z;
  return { x:camera.position.x+ray.x*t, y:depth, z:camera.position.y+ray.y*t };
}
