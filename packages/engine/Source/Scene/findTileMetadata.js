import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import hasExtension from "./hasExtension.js";
import TileMetadata from "./TileMetadata.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

/**
 * Check if a tile has metadata, either defined in its metadata field (3D Tiles 1.1)
 * or in the <code>3DTILES_metadata</code> extension. If defined, get the tile metadata
 * with the corresponding class.
 * @function
 *
 * @param {MetadataSchema|undefined} metadataSchema The metadata schema
 * @param {object} tileHeader the JSON header for a {@link Cesium3DTile}
 * @return {TileMetadata} the tile metadata, or <code>undefined</code> if not found
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function findTileMetadata(metadataSchema, tileHeader) {
  const metadataJson = hasExtension(tileHeader, "3DTILES_metadata")
    ? tileHeader.extensions["3DTILES_metadata"]
    : tileHeader.metadata;

  if (!defined(metadataJson)) {
    return undefined;
  }

  if (!defined(metadataSchema)) {
    findTileMetadata._oneTimeWarning(
      "findTileMetadata-missing-schema",
      "Could not find a metadata schema for tile metadata.",
    );
    return undefined;
  }

  const classes = metadataSchema.classes ?? Frozen.EMPTY_OBJECT;
  if (defined(metadataJson.class)) {
    const tileClass = classes[metadataJson.class];
    if (!defined(tileClass)) {
      findTileMetadata._oneTimeWarning(
        "findTileMetadata-missing-tile-class",
        `Could not find a class definition for tile metadata class ${metadataJson.class} in schema:\n${JSON.stringify(metadataSchema, null, 2)}`,
      );
      return undefined;
    }
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
