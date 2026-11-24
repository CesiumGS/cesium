import { defined } from "@cesium/core";
import ForEach from "./ForEach.js";

/**
 * Adds extras._pipeline to each buffer in the glTF asset, to hold the buffer's data.
 * This stage runs before updateVersion and handles both glTF 1.0 and glTF 2.0 assets.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @returns {object} The glTF asset with the added pipeline extras.
 *
 * @internal
 */
function addPipelineExtras(gltf) {
  ForEach.buffer(gltf, function (buffer) {
    addExtras(buffer);
  });

  return gltf;
}

function addExtras(object) {
  object.extras = defined(object.extras) ? object.extras : {};
  object.extras._pipeline = defined(object.extras._pipeline)
    ? object.extras._pipeline
    : {};
}

export default addPipelineExtras;
