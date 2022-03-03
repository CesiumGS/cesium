import { defined } from "../Cesium.js";
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
export default function findGroupMetadata(tileset, contentHeader) {
  if (!defined(tileset.metadata)) {
    return undefined;
  }

  const group = hasExtension(contentHeader, "3DTILES_metadata")
    ? contentHeader.extensions["3DTILES_metadata"].group
    : contentHeader.group;

  return tileset.metadata.groups[group];
}
