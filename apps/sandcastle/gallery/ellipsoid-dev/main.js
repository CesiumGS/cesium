import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Draw a blue ellipsoid and position it on the globe surface.

const radii = new Cesium.Cartesian3(200000.0, 200000.0, 300000.0);
// Ellipsoid geometries are initially centered on the origin.
// We can use a model matrix to position the ellipsoid on the
// globe surface.
const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-100.0, 40.0);
const modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, radii.z),
  new Cesium.Matrix4(),
);
// Create a ellipsoid geometry.
const ellipsoidGeometry = new Cesium.EllipsoidGeometry({
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  radii: radii,
});
// Create a geometry instance using the geometry
// and model matrix created above.
const ellipsoidInstance = new Cesium.GeometryInstance({
  geometry: ellipsoidGeometry,
  modelMatrix: modelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: ellipsoidInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
      closed: true,
    }),
  }),
);
