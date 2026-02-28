import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");
let heading = 0.0;
let pitch = 0.0;
let roll = 0.0;
let currentUrl;

function createModel(url, height) {
  viewer.entities.removeAll();
  currentUrl = url;

  const position = Cesium.Cartesian3.fromDegrees(-75.686694, 40.065757, height);

  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(heading),
    Cesium.Math.toRadians(pitch),
    Cesium.Math.toRadians(roll),
  );
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
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_Checker.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard with normal map",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_NormalMap.gltf",
        0,
      );
    },
  },
  {
    text: "Grass",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_Grass.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard with emissive",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_CheckerEmissive.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard with emissive and no CLOD",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_CheckerEmissive_NoCLOD.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard with KHR_texture_transform",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_CheckerTransform.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard with normal map and KHR_texture_transform",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_NormalMap_Transform.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard vertical plane (facing +Z-axis)",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_Checker_Vertical.gltf",
        0,
      );
    },
  },
  {
    text: "Checkerboard angled plane (rotated 45 degrees around X-axis)",
    onselect: function () {
      heading = pitch = roll = 0.0;
      createModel(
        "../../../Specs/Data/Models/glTF-2.0/ConstantLod/gltf/ConstantLod_Checker_Angled.gltf",
        0,
      );
    },
  },
];

Sandcastle.addToolbarMenu(options);

Sandcastle.addToolbarButton("Heading +15 degrees", function () {
  heading += 15.0;
  createModel(currentUrl, 0);
});

Sandcastle.addToolbarButton("Pitch  +15 degrees", function () {
  pitch += 15.0;
  createModel(currentUrl, 0);
});

Sandcastle.addToolbarButton("Roll  +15 degrees", function () {
  roll += 15.0;
  createModel(currentUrl, 0);
});
