import defined from "../Core/defined.js";

/**
 * Check if a specific extension is present on a JSON object. This can be used
 * for either 3D Tiles extensions or glTF extensions
 * @param {object} json The JSON object
 * @param {string} extensionName The name of the extension, e.g. '3DTILES_implicit_tiling'
 * @returns {boolean} True if the extension is present
 * @private
 */
function hasExtension(json, extensionName) {
  return (
    defined(json) &&
    defined(json.extensions) &&
    defined(json.extensions[extensionName])
  );
}

export default hasExtension;
