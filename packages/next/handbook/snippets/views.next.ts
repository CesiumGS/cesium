declare const leftCanvas: HTMLCanvasElement;
declare const rightCanvas: HTMLCanvasElement;
declare const url: string;
// ---
import { CanvasTarget, Engine } from "@cesium/next";

// One device, world and tile cache, two views.
const engine = await Engine.create();
const world = engine.createWorld();
const left = engine.addView({
  target: new CanvasTarget(leftCanvas),
  world,
});
const right = engine.addView({
  target: new CanvasTarget(rightCanvas),
  world,
});
await engine.addTileset(world, url);
// --- end
export { left, right };
