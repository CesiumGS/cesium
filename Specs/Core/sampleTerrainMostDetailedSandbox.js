// import { Cartographic } from "../../Source/Cesium.js";
// import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { createWorldTerrain } from "../../Source/Cesium.js";
// import { sampleTerrainMostDetailed } from "../../Source/Cesium.js";

const worldTerrain = createWorldTerrain((url: "wow"));

worldTerrain.then((d) => console.log(d));
