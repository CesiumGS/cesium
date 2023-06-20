import defined from "../Core/defined.js";

/**
 * Parse the bounding volume from a tile metadata. If the metadata specify
 * multiple bounding volumes, only the first one is returned. Bounding volumes
 * are checked in the order box, region, then sphere.
 *
 * This handles both tile and content bounding volumes, as the only difference
 * is the prefix. e.g. <code>TILE_BOUNDING_BOX</code> and
 * <code>CONTENT_BOUNDING_BOX</code> have the same memory layout.
 *
 * @param {string} prefix Either "TILE" or "CONTENT"
 * @param {TileMetadata} tileMetadata The tileMetadata for looking up values
 * @return {object} An object representing the JSON description of the tile metadata
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

export default parseBoundingVolume;
