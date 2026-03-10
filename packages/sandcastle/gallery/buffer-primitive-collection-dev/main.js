import * as Cesium from "cesium";

function createPrimitives(scene) {
  const collection = new Cesium.BufferPolylineCollection({
    primitiveCountMax: 1024,
    vertexCountMax: 1024,
  });

  scene.primitives.add(collection);

  const degreesArray = [-105.0, 40.0, -100.0, 38.0, -105.0, 35.0, -100.0, 32.0];

  const positions = Cesium.Cartesian3.packArray(
    Cesium.Cartesian3.fromDegreesArray(degreesArray),
    new Float64Array((degreesArray.length * 3) / 2),
  );

  const polyline = new Cesium.BufferPolyline();
  collection.add({ positions }, polyline);
  polyline.setColor(Cesium.Color.RED);
  polyline.width = 10;
}

const viewer = new Cesium.Viewer("cesiumContainer");

createPrimitives(viewer.scene);
