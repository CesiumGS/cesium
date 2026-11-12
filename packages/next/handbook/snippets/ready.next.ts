import type { Engine, View, World } from "@cesium/next";
declare const engine: Engine;
declare const world: World;
declare const view: View;
declare const url: string;
// ---
await engine.addTileset(world, url);

// Resolves after the first frame in which no draw used a stand-in.
// It asks the view, so it covers everything the view draws.
await engine.whenReady(view, { timeoutMs: 30_000 });
console.log("Everything in view has loaded");
// --- end
