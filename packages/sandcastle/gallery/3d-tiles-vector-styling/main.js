import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

let tileset;

const style = new Cesium.Cesium3DTileStyle({
  color: "color('orange')",
  pointSize: 12,
  pointOutlineWidth: 2,
  pointOutlineColor: "color('cyan')",
});

const viewModel = {
  tilesets: [
    {
      name: "Vector - Sample Points",
      resource: "../../SampleData/vector/sample-cities-spain.tileset.json",
    },
    {
      name: "Vector - Sample Lines",
      resource: "../../SampleData/vector/sample-us-outline.tileset.json",
    },
    {
      name: "Vector - Sample Polygons",
      resource: "../../SampleData/vector/sample-us-states.tileset.json",
    },
  ],
  selectedTileset: undefined,
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

let resourceToLoad;
Cesium.knockout
  .getObservable(viewModel, "selectedTileset")
  .subscribe(async function (options) {
    if (Cesium.defined(tileset)) {
      scene.primitives.remove(tileset);
    }
    if (!Cesium.defined(options)) {
      resourceToLoad = undefined;
      return;
    }

    resourceToLoad = options.resource;
    try {
      tileset = await Cesium.Cesium3DTileset.fromUrl(resourceToLoad);

      if (options.resource !== resourceToLoad) {
        return; // Discard; another tileset was loaded.
      }

      tileset.style = style;
      viewer.scene.primitives.add(tileset);

      const range = Math.max(100.0 - tileset.boundingSphere.radius, 0.0);
      viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0, -2.0, range));
    } catch (error) {
      console.log(`Error loading tileset: ${error}`);
    }
  });

viewModel.selectedTileset = viewModel.tilesets[0];
