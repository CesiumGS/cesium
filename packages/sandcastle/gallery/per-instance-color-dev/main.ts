import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

const instances = [];

for (let i = 0; i < 4; i++) {
  instances.push(
    new Cesium.GeometryInstance({
      geometry: new Cesium.RectangleGeometry({
        rectangle: Cesium.Rectangle.fromDegrees(
          -120.0 + i * 10,
          30.0,
          -110.0 + i * 10,
          40.0,
        ),
        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.fromRandom({ alpha: 0.7 }),
        ),
      },
    }),
  );
}

scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance(),
  }),
);
