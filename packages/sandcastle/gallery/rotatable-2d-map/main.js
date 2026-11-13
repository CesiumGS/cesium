import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  sceneMode: Cesium.SceneMode.SCENE2D,
  mapMode2D: Cesium.MapMode2D.ROTATE,
});

viewer.scene.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-73.0, 42.0, 50000000.0),
  orientation: {
    heading: Cesium.Math.toRadians(-45.0),
  },
});
