import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

const snowden1 = "../../SampleData/Cesium3DTiles/snowden/tileset.json";
const snowden2 =
  "../../SampleData/Cesium3DTiles/gltf-2.1/snowden/root.tileset.gltf";
const agi1 = "../../SampleData/Cesium3DTiles/AGI_HQ/tileset.json";
const agi2 = "../../SampleData/Cesium3DTiles/gltf-2.1/AGI_HQ/root.tileset.gltf";
const sanFran1 = "../../SampleData/Cesium3DTiles/SanFran/tileset.json";
const sanFran2 =
  "../../SampleData/Cesium3DTiles/gltf-2.1/SanFran/root.tileset.gltf";

const packedGeoreference = [
  0.9685698432170965, 0.2487417512409377, -4.632960681760777e-13, 0,
  -0.16001765262281278, 0.6230890951759628, 0.7656071644922637, 0,
  0.19043846685870308, -0.7415440112780839, 0.6433083783677276, 0,
  1216363.6111466389, -4736293.364982555, 4081329.7216236885, 1,
];
const agiGeoreference = Cesium.Matrix4.unpack(packedGeoreference);

async function loadModels(leftUrl, rightUrl, modelMatrix) {
  viewer.scene.primitives.removeAll();

  try {
    const left = await Cesium.Cesium3DTileset.fromUrl(leftUrl);
    left.modelMatrix = modelMatrix;
    left.splitDirection = Cesium.SplitDirection.LEFT;
    viewer.scene.primitives.add(left);
    console.log(
      `left.boundingSphere = ${Cesium.BoundingSphere.pack(left.boundingSphere, [])}`,
    );
    console.log(
      `left root computedTransform: ${Cesium.Matrix4.pack(left.root.computedTransform, [])}`,
    );

    viewer.zoomTo(left);

    const right = await Cesium.Cesium3DTileset.fromGltf(rightUrl);
    right.modelMatrix = modelMatrix;
    right.splitDirection = Cesium.SplitDirection.RIGHT;
    viewer.scene.primitives.add(right);
    console.log(
      `right.boundingSphere = ${Cesium.BoundingSphere.pack(right.boundingSphere, [])}`,
    );
    console.log(
      `right root computedTransform: ${Cesium.Matrix4.pack(right.root.computedTransform, [])}`,
    );
  } catch (error) {
    console.log(`Error loading tileset: ${error}`);
  }
}

Sandcastle.addToolbarMenu([
  {
    text: "San Francisco",
    onselect: function () {
      loadModels(sanFran1, sanFran2, Cesium.Matrix4.IDENTITY);
    },
  },
  {
    text: "Snowden",
    onselect: function () {
      loadModels(snowden1, snowden2, Cesium.Matrix4.IDENTITY);
    },
  },
  {
    text: "AGI HQ",
    onselect: function () {
      loadModels(agi1, agi2, agiGeoreference);
    },
  },
]);

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
