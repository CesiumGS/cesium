import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Create the outline of a rectangle.

// Create the rectangle outline instace.
const instance = new Cesium.GeometryInstance({
  geometry: new Cesium.RectangleOutlineGeometry({
    rectangle: Cesium.Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0),
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Add the rectangle outline instance to primitives.
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
