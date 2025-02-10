import defined from "../../Core/defined.js";

/**
 * Removes an extension from gltf.extensionsRequired if it is present.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @param {string} extension The extension to remove.
 *
 * @private
 */
function removeExtensionsRequired(gltf, extension) {
  const extensionsRequired = gltf.extensionsRequired;
  if (defined(extensionsRequired)) {
    const index = extensionsRequired.indexOf(extension);
    if (index >= 0) {
      extensionsRequired.splice(index, 1);
    }
    if (extensionsRequired.length === 0) {
      delete gltf.extensionsRequired;
    }
  }
}

export default removeExtensionsRequired;
