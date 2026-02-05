import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

function createModel(url, height) {
  viewer.entities.removeAll();

  const position = Cesium.Cartesian3.fromDegrees(-75.686694, 40.065757, height);

  const heading = Cesium.Math.toRadians(0.0);
  const pitch = 0.0;
  const roll = 0.0;
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
    text: "Checkerboard",
    onselect: function () {
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_Checker.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard with normal map",
    onselect: function () {
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_NormalMap.gltf",
        0,
      );
    },
  },
  {
    text: "Grass",
    onselect: function () {
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_Grass.gltf",
        0,
      );
    },
  },
];

Sandcastle.addToolbarMenu(options);
