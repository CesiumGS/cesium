import * as Cesium from "cesium";

// Create the viewer
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a red corridor on the globe surface.

// Create the corridor geometry.
let corridorGeometry = new Cesium.CorridorGeometry({
  positions: Cesium.Cartesian3.fromDegreesArray([
    -100.0, 40.0, -105.0, 40.0, -105.0, 35.0,
  ]),
  width: 200000.0,
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
});
// Create a geometry instance using the corridor geometry
// created above. We can also specify a color attribute,
// in this case, we're creating a translucent red color.
const redCorridorInstance = new Cesium.GeometryInstance({
  geometry: corridorGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(1.0, 0.0, 0.0, 0.5),
    ),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: redCorridorInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
    }),
  }),
);

// Example 2: Draw a green corridor at a height.

// Create the corridor geometry.  Use the height option
// to set the corridor distance from the ground.
// In this case, we are also using the corner type
// option to draw mitered corners.
corridorGeometry = new Cesium.CorridorGeometry({
  positions: Cesium.Cartesian3.fromDegreesArray([
    -90.0, 40.0, -95.0, 40.0, -95.0, 35.0,
  ]),
  height: 100000.0,
  width: 200000.0,
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  cornerType: Cesium.CornerType.MITERED,
});
// Create a geometry instance using the corridor geometry
// created above. Set the color attribute to a
// solid green.
const greenCorridorInstance = new Cesium.GeometryInstance({
  geometry: corridorGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.GREEN),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: greenCorridorInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      translucent: false,
    }),
  }),
);

// Example 3: Draw a blue extruded corridor.

// Create the corridor geometry.  To extrude, specify the
// height of the geometry with the extrudedHeight option.
// In this case, we are also using the corner type option
// to draw beveled corners.
corridorGeometry = new Cesium.CorridorGeometry({
  positions: Cesium.Cartesian3.fromDegreesArray([
    -80.0, 40.0, -85.0, 40.0, -85.0, 35.0,
  ]),
  height: 200000.0,
  extrudedHeight: 100000.0,
  width: 200000.0,
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  cornerType: Cesium.CornerType.BEVELED,
});
// Create a geometry instance using the corridor geometry
// created above.
const blueCorridorInstance = new Cesium.GeometryInstance({
  geometry: corridorGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(0.0, 0.0, 1.0, 0.5),
    ),
  },
});
// Add the geometry instance to primitives.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: blueCorridorInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
    }),
  }),
);
