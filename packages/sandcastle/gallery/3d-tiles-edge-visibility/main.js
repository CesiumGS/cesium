import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4665927);

  viewer.scene.primitives.add(tileset);
  tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.EDGES_ONLY;
  await viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0.0, -0.5, 0.0));

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
} catch (error) {
  window.alert(`Error loading tileset: ${error}`);
}
