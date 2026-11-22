import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

function addBillboardAndRectangle() {
  Sandcastle.declare(addBillboardAndRectangle);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-77, 40.5),
    billboard: {
      image: "../images/facility.gif",
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(5.5e6),
    },
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-80.5, 39.7, -75.1, 42.0),
      height: 0.0,
      material: Cesium.Color.RED.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.RED,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 5.5e6),
    },
  });
}

function addPointAndModel() {
  Sandcastle.declare(addPointAndModel);

  const position = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 0.0);
  const heading = Cesium.Math.toRadians(135);
  const hpr = new Cesium.HeadingPitchRoll(heading, 0.0, 0.0);
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    hpr,
  );

  viewer.entities.add({
    position: position,
    orientation: orientation,
    point: {
      pixelSize: 10,
      color: Cesium.Color.YELLOW,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(250.5),
    },
    model: {
      uri: "../../SampleData/models/GroundVehicle/GroundVehicle.glb",
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 250.5),
    },
  });
}

Sandcastle.addToolbarMenu([
  {
    text: "Billboard and Primitive",
    onselect: function () {
      addBillboardAndRectangle();
      Sandcastle.highlight(addBillboardAndRectangle);
    },
  },
  {
    text: "Point and Model",
    onselect: function () {
      addPointAndModel();
      Sandcastle.highlight(addPointAndModel);
    },
  },
]);

Sandcastle.reset = function () {
  viewer.camera.flyHome(0);
  viewer.entities.removeAll();
};
