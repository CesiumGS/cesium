import has3DTilesExtension from "./has3DTilesExtension.js";

/**
 * Check if a content has a <code>3DTILES_metadata</code> extension, and if so,
 * look up the group from the <code>3DTILES_metadata.groups</code> object.
 *
 * @param {Cesium3DTileset} tileset The tileset to query for group metadata
 * @param {Object} contentHeader the JSON header for a {@link Cesium3DTileContent}
 */
export default function findMetadataGroup(tileset, contentHeader) {
  if (has3DTilesExtension(contentHeader, "3DTILES_metadata")) {
    var extension = contentHeader.extensions["3DTILES_metadata"];
    var groupId = extension.group;
    return tileset.metadata.groups[groupId];
  }

  return undefined;
}
