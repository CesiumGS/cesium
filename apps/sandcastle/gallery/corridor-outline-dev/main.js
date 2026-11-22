import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw the outline of a corridor on the globe surface.
// Create the corridor outline geometry.
let corridorOutlineGeometry = new Cesium.CorridorOutlineGeometry({
  positions: Cesium.Cartesian3.fromDegreesArray([
    -100.0, 40.0, -105.0, 40.0, -105.0, 35.0,
  ]),
  width: 200000.0,
});
// Create the geometry instance.
const corridorOutline = new Cesium.GeometryInstance({
  geometry: corridorOutlineGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Example 2: Draw the outline of an extruded corridor.
// Create the corridor geometry.  To extrude, specify the
// height of the geometry with the extrudedHeight option.
corridorOutlineGeometry = new Cesium.CorridorOutlineGeometry({
  positions: Cesium.Cartesian3.fromDegreesArray([
    -90.0, 40.0, -95.0, 40.0, -95.0, 35.0,
  ]),
  width: 200000.0,
  cornerType: Cesium.CornerType.MITERED,
  extrudedHeight: 100000.0,
});
// Create the geometry instance.
const extrudedCorridorOutline = new Cesium.GeometryInstance({
  geometry: corridorOutlineGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

// Add both corridor outline instances to primitives
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [corridorOutline, extrudedCorridorOutline],
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
