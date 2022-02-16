import Check from "../Core/Check.js";
import defined from "../Core/defined.js";

/**
 * Parse the bounding volume-related semantics such as
 * <code>TILE_BOUNDING_BOX</code> and <code>CONTENT_BOUNDING_REGION</code> from
 * implicit tile metadata. Results are returned as a JSON object for use when
 * transcoding tiles (see {@link Implicit3DTileContent}).
 * <p>
 * Bounding volumes are checked in the order box, region, then sphere. Only
 * the first valid bounding volume is returned.
 * </p>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata/Semantics|3D Metadata Semantic Reference} for the various bounding volumes and minimum/maximum heights.
 *
 * @param {TileMetadata} tileMetadata The metadata object for looking up values by semantic. In practice, this will typically be a {@link ImplicitMetadataTableView}
 * @return {Object} An object containing a <code>tile</code> property and a <code>content</code> property. These contain the bounding volume, and any minimum or maximum height.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function parseBoundingVolumeSemantics(tileMetadata) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("tileMetadata", tileMetadata);
  //>>includeEnd('debug');

  return {
    tile: {
      boundingVolume: parseBoundingVolume("TILE", tileMetadata),
      minimumHeight: parseMinimumHeight("TILE", tileMetadata),
      maximumHeight: parseMaximumHeight("TILE", tileMetadata),
    },
    content: {
      boundingVolume: parseBoundingVolume("CONTENT", tileMetadata),
      minimumHeight: parseMinimumHeight("CONTENT", tileMetadata),
      maximumHeight: parseMaximumHeight("CONTENT", tileMetadata),
    },
  };
}

/**
 * Parse the bounding volume from a tile metadata. If the metadata specify
 * multiple bounding volumes, only the first one is returned. Bounding volumes
 * are checked in the order box, region, then sphere.
 *
 * This handles both tile and content bounding volumes, as the only difference
 * is the prefix. e.g. <code>TILE_BOUNDING_BOX</code> and
 * <code>CONTENT_BOUNDING_BOX</code> have the same memory layout.
 *
 * @param {String} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata} tileMetadata The tileMetadata for looking up values
 * @return {Object} An object representing the JSON description of the tile metadata
 * @private
 */
function parseBoundingVolume(prefix, tileMetadata) {
  const boundingBoxSemantic = `${prefix}_BOUNDING_BOX`;
  const boundingBox = tileMetadata.getPropertyBySemantic(boundingBoxSemantic);

  if (defined(boundingBox)) {
    return {
      box: boundingBox,
    };
  }

  const boundingRegionSemantic = `${prefix}_BOUNDING_REGION`;
  const boundingRegion = tileMetadata.getPropertyBySemantic(
    boundingRegionSemantic
  );

  if (defined(boundingRegion)) {
    return {
      region: boundingRegion,
    };
  }

  const boundingSphereSemantic = `${prefix}_BOUNDING_SPHERE`;
  const boundingSphere = tileMetadata.getPropertyBySemantic(
    boundingSphereSemantic
  );

  if (defined(boundingSphere)) {
    // ARRAY with 4 elements is automatically converted to a Cartesian4
    return {
      sphere: boundingSphere,
    };
  }

  return undefined;
}

/**
 * Parse the minimum height from tile metadata. This is used for making tighter
 * quadtree bounds for implicit tiling. This works for both
 * <code>TILE_MINIMUM_HEIGHT</code> and <code>CONTENT_MINIMUM_HEIGHT</code>
 *
 * @param {String} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata} tileMetadata The tileMetadata for looking up values
 * @return {Number} The minimum height
 * @private
 */
function parseMinimumHeight(prefix, tileMetadata) {
  const minimumHeightSemantic = `${prefix}_MINIMUM_HEIGHT`;
  return tileMetadata.getPropertyBySemantic(minimumHeightSemantic);
}

/**
 * Parse the maximum height from tile metadata. This is used for making tighter
 * quadtree bounds for implicit tiling. This works for both
 * <code>TILE_MAXIMUM_HEIGHT</code> and <code>CONTENT_MAXIMUM_HEIGHT</code>
 *
 * @param {String} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata} tileMetadata The tileMetadata for looking up values
 * @return {Number} The maximum height
 * @private
 */
function parseMaximumHeight(prefix, tileMetadata) {
  const maximumHeightSemantic = `${prefix}_MAXIMUM_HEIGHT`;
  return tileMetadata.getPropertyBySemantic(maximumHeightSemantic);
}
