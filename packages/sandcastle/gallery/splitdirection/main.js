import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");
const points = viewer.scene.primitives.add(
  new Cesium.PointPrimitiveCollection(),
);
const billboards = viewer.scene.primitives.add(
  new Cesium.BillboardCollection(),
);

function testPoints() {
  Sandcastle.declare(testPoints);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.0, 40.0),
    point: {
      show: true,
      color: Cesium.Color.SKYBLUE,
      pixelSize: 10,
      outlineColor: Cesium.Color.GREEN,
      outlineWidth: 3,
      splitDirection: Cesium.SplitDirection.LEFT,
    },
  });

  points.add({
    position: new Cesium.Cartesian3.fromDegrees(-75, 35),
    color: Cesium.Color.RED,
    splitDirection: Cesium.SplitDirection.RIGHT,
  });
  points.add({
    position: new Cesium.Cartesian3.fromDegrees(-125, 35),
    color: Cesium.Color.WHITE,
    splitDirection: Cesium.SplitDirection.NONE,
  });
  points.add({
    position: new Cesium.Cartesian3.fromDegrees(-100, 20),
    color: Cesium.Color.YELLOW,
    splitDirection: Cesium.SplitDirection.LEFT,
  });
}

function testBillboards() {
  Sandcastle.declare(testBillboards);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.0, 50.0),
    billboard: {
      show: true,
      image: "../images/facility.gif",
      pixelSize: 100,
      splitDirection: Cesium.SplitDirection.LEFT,
    },
  });

  billboards.add({
    position: new Cesium.Cartesian3.fromDegrees(-75, 35),
    image: "../images/facility.gif",
    splitDirection: Cesium.SplitDirection.RIGHT,
  });
  billboards.add({
    position: new Cesium.Cartesian3.fromDegrees(-125, 35),
    image: "../images/facility.gif",
    splitDirection: Cesium.SplitDirection.NONE,
  });
  billboards.add({
    position: new Cesium.Cartesian3.fromDegrees(-100, 20),
    image: "../images/Cesium_Logo_overlay.png",
    splitDirection: Cesium.SplitDirection.LEFT,
  });
}

// Sync the position of the slider with the split position
const slider = document.getElementById("slider");
viewer.scene.splitPosition =
  slider.offsetLeft / slider.parentElement.offsetWidth;

const handler = new Cesium.ScreenSpaceEventHandler(slider);

let moveActive = false;

function move(movement) {
  if (!moveActive) {
    return;
  }
  const relativeOffset = movement.endPosition.x;
  const splitPosition =
    (slider.offsetLeft + relativeOffset) / slider.parentElement.offsetWidth;
  slider.style.left = `${100.0 * splitPosition}%`;
  viewer.scene.splitPosition = splitPosition;
}

handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);
handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.PINCH_START);

handler.setInputAction(move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
handler.setInputAction(move, Cesium.ScreenSpaceEventType.PINCH_MOVE);

handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.LEFT_UP);
handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.PINCH_END);

//Sandcastle toolbar
Sandcastle.addToolbarMenu([
  {
    text: "Points",
    onselect: function () {
      testPoints();
      Sandcastle.highlight(testPoints);
    },
  },
  {
    text: "Billboards",
    onselect: function () {
      testBillboards();
      Sandcastle.highlight(testBillboards);
    },
  },
]);

Sandcastle.reset = function () {
  viewer.entities.removeAll();
  points.removeAll();
  billboards.removeAll();
};
