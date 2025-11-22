import * as Cesium from "cesium";

// this can be changed to any glTF model
const modelUrl = "https://assets.agi.com/models/launchvehicle.glb";

const viewModel = {
  articulations: [],
  stages: [],
  selectedArticulation: undefined,
};

Cesium.knockout.track(viewModel);

Cesium.knockout
  .getObservable(viewModel, "selectedArticulation")
  .subscribe(function (newArticulation) {
    viewModel.stages = newArticulation.stages;
  });

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

const height = 220000.0;
const origin = Cesium.Cartesian3.fromDegrees(-74.693, 28.243, height);
const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
  origin,
  new Cesium.HeadingPitchRoll(),
);

try {
  const model = scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: modelUrl,
      modelMatrix: modelMatrix,
      minimumPixelSize: 128,
    }),
  );

  model.readyEvent.addEventListener(() => {
    const camera = viewer.camera;

    // Zoom to model
    const controller = scene.screenSpaceCameraController;
    const r = 2.0 * Math.max(model.boundingSphere.radius, camera.frustum.near);
    controller.minimumZoomDistance = r * 0.2;

    const center = Cesium.Matrix4.multiplyByPoint(
      model.modelMatrix,
      Cesium.Cartesian3.ZERO,
      new Cesium.Cartesian3(),
    );
    const heading = Cesium.Math.toRadians(0.0);
    const pitch = Cesium.Math.toRadians(-10.0);
    camera.lookAt(
      center,
      new Cesium.HeadingPitchRange(heading, pitch, r * 0.8),
    );

    const articulations = model.sceneGraph._runtimeArticulations;
    viewModel.articulations = Object.keys(articulations).map(
      function (articulationName) {
        return {
          name: articulationName,
          stages: articulations[articulationName]._runtimeStages.map(
            function (stage) {
              const stageModel = {
                name: stage.name,
                minimum: stage.minimumValue,
                maximum: stage.maximumValue,
                current: stage.currentValue,
              };
              Cesium.knockout.track(stageModel);
              Cesium.knockout.defineProperty(stageModel, "currentText", {
                get: function () {
                  return stageModel.current.toString();
                },
                set: function (value) {
                  // coerce values to number
                  stageModel.current = +value;
                },
              });
              Cesium.knockout
                .getObservable(stageModel, "current")
                .subscribe(function (newValue) {
                  model.setArticulationStage(
                    `${articulationName} ${stage.name}`,
                    +stageModel.current,
                  );
                  model.applyArticulations();
                });
              return stageModel;
            },
          ),
        };
      },
    );
    viewModel.selectedArticulation = viewModel.articulations[0];
  });
} catch (error) {
  console.log(`Error loading model: ${error}`);
}
