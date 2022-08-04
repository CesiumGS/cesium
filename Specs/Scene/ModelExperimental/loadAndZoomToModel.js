import { Model } from "../../../Source/Cesium.js";
import pollToPromise from "../../pollToPromise.js";

function loadAndZoomToModel(options, scene) {
  return new Promise(function (resolve, reject) {
    let model;
    try {
      model = Model.fromGltf({
        url: options.url,
        gltf: options.gltf,
        basePath: options.basePath,
        show: options.show,
        modelMatrix: options.modelMatrix,
        scale: options.scale,
        minimumPixelSize: options.minimumPixelSize,
        maximumScale: options.maximumScale,
        id: options.id,
        allowPicking: options.allowPicking,
        incrementallyLoadTextures: options.incrementallyLoadTextures,
        asynchronous: options.asynchronous,
        clampAnimations: options.clampAnimations,
        shadows: options.shadows,
        debugShowBoundingVolume: options.debugShowBoundingVolume,
        enableDebugWireframe: options.enableDebugWireframe,
        debugWireframe: options.debugWireframe,
        cull: options.cull,
        opaquePass: options.opaquePass,
        upAxis: options.upAxis,
        forwardAxis: options.forwardAxis,
        customShader: options.customShader,
        content: options.content,
        heightReference: options.heightReference,
        scene: options.scene,
        distanceDisplayCondition: options.distanceDisplayCondition,
        color: options.color,
        colorBlendAmount: options.colorBlendAmount,
        colorBlendMode: options.colorBlendMode,
        silhouetteColor: options.silhouetteColor,
        silhouetteSize: options.silhouetteSize,
        clippingPlanes: options.clippingPlanes,
        lightColor: options.lightColor,
        imageBasedLighting: options.imageBasedLighting,
        backFaceCulling: options.backFaceCulling,
        credit: options.credit,
        showCreditsOnScreen: options.showCreditsOnScreen,
        projectTo2D: options.projectTo2D,
        featureIdLabel: options.featureIdLabel,
        instanceFeatureIdLabel: options.instanceFeatureIdLabel,
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

export default loadAndZoomToModel;
