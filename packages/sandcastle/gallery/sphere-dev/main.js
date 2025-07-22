import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Draw a red sphere and position it on the globe surface.

const radius = 300000.0;
// Sphere geometries are initially centered on the origin.
// We can use a model matrix to position the sphere on the
// globe surface.
const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-100.0, 40.0);
const modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, radius),
  new Cesium.Matrix4(),
);
// Create a sphere geometry.
const sphereGeometry = new Cesium.SphereGeometry({
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  radius: radius,
});
// Create a geometry instance using the geometry
// and model matrix created above.
const sphereInstance = new Cesium.GeometryInstance({
  geometry: sphereGeometry,
  modelMatrix: modelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
  },
});
// Add the sphere instance to primitives
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: sphereInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
      closed: true,
    }),
  }),
);
