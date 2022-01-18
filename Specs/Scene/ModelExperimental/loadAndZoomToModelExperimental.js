import { ModelExperimental, when } from "../../../Source/Cesium.js";
import pollToPromise from "../../pollToPromise.js";

function loadAndZoomToModelExperimental(options, scene) {
  var model;

  try {
    model = ModelExperimental.fromGltf({
      content: options.content,
      color: options.color,
      gltf: options.gltf,
      show: options.show,
      customShader: options.customShader,
      basePath: options.basePath,
      modelMatrix: options.modelMatrix,
      allowPicking: options.allowPicking,
      upAxis: options.upAxis,
      forwardAxis: options.forwardAxis,
      debugShowBoundingVolume: options.debugShowBoundingVolume,
      featureIdIndex: options.featureIdIndex,
      instanceFeatureIdIndex: options.instanceFeatureIdIndex,
      incrementallyLoadTextures: options.incrementallyLoadTextures,
    });
  } catch (error) {
    return when.reject(error);
  }

  scene.primitives.add(model);

  var finished = false;
  var rejected = false;
  model.readyPromise
    .otherwise(function () {
      rejected = true;
    })
    .always(function () {
      finished = true;
    });

  return pollToPromise(
    function () {
      scene.renderForSpecs();
      return finished;
    },
    { timeout: 10000 }
  ).then(function () {
    if (rejected) {
      return model.readyPromise;
    }
    scene.camera.flyToBoundingSphere(model.boundingSphere, {
      duration: 0,
      offset: options.offset,
    });
    return model.readyPromise;
  });
}

export default loadAndZoomToModelExperimental;
