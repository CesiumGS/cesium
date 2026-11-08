import type { Engine, World } from "@cesium/next";
declare const engine: Engine;
declare const world: World;
declare const url: string;
// ---
const globe = await engine.addTerrain(world, url);

// A region, in geodetic degrees. Picks go on to what shows through it.
const site = globe.addTerrainTranslucency(
  { rectangle: { west: -75.6, south: 40.0, east: -75.5, north: 40.1 } },
  { opacity: 0.3, pickThrough: true },
);

// In place, with no recompile, so a fade can call it every tick.
globe.setTerrainTranslucency(site, { opacity: 0.5 });
globe.removeTerrainTranslucency(site);

// The whole globe. 1 is opaque again.
globe.setTerrainOpacity(0.6, { pickThrough: true });
