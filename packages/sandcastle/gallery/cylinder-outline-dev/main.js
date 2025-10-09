import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Create a cyliner outline and position on the globe
// surface using a model matrix.

// Create the model matrix.
const length = 400000.0;
const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-100.0, 40.0);
const modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
  new Cesium.Cartesian3(0.0, 0.0, length * 0.5),
  new Cesium.Matrix4(),
);
// Create the cylinder outline geometry.  The numberOfVerticalLines
// option can be used to specify the number of lines connecting
// the top and bottom of the cylinder.
const cylinderOutlineGeometry = new Cesium.CylinderOutlineGeometry({
  length: length,
  topRadius: 150000.0,
  bottomRadius: 150000.0,
  numberOfVerticalLines: 16,
});
// Create a geometry instance using the geometry.
const cylinderOutline = new Cesium.GeometryInstance({
  geometry: cylinderOutlineGeometry,
  modelMatrix: modelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});
// Add the instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: cylinderOutline,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
