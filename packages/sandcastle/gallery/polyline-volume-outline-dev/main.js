import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw the outline of an extruded square.

// Create a 2D square
function boxPositions() {
  return [
    new Cesium.Cartesian2(-50000, -50000),
    new Cesium.Cartesian2(50000, -50000),
    new Cesium.Cartesian2(50000, 50000),
    new Cesium.Cartesian2(-50000, 50000),
  ];
}
// Create the polyline volume geometry instance.  The shape defined by the
// shapePositions option will be extruded along the polylinePosition
// The corderType option can be set to draw rounded, beveled or mitered corners.
const boxOutline = new Cesium.GeometryInstance({
  geometry: new Cesium.PolylineVolumeOutlineGeometry({
    polylinePositions: Cesium.Cartesian3.fromDegreesArray([
      -89.0, 32.0, -89.0, 36.0, -93.0, 36.0,
    ]),
    shapePositions: boxPositions(),
    cornerType: Cesium.CornerType.MITERED,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Example 2: Draw the outline of an extruded star.

// Create a 2D star shape
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
const starOutline = new Cesium.GeometryInstance({
  geometry: new Cesium.PolylineVolumeOutlineGeometry({
    polylinePositions: Cesium.Cartesian3.fromDegreesArray([
      -95.0, 32.0, -95.0, 36.0,
    ]),
    shapePositions: starPositions(5, 70000, 40000),
    cornerType: Cesium.CornerType.ROUNDED,
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Add all instances to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [boxOutline, starOutline],
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
