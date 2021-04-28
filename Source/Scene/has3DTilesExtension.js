import defined from "../Core/defined.js";

/**
 * Check if a specific extension is present on a 3D Tiles JSON object. This
 * logic is the same regardless of whether the extension is scoped to the
 * tileset, a tile, or other 3D Tiles concept.
 * @param {Object} json The JSON object
 * @param {String} extensionName The name of the extension, e.g. '3DTILES_implicit_tiling'
 * @returns {Boolean} True if the extension is present
 * @private
 */
export default function has3DTilesExtension(json, extensionName) {
  return (
    defined(json) &&
    defined(json.extensions) &&
    defined(json.extensions[extensionName])
  );
}
