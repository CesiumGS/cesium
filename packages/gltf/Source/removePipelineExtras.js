import { defined } from "@cesium/core";
import ForEach from "./ForEach.js";

/**
 * Iterate through the buffers within the glTF and delete their pipeline extras object.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @returns {object} glTF with no pipeline extras.
 *
 * @internal
 */
function removePipelineExtras(gltf) {
  ForEach.buffer(gltf, function (buffer) {
    removeExtras(buffer);
  });

  return gltf;
}

function removeExtras(object) {
  if (!defined(object.extras)) {
    return;
  }

  if (defined(object.extras._pipeline)) {
    delete object.extras._pipeline;
  }

  if (Object.keys(object.extras).length === 0) {
    delete object.extras;
  }
}

export default removePipelineExtras;
