import { ModelExperimental, when } from "../../../Source/Cesium.js";
import pollToPromise from "../../pollToPromise.js";

function loadAndZoomToModelExperimental(options, scene) {
  var model = ModelExperimental.fromGltf({
    gltf: options.gltf,
    show: options.show,
    basePath: options.basePath,
    modelMatrix: options.modelMatrix,
    allowPicking: options.allowPicking,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    debugShowBoundingVolume: options.debugShowBoundingVolume,
  });

  scene.primitives.add(model);

  return pollToPromise(
    function () {
      scene.renderForSpecs();
      return model.ready;
    },
    { timeout: 10000 }
  )
    .then(function () {
      scene.camera.flyToBoundingSphere(model.boundingSphere, {
        duration: 0,
        offset: options.offset,
      });
      return model;
    })
    .otherwise(function () {
      return when.reject(model);
    });
}

export default loadAndZoomToModelExperimental;
