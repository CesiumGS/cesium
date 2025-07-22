import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const geocoder = viewer.geocoder.viewModel;
geocoder.searchText = "Vienna, Austria";
geocoder.flightDuration = 0.0;
geocoder.search();

try {
  // Vector 3D Tiles are experimental and the format is subject to change in the future.
  // For more details, see:
  //    https://github.com/CesiumGS/3d-tiles/tree/vctr/TileFormats/VectorData
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5737);
  viewer.scene.primitives.add(tileset);

  tileset.style = new Cesium.Cesium3DTileStyle({
    color: "rgba(255, 255, 255, 0.5)",
  });
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

// Information about the currently highlighted feature
const highlighted = {
  feature: undefined,
  originalColor: new Cesium.Color(),
};

// Color a feature yellow on hover.
viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
  // If a feature was previously highlighted, undo the highlight
  if (Cesium.defined(highlighted.feature)) {
    highlighted.feature.color = highlighted.originalColor;
    highlighted.feature = undefined;
  }

  // Pick a new feature
  const pickedFeature = viewer.scene.pick(movement.endPosition);
  if (!Cesium.defined(pickedFeature)) {
    return;
  }

  // Highlight the feature
  highlighted.feature = pickedFeature;
  Cesium.Color.clone(pickedFeature.color, highlighted.originalColor);
  pickedFeature.color = Cesium.Color.YELLOW;
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
