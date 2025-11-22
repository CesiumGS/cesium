import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

const polygonOutline1 = new Cesium.GeometryInstance({
  geometry: Cesium.CoplanarPolygonOutlineGeometry.fromPositions({
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      -94.0, 40.0, 0.0, -93.0, 40.0, 200000.0, -92.0, 40.0, 200000.0, -91.0,
      40.0, 0.0,
    ]),
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

const polygonOutline2 = new Cesium.GeometryInstance({
  geometry: new Cesium.CoplanarPolygonOutlineGeometry({
    polygonHierarchy: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -99.0, 38.0, 100000, -97.0, 38.0, 100000, -97.0, 40.0, 100000, -99.0,
        40.0, 100000,
      ]),
      holes: [
        {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([
            -98.5, 38.5, 100000, -98.5, 39.5, 100000, -97.5, 39.5, 100000,
            -97.5, 38.5, 100000,
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
  }),
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
  },
});

scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [polygonOutline1, polygonOutline2],
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
  }),
);
