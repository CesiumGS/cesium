import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Generate a share key for access to an iTwin without OAuth
// https://developer.bentley.com/apis/access-control-v2/operations/create-itwin-share/
Cesium.ITwinPlatform.defaultShareKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiNTM1YTI0YTMtOWIyOS00ZTIzLWJiNWQtOWNlZGI1MjRjNzQzIiwiaWQiOiI2NTEwMzUzMi02MmU3LTRmZGQtOWNlNy1iODIxYmEyMmI5NjMiLCJleHAiOjE3NzcwNTU4MTh9.Q9MgsWWkc6bb1zHUJ7ahZjxPtaTWEjpNvRln7NS3faM";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
});
viewer.scene.skyAtmosphere.show = true;

const tileset = await Cesium.ITwinData.createTilesetForRealityDataId({
  iTwinId: "535a24a3-9b29-4e23-bb5d-9cedb524c743",
  realityDataId: "85897090-3bcc-470b-bec7-20bb639cc1b9",
});
viewer.scene.primitives.add(tileset);
tileset.maximumScreenSpaceError = 2;

// Create the imagery layer for Bing Maps (labels only)
const labelImageryLayer = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(2411391),
);
tileset.imageryLayers.add(labelImageryLayer);

Sandcastle.addToggleButton(
  "Show labels",
  labelImageryLayer.show,
  function (checked) {
    labelImageryLayer.show = checked;
  },
);

// Look at Philadelphia
viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    1252289.5782535905,
    -4732887.700120302,
    4075105.3952877373,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    6.130466027267037,
    -1.1315283015826818,
    6.2831472551984575,
  ),
});
