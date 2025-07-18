import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  infoBox: false,
  selectionIndicator: false,
  shadows: true,
  shouldAnimate: true,
});
const scene = viewer.scene;
scene.globe.depthTestAgainstTerrain = true;

if (!scene.sampleHeightSupported) {
  window.alert("This browser does not support sampleHeight.");
}

const longitude = -2.1480545852753163;
const latitude = 0.7688240036937101;
const range = 0.000001;
const duration = 4.0;

const entity = viewer.entities.add({
  position: Cesium.Cartesian3.fromRadians(longitude, latitude),
  model: {
    uri: "../../SampleData/models/GroundVehicle/GroundVehicle.glb",
  },
});

const point = viewer.entities.add({
  position: new Cesium.CallbackProperty(updatePosition, false),
  point: {
    pixelSize: 10,
    color: Cesium.Color.YELLOW,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  },
  label: {
    show: false,
    showBackground: true,
    font: "14px monospace",
    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(5, 5),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  },
});

const objectsToExclude = [point];
const cartographic = new Cesium.Cartographic();

function updatePosition(time, result) {
  const offset = (time.secondsOfDay % duration) / duration;
  cartographic.longitude = longitude - range + offset * range * 2.0;
  cartographic.latitude = latitude;

  let height;
  if (scene.sampleHeightSupported) {
    height = scene.sampleHeight(cartographic, objectsToExclude);
  }

  if (Cesium.defined(height)) {
    cartographic.height = height;
    point.label.text = `${Math.abs(height).toFixed(2).toString()} m`;
    point.label.show = true;
  } else {
    cartographic.height = 0.0;
    point.label.show = false;
  }

  return Cesium.Cartographic.toCartesian(
    cartographic,
    Cesium.Ellipsoid.WGS84,
    result,
  );
}
viewer.trackedEntity = entity;
