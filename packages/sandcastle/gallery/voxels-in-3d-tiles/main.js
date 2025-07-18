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

const customShaderColor = new Cesium.CustomShader({
  fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
  {
      material.diffuse = fsInput.metadata.a.rgb;
      material.alpha = fsInput.metadata.a.a;
  }`,
});

function createPrimitive(provider) {
  viewer.scene.primitives.removeAll();

  const voxelPrimitive = viewer.scene.primitives.add(
    new Cesium.VoxelPrimitive({
      provider: provider,
      customShader: customShaderColor,
    }),
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
    text: "Box - 3D Tiles",
    onselect: async function () {
      const provider = await Cesium.Cesium3DTilesVoxelProvider.fromUrl(
        "../../SampleData/Cesium3DTiles/Voxel/VoxelBox3DTiles/tileset.json",
      );
      createPrimitive(provider);
    },
  },
  {
    text: "Cylinder - 3D Tiles",
    onselect: async function () {
      const provider = await Cesium.Cesium3DTilesVoxelProvider.fromUrl(
        "../../SampleData/Cesium3DTiles/Voxel/VoxelCylinder3DTiles/tileset.json",
      );
      createPrimitive(provider);
    },
  },
  {
    text: "Ellipsoid - 3D Tiles",
    onselect: async function () {
      const provider = await Cesium.Cesium3DTilesVoxelProvider.fromUrl(
        "../../SampleData/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json",
      );
      createPrimitive(provider);
    },
  },
]);
