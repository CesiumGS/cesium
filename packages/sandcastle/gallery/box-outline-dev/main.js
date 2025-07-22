import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Draw the outline of a box.

const dimensions = new Cesium.Cartesian3(400000.0, 400000.0, 400000.0);

// Box geometries are initially centered on the origin.
// We can use a model matrix to position the box on the
// globe surface.
const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-106.0, 45.0);
const boxModelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, dimensions.z * 0.5),
  new Cesium.Matrix4(),
);

// Create a box outline geometry.
const boxOutlineGeometry = Cesium.BoxOutlineGeometry.fromDimensions({
  dimensions: dimensions,
});

// Create a geometry instance using the geometry
// and model matrix created above.
const boxOutlineInstance = new Cesium.GeometryInstance({
  geometry: boxOutlineGeometry,
  modelMatrix: boxModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: boxOutlineInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
