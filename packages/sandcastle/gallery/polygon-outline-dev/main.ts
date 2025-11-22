import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw the outline of a polygon on the globe surface.
let positions = Cesium.Cartesian3.fromDegreesArray([
  -95, 37.0, -95, 32.0, -90, 33.0, -87, 31.0, -87, 35.0,
]);
const polygonOutlineInstance = new Cesium.GeometryInstance({
  geometry: Cesium.PolygonOutlineGeometry.fromPositions({
    positions: positions,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Example 2: Draw a polygon outline with holes.

// To draw a polygon with holes, create a nested position
// hierarchy defining the positions of the polygon
// edges and the positions of the holes.
const polygonHierarchy = {
  positions: Cesium.Cartesian3.fromDegreesArray([
    -108.0, 30.0, -98.0, 30.0, -98.0, 40.0, -108.0, 40.0,
  ]),
  holes: [
    {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -106.0, 31.0, -106.0, 39.0, -100.0, 39.0, -100.0, 31.0,
      ]),
    },
  ],
};
// To extrude, use the extrudedHeight option to specify the
// height of the polygon.
const extrudedPolygonOutlineInstance = new Cesium.GeometryInstance({
  geometry: new Cesium.PolygonOutlineGeometry({
    polygonHierarchy: polygonHierarchy,
    extrudedHeight: 500000.0,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Example 3: Draw a polygon outline with per position heights.
positions = Cesium.Cartesian3.fromDegreesArrayHeights([
  -95, 44.0, 400000, -95, 39.0, 100000, -87, 42.0, 100000,
]);
// Set the perPositionHeight option to true for the polygon
// to use the heights each position.
const perPositionPolygonOutlineInstance = new Cesium.GeometryInstance({
  geometry: Cesium.PolygonOutlineGeometry.fromPositions({
    positions: positions,
    perPositionHeight: true,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Add all polyline outlines instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [
      polygonOutlineInstance,
      extrudedPolygonOutlineInstance,
      perPositionPolygonOutlineInstance,
    ],
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
