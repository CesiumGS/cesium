import defined from "../../Core/defined.js"

/**
 * Removes an extension from gltf.extensionsRequired if it is present.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {String} extension The extension to remove.
 *
 * @private
 */
function removeExtensionsRequired(gltf, extension) {
    var extensionsRequired = gltf.extensionsRequired;
    if (defined(extensionsRequired)) {
        var index = extensionsRequired.indexOf(extension);
        if (index >= 0) {
            extensionsRequired.splice(index, 1);
        }
        if (extensionsRequired.length === 0) {
            delete gltf.extensionsRequired;
        }
    }
}

export default removeExtensionsRequired;
