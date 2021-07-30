import addToArray from "./addToArray.js";

/**
 * Adds buffer to gltf.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {Buffer} buffer A Buffer object which will be added to gltf.buffers.
 * @returns {Number} The bufferView id of the newly added bufferView.
 *
 * @private
 */
function addBuffer(gltf, buffer) {
  var newBuffer = {
    byteLength: buffer.length,
    extras: {
      _pipeline: {
        source: buffer,
      },
    },
  };
  var bufferId = addToArray(gltf.buffers, newBuffer);
  var bufferView = {
    buffer: bufferId,
    byteOffset: 0,
    byteLength: buffer.length,
  };
  return addToArray(gltf.bufferViews, bufferView);
}

export default addBuffer;
