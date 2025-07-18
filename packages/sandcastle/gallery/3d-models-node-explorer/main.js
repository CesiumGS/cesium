import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// this can be changed to any glTF model
const modelUrl = "../../SampleData/models/CesiumMan/Cesium_Man.glb";

const viewModel = {
  nodeName: undefined,
  showTranslation: false,
  showRotation: false,
  showScale: false,
  transformations: {},
};

Cesium.knockout.track(viewModel);

// transformation is a computed property returning the values storage for the current node name
Cesium.knockout.defineProperty(viewModel, "transformation", function () {
  const transformations = viewModel.transformations;
  const nodeName = viewModel.nodeName;
  if (!Cesium.defined(transformations[nodeName])) {
    transformations[nodeName] = {
      translationX: 0.0,
      translationY: 0.0,
      translationZ: 0.0,
      rotationHeading: 0.0,
      rotationPitch: 0.0,
      rotationRoll: 0.0,
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
    };
    Cesium.knockout.track(transformations[nodeName]);
  }
  return transformations[nodeName];
});

// these writable computed properties produce individual values for use in the UI
[
  "translationX",
  "translationY",
  "translationZ",
  "rotationHeading",
  "rotationPitch",
  "rotationRoll",
  "scaleX",
  "scaleY",
  "scaleZ",
].forEach(function (p) {
  Cesium.knockout.defineProperty(viewModel, p, {
    get: function () {
      return viewModel.transformation[p];
    },
    set: function (value) {
      // coerce values to number
      viewModel.transformation[p] = +value;
    },
  });
});

// these computed properties return each element of the transform
Cesium.knockout.defineProperty(viewModel, "translation", function () {
  return new Cesium.Cartesian3(
    viewModel.translationX,
    viewModel.translationY,
    viewModel.translationZ,
  );
});
Cesium.knockout.defineProperty(viewModel, "rotation", function () {
  const hpr = new Cesium.HeadingPitchRoll(
    viewModel.rotationHeading,
    viewModel.rotationPitch,
    viewModel.rotationRoll,
  );
  return Cesium.Quaternion.fromHeadingPitchRoll(hpr);
});
Cesium.knockout.defineProperty(viewModel, "scale", function () {
  return new Cesium.Cartesian3(
    viewModel.scaleX,
    viewModel.scaleY,
    viewModel.scaleZ,
  );
});
// this computed property combines the above properties into a single matrix to be applied to the node
Cesium.knockout.defineProperty(viewModel, "matrix", function () {
  return Cesium.Matrix4.fromTranslationQuaternionRotationScale(
    viewModel.translation,
    viewModel.rotation,
    viewModel.scale,
  );
});

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

const height = 250000.0;
const origin = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, height);
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
    controller.minimumZoomDistance = r * 0.5;

    const center = model.boundingSphere.center;
    const heading = Cesium.Math.toRadians(230.0);
    const pitch = Cesium.Math.toRadians(-20.0);
    camera.lookAt(
      center,
      new Cesium.HeadingPitchRange(heading, pitch, r * 2.0),
    );

    // enumerate nodes and add options
    const options = Object.keys(model._nodesByName).map(function (nodeName) {
      return {
        text: nodeName,
        onselect: function () {
          viewModel.nodeName = nodeName;
        },
      };
    });
    options[0].onselect();
    Sandcastle.addToolbarMenu(options);

    // This only affects nodes that draw primitives. Setting this value
    // for a joint node will have no effect.
    Sandcastle.addToggleButton("Show Node", true, function (value) {
      const node = model.getNode(viewModel.nodeName);
      node.show = value;
    });

    // respond to viewmodel changes by applying the computed matrix
    Cesium.knockout
      .getObservable(viewModel, "matrix")
      .subscribe(function (newValue) {
        const node = model.getNode(viewModel.nodeName);
        if (!Cesium.defined(node.originalMatrix)) {
          node.originalMatrix = node.matrix.clone();
        }
        node.matrix = Cesium.Matrix4.multiply(
          node.originalMatrix,
          newValue,
          new Cesium.Matrix4(),
        );
      });
  });
} catch (error) {
  window.alert(error);
}
