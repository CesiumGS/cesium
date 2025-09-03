import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a red tube on the globe surface.

// Create positions for a 2D circle.
function computeCircle(radius) {
  const positions = [];
  for (let i = 0; i < 360; i++) {
    const radians = Cesium.Math.toRadians(i);
    positions.push(
      new Cesium.Cartesian2(
        radius * Math.cos(radians),
        radius * Math.sin(radians),
      ),
    );
  }
  return positions;
}
// Create the polyline volume geometry instance.  The shape defined by the
// shapePositions option will be extruded along the polylinePositions.
const redTube = new Cesium.GeometryInstance({
  geometry: new Cesium.PolylineVolumeGeometry({
    polylinePositions: Cesium.Cartesian3.fromDegreesArray([
      -85.0, 32.0, -85.0, 36.0, -89.0, 36.0,
    ]),
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    shapePositions: computeCircle(60000.0),
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
  },
});

// Example 2: Draw a green extruded square.

// Create positions for a 2D square
function boxPositions() {
  return [
    new Cesium.Cartesian2(-50000, -50000),
    new Cesium.Cartesian2(50000, -50000),
    new Cesium.Cartesian2(50000, 50000),
    new Cesium.Cartesian2(-50000, 50000),
  ];
}
// Create the polyline volume geometry instance.  The corderType option
// can be set to draw rounded, beveled or mitered corners.
const greenBox = new Cesium.GeometryInstance({
  geometry: new Cesium.PolylineVolumeGeometry({
    polylinePositions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -90.0, 32.0, 0.0, -90.0, 36.0, 100000.0, -94.0, 36.0, 0.0,
    ]),
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    shapePositions: boxPositions(),
    cornerType: Cesium.CornerType.BEVELED,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.GREEN),
  },
});

// Example 3: Draw a blue extruded star.

// Create positions for a 2D star.
function starPositions(arms, rOuter, rInner) {
  const angle = Math.PI / arms;
  const pos = [];
  for (let i = 0; i < 2 * arms; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const p = new Cesium.Cartesian2(
      Math.cos(i * angle) * r,
      Math.sin(i * angle) * r,
    );
    pos.push(p);
  }
  return pos;
}
// Create the polyline volume geometry instance.
const blueStar = new Cesium.GeometryInstance({
  geometry: new Cesium.PolylineVolumeGeometry({
    polylinePositions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -95.0, 32.0, 0.0, -95.0, 36.0, 100000.0, -99.0, 36.0, 200000.0,
    ]),
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    shapePositions: starPositions(7, 70000, 50000),
    cornerType: Cesium.CornerType.ROUNDED,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE),
  },
});

// Add all instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [redTube, greenBox, blueStar],
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
      closed: true,
    }),
  }),
);
