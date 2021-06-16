import hasExtension from "./hasExtension.js";

/**
 * Check if a content has a <code>3DTILES_metadata</code> extension, and if so,
 * look up the group from the <code>3DTILES_metadata.groups</code> object.
 *
 * @function
 *
 * @param {Cesium3DTileset} tileset The tileset to query for group metadata
 * @param {Object} contentHeader the JSON header for a {@link Cesium3DTileContent}
 * @return {GroupMetadata} the group metadata, or <code>undefined</code> if not found
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function findGroupMetadata(tileset, contentHeader) {
  if (hasExtension(contentHeader, "3DTILES_metadata")) {
    var extension = contentHeader.extensions["3DTILES_metadata"];
    var groupId = extension.group;
    return tileset.metadata.groups[groupId];
  }

  return undefined;
}
