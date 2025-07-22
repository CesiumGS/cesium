import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw the outline of an ellipse on the globe surface.

// Create the ellipse outline geometry.
let ellipseOutlineGeometry = new Cesium.EllipseOutlineGeometry({
  center: Cesium.Cartesian3.fromDegrees(-100.0, 40.0),
  semiMinorAxis: 200000.0,
  semiMajorAxis: 300000.0,
});
// Create a geometry instance using the ellipse geometry
// created above.
const ellipseOutlineInstance = new Cesium.GeometryInstance({
  geometry: ellipseOutlineGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Example 3: Draw the outline of an extruded ellipse.

// Create the ellipse geometry.  To extrude, specify the
// height of the geometry with the extrudedHeight option.
// The numberOfVerticalLines option can be used to specify
// the number of lines connecting the top and bottom of the
// ellipse.
ellipseOutlineGeometry = new Cesium.EllipseOutlineGeometry({
  center: Cesium.Cartesian3.fromDegrees(-95.0, 35.0),
  semiMinorAxis: 200000.0,
  semiMajorAxis: 300000.0,
  extrudedHeight: 150000.0,
  rotation: Cesium.Math.toRadians(45),
  numberOfVerticalLines: 10,
});
// Create a geometry instance using the ellipse geometry
// created above.
const extrudedEllipseOutlineInstance = new Cesium.GeometryInstance({
  geometry: ellipseOutlineGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Add both ellipse outline instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [ellipseOutlineInstance, extrudedEllipseOutlineInstance],
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
