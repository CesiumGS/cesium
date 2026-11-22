import { vec3, type Engine, type View } from "@cesium/next";
declare const engine: Engine;
declare const view: View;
// ---
// The default. A change it can see wakes the loop.
view.observer.exposure = { ev100: 14 };

// Written in place, outside what it watches: it asks.
vec3.set(engine.sunDirection, 0, 0, 1);
engine.requestRender();
