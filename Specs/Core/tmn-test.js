// console.log("test");
import { createWorldTerrain } from "../../Source/Cesium.js";

// const worldTerrain = createWorldTerrain();

const terrainProvider = new CesiumTerrainProvider({
  url: "/Specs/Mocks/CesiumTerrainProvider", // Mock payload from Ion
  requestVertexNormals: true,
  requestWaterMask: true,
  ready: true,
});

terrainProvider.then((x) => console.log(x));
