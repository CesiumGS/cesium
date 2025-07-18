import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706);
const url = "../../SampleData/models/CesiumMan/Cesium_Man.glb";
viewer.trackedEntity = viewer.entities.add({
  name: url,
  position: position,
  model: {
    uri: url,
  },
});

if (!Cesium.PostProcessStageLibrary.isSilhouetteSupported(viewer.scene)) {
  window.alert("This browser does not support the silhouette post process.");
}

const stages = viewer.scene.postProcessStages;
const silhouette = stages.add(
  Cesium.PostProcessStageLibrary.createSilhouetteStage(),
);
silhouette.uniforms.color = Cesium.Color.LIME;
const blackAndWhite = stages.add(
  Cesium.PostProcessStageLibrary.createBlackAndWhiteStage(),
);
blackAndWhite.uniforms.gradations = 5.0;

let handler;
function addMouseOver(stage) {
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function (movement) {
    const pickedObject = viewer.scene.pick(movement.endPosition);
    if (Cesium.defined(pickedObject)) {
      stage.selected = [pickedObject.primitive];
    } else {
      stage.selected = [];
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

function removeMouseOver(stage) {
  handler = handler && handler.destroy();
  stage.selected = [];
}

Sandcastle.addToolbarMenu([
  {
    text: "Mouse-over Black and White",
    onselect: function () {
      blackAndWhite.enabled = true;
      silhouette.enabled = false;

      removeMouseOver(silhouette);
      addMouseOver(blackAndWhite);
    },
  },
  {
    text: "Mouse-over Silhouette",
    onselect: function () {
      blackAndWhite.enabled = false;
      silhouette.enabled = true;

      removeMouseOver(blackAndWhite);
      addMouseOver(silhouette);
    },
  },
]);
