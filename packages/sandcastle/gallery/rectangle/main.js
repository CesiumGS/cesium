import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

const viewer = new Cesium.Viewer("cesiumContainer");

const redRectangle = viewer.entities.add({
  name: "Red translucent rectangle",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-110.0, 20.0, -80.0, 25.0),
    material: Cesium.Color.RED.withAlpha(0.5),
  },
});

const greenRectangle = viewer.entities.add({
  name: "Green translucent, rotated, and extruded rectangle at height with outline",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-110.0, 30.0, -100.0, 40.0),
    material: Cesium.Color.GREEN.withAlpha(0.5),
    rotation: Cesium.Math.toRadians(45),
    extrudedHeight: 300000.0,
    height: 100000.0,
    outline: true, // height must be set for outline to display
    outlineColor: Cesium.Color.BLACK,
  },
});

let rotation = Cesium.Math.toRadians(30);

function getRotationValue() {
  rotation += 0.005;
  return rotation;
}
viewer.entities.add({
  name: "Rotating rectangle with rotating texture coordinate",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-92.0, 30.0, -76.0, 40.0),
    material: "../images/Cesium_Logo_Color.jpg",
    rotation: new Cesium.CallbackProperty(getRotationValue, false),
    stRotation: new Cesium.CallbackProperty(getRotationValue, false),
    classificationType: Cesium.ClassificationType.TERRAIN,
  },
});

viewer.zoomTo(viewer.entities);
