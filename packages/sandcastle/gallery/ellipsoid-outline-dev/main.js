import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Draw a the outline of an ellipsoid and position
// it on the globe surface.

const radii = new Cesium.Cartesian3(200000.0, 200000.0, 300000.0);
const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-102.0, 45.0);
const modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, radii.z),
  new Cesium.Matrix4(),
);
// Create a ellipsoid geometry.
const ellipsoidOutlineGeometry = new Cesium.EllipsoidOutlineGeometry({
  radii: radii,
  stackPartitions: 16,
  slicePartitions: 8,
});
// Create a geometry instance using the geometry
// and model matrix created above.
const ellipseOutlineInstance = new Cesium.GeometryInstance({
  geometry: ellipsoidOutlineGeometry,
  modelMatrix: modelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: ellipseOutlineInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
