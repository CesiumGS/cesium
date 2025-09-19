import * as Cesium from "cesium";

// For more information on Cesium World Terrain, see https://cesium.com/platform/cesium-ion/content/cesium-world-terrain/
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
const target = new Cesium.Cartesian3(
  -2489625.0836225147,
  -4393941.44443024,
  3882535.9454173897,
);
const offset = new Cesium.Cartesian3(
  -6857.40902037546,
  412.3284835694358,
  2147.5545426812023,
);
viewer.camera.lookAt(target, offset);
viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
