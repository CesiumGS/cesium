import defined from "../Core/defined.js";
import hasExtension from "./hasExtension.js";
import TileMetadata from "./TileMetadata.js";

/**
 * Check if a tile has metadata, either defined in its metadata field (3D Tiles 1.1)
 * or in the <code>3DTILES_metadata</code> extension. If defined, get the tile metadata
 * with the corresponding class.
 * <p>
 * This assumes that tileset.metadata has been created before any tiles are constructed.
 * </p>
 * @function
 *
 * @param {Cesium3DTileset} tileset The tileset to query for tile metadata
 * @param {Object} tileHeader the JSON header for a {@link Cesium3DTile}
 * @return {TileMetadata} the tile metadata, or <code>undefined</code> if not found
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function findTileMetadata(tileset, tileHeader) {
  const metadataJson = hasExtension(tileHeader, "3DTILES_metadata")
    ? tileHeader.extensions["3DTILES_metadata"]
    : tileHeader.metadata;

  if (!defined(metadataJson)) {
    return undefined;
  }

  const classes = tileset.metadata.schema.classes;
  if (defined(metadataJson.class)) {
    const tileClass = classes[metadataJson.class];
    return new TileMetadata({
      tile: metadataJson,
      class: tileClass,
    });
  }

  return undefined;
}
