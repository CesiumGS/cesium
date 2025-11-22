import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

const polygonGeometry1 = Cesium.CoplanarPolygonGeometry.fromPositions({
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  positions: Cesium.Cartesian3.fromDegreesArrayHeights([
    -91.0, 40.0, 0.0, -90.0, 40.0, 200000.0, -89.0, 40.0, 200000.0, -88.0, 40.0,
    0.0,
  ]),
});

const polygonGeometry2 = new Cesium.CoplanarPolygonGeometry({
  vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  polygonHierarchy: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -99.0, 38.0, 100000, -97.0, 38.0, 100000, -97.0, 40.0, 100000, -99.0,
      40.0, 100000,
    ]),
    holes: [
      {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -98.5, 38.5, 100000, -98.5, 39.5, 100000, -97.5, 39.5, 100000, -97.5,
          38.5, 100000,
        ]),
        holes: [
          {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              -98.25, 38.75, 100000, -97.75, 38.75, 100000, -97.75, 39.25,
              100000, -98.25, 39.25, 100000,
            ]),
          },
        ],
      },
    ],
  },
});

const polygonInstance1 = new Cesium.GeometryInstance({
  geometry: polygonGeometry1,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE),
  },
});

const polygonInstance2 = new Cesium.GeometryInstance({
  geometry: polygonGeometry2,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
  },
});

scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [polygonInstance1, polygonInstance2],
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
      closed: false,
    }),
  }),
);

const polygonGeometry = Cesium.CoplanarPolygonGeometry.fromPositions({
  vertexFormat: Cesium.VertexFormat.ALL,
  positions: Cesium.Cartesian3.fromDegreesArrayHeights([
    -95.0, 40.0, 100000.0, -94.0, 42.0, 200000.0, -93.0, 42.0, 200000.0, -92.0,
    40.0, 100000.0,
  ]),
  stRotation: Cesium.Math.toRadians(-20),
});

const polygonInstance = new Cesium.GeometryInstance({
  geometry: polygonGeometry,
});

scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: polygonInstance,
    appearance: new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType("Checkerboard"),
      materialSupport: Cesium.MaterialAppearance.MaterialSupport.TEXTURED,
    }),
  }),
);
