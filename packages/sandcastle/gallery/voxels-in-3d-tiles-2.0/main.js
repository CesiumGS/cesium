// @ts-nocheck

import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
    ),
  ),
  baseLayerPicker: false,
  geocoder: false,
  animation: false,
  timeline: false,
});

viewer.extend(Cesium.viewerVoxelInspectorMixin);
viewer.scene.debugShowFramesPerSecond = true;

function createPrimitive(provider) {
  viewer.scene.primitives.removeAll();

  const voxelPrimitive = viewer.scene.primitives.add(
    new Cesium.VoxelPrimitive({ provider }),
  );

  voxelPrimitive.nearestSampling = true;

  viewer.voxelInspector.viewModel.voxelPrimitive = voxelPrimitive;
  viewer.camera.flyToBoundingSphere(voxelPrimitive.boundingSphere, {
    duration: 0.0,
  });

  return voxelPrimitive;
}

Sandcastle.addToolbarMenu([
  {
    text: "Box - 3D Tiles 1.1",
    onselect: async function () {
      const provider = await Cesium.Cesium3DTilesVoxelProvider.fromUrl(
        "../../SampleData/Cesium3DTiles/Voxel/VoxelBox3DTiles/tileset.json",
      );
      createPrimitive(provider);
    },
  },
  {
    text: "Box - 3D Tiles 2.0",
    onselect: async function () {
      const provider = await Cesium.Cesium3DTilesVoxelProvider.fromGltf(
        "../../SampleData/Cesium3DTiles/gltf-2.1/VoxelBox3DTiles/voxels.tileset.gltf",
      );
      createPrimitive(provider);
    },
  },
]);
