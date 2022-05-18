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

  // TODO: an ES6 Set would be nicer for this
  // Sets of buffers and textures we've already counted, so we don't
  // double-count cached assets.
  this.bufferIdSet = {};
  this.textureIdSet = {};
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
