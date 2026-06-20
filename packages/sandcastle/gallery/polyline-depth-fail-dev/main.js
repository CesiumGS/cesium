import * as Cesium from "cesium";

// A note on ground polylines and depth fail:
//
// GroundPolylinePrimitive drapes a line onto the terrain surface using a
// shadow-volume technique, so the line is always *on* the terrain. It has no
// "in front of" / "behind" terrain state, which is why it does not expose a
// depth-fail color.
//
// The red-in-front / yellow-behind effect requires a regular polyline that
// floats at altitude and can be occluded by terrain. A Primitive built from
// PolylineGeometry supports this directly through Primitive.depthFailAppearance:
//   - appearance:           used where the line passes the depth test (visible).
//   - depthFailAppearance:  used where the line fails the depth test (occluded).

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// World terrain is required for the line to actually be occluded by mountains.
scene.setTerrain(Cesium.Terrain.fromWorldTerrain());

// A straight line at a constant height across a mountainous region near
// Grand Teton, WY. Parts of it will sit in front of ridges; parts will be
// hidden behind them.
const positions = Cesium.Cartesian3.fromDegreesArrayHeights([
  -110.9, 43.6, 2600.0, -110.7, 43.78, 2600.0, -110.5, 43.6, 2600.0,
]);

scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: positions,
        width: 5.0,
        vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
      }),
    }),
    // Shown where the line is in front of terrain.
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType("Color", {
        color: Cesium.Color.RED,
      }),
    }),
    // Shown where the line is occluded by terrain.
    depthFailAppearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType("Color", {
        color: Cesium.Color.YELLOW,
      }),
    }),
  }),
);

scene.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-110.7, 43.4, 8000.0),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-15.0),
    roll: 0.0,
  },
});
