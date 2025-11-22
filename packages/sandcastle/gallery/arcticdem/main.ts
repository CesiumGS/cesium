import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

try {
  // High-resolution arctic terrain from the Arctic DEM project (Release 4), tiled and hosted by Cesium ion.
  // https://www.pgc.umn.edu/data/arcticdem/
  viewer.scene.terrainProvider =
    await Cesium.CesiumTerrainProvider.fromIonAssetId(3956);
} catch (error) {
  window.alert(`Failed to load terrain. ${error}`);
}

// Add Alaskan locations
Sandcastle.addToolbarMenu(
  [
    {
      text: "Denali",
      onselect: function () {
        viewer.scene.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            -2.6399828792482234,
            1.0993550795541742,
            5795,
          ),
          orientation: {
            heading: 3.8455,
            pitch: -0.4535,
            roll: 0.0,
          },
        });
      },
    },
    {
      text: "Anchorage Area",
      onselect: function () {
        viewer.scene.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            -2.610708034601548,
            1.0671172431736584,
            1900,
          ),
          orientation: {
            heading: 4.6,
            pitch: -0.341,
            roll: 0.0,
          },
        });
      },
    },
    {
      text: "Peaks",
      onselect: function () {
        viewer.scene.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            -2.6928866820212813,
            1.072394255273859,
            3700,
          ),
          orientation: {
            heading: 1.6308222948889464,
            pitch: -0.6473480165020193,
            roll: 0.0,
          },
        });
      },
    },
    {
      text: "Riverbed",
      onselect: function () {
        viewer.scene.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            -2.6395623497608596,
            1.0976443174490356,
            2070,
          ),
          orientation: {
            heading: 6.068794108659519,
            pitch: -0.08514161789475816,
            roll: 0.0,
          },
        });
      },
    },
  ],
  "toolbar",
);

viewer.scene.camera.flyTo({
  destination: Cesium.Cartesian3.fromRadians(
    -2.6399828792482234,
    1.0993550795541742,
    5795,
  ),
  orientation: {
    heading: 3.8455,
    pitch: -0.4535,
    roll: 0.0,
  },
  duration: 0.0,
});
