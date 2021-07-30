import removeExtensionsRequired from "./removeExtensionsRequired.js"
import defined from "../../Core/defined.js"

/**
 * Removes an extension from gltf.extensionsUsed and gltf.extensionsRequired if it is present.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {String} extension The extension to remove.
 *
 * @private
 */
function removeExtensionsUsed(gltf, extension) {
    var extensionsUsed = gltf.extensionsUsed;
    if (defined(extensionsUsed)) {
        var index = extensionsUsed.indexOf(extension);
        if (index >= 0) {
            extensionsUsed.splice(index, 1);
        }
        removeExtensionsRequired(gltf, extension);
        if (extensionsUsed.length === 0) {
            delete gltf.extensionsUsed;
        }
    }
}

export default removeExtensionsUsed;
