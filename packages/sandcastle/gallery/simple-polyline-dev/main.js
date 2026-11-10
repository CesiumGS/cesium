import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a yellow polyline on the globe surface.
const yellowPolyline = new Cesium.GeometryInstance({
  geometry: new Cesium.SimplePolylineGeometry({
    positions: Cesium.Cartesian3.fromDegreesArray([-127, 70, -80, 20]),
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.YELLOW),
  },
});

// Example 2: Create a polyline with per segment coloring.
const positions = [];
const colors = [];
for (let j = 0; j <= 50; j += 5) {
  positions.push(
    Cesium.Cartesian3.fromDegrees(-124.0 + j, 40, 50000.0 * (j % 10)),
  );
  colors.push(Cesium.Color.fromRandom({ alpha: 1.0 }));
}
// For per segment coloring, provide the colors options with an
// array of colors where the length is equal to the number of positions.
// Setting arcType to ArcType.NONE will draw straight lines.
// Otherwise, the polyline curves to the surface of the globe.
const perSegmentPolyline = new Cesium.GeometryInstance({
  geometry: new Cesium.SimplePolylineGeometry({
    positions: positions,
    colors: colors,
    arcType: Cesium.ArcType.NONE,
  }),
});

// Example 3: Draw a polyline with per vertex coloring.

// For per vertex coloring, set the colorsPerVertex option
// to true, and provide the colors options with an array of
// colors where the length is equal to the number of positions.
const perVertexPolyline = new Cesium.GeometryInstance({
  geometry: new Cesium.SimplePolylineGeometry({
    positions: Cesium.Cartesian3.fromDegreesArray([-100, 40, -80, 30]),
    colors: [Cesium.Color.RED, Cesium.Color.BLUE],
    colorsPerVertex: true,
  }),
});

// Add yellow polyline instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: yellowPolyline,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);

// Add perSegment and perVertex polyline instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [perSegmentPolyline, perVertexPolyline],
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
