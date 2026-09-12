import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4665927);

  viewer.scene.primitives.add(tileset);
  tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.EDGES_ONLY;
  await viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0.0, -0.5, 0.0));

  const initialView = {
    destination: Cesium.Cartesian3.clone(viewer.camera.positionWC),
    orientation: {
      direction: Cesium.Cartesian3.clone(viewer.camera.directionWC),
      up: Cesium.Cartesian3.clone(viewer.camera.upWC),
    },
  };

  Sandcastle.addToolbarMenu([
    {
      text: "Edges Only",
      onselect: function () {
        tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.EDGES_ONLY;
      },
    },
    {
      text: "Surfaces + Edges",
      onselect: function () {
        tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_AND_EDGES;
      },
    },
    {
      text: "Surfaces Only",
      onselect: function () {
        tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_ONLY;
      },
    },
  ]);
  Sandcastle.addToggleButton("Show Tile Bounds", false, function (checked) {
    tileset.debugShowBoundingVolume = checked;
  });
  Sandcastle.addToolbarButton("Zoom to Pipes", function () {
    viewer.camera.setView({
      destination: new Cesium.Cartesian3(
        -491698.3382031368,
        -5521053.190015137,
        3144895.6141743367,
      ),
      orientation: { heading: 5.6, pitch: -0.4, roll: 0.0 },
    });
  });
  Sandcastle.addToolbarButton("Zoom to Tileset", function () {
    viewer.camera.setView(initialView);
  });
} catch (error) {
  window.alert(`Error loading tileset: ${error}`);
}
