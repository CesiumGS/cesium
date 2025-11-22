import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a green cylinder and position with
// a model matrix.

// Cylinder geometries are initially centered on the origin.
// We can use a model matrix to position the cylinder on the
// globe surface.
const length = 400000.0;
let positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-100.0, 40.0);
let modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, length * 0.5),
  new Cesium.Matrix4(),
);
// Create the cylinder geometry.
let cylinderGeometry = new Cesium.CylinderGeometry({
  length: length,
  topRadius: 200000.0,
  bottomRadius: 200000.0,
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
});
// Create a geometry instance using the cylinder geometry
// created above. We can also specify a color attribute,
// in this case, we're creating a solid green color.
const greenCylinder = new Cesium.GeometryInstance({
  geometry: cylinderGeometry,
  modelMatrix: modelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.GREEN),
  },
});

// Example 2: Draw a red cone and position with
// a model matrix.
positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-105.0, 40.0);
modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, length * 0.5),
  new Cesium.Matrix4(),
);
// Create the cylinder geometry.  To create a cone, set the
// top radius to zero.
cylinderGeometry = new Cesium.CylinderGeometry({
  length: length,
  topRadius: 0.0,
  bottomRadius: 200000.0,
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
});
// Create a geometry instance using the cylinder geometry
// created above.
const redCone = new Cesium.GeometryInstance({
  geometry: cylinderGeometry,
  modelMatrix: modelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
  },
});

// Add both instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [greenCylinder, redCone],
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      translucent: false,
    }),
  }),
);
