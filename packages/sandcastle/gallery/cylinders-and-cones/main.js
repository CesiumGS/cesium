import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

const viewer = new Cesium.Viewer("cesiumContainer");

const greenCylinder = viewer.entities.add({
  name: "Green cylinder with black outline",
  position: Cesium.Cartesian3.fromDegrees(-100.0, 40.0, 200000.0),
  cylinder: {
    length: 400000.0,
    topRadius: 200000.0,
    bottomRadius: 200000.0,
    material: Cesium.Color.GREEN.withAlpha(0.5),
    outline: true,
    outlineColor: Cesium.Color.BLACK,
  },
});

const redCone = viewer.entities.add({
  name: "Red cone",
  position: Cesium.Cartesian3.fromDegrees(-105.0, 40.0, 200000.0),
  cylinder: {
    length: 400000.0,
    topRadius: 0.0,
    bottomRadius: 200000.0,
    material: Cesium.Color.RED,
  },
});

viewer.zoomTo(viewer.entities);
