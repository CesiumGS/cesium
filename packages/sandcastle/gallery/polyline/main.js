import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

const viewer = new Cesium.Viewer("cesiumContainer");

const redLine = viewer.entities.add({
  name: "Red line on terrain",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
    width: 5,
    material: Cesium.Color.RED,
    clampToGround: true,
  },
});

const greenRhumbLine = viewer.entities.add({
  name: "Green rhumb line",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
    width: 5,
    arcType: Cesium.ArcType.RHUMB,
    material: Cesium.Color.GREEN,
  },
});

const glowingLine = viewer.entities.add({
  name: "Glowing blue line on the surface",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([-75, 37, -125, 37]),
    width: 10,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.2,
      taperPower: 0.5,
      color: Cesium.Color.CORNFLOWERBLUE,
    }),
  },
});

const orangeOutlined = viewer.entities.add({
  name: "Orange line with black outline at height and following the surface",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 39, 250000, -125, 39, 250000,
    ]),
    width: 5,
    material: new Cesium.PolylineOutlineMaterialProperty({
      color: Cesium.Color.ORANGE,
      outlineWidth: 2,
      outlineColor: Cesium.Color.BLACK,
    }),
  },
});

const purpleArrow = viewer.entities.add({
  name: "Purple straight arrow at height",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 43, 500000, -125, 43, 500000,
    ]),
    width: 10,
    arcType: Cesium.ArcType.NONE,
    material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.PURPLE),
  },
});

const dashedLine = viewer.entities.add({
  name: "Blue dashed line",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -75, 45, 500000, -125, 45, 500000,
    ]),
    width: 4,
    material: new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.CYAN,
    }),
  },
});

viewer.zoomTo(viewer.entities);
