import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a red rectangle on the globe surface.
const redRectangleInstance = new Cesium.GeometryInstance({
  geometry: new Cesium.RectangleGeometry({
    rectangle: Cesium.Rectangle.fromDegrees(-110.0, 20.0, -80.0, 25.0),
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(1.0, 0.0, 0.0, 0.5),
    ),
  },
});

// Example 2: Draw a green extruded rectangle.

// The extrudedHeight option is used to set the height of the
// extruded side.  The height option is used to specify the distnace
// from the globe surface to the rectangle.  The rotation
// option can also be used to rotate the rectangle.
const greenRectangleInstance = new Cesium.GeometryInstance({
  geometry: new Cesium.RectangleGeometry({
    rectangle: Cesium.Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0),
    rotation: Cesium.Math.toRadians(45),
    extrudedHeight: 300000.0,
    height: 100000.0,
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(0.0, 1.0, 0.0, 0.5),
    ),
  },
});

// Add both rectangle instances to primitives
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [redRectangleInstance, greenRectangleInstance],
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
    }),
  }),
);
