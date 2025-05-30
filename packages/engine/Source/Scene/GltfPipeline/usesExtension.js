import { defined } from "@cesium/utils";

/**
 * Checks whether the glTF uses the given extension.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @param {string} extension The name of the extension.
 * @returns {boolean} Whether the glTF uses the given extension.
 *
 * @private
 */
function usesExtension(gltf, extension) {
  return (
    defined(gltf.extensionsUsed) && gltf.extensionsUsed.indexOf(extension) >= 0
  );
}

export default usesExtension;
