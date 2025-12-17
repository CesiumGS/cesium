import * as Cesium from "cesium";
import { indicateTestDone, waitForAllPrimitives } from "../scenario-lib.js";

const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  timeline: false,
  geocoder: false,
  homeButton: false,
  baseLayerPicker: false,
  sceneModePicker: false,
  navigationHelpButton: false,
});
viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
  "2021-11-09T07:27:37.016064475348684937Z",
);
const scene = viewer.scene;
scene.light.intensity = 7.0;

try {
  // 3D Tiles 1.1 converted from CDB of Aden, Yemen (CDB provided by Presagis)
  const terrainTileset = await Cesium.Cesium3DTileset.fromIonAssetId(2389063);

  const buildingsTileset = await Cesium.Cesium3DTileset.fromIonAssetId(
    2389064,
    {
      maximumScreenSpaceError: 12,
    },
  );

  terrainTileset.allTilesLoaded.addEventListener(function () {
    console.log("Terrain all loaded");
  });
  buildingsTileset.allTilesLoaded.addEventListener(function () {
    console.log("Buildings all loaded");
  });
  viewer.scene.primitives.add(terrainTileset);
  viewer.scene.primitives.add(buildingsTileset);

  viewer.camera.flyTo({
    duration: 0,
    destination: new Cesium.Cartesian3(
      4397999.822774582,
      4404502.67774069,
      1397782.4709840622,
    ),
    orientation: {
      direction: new Cesium.Cartesian3(
        -0.29335588497705106,
        -0.6066709587467911,
        0.7388454997917905,
      ),
      up: new Cesium.Cartesian3(
        0.6240972421637774,
        0.46391380837591956,
        0.6287182283994301,
      ),
    },
  });

  await waitForAllPrimitives(viewer.scene);
  indicateTestDone();
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
