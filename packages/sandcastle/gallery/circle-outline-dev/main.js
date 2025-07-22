import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a circle outline on the globe surface.
// Create the circle outline geometry.
let circleOutlineGeometry = new Cesium.CircleOutlineGeometry({
  center: Cesium.Cartesian3.fromDegrees(-100.0, 40.0),
  radius: 200000.0,
});
// Create a geometry instance using the circle outline
// created above.
let circleOutlineInstance = new Cesium.GeometryInstance({
  geometry: circleOutlineGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: circleOutlineInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);

// Example 2: Draw a green extruded circle.
// Create the circle outline geometry.  To extrude, specify
// the height of the geometry with the extrudedHeight option.
// The numberOfVerticalLines option is used to determine
// how many lines connect the top and bottom of the circle.
circleOutlineGeometry = new Cesium.CircleOutlineGeometry({
  center: Cesium.Cartesian3.fromDegrees(-95.0, 40.0),
  radius: 100000.0,
  extrudedHeight: 200000.0,
  numberOfVerticalLines: 16,
});
// Create a geometry instance using the circle outline
// created above.
circleOutlineInstance = new Cesium.GeometryInstance({
  geometry: circleOutlineGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: circleOutlineInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
