import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Polyline Glow
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray([
          -120.0, 40.0, -80.0, 40.0,
        ]),
        width: 10.0,
        vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType(Cesium.Material.PolylineGlowType),
    }),
  }),
);

// Polyline Arrow
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray([
          -120.0, 35.0, -80.0, 35.0,
        ]),
        width: 10.0,
        vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType(Cesium.Material.PolylineArrowType),
    }),
  }),
);

// Polyline Outline
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray([
          -120.0, 30.0, -80.0, 30.0,
        ]),
        width: 10.0,
        vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material: Cesium.Material.fromType(Cesium.Material.PolylineOutlineType),
    }),
  }),
);
