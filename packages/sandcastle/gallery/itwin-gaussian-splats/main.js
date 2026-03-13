import * as Cesium from "cesium";

// Generate a share key for access to an iTwin without OAuth
// https://developer.bentley.com/apis/access-control-v2/operations/create-itwin-share/
Cesium.ITwinPlatform.defaultShareKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiNTM1YTI0YTMtOWIyOS00ZTIzLWJiNWQtOWNlZGI1MjRjNzQzIiwiaWQiOiI2NTEwMzUzMi02MmU3LTRmZGQtOWNlNy1iODIxYmEyMmI5NjMiLCJleHAiOjE3NzcwNTU4MTh9.Q9MgsWWkc6bb1zHUJ7ahZjxPtaTWEjpNvRln7NS3faM";

// For alternative forms of authentication you can use, visit https://developer.bentley.com/apis/overview/authorization/. Then set your access token like this:
// Cesium.ITwinPlatform.defaultAccessToken = 'your token'

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  animation: false,
  timeline: false,
});
viewer.baseLayerPicker.viewModel.selectedImagery =
  viewer.baseLayerPicker.viewModel.imageryProviderViewModels[2];

// Create tileset for the reality data gaussian splats
const realityMesh = await Cesium.ITwinData.createTilesetForRealityDataId({
  iTwinId: "04ba725f-f3c0-4f30-8014-a4488cbd612d",
  realityDataId: "4afd5d69-3ba7-491d-86cd-3d86d43db907",
  tilesetOptions: {
    // Move the mesh down slightly to align with Cesium World Terrain
    modelMatrix: Cesium.Matrix4.fromTranslation(
      new Cesium.Cartesian3(-1, 9, -8),
    ),
  },
});
viewer.scene.primitives.add(realityMesh);

// // Set up a camera facing the dam
viewer.zoomTo(realityMesh, new Cesium.HeadingPitchRange(0, -0.5, 100));
