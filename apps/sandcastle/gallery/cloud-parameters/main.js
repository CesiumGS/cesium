import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;
const position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 50);

function getColor(colorName) {
  return Cesium.Color[colorName.toUpperCase()];
}
// These noise parameters are set to default, but can be changed
// to produce different cloud results. However, the noise is precomputed,
// so this cannot be changed dynamically.
const clouds = scene.primitives.add(
  new Cesium.CloudCollection({
    noiseDetail: 16.0,
    noiseOffset: Cesium.Cartesian3.ZERO,
  }),
);

const cloudParameters = {
  scaleWithMaximumSize: true,
  scaleX: 25,
  scaleY: 12,
  maximumSizeX: 25,
  maximumSizeY: 12,
  maximumSizeZ: 15,
  renderSlice: true, // if false, renders the entire surface of the ellipsoid
  slice: 0.36,
  brightness: 1.0,
  color: "White",
  colors: ["White", "Red", "Green", "Blue", "Yellow", "Gray"],
};

const cloud = clouds.add({
  position: position,
  scale: new Cesium.Cartesian2(cloudParameters.scaleX, cloudParameters.scaleY),
  maximumSize: new Cesium.Cartesian3(
    cloudParameters.maximumSizeX,
    cloudParameters.maximumSizeY,
    cloudParameters.maximumSizeZ,
  ),
  color: getColor(cloudParameters.color),
  slice: cloudParameters.renderSlice ? cloudParameters.slice : -1.0,
  brightness: cloudParameters.brightness,
});

Cesium.knockout.track(cloudParameters);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(cloudParameters, toolbar);

Cesium.knockout
  .getObservable(cloudParameters, "scaleWithMaximumSize")
  .subscribe(function (newValue) {
    if (Boolean(newValue)) {
      cloudParameters.scaleX = cloudParameters.maximumSizeX;
      cloudParameters.scaleY = cloudParameters.maximumSizeY;
    }
  });

Cesium.knockout
  .getObservable(cloudParameters, "scaleX")
  .subscribe(function (newValue) {
    const value = Number(newValue);
    cloud.scale = new Cesium.Cartesian2(value, cloud.scale.y);
  });

Cesium.knockout
  .getObservable(cloudParameters, "scaleY")
  .subscribe(function (newValue) {
    const value = Number(newValue);
    cloud.scale = new Cesium.Cartesian2(cloud.scale.x, value);
  });

Cesium.knockout
  .getObservable(cloudParameters, "maximumSizeX")
  .subscribe(function (newValue) {
    const value = Number(newValue);
    cloud.maximumSize = new Cesium.Cartesian3(
      value,
      cloud.maximumSize.y,
      cloud.maximumSize.z,
    );
    if (cloudParameters.scaleWithMaximumSize) {
      cloud.scale = new Cesium.Cartesian2(value, cloud.scale.y);
    }
  });

Cesium.knockout
  .getObservable(cloudParameters, "maximumSizeY")
  .subscribe(function (newValue) {
    const value = Number(newValue);
    cloud.maximumSize = new Cesium.Cartesian3(
      cloud.maximumSize.x,
      value,
      cloud.maximumSize.z,
    );
    if (cloudParameters.scaleWithMaximumSize) {
      cloud.scale = new Cesium.Cartesian2(cloud.scale.x, value);
    }
  });

Cesium.knockout
  .getObservable(cloudParameters, "maximumSizeZ")
  .subscribe(function (newValue) {
    const value = Number(newValue);
    cloud.maximumSize = new Cesium.Cartesian3(
      cloud.maximumSize.x,
      cloud.maximumSize.y,
      value,
    );
  });

Cesium.knockout
  .getObservable(cloudParameters, "renderSlice")
  .subscribe(function (newValue) {
    if (Boolean(newValue)) {
      cloud.slice = Number(cloudParameters.slice);
    } else {
      cloud.slice = -1.0;
    }
  });

Cesium.knockout
  .getObservable(cloudParameters, "slice")
  .subscribe(function (newValue) {
    cloud.slice = Number(newValue);
  });

Cesium.knockout
  .getObservable(cloudParameters, "color")
  .subscribe(function (newValue) {
    cloud.color = getColor(newValue);
  });

Cesium.knockout
  .getObservable(cloudParameters, "brightness")
  .subscribe(function (newValue) {
    cloud.brightness = Number(newValue);
  });

viewer.camera.lookAt(position, new Cesium.Cartesian3(30, 30, -10));
