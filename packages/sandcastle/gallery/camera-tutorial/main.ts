import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

const scene = viewer.scene;
const canvas = viewer.canvas;
canvas.setAttribute("tabindex", "0"); // needed to put focus on the canvas
canvas.onclick = function () {
  canvas.focus();
};
const ellipsoid = scene.globe.ellipsoid;

// disable the default event handlers
scene.screenSpaceCameraController.enableRotate = false;
scene.screenSpaceCameraController.enableTranslate = false;
scene.screenSpaceCameraController.enableZoom = false;
scene.screenSpaceCameraController.enableTilt = false;
scene.screenSpaceCameraController.enableLook = false;

let startMousePosition;
let mousePosition;
const flags = {
  looking: false,
  moveForward: false,
  moveBackward: false,
  moveUp: false,
  moveDown: false,
  moveLeft: false,
  moveRight: false,
};

const handler = new Cesium.ScreenSpaceEventHandler(canvas);

handler.setInputAction(function (movement) {
  flags.looking = true;
  mousePosition = startMousePosition = Cesium.Cartesian3.clone(
    movement.position,
  );
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

handler.setInputAction(function (movement) {
  mousePosition = movement.endPosition;
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

handler.setInputAction(function (position) {
  flags.looking = false;
}, Cesium.ScreenSpaceEventType.LEFT_UP);

function getFlagForKeyCode(code) {
  switch (code) {
    case "KeyW":
      return "moveForward";
    case "KeyS":
      return "moveBackward";
    case "KeyQ":
      return "moveUp";
    case "KeyE":
      return "moveDown";
    case "KeyD":
      return "moveRight";
    case "KeyA":
      return "moveLeft";
    default:
      return undefined;
  }
}

document.addEventListener(
  "keydown",
  function (e) {
    const flagName = getFlagForKeyCode(e.code);
    if (typeof flagName !== "undefined") {
      flags[flagName] = true;
    }
  },
  false,
);

document.addEventListener(
  "keyup",
  function (e) {
    const flagName = getFlagForKeyCode(e.code);
    if (typeof flagName !== "undefined") {
      flags[flagName] = false;
    }
  },
  false,
);

viewer.clock.onTick.addEventListener(function (clock) {
  const camera = viewer.camera;

  if (flags.looking) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Coordinate (0.0, 0.0) will be where the mouse was clicked.
    const x = (mousePosition.x - startMousePosition.x) / width;
    const y = -(mousePosition.y - startMousePosition.y) / height;

    const lookFactor = 0.05;
    camera.lookRight(x * lookFactor);
    camera.lookUp(y * lookFactor);
  }

  // Change movement speed based on the distance of the camera to the surface of the ellipsoid.
  const cameraHeight = ellipsoid.cartesianToCartographic(
    camera.position,
  ).height;
  const moveRate = cameraHeight / 100.0;

  if (flags.moveForward) {
    camera.moveForward(moveRate);
  }
  if (flags.moveBackward) {
    camera.moveBackward(moveRate);
  }
  if (flags.moveUp) {
    camera.moveUp(moveRate);
  }
  if (flags.moveDown) {
    camera.moveDown(moveRate);
  }
  if (flags.moveLeft) {
    camera.moveLeft(moveRate);
  }
  if (flags.moveRight) {
    camera.moveRight(moveRate);
  }
});
