import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * Utilities for parsing bounding volume semantics from 3D Tiles 1.1 metadata.
 *
 * @namespace BoundingVolumeSemantics
 * @private
 */
const BoundingVolumeSemantics = {};

/**
 * Parse the bounding volume-related semantics such as
 * <code>TILE_BOUNDING_BOX</code> and <code>CONTENT_BOUNDING_BOX</code> from
 * implicit tile or content metadata. Results are returned as a JSON object for
 * use when transcoding tiles (see {@link Implicit3DTileContent}).
 * <p>
 * Bounding volumes are checked in the order box, region, then sphere. Only
 * the first valid bounding volume is returned.
 * </p>
 * <p>
 * This handles both tile and content bounding volumes, as the only difference
 * is the prefix. e.g. <code>TILE_BOUNDING_BOX</code> and
 * <code>CONTENT_BOUNDING_BOX</code> have the same memory layout.
 * </p>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata/Semantics|3D Metadata Semantic Reference} for the various bounding volumes and minimum/maximum heights.
 *
 * @param {string} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata|ContentMetadata} metadata The metadata object for looking up values by semantic. In practice, this will typically be a {@link ImplicitMetadataView}
 * @return {object} An object containing the bounding volume, and any minimum or maximum height.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
BoundingVolumeSemantics.parseAllBoundingVolumeSemantics = function (
  prefix,
  metadata,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("prefix", prefix);
  if (prefix !== "TILE" && prefix !== "CONTENT") {
    throw new DeveloperError("prefix must be either 'TILE' or 'CONTENT'");
  }
  Check.typeOf.object("metadata", metadata);
  //>>includeEnd('debug');

  return {
    boundingVolume: BoundingVolumeSemantics.parseBoundingVolumeSemantic(
      prefix,
      metadata,
    ),
    minimumHeight: BoundingVolumeSemantics._parseMinimumHeight(
      prefix,
      metadata,
    ),
    maximumHeight: BoundingVolumeSemantics._parseMaximumHeight(
      prefix,
      metadata,
    ),
  };
};

/**
 * Parse the bounding volume from tile or content metadata. If the metadata
 * specify multiple bounding volumes, only the first one is returned. Bounding
 * volumes are checked in the order box, region, then sphere.
 * <p>
 * This handles both tile and content bounding volumes, as the only difference
 * is the prefix. e.g. <code>TILE_BOUNDING_BOX</code> and
 * <code>CONTENT_BOUNDING_BOX</code> have the same memory layout.
 * </p>
 *
 * @param {string} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata|ContentMetadata} metadata The metadata for looking up values
 * @return {object} An object representing the JSON description of the tile or content bounding volume
 * @private
 */
BoundingVolumeSemantics.parseBoundingVolumeSemantic = function (
  prefix,
  metadata,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("prefix", prefix);
  if (prefix !== "TILE" && prefix !== "CONTENT") {
    throw new DeveloperError("prefix must be either 'TILE' or 'CONTENT'");
  }
  Check.typeOf.object("metadata", metadata);
  //>>includeEnd('debug');

  const boundingBoxSemantic = `${prefix}_BOUNDING_BOX`;
  const boundingBox = metadata.getPropertyBySemantic(boundingBoxSemantic);

  if (defined(boundingBox)) {
    return {
      box: boundingBox,
    };
  }

  const boundingRegionSemantic = `${prefix}_BOUNDING_REGION`;
  const boundingRegion = metadata.getPropertyBySemantic(boundingRegionSemantic);

  if (defined(boundingRegion)) {
    return {
      region: boundingRegion,
    };
  }

  const boundingSphereSemantic = `${prefix}_BOUNDING_SPHERE`;
  const boundingSphere = metadata.getPropertyBySemantic(boundingSphereSemantic);

  if (defined(boundingSphere)) {
    // ARRAY with 4 elements is automatically converted to a Cartesian4
    return {
      sphere: boundingSphere,
    };
  }

  return undefined;
};

/**
 * Parse the minimum height from tile or content metadata. This is used for making
 * tighter quadtree bounds for implicit tiling. This works for both
 * <code>TILE_MINIMUM_HEIGHT</code> and <code>CONTENT_MINIMUM_HEIGHT</code>
 *
 * @param {string} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata|ContentMetadata} metadata The metadata for looking up values
 * @return {number} The minimum height
 * @private
 */
BoundingVolumeSemantics._parseMinimumHeight = function (prefix, metadata) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("prefix", prefix);
  if (prefix !== "TILE" && prefix !== "CONTENT") {
    throw new DeveloperError("prefix must be either 'TILE' or 'CONTENT'");
  }
  Check.typeOf.object("metadata", metadata);
  //>>includeEnd('debug');

  const minimumHeightSemantic = `${prefix}_MINIMUM_HEIGHT`;
  return metadata.getPropertyBySemantic(minimumHeightSemantic);
};

/**
 * Parse the maximum height from tile or content metadata. This is used for
 * making tighter quadtree bounds for implicit tiling. This works for both
 * <code>TILE_MAXIMUM_HEIGHT</code> and <code>CONTENT_MAXIMUM_HEIGHT</code>
 *
 * @param {string} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata|ContentMetadata} metadata The metadata for looking up values
 * @return {number} The maximum height
 * @private
 */
BoundingVolumeSemantics._parseMaximumHeight = function (prefix, metadata) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("prefix", prefix);
  if (prefix !== "TILE" && prefix !== "CONTENT") {
    throw new DeveloperError("prefix must be either 'TILE' or 'CONTENT'");
  }
  Check.typeOf.object("metadata", metadata);
  //>>includeEnd('debug');

  const maximumHeightSemantic = `${prefix}_MAXIMUM_HEIGHT`;
  return metadata.getPropertyBySemantic(maximumHeightSemantic);
};

export default BoundingVolumeSemantics;
