import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Example 1: Draw a red polyline on the globe surface

scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray([
          -124.0, 40.0, -80.0, 40.0,
        ]),
        width: 5.0,
        vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(1.0, 0.0, 0.0, 0.8),
        ),
      },
    }),
    appearance: new Cesium.PolylineColorAppearance(),
  }),
);

// Example 2: Draw a straight blue polyline

// Setting the arcType option to ArcType.NONE will allow
// you to draw a straight polyline.  Otherwise, it will
// curve to the globe surface.
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -84.0, 50.0, 0.0, -100.0, 30.0, 1000000.0,
        ]),
        width: 5.0,
        vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        arcType: Cesium.ArcType.NONE,
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.BLUE,
        ),
      },
    }),
    appearance: new Cesium.PolylineColorAppearance(),
  }),
);
