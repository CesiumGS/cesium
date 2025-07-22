import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a red ellipse on the globe surface.

// Create the ellipse geometry.
let ellipseGeometry = new Cesium.EllipseGeometry({
  center: Cesium.Cartesian3.fromDegrees(-100.0, 40.0),
  semiMinorAxis: 300000.0,
  semiMajorAxis: 400000.0,
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
});
// Create a geometry instance using the ellipse geometry
// created above. We can also specify a color attribute,
// in this case, we're creating a solid red color.
const redEllipseInstance = new Cesium.GeometryInstance({
  geometry: ellipseGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
  },
});

// Example 2: Draw a green ellipse at a height.

// Create the ellipse geometry.  Use the height option
// to set the distance from the ground.  In this case,
// the rotation option is used to draw the ellipse at
// a 45 degree angle.
ellipseGeometry = new Cesium.EllipseGeometry({
  center: Cesium.Cartesian3.fromDegrees(-95.0, 35.0),
  semiMinorAxis: 200000.0,
  semiMajorAxis: 400000.0,
  rotation: Cesium.Math.toRadians(45),
  height: 200000.0,
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
});
// Create a geometry instance using the ellipse geometry
// created above.
const greenEllipseInstance = new Cesium.GeometryInstance({
  geometry: ellipseGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.GREEN),
  },
});

// Example 3: Draw a blue extruded ellipse.

// Create the ellipse geometry.  To extrude, specify the
// height of the geometry with the extrudedHeight option.
ellipseGeometry = new Cesium.EllipseGeometry({
  center: Cesium.Cartesian3.fromDegrees(-90.0, 40.0),
  semiMinorAxis: 200000.0,
  semiMajorAxis: 300000.0,
  extrudedHeight: 200000.0,
  rotation: Cesium.Math.toRadians(90),
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
});
// Create a geometry instance using the ellipse geometry
// created above.
const blueEllipseInstance = new Cesium.GeometryInstance({
  geometry: ellipseGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE),
  },
});

// Add all ellipse instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [
      redEllipseInstance,
      greenEllipseInstance,
      blueEllipseInstance,
    ],
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
      closed: true,
    }),
  }),
);
