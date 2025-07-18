import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a red wall with constant min and max heights

// Use the maximumHeight and minumumHeight options to specify
// the heights of the top and bottom of the wall.
const redWallInstance = new Cesium.GeometryInstance({
  geometry: Cesium.WallGeometry.fromConstantHeights({
    positions: Cesium.Cartesian3.fromDegreesArray([-115.0, 44.0, -90.0, 44.0]),
    maximumHeight: 200000.0,
    minimumHeight: 100000.0,
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
  },
});

// Example 2: Draw a green wall with constant height

// If minumumHeight is not specified, the wall will be
// drawn on the globe surface.
const greenWallInstance = new Cesium.GeometryInstance({
  geometry: Cesium.WallGeometry.fromConstantHeights({
    positions: Cesium.Cartesian3.fromDegreesArray([
      -107.0, 43.0, -97.0, 43.0, -97.0, 40.0, -107.0, 40.0, -107.0, 43.0,
    ]),
    maximumHeight: 100000.0,
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.GREEN),
  },
});

// Example 3: Draw a blue wall with per position heights
// To use per position heights, create an array of heights
// for maximumHeights (and optionally minumumHeights)
// with a length equal to the number of positions.
const positions = Cesium.Cartesian3.fromDegreesArray([
  -115.0, 50.0, -112.5, 50.0, -110.0, 50.0, -107.5, 50.0, -105.0, 50.0, -102.5,
  50.0, -100.0, 50.0, -97.5, 50.0, -95.0, 50.0, -92.5, 50.0, -90.0, 50.0,
]);
const maximumHeights = [
  100000, 200000, 100000, 200000, 100000, 200000, 100000, 200000, 100000,
  200000, 100000,
];
const minimumHeights = [
  0, 100000, 0, 100000, 0, 100000, 0, 100000, 0, 100000, 0,
];

const blueWallInstance = new Cesium.GeometryInstance({
  geometry: new Cesium.WallGeometry({
    positions: positions,
    maximumHeights: maximumHeights,
    minimumHeights: minimumHeights,
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE),
  },
});

// Add all wall instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [blueWallInstance, redWallInstance, greenWallInstance],
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
    }),
  }),
);
