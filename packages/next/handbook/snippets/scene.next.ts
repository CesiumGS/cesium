declare const canvas: HTMLCanvasElement;
declare const url: string;
// ---
import { CanvasTarget, Engine } from "@cesium/next";

const engine = await Engine.create();
const world = engine.createWorld();
const view = engine.addView({ target: new CanvasTarget(canvas), world });

// The content: its tree is loaded, and nothing is drawn or fetched yet.
const site = await engine.loadTileset(url);

// Two items: the same tiles, one selection, one cache.
const solid = world.add(site);
const faded = world.add(site, { opacity: 0.4, tint: [1, 0.6, 0.2] });

// Each changes on its own.
solid.viewMask = engine.viewBit(view);
faded.show = false;
