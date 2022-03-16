import { ModelExperimental } from "../../../Source/Cesium.js";
import pollToPromise from "../../pollToPromise.js";

function loadAndZoomToModelExperimental(options, scene) {
  return new Promise(function (resolve, reject) {
    let model;
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
        featureIdLabel: options.featureIdLabel,
        instanceFeatureIdLabel: options.instanceFeatureIdLabel,
        incrementallyLoadTextures: options.incrementallyLoadTextures,
        backFaceCulling: options.backFaceCulling,
        showCreditsOnScreen: options.showCreditsOnScreen,
      });
    } catch (error) {
      reject(error);
      return;
    }

    scene.primitives.add(model);

    let finished = false;
    model.readyPromise
      .then(function (model) {
        finished = true;
        scene.camera.flyToBoundingSphere(model.boundingSphere, {
          duration: 0,
          offset: options.offset,
        });

        resolve(model);
      })
      .catch(function (error) {
        finished = true;
        reject(error);
      });

    pollToPromise(
      function () {
        scene.renderForSpecs();
        return finished;
      },
      { timeout: 10000 }
    ).catch(function (error) {
      reject(error);
    });
  });
}

export default loadAndZoomToModelExperimental;
