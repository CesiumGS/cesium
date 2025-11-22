import * as Cesium from "cesium";

// Click the projection picker to switch between orthographic and perspective projections.
const viewer = new Cesium.Viewer("cesiumContainer", {
  projectionPicker: true,
});

// start with orthographic projection
viewer.projectionPicker.viewModel.switchToOrthographic();

const position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 0.0);
const hpr = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(135), 0.0, 0.0);
const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

const entity = viewer.entities.add({
  position: position,
  orientation: orientation,
  model: {
    uri: "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
    minimumPixelSize: 128,
    maximumScale: 20000,
  },
});
viewer.trackedEntity = entity;
