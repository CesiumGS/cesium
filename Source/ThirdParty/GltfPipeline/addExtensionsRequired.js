import addExtensionsUsed from "./addExtensionsUsed.js"
import addToArray from "./addToArray.js"
import defined from "../../Core/defined.js"

/**
 * Adds an extension to gltf.extensionsRequired if it does not already exist.
 * Initializes extensionsRequired if it is not defined.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {String} extension The extension to add.
 *
 * @private
 */
function addExtensionsRequired(gltf, extension) {
    var extensionsRequired = gltf.extensionsRequired;
    if (!defined(extensionsRequired)) {
        extensionsRequired = [];
        gltf.extensionsRequired = extensionsRequired;
    }
    addToArray(extensionsRequired, extension, true);
    addExtensionsUsed(gltf, extension);
}

export default addExtensionsRequired;
