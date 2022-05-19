/**
 * Rendering statistics for a single model
 *
 * @alias ModelExperimentalStatistics
 * @constructor
 *
 * @see {@link Cesium3DTilesetStatistics}
 *
 * @private
 */
export default function ModelExperimentalStatistics() {
  this.pointsLength = 0;
  this.trianglesLength = 0;
  this.geometryByteLength = 0;
  this.texturesByteLength = 0;

  // This includes property textures and feature ID textures
  this.metadataTexturesByteLength = 0;

  // This includes binary property table properties. This does not
  // include property attributes, as those are included in geometry.
  // Unlike metadata textures, there isn't an easy way to de-duplicate cached
  // resources since metadata is often in typed arrays, not Buffer objects
  this.metadataPropertiesByteLength = 0;

  // TODO: an ES6 Set would be nicer for this
  // Sets of buffers and textures we've already counted, so we don't
  // double-count cached assets.
  this.bufferIdSet = {};
  this.textureIdSet = {};
  this.metadataTextureIdSet = {};
}

/**
 * Reset the memory counts for this model. This should be called each time the
 * draw command pipeline is rebuilt.
 *
 * @private
 */
ModelExperimentalStatistics.prototype.clear = function () {
  this.pointsLength = 0;
  this.trianglesLength = 0;
  this.geometryByteLength = 0;
  this.texturesByteLength = 0;
  this.metadataTexturesByteLength = 0;
  this.metadataPropertiesByteLength = 0;
  this.bufferIdSet = {};
  this.textureIdSet = {};
};

ModelExperimentalStatistics.prototype.addBuffer = function (
  buffer,
  hasCpuCopy
) {
  if (!this.bufferIdSet.hasOwnProperty(buffer._id)) {
    // If there's a CPU copy, we need to count the memory twice
    const copies = hasCpuCopy ? 2 : 1;
    this.geometryByteLength += buffer.sizeInBytes * copies;
  }

  // Simulate set insertion
  this.bufferIdSet[buffer._id] = true;
};

ModelExperimentalStatistics.prototype.addTexture = function (texture) {
  if (!this.textureIds.hasOwnProperty(texture._id)) {
    this.texturesByteLength += texture.sizeInBytes;
  }

  // Simulate set insertion
  this.textureIdSet[texture._id] = true;
};

ModelExperimentalStatistics.prototype.addMetadataTexture = function (texture) {
  if (!this.metadataTextureIds.hasOwnProperty(texture._id)) {
    this.metadataTexturesByteLength += texture.sizeInBytes;
  }

  // Simulate set insertion
  this.metadataTextureIdSet[texture._id] = true;
};
