import type { Engine, World } from "@cesium/next";
declare const engine: Engine;
declare const world: World;
declare const url: string;
// ---
const globe = await engine.addTerrain(world, url);

// A region, in geodetic degrees. With no options it is a cut.
const shape = {
  rectangle: { west: -75.6, south: 40.0, east: -75.5, north: 40.1 },
};
const hole = globe.terrain.addRegion(shape);

// Glass: picks go on to what shows through it.
const glass = globe.terrain.addRegion(shape, {
  opacity: 0.3,
  pickThrough: true,
});

// Invisible ground that things still stand on.
globe.terrain.addRegion(shape, { opacity: 0, ground: true });

// In place, with no recompile, so a fade can set it every tick.
glass.opacity = 0.6;
glass.remove();

// The whole globe. 1 has no effect.
globe.terrain.addRegion("everywhere", { opacity: 0.5 });
hole.remove();
