import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a polyline with per segment colors
let positions = [];
let colors = [];
let i;
for (i = 0; i < 12; ++i) {
  positions.push(Cesium.Cartesian3.fromDegrees(-124.0 + 5 * i, 40.0));
  colors.push(Cesium.Color.fromRandom({ alpha: 1.0 }));
}
// For per segment coloring, supply the colors option with
// an array of colors for each segment.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: positions,
        width: 5.0,
        vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        colors: colors,
      }),
    }),
    appearance: new Cesium.PolylineColorAppearance(),
  }),
);

// Example 2: Draw a polyline with per vertex colors
positions = [];
colors = [];
for (i = 0; i < 12; ++i) {
  positions.push(Cesium.Cartesian3.fromDegrees(-124.0 + 5 * i, 35.0));
  colors.push(Cesium.Color.fromRandom({ alpha: 1.0 }));
}
// For per segment coloring, supply the colors option with
// an array of colors for each vertex.  Also set the
// colorsPerVertex option to true.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: positions,
        width: 5.0,
        vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        colors: colors,
        colorsPerVertex: true,
      }),
    }),
    appearance: new Cesium.PolylineColorAppearance(),
  }),
);
