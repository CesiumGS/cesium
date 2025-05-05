import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import hasExtension from "./hasExtension.js";
import TileMetadata from "./TileMetadata.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

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
 * @param {object} tileHeader the JSON header for a {@link Cesium3DTile}
 * @return {TileMetadata} the tile metadata, or <code>undefined</code> if not found
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function findTileMetadata(tileset, tileHeader) {
  const metadataJson = hasExtension(tileHeader, "3DTILES_metadata")
    ? tileHeader.extensions["3DTILES_metadata"]
    : tileHeader.metadata;

  if (!defined(metadataJson)) {
    return undefined;
  }

  if (!defined(tileset.schema)) {
    findTileMetadata._oneTimeWarning(
      "findTileMetadata-missing-root-schema",
      "Could not find a metadata schema for tile metadata. For tilesets that contain external tilesets, make sure the schema is added to the root tileset.json.",
    );
    return undefined;
  }

  const classes = defaultValue(
    tileset.schema.classes,
    defaultValue.EMPTY_OBJECT,
  );
  if (defined(metadataJson.class)) {
    const tileClass = classes[metadataJson.class];
    return new TileMetadata({
      tile: metadataJson,
      class: tileClass,
    });
  }

  return undefined;
}

// Exposed for testing
findTileMetadata._oneTimeWarning = oneTimeWarning;
export default findTileMetadata;
