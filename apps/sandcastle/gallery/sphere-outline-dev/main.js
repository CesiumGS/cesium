import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Draw a the outline of a sphere and position
// it on the globe surface.

const radius = 300000;
const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-98.0, 45.0);
const modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, radius),
  new Cesium.Matrix4(),
);
// Create the sphere outline geometry instance. Use the
// stackPartitions and slicePartitions options to determine
// the number of latitude and longitude lines to draw.
const sphereOutlineInstance = new Cesium.GeometryInstance({
  geometry: new Cesium.SphereOutlineGeometry({
    radius: radius,
    stackPartitions: 8,
    slicePartitions: 12,
  }),
  modelMatrix: modelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});
// Add the instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: sphereOutlineInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
