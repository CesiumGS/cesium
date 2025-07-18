import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
  "2022-08-01T00:00:00Z",
);

const scene = viewer.scene;
if (!scene.msaaSupported) {
  window.alert("This browser does not support MSAA.");
}
scene.msaaSamples = 8;

function createModel(url, height) {
  const position = Cesium.Cartesian3.fromDegrees(
    -123.0744619,
    44.0503706,
    height,
  );
  const heading = Cesium.Math.toRadians(135);
  const pitch = 0;
  const roll = 0;
  const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    hpr,
  );

  viewer.entities.add({
    name: url,
    position: position,
    orientation: orientation,
    model: {
      uri: url,
      minimumPixelSize: 128,
      maximumScale: 20000,
    },
  });
  const target = Cesium.Cartesian3.fromDegrees(
    -123.0744619,
    44.0503706,
    height + 7.5,
  );
  const offset = new Cesium.Cartesian3(50.0, -15.0, 0.0);
  viewer.scene.camera.lookAt(target, offset);
}

let currentAssetId;
async function createTileset(assetId) {
  currentAssetId = assetId;

  try {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(assetId);

    if (currentAssetId !== assetId) {
      // Another scenario was loaded. Discard the result.
      return;
    }

    scene.primitives.add(tileset);
  } catch (error) {
    console.log(`Error loading tileset: ${error}`);
  }
}

const options = [
  {
    text: "Statue of Liberty",
    onselect: function () {
      viewer.entities.removeAll();
      scene.primitives.removeAll();
      scene.camera.setView({
        destination: new Cesium.Cartesian3(
          1331419.302230775,
          -4656681.5022043325,
          4136232.6465900405,
        ),
        orientation: new Cesium.HeadingPitchRoll(
          6.032455545102689,
          -0.056832496140112765,
          6.282360923090216,
        ),
        endTransform: Cesium.Matrix4.IDENTITY,
      });
      createTileset(75343);
    },
  },
  {
    text: "3D Tiles BIM",
    onselect: function () {
      viewer.entities.removeAll();
      scene.primitives.removeAll();
      viewer.camera.setView({
        destination: new Cesium.Cartesian3(
          1234138.7804841248,
          -5086063.633843134,
          3633284.606361642,
        ),
        orientation: {
          heading: 0.4304630387656614,
          pitch: -0.16969316864215878,
          roll: 6.283184816241989,
        },
      });
      createTileset(2464651);
    },
  },
  {
    text: "Hot Air Balloon",
    onselect: function () {
      currentAssetId = undefined;
      viewer.entities.removeAll();
      scene.primitives.removeAll();
      createModel(
        "../../SampleData/models/CesiumBalloon/CesiumBalloon.glb",
        1000.0,
      );
    },
  },
];

const samplingOptions = [
  {
    text: "MSAA 8x",
    onselect: function () {
      scene.msaaSamples = 8;
    },
  },
  {
    text: "MSAA 4x",
    onselect: function () {
      scene.msaaSamples = 4;
    },
  },
  {
    text: "MSAA 2x",
    onselect: function () {
      scene.msaaSamples = 2;
    },
  },
  {
    text: "MSAA off",
    onselect: function () {
      scene.msaaSamples = 1;
    },
  },
];
Sandcastle.addToolbarMenu(options);
Sandcastle.addToolbarMenu(samplingOptions);
