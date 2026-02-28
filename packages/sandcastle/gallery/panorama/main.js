import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.scene.globe.show = false;
const controller = viewer.scene.screenSpaceCameraController;

const equirectangularFromFile = () => {
  const position = Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 100);

  // Create a transform matrix to locate and orient the panorama
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

  viewer.scene.primitives.add(panorama);

  viewer.scene.camera.lookAt(
    position,
    new Cesium.HeadingPitchRange(
      0,
      0,
      2, // small offset to allow rotation
    ),
  );
  // Allow camera to rotate and tilt, but disable zoom and translation to keep the user in the panorama
  controller.enableZoom = false;
  controller.enableTranslate = false;
};

const cubeMapFromFiles = () => {
  const position = Cesium.Cartesian3.fromDegrees(104.923323, 11.569967, 0);

  // Create a transform matrix to orient the panorama
  const matrix4 = Cesium.Transforms.localFrameToFixedFrameGenerator(
    "north",
    "down",
  )(position, Cesium.Ellipsoid.default);

  const transform = Cesium.Matrix4.getMatrix3(matrix4, new Cesium.Matrix3());

  const credit = new Cesium.Credit(
    "Image by Kiensvay via Wikimedia Commons " +
      "Licensed under " +
      '<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank">' +
      "CC BY-SA 4.0</a>.",
  );

  const cubeMapPanorama = new Cesium.CubeMapPanorama({
    sources: {
      positiveZ:
        "https://upload.wikimedia.org/wikipedia/commons/3/37/360%C2%B0_Phnom_Penh_%28Central_Market_2022%29_%28left%29.jpg",
      negativeZ:
        "https://upload.wikimedia.org/wikipedia/commons/1/1b/360%C2%B0_Phnom_Penh_%28Central_Market_2022%29_%28right%29.jpg",
      positiveY:
        "https://upload.wikimedia.org/wikipedia/commons/7/73/360%C2%B0_Phnom_Penh_%28Central_Market_2022%29_%28down%29.jpg",
      negativeY:
        "https://upload.wikimedia.org/wikipedia/commons/d/de/360%C2%B0_Phnom_Penh_%28Central_Market_2022%29_%28up%29.jpg",
      negativeX:
        "https://upload.wikimedia.org/wikipedia/commons/2/2e/360%C2%B0_Phnom_Penh_%28Central_Market_2022%29_%28back%29.jpg",
      positiveX:
        "https://upload.wikimedia.org/wikipedia/commons/d/db/360%C2%B0_Phnom_Penh_%28Central_Market_2022%29_%28front%29.jpg",
    },
    transform,
    credit,
  });
  viewer.scene.camera.lookAt(
    position,
    new Cesium.HeadingPitchRange(
      0,
      0,
      2, // small offset to allow rotation
    ),
  );
  clearPrimitives();
  viewer.scene.primitives.add(cubeMapPanorama);
  controller.enableZoom = true;
  controller.enableTranslate = true;
};

//clear existing panorama primitives before adding new ones
const clearPrimitives = () => {
  const primitives = viewer.scene.primitives;
  for (let i = primitives.length - 1; i >= 0; i--) {
    const primitive = primitives.get(i);
    const remove =
      primitive instanceof Cesium.CubeMapPanorama ||
      primitive instanceof Cesium.EquirectangularPanorama;
    if (remove) {
      primitives.remove(primitive);
    }
  }
};
// Display the equirectangular panorama by default
equirectangularFromFile();

// Enable narrowing the field of view with the mouse wheel when in panorama view to simulate zooming in and out of the panorama.
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

const minFov = Cesium.Math.toRadians(20.0);
const maxFov = Cesium.Math.toRadians(100.0);
const zoomSpeed = 0.05;

function enableFieldOfViewAdjustment() {
  handler.setInputAction(function (movement) {
    const camera = viewer.camera;
    const frustum = camera.frustum;

    let fov = frustum.fov;

    // Wheel direction
    const delta = movement;

    if (delta < 0) {
      fov *= 1.0 + zoomSpeed; // zoom in
    } else {
      fov *= 1.0 - zoomSpeed; // zoom out
    }

    // Clamp FOV
    fov = Cesium.Math.clamp(fov, minFov, maxFov);

    frustum.fov = fov;
  }, Cesium.ScreenSpaceEventType.WHEEL);
}
enableFieldOfViewAdjustment();

// Create dropdown menu to select panorama display type
const options = [
  {
    text: "Equirectangular Panorama",
    onselect: function () {
      clearPrimitives();
      equirectangularFromFile();
    },
  },
  {
    text: "Cube Map Panorama",
    onselect: function () {
      viewer.scene.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      clearPrimitives();
      cubeMapFromFiles();
    },
  },
];

const toolbar = document.getElementById("toolbar");

function createDropdown(options) {
  const initialIndex = 0;
  const select = document.createElement("select");
  select.className = "cesium-button";

  options.forEach((opt, index) => {
    const option = document.createElement("option");
    option.text = opt.text;
    option.value = index;
    select.add(option);
  });

  // Set initial selection
  select.selectedIndex = initialIndex;

  select.onchange = () => {
    options[select.selectedIndex].onselect();
  };

  toolbar.appendChild(select);
  return select;
}

createDropdown(options);
