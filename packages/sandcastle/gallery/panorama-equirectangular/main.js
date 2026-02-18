import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.scene.globe.show = false;

// Define the sphere's geographic location (longitude, latitude, height)
const longitude = -122.4175;
const latitude = 37.655;
const height = 100;

// Convert to Cartesian3 position
const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);

// Create a transform matrix to place the sphere at the correct location
const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);

const image =
  "https://upload.wikimedia.org/wikipedia/commons/0/08/Laon_Cathedral_Interior_360x180%2C_Picardy%2C_France_-_Diliff.jpg";

const credit = new Cesium.Credit(
  "Photo by DAVID ILIFF. " +
    "Interior of Laon Cathedral, France. " +
    "Licensed under " +
    '<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">' +
    "CC BY-SA 3.0</a>.",
);

const panorama = new Cesium.EquirectangularPanorama({
  transform,
  image,
  credit,
});

// Add the primitive to the scene
viewer.scene.primitives.add(panorama);

// Lock the camera to this position
viewer.scene.camera.lookAt(
  position,
  new Cesium.HeadingPitchRange(
    0,
    0,
    2, // small offset to allow rotation
  ),
);

// Allow camera to rotate and tilt, but disable zoom and translation to keep the user in the panorama
const controller = viewer.scene.screenSpaceCameraController;
controller.enableRotate = true;
controller.enableZoom = false;
controller.enableTilt = true;
controller.enableTranslate = false;
