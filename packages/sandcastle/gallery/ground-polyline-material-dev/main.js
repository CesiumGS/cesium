import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
const scene = viewer.scene;

if (!Cesium.GroundPolylinePrimitive.isSupported(scene)) {
  window.alert("Polylines on terrain are not supported on this platform.");
}

// Polyline Glow
scene.groundPrimitives.add(
  new Cesium.GroundPolylinePrimitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.GroundPolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray([
          -122.2558, 46.1955, -122.1058, 46.1955,
        ]),
        width: 10.0,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType(Cesium.Material.PolylineGlowType),
    }),
  }),
);

// Polyline Dash
scene.groundPrimitives.add(
  new Cesium.GroundPolylinePrimitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.GroundPolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray([
          -122.2558, 46.1975, -122.1058, 46.1975,
        ]),
        width: 10.0,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType(Cesium.Material.PolylineDashType),
    }),
  }),
);

// Polyline Outline
scene.groundPrimitives.add(
  new Cesium.GroundPolylinePrimitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.GroundPolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray([
          -122.2558, 46.1995, -122.1058, 46.1995,
        ]),
        width: 10.0,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType(Cesium.Material.PolylineOutlineType),
    }),
  }),
);

viewer.camera.lookAt(
  Cesium.Cartesian3.fromDegrees(-122.2058, 46.1955, 1000.0),
  new Cesium.Cartesian3(5000.0, 5000.0, 5000.0),
);
viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
