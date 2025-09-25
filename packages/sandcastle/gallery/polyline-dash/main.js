import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

const viewer = new Cesium.Viewer("cesiumContainer");

const redLine = viewer.entities.add({
  name: "Red dashed line",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 38, 250000, -125, 38, 250000,
    ]),
    width: 5,
    material: new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.RED,
    }),
  },
});

const blueLine = viewer.entities.add({
  name: "Wide blue dashed line with a gap color",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 40, 250000, -125, 40, 250000,
    ]),
    width: 30,
    material: new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.BLUE,
      gapColor: Cesium.Color.YELLOW,
    }),
  },
});

const orangeLine = viewer.entities.add({
  name: "Orange dashed line with a short dash length",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 42, 250000, -125, 42, 250000,
    ]),
    width: 5,
    material: new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.ORANGE,
      dashLength: 8.0,
    }),
  },
});

const cyanLine = viewer.entities.add({
  name: "Cyan dashed line with a dash pattern.",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 44, 250000, -125, 44, 250000,
    ]),
    width: 10,
    material: new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.CYAN,
      dashPattern: parseInt("110000001111", 2),
    }),
  },
});

const yellowLine = viewer.entities.add({
  name: "Yellow dashed line with a dash pattern.",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 46, 250000, -125, 46, 250000,
    ]),
    width: 10,
    material: new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.YELLOW,
      dashPattern: parseInt("1010101010101010", 2),
    }),
  },
});

viewer.zoomTo(viewer.entities);
