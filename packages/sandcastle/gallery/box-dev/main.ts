import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Draw a red box and position it on the globe surface.

const dimensions = new Cesium.Cartesian3(400000.0, 300000.0, 500000.0);
// Box geometries are initially centered on the origin.
// We can use a model matrix to position the box on the
// globe surface.
const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-105.0, 45.0);
const boxModelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, dimensions.z * 0.5),
  new Cesium.Matrix4(),
);
// Create a box geometry.
const boxGeometry = Cesium.BoxGeometry.fromDimensions({
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  dimensions: dimensions,
});
// Create a geometry instance using the geometry
// and model matrix created above.
const boxGeometryInstance = new Cesium.GeometryInstance({
  geometry: boxGeometry,
  modelMatrix: boxModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(1.0, 0.0, 0.0, 0.5),
    ),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: boxGeometryInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
    }),
  }),
);
