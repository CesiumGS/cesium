import defined from "../Core/defined.js";

/**
 * Returns the meshopt compression extension object, KHR_meshopt_compression or
 * EXT_meshopt_compression, on a glTF bufferView or buffer. If both are present,
 * KHR is preferred.
 * @param {object} gltfObject A glTF bufferView or buffer.
 * @returns {object|undefined} The meshopt extension object, or undefined.
 * @private
 */
function findMeshoptExtension(gltfObject) {
  const extensions = gltfObject?.extensions;
  if (!defined(extensions)) {
    return undefined;
  }

  return (
    extensions["KHR_meshopt_compression"] ??
    extensions["EXT_meshopt_compression"]
  );
}

export default findMeshoptExtension;
