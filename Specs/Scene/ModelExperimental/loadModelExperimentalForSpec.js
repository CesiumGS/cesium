import { Cartesian3, defined } from "../../../Source/Cesium.js";
import { defaultValue } from "../../../Source/Cesium.js";
import { HeadingPitchRange } from "../../../Source/Cesium.js";
import { Matrix4 } from "../../../Source/Cesium.js";
import { ModelExperimental } from "../../../Source/Cesium.js";
import { when } from "../../../Source/Cesium.js";
import pollToPromise from "../../pollToPromise.js";

function loadAndZoomToModelExperimental(options, scene) {
  var model;
  if (defined(options.url)) {
    model = ModelExperimental.fromGltf({
      url: options.url,
      upAxis: options.upAxis,
      forwardAxis: options.forwardAxis,
    });
  } else {
    model = new ModelExperimental({
      gltf: options.gltf,
      upAxis: options.upAxis,
      forwardAxis: options.forwardAxis,
    });
  }

  scene.primitives.add(model);
  zoomTo(model, scene);

  return pollToPromise(
    function () {
      scene.renderForSpecs();
      return model.ready;
    },
    { timeout: 10000 }
  )
    .then(function () {
      return model;
    })
    .otherwise(function () {
      return when.reject(model);
    });
}

function zoomTo(model, scene) {
  model.zoomTo = function (zoom) {
    zoom = defaultValue(zoom, 4.0);

    var camera = scene.camera;
    var center = Matrix4.multiplyByPoint(
      model.modelMatrix,
      model.boundingSphere.center,
      new Cartesian3()
    );
    var r = zoom * Math.max(model.boundingSphere.radius, camera.frustum.near);
    camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, r));
  };
}

export default loadAndZoomToModelExperimental;
