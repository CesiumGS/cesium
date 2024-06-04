import Check from "../Core/Check.js";
import defined from "../Core/defined.js";

/**
 * Statistics for the GPU and CPU memory used by the models loaded through the
 * {@link ResourceCache}.
 *
 * @alias ResourceCacheStatistics
 * @constructor
 *
 * @private
 */
function ResourceCacheStatistics() {
  /**
   * The size of vertex buffers and index buffers loaded in the cache in bytes.
   *
   * @type {number}
   * @private
   */
  this.geometryByteLength = 0;

  /**
   * The size of all textures loaded in the cache in bytes
   *
   * @type {number}
   * @private
   */
  this.texturesByteLength = 0;

  // Track the sizes of resources by cache key. This is important so
  // removeLoader() can decrement the counts correctly.
  this._geometrySizes = {};
  this._textureSizes = {};
}

/**
 * Reset the memory counts
 *
 * @private
 */
ResourceCacheStatistics.prototype.clear = function () {
  this.geometryByteLength = 0;
  this.texturesByteLength = 0;

  this._geometrySizes = {};
  this._textureSizes = {};
};

/**
 * Track the resources for a vertex or index buffer loader. This should be called after a loader is ready; that
 * is it has been loaded and processed.
 * This method handles the following cases gracefully:
 * <ul>
 *   <li>If the loader is added twice, its resources will not be double-counted</li>
 *   <li>If the geometry has a CPU copy of the GPU buffer, it will be added to the count</li>
 * </ul>
 * @param {GltfVertexBufferLoader|GltfIndexBufferLoader} loader The geometry buffer with resources to track
 *
 * @private
 */
ResourceCacheStatistics.prototype.addGeometryLoader = function (loader) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("loader", loader);
  //>>includeEnd('debug');

  const cacheKey = loader.cacheKey;

  // Don't double count the same resource.
  if (this._geometrySizes.hasOwnProperty(cacheKey)) {
    return;
  }

  this._geometrySizes[cacheKey] = 0;

  const buffer = loader.buffer;
  const typedArray = loader.typedArray;

  let totalSize = 0;

  if (defined(buffer)) {
    totalSize += buffer.sizeInBytes;
  }

  if (defined(typedArray)) {
    totalSize += typedArray.byteLength;
  }

  this.geometryByteLength += totalSize;
  this._geometrySizes[cacheKey] = totalSize;
};

/**
 * Track the resources for a texture loader. This should be called after a loader is ready; that
 * is it has been loaded and processed.
 * If the loader is added twice, its resources will not be double-counted.
 *
 * @param {GltfTextureLoader} loader The texture loader with resources to track
 *
 * @private
 */
ResourceCacheStatistics.prototype.addTextureLoader = function (loader) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("loader", loader);
  //>>includeEnd('debug');

  const cacheKey = loader.cacheKey;

  // Don't double count the same resource.
  if (this._textureSizes.hasOwnProperty(cacheKey)) {
    return;
  }

  this._textureSizes[cacheKey] = 0;
  const totalSize = loader.texture.sizeInBytes;
  this.texturesByteLength += loader.texture.sizeInBytes;
  this._textureSizes[cacheKey] = totalSize;
};

/**
 * Remove a loader's resources from the memory count. The loader's cache key
 * is used to determine information about the resource, so this method can
 * be used both for geometry and textures. If the loader does not have any
 * tracked resources, this is a no-op.
 * @param {ResourceLoader} loader The resource loader to remove from the cache
 *
 * @private
 */
ResourceCacheStatistics.prototype.removeLoader = function (loader) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("loader", loader);
  //>>includeEnd('debug');

  const cacheKey = loader.cacheKey;
  const geometrySize = this._geometrySizes[cacheKey];
  delete this._geometrySizes[cacheKey];

  if (defined(geometrySize)) {
    this.geometryByteLength -= geometrySize;
  }

  const textureSize = this._textureSizes[cacheKey];
  delete this._textureSizes[cacheKey];

  if (defined(textureSize)) {
    this.texturesByteLength -= textureSize;
  }
};

export default ResourceCacheStatistics;
