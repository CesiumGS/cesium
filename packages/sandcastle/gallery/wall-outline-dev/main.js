import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Create the instance of the wall geometry outline.
const instance = new Cesium.GeometryInstance({
  geometry: new Cesium.WallOutlineGeometry.fromConstantHeights({
    positions: Cesium.Cartesian3.fromDegreesArray([-120.0, 60.0, -90.0, 60.0]),
    maximumHeight: 500000,
  }),
  attributes: {
    color: new Cesium.ColorGeometryInstanceAttribute.fromColor(
      Cesium.Color.WHITE,
    ),
  },
});

// Add the instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: instance,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
