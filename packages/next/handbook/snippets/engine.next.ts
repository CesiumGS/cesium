declare const canvas: HTMLCanvasElement;
declare const url: string;
declare const x: number;
declare const y: number;
// ---
import { CanvasTarget, Engine } from "@cesium/next";

// One GPU device, shared by every world and view.
const engine = await Engine.create();
const world = engine.createWorld();
const view = engine.addView({ target: new CanvasTarget(canvas), world });

// Content arrives asynchronously and registers with its world.
await engine.addTileset(world, url);

// Waiting is explicit: this resolves after the first frame with no stand-ins.
await engine.whenReady(view);

// Picks read back from the GPU, so the answer is a promise.
const hit = await view.pick(x, y);
// --- end
export { hit };
