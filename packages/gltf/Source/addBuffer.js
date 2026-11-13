import addToArray from "./addToArray.js";

/**
 * Adds buffer to gltf.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @param {Uint8Array} buffer A typed array which will be added to gltf.buffers.
 * @returns {number} The bufferView id of the newly added bufferView.
 *
 * @private
 */
function addBuffer(gltf, buffer) {
  const newBuffer = {
    byteLength: buffer.length,
    extras: {
      _pipeline: {
        source: buffer,
      },
    },
  };
  const bufferId = addToArray(gltf.buffers, newBuffer);
  const bufferView = {
    buffer: bufferId,
    byteOffset: 0,
    byteLength: buffer.length,
  };
  return addToArray(gltf.bufferViews, bufferView);
}

export default addBuffer;
