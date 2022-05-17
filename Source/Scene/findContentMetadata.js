import ContentMetadata from "./ContentMetadata.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import hasExtension from "./hasExtension.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

/**
 * Check if a content has metadata, either defined in its metadata field (3D Tiles 1.1) or in
 * the <code>3DTILES_metadata</code> extension. If defined, get the content metadata
 * with the corresponding class.
 *
 * @function
 *
 * @param {Cesium3DTileset} tileset The tileset to query for content metadata
 * @param {Object} contentHeader the JSON header for a {@link Cesium3DTileContent}
 * @return {ContentMetadata} the content metadata, or <code>undefined</code> if not found
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function findContentMetadata(tileset, contentHeader) {
  const metadataJson = hasExtension(contentHeader, "3DTILES_metadata")
    ? contentHeader.extensions["3DTILES_metadata"]
    : contentHeader.metadata;

  if (!defined(metadataJson)) {
    return undefined;
  }

  if (!defined(tileset.schema)) {
    findContentMetadata._oneTimeWarning(
      "findContentMetadata-missing-root-schema",
      "Could not find a metadata schema for content metadata. For external tilesets, make sure the schema is added to the root tileset.json"
    );
    return undefined;
  }

  const classes = defaultValue(
    tileset.schema.classes,
    defaultValue.EMPTY_OBJECT
  );
  if (defined(metadataJson.class)) {
    const contentClass = classes[metadataJson.class];
    return new ContentMetadata({
      content: metadataJson,
      class: contentClass,
    });
  }

  return undefined;
}

// Exposed for testing
findContentMetadata._oneTimeWarning = oneTimeWarning;
export default findContentMetadata;
