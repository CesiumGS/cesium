import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// An example of using a b3dm tileset to classify another b3dm tileset.
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

try {
  // A normal b3dm tileset containing photogrammetry
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(40866);
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);

  const classificationTilesetUrl =
    "../../SampleData/Cesium3DTiles/Classification/Photogrammetry/tileset.json";
  // A b3dm tileset used to classify the photogrammetry tileset
  const classificationTileset = await Cesium.Cesium3DTileset.fromUrl(
    classificationTilesetUrl,
    {
      classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
    },
  );
  classificationTileset.style = new Cesium.Cesium3DTileStyle({
    color: "rgba(255, 0, 0, 0.5)",
  });
  viewer.scene.primitives.add(classificationTileset);

  // The same b3dm tileset used for classification, but rendered normally for comparison.
  const nonClassificationTileset = await Cesium.Cesium3DTileset.fromUrl(
    classificationTilesetUrl,
    {
      show: false,
    },
  );
  nonClassificationTileset.style = new Cesium.Cesium3DTileStyle({
    color: "rgba(255, 0, 0, 0.5)",
  });
  viewer.scene.primitives.add(nonClassificationTileset);

  Sandcastle.addToggleButton("Show classification", true, function (checked) {
    classificationTileset.show = checked;
    nonClassificationTileset.show = !checked;
  });
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
