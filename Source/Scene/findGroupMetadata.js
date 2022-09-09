import defined from "../Core/defined.js";
import hasExtension from "./hasExtension.js";

/**
 * Check if a content has metadata, either defined in its metadata field (3D Tiles 1.1)
 * or in the <code>3DTILES_metadata</code> extension. If so, look up the group with the
 * corresponding ID.
 *
 * @function
 *
 * @param {Cesium3DTileset} tileset The tileset to query for group metadata
 * @param {Object} contentHeader the JSON header for a {@link Cesium3DTileContent}
 * @return {GroupMetadata} the group metadata, or <code>undefined</code> if not found
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function findGroupMetadata(tileset, contentHeader) {
  const metadataExtension = tileset.metadataExtension;
  if (!defined(metadataExtension)) {
    return undefined;
  }
  const groups = metadataExtension.groups;

  const group = hasExtension(contentHeader, "3DTILES_metadata")
    ? contentHeader.extensions["3DTILES_metadata"].group
    : contentHeader.group;

  if (typeof group === "number") {
    return groups[group];
  }

  const index = metadataExtension.groupIds.findIndex(function (id) {
    return id === group;
  });

  return index >= 0 ? groups[index] : undefined;
}

export default findGroupMetadata;
