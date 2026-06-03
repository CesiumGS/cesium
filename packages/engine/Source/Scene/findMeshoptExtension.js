import defined from "../Core/defined.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

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

  const khr = extensions["KHR_meshopt_compression"];
  const ext = extensions["EXT_meshopt_compression"];

  if (defined(khr) && defined(ext)) {
    findMeshoptExtension._oneTimeWarning(
      "findMeshoptExtension-both-extensions",
      "A glTF object uses both KHR_meshopt_compression and EXT_meshopt_compression, which is not allowed. Using KHR_meshopt_compression.",
    );
  }

  return khr ?? ext;
}

// Exposed for testing
findMeshoptExtension._oneTimeWarning = oneTimeWarning;

export default findMeshoptExtension;
