import * as Cesium from "cesium";

// An example showing a point cloud tileset classified by a Geometry tileset.
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

try {
  // Point Cloud by Prof. Peter Allen, Columbia University Robotics Lab. Scanning by Alejandro Troccoli and Matei Ciocarlie.
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(16421);
  viewer.scene.primitives.add(tileset);

  // Geometry Tiles are experimental and the format is subject to change in the future.
  // For more details, see:
  //    https://github.com/CesiumGS/3d-tiles/tree/vctr/TileFormats/Geometry
  const classificationTileset = await Cesium.Cesium3DTileset.fromUrl(
    "../../SampleData/Cesium3DTiles/Classification/PointCloud/tileset.json",
    {
      classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
    },
  );
  viewer.scene.primitives.add(classificationTileset);

  classificationTileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        ["${id} === 'roof1'", "color('#004FFF', 0.5)"],
        ["${id} === 'towerBottom1'", "color('#33BB66', 0.5)"],
        ["${id} === 'towerTop1'", "color('#0099AA', 0.5)"],
        ["${id} === 'roof2'", "color('#004FFF', 0.5)"],
        ["${id} === 'tower3'", "color('#FF8833', 0.5)"],
        ["${id} === 'tower4'", "color('#FFAA22', 0.5)"],
        ["true", "color('#FFFF00', 0.5)"],
      ],
    },
  });
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    4401744.644145314,
    225051.41078911052,
    4595420.374784433,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    5.646733805039757,
    -0.276607153839886,
    6.281110875400085,
  ),
});

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
  pickedFeature.color = Cesium.Color.YELLOW.withAlpha(0.5);
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
