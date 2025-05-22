import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  infoBox: false,
  selectionIndicator: false,
  shadows: true,
  shouldAnimate: true,
});

function createModel(url, height) {
  viewer.entities.removeAll();

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

  const entity = viewer.entities.add({
    name: url,
    position: position,
    orientation: orientation,
    model: {
      uri: url,
      minimumPixelSize: 128,
      maximumScale: 20000,
    },
  });
  viewer.trackedEntity = entity;
}

const options = [
  {
    text: "Aircraft",
    onselect: function () {
      createModel("../../SampleData/models/CesiumAir/Cesium_Air.glb", 5000.0);
    },
  },
  {
    text: "Drone",
    onselect: function () {
      createModel("../../SampleData/models/CesiumDrone/CesiumDrone.glb", 150.0);
    },
  },
  {
    text: "Ground Vehicle",
    onselect: function () {
      createModel("../../SampleData/models/GroundVehicle/GroundVehicle.glb", 0);
    },
  },
  {
    text: "Hot Air Balloon",
    onselect: function () {
      createModel(
        "../../SampleData/models/CesiumBalloon/CesiumBalloon.glb",
        1000.0,
      );
    },
  },
  {
    text: "Milk Truck",
    onselect: function () {
      createModel(
        "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
        0,
      );
    },
  },
  {
    text: "Skinned Character",
    onselect: function () {
      createModel("../../SampleData/models/CesiumMan/Cesium_Man.glb", 0);
    },
  },
  {
    text: "Unlit Box",
    onselect: function () {
      createModel("../../SampleData/models/BoxUnlit/BoxUnlit.gltf", 10.0);
    },
  },
  {
    text: "Draco Compressed Model",
    onselect: function () {
      createModel(
        "../../SampleData/models/DracoCompressed/CesiumMilkTruck.gltf",
        0,
      );
    },
  },
  {
    text: "KTX2 Compressed Balloon",
    onselect: function () {
      if (!Cesium.FeatureDetection.supportsBasis(viewer.scene)) {
        window.alert(
          "This browser does not support Basis Universal compressed textures",
        );
      }
      createModel(
        "../../SampleData/models/CesiumBalloonKTX2/CesiumBalloonKTX2.glb",
        1000.0,
      );
    },
  },
  {
    text: "Instanced Box",
    onselect: function () {
      createModel("../../SampleData/models/BoxInstanced/BoxInstanced.gltf", 15);
    },
  },
];

Sandcastle.addToolbarMenu(options);
