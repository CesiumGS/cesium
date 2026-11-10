import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

const viewer = new Cesium.Viewer("cesiumContainer");

const greenCircle = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-111.0, 40.0, 150000.0),
  name: "Green circle at height with outline",
  ellipse: {
    semiMinorAxis: 300000.0,
    semiMajorAxis: 300000.0,
    height: 200000.0,
    material: Cesium.Color.GREEN,
    outline: true, // height must be set for outline to display
  },
});

const redEllipse = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-103.0, 40.0),
  name: "Red ellipse on surface",
  ellipse: {
    semiMinorAxis: 250000.0,
    semiMajorAxis: 400000.0,
    material: Cesium.Color.RED.withAlpha(0.5),
  },
});

const blueEllipse = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 100000.0),
  name: "Blue translucent, rotated, and extruded ellipse with outline",
  ellipse: {
    semiMinorAxis: 150000.0,
    semiMajorAxis: 300000.0,
    extrudedHeight: 200000.0,
    rotation: Cesium.Math.toRadians(45),
    material: Cesium.Color.BLUE.withAlpha(0.5),
    outline: true,
  },
});

viewer.zoomTo(viewer.entities);
