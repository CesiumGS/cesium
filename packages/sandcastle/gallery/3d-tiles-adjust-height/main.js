import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shadows: true,
});

const viewModel = {
  height: 0,
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

let tileset;
try {
  tileset = await Cesium.Cesium3DTileset.fromUrl(
    "../../SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json",
  );
  viewer.scene.primitives.add(tileset);
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      0.0,
      -0.5,
      tileset.boundingSphere.radius * 2.0,
    ),
  );
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

Cesium.knockout.getObservable(viewModel, "height").subscribe(function (height) {
  height = Number(height);
  if (isNaN(height) || !Cesium.defined(tileset)) {
    return;
  }

  const cartographic = Cesium.Cartographic.fromCartesian(
    tileset.boundingSphere.center,
  );
  const surface = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    0.0,
  );
  const offset = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    height,
  );
  const translation = Cesium.Cartesian3.subtract(
    offset,
    surface,
    new Cesium.Cartesian3(),
  );
  tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
});
