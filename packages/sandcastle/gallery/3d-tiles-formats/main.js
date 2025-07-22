import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shadows: true,
});
viewer.extend(Cesium.viewerCesium3DTilesInspectorMixin);
const inspectorViewModel = viewer.cesium3DTilesInspector.viewModel;

viewer.clock.currentTime = new Cesium.JulianDate(2457522.154792);

const scene = viewer.scene;
let tileset;

const viewModel = {
  tilesets: [
    {
      name: "Tileset",
      resource: "../../SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json",
    },
    {
      name: "Translucent",
      resource:
        "../../SampleData/Cesium3DTiles/Batched/BatchedTranslucent/tileset.json",
    },
    {
      name: "Translucent/Opaque",
      resource:
        "../../SampleData/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/tileset.json",
    },
    {
      name: "Multi-color",
      resource:
        "../../SampleData/Cesium3DTiles/Batched/BatchedColors/tileset.json",
    },
    {
      name: "Request Volume",
      resource:
        "../../SampleData/Cesium3DTiles/Tilesets/TilesetWithViewerRequestVolume/tileset.json",
    },
    {
      name: "Batched",
      resource:
        "../../SampleData/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json",
    },
    {
      name: "Instanced",
      resource:
        "../../SampleData/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json",
    },
    {
      name: "Instanced/Orientation",
      resource:
        "../../SampleData/Cesium3DTiles/Instanced/InstancedOrientation/tileset.json",
    },
    {
      name: "Composite",
      resource:
        "../../SampleData/Cesium3DTiles/Composite/Composite/tileset.json",
    },
    {
      name: "PointCloud",
      resource:
        "../../SampleData/Cesium3DTiles/PointCloud/PointCloudRGB/tileset.json",
    },
    {
      name: "PointCloudConstantColor",
      resource:
        "../../SampleData/Cesium3DTiles/PointCloud/PointCloudConstantColor/tileset.json",
    },
    {
      name: "PointCloudNormals",
      resource:
        "../../SampleData/Cesium3DTiles/PointCloud/PointCloudNormals/tileset.json",
    },
    {
      name: "PointCloudBatched",
      resource:
        "../../SampleData/Cesium3DTiles/PointCloud/PointCloudBatched/tileset.json",
    },
    {
      name: "PointCloudDraco",
      resource:
        "../../SampleData/Cesium3DTiles/PointCloud/PointCloudDraco/tileset.json",
    },
  ],
  selectedTileset: undefined,
  shadows: true,
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "shadows")
  .subscribe(function (enabled) {
    viewer.shadows = enabled;
  });

let resourceToLoad;
Cesium.knockout
  .getObservable(viewModel, "selectedTileset")
  .subscribe(async function (options) {
    if (Cesium.defined(tileset)) {
      scene.primitives.remove(tileset);
    }
    if (!Cesium.defined(options)) {
      inspectorViewModel.tileset = undefined;
      resourceToLoad = undefined;
      return;
    }

    resourceToLoad = options.resource;
    try {
      tileset = await Cesium.Cesium3DTileset.fromUrl(resourceToLoad, {
        enableDebugWireframe: true,
      });
      if (options.resource !== resourceToLoad) {
        // Another tileset was loaded. Discard the result.
        return;
      }
      viewer.scene.primitives.add(tileset);

      inspectorViewModel.tileset = tileset;
      viewer.zoomTo(
        tileset,
        new Cesium.HeadingPitchRange(
          0,
          -2.0,
          Math.max(100.0 - tileset.boundingSphere.radius, 0.0),
        ),
      );

      const properties = tileset.properties;
      if (Cesium.defined(properties) && Cesium.defined(properties.Height)) {
        tileset.style = new Cesium.Cesium3DTileStyle({
          color: {
            conditions: [
              ["${Height} >= 83", "color('purple', 0.5)"],
              ["${Height} >= 80", "color('red')"],
              ["${Height} >= 70", "color('orange')"],
              ["${Height} >= 12", "color('yellow')"],
              ["${Height} >= 7", "color('lime')"],
              ["${Height} >= 1", "color('cyan')"],
              ["true", "color('blue')"],
            ],
          },
        });
      }
    } catch (error) {
      console.log(`Error loading tileset: ${error}`);
    }
  });

viewModel.selectedTileset = viewModel.tilesets[0];

const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

handler.setInputAction(function (movement) {
  const feature = inspectorViewModel.feature;
  if (Cesium.defined(feature)) {
    const propertyIds = feature.getPropertyIds();
    const length = propertyIds.length;
    for (let i = 0; i < length; ++i) {
      const propertyId = propertyIds[i];
      console.log(`${propertyId}: ${feature.getProperty(propertyId)}`);
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

handler.setInputAction(function (movement) {
  const feature = inspectorViewModel.feature;
  if (Cesium.defined(feature)) {
    feature.show = false;
  }
}, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);
