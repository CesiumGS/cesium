import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Checkerboard Wall
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.WallGeometry({
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -95.5, 50.0, 300000.0, -90.5, 50.0, 300000.0,
        ]),
        vertexFormat:
          Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
      }),
    }),
    appearance: new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType("Checkerboard"),
      materialSupport: Cesium.MaterialAppearance.MaterialSupport.TEXTURED,
    }),
  }),
);

// Striped Wall
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.WallGeometry({
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -100.5, 50.0, 300000.0, -95.5, 50.0, 300000.0,
        ]),
        vertexFormat:
          Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
      }),
    }),
    appearance: new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType("Stripe"),
      materialSupport: Cesium.MaterialAppearance.MaterialSupport.TEXTURED,
    }),
  }),
);
