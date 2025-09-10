import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  showRenderLoopErrors: false,
  shouldAnimate: true,
});

const videoElement = document.getElementById("trailer");

const sphere = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-79, 39, 1000),
  ellipsoid: {
    radii: new Cesium.Cartesian3(1000, 1000, 1000),
    material: videoElement,
  },
});

viewer.trackedEntity = sphere;

let synchronizer;
Sandcastle.addToggleButton("Clock synchronization", false, function (checked) {
  // By default, the video plays normally and simply shows
  // whatever frame the video is currently on.
  // We can synchronize the video with the scene clock
  // using a VideoSynchronizer.

  if (Cesium.defined(synchronizer)) {
    synchronizer = synchronizer.destroy();
    videoElement.playbackRate = 1.0;
    return;
  }

  synchronizer = new Cesium.VideoSynchronizer({
    clock: viewer.clock,
    element: videoElement,
  });
});

// Since it's just an image material, we can modify the number
// of times the video repeats in each direction..
let isRepeating = true;
Sandcastle.addToggleButton("Image Repeat", isRepeating, function (checked) {
  isRepeating = checked;
});

sphere.ellipsoid.material.repeat = new Cesium.CallbackProperty(function (
  time,
  result,
) {
  if (!Cesium.defined(result)) {
    result = new Cesium.Cartesian2();
  }
  if (isRepeating) {
    result.x = 8;
    result.y = 8;
  } else {
    result.x = 1;
    result.y = 1;
  }
  return result;
}, false);

// Like Image, the video element doesn't have to be part of the DOM or
// otherwise on the screen to be used as a texture.
Sandcastle.addToggleButton("Video Overlay", true, function (checked) {
  if (checked) {
    videoElement.style.display = "";
  } else {
    videoElement.style.display = "none";
  }
});

// Older browsers do not support WebGL video textures,
// put up a friendly error message indicating such.
viewer.scene.renderError.addEventListener(function () {
  if (!videoElement.paused) {
    videoElement.pause();
  }
  viewer.cesiumWidget.showErrorPanel(
    "This browser does not support cross-origin WebGL video textures.",
    "",
    "",
  );
});
