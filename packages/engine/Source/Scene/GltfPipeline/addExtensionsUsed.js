import addToArray from "./addToArray.js";
import defined from "../../Core/defined.js";

/**
 * Adds an extension to gltf.extensionsUsed if it does not already exist.
 * Initializes extensionsUsed if it is not defined.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @param {string} extension The extension to add.
 *
 * @private
 */
function addExtensionsUsed(gltf, extension) {
  let extensionsUsed = gltf.extensionsUsed;
  if (!defined(extensionsUsed)) {
    extensionsUsed = [];
    gltf.extensionsUsed = extensionsUsed;
  }
  addToArray(extensionsUsed, extension, true);
}

export default addExtensionsUsed;
