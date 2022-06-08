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
export default function ResourceCacheStatistics() {
  /**
   * The size of vertex buffers and index buffers loaded in the cache in bytes.
   *
   * @type {Number}
   * @private
   */
  this.geometryByteLength = 0;

  /**
   * The size of all textures loaded in the cache in bytes
   *
   * @type {Number}
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
 * Track the resources for a vertex or index buffer loader. This is implemented
 * asynchronously since resources may not be immediately available to count.
 * This method handles the following cases gracefully:
 * <ul>
 *   <li>If the loader is added twice, its resources will not be double-counted</li>
 *   <li>If the geometry has a CPU copy of the GPU buffer, it will be added to the count</li>
 *   <li>If the resource loading failed, its resources will not be counted</li>
 *   <li>If removeLoader() was called before the loader promise resolves, its resources will not be counted</li>
 * </ul>
 * @param {GltfVertexBufferLoader|GltfIndexBufferLoader} loader The geometry buffer with resources to track
 * @returns {Promise} A promise that resolves once the count is updated.
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

  const that = this;
  return loader.promise
    .then(function (loader) {
      // loader was unloaded before its promise resolved
      if (!that._geometrySizes.hasOwnProperty(cacheKey)) {
        return;
      }

      const buffer = loader.buffer;
      const typedArray = loader.typedArray;

      let totalSize = 0;

      if (defined(buffer)) {
        totalSize += buffer.sizeInBytes;
      }

      if (defined(typedArray)) {
        totalSize += typedArray.byteLength;
      }

      that.geometryByteLength += totalSize;
      that._geometrySizes[cacheKey] = totalSize;
    })
    .catch(function () {
      // If the resource failed to load, remove it from the cache
      delete that._geometrySizes[cacheKey];
    });
};

/**
 * Track the resources for a texture loader. This is implemented
 * asynchronously since resources may not be immediately available to count.
 * This method handles the following cases gracefully:
 * <ul>
 *   <li>If the loader is added twice, its resources will not be double-counted</li>
 *   <li>If the resource loading failed, its resources will not be counted</li>
 *   <li>If removeLoader() was called before the loader promise resolves, its resources will not be counted</li>
 * </ul>
 * @param {GltfTextureLoader} loader The texture loader with resources to track
 * @returns {Promise} A promise that resolves once the count is updated.
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

  const that = this;
  return loader.promise
    .then(function (loader) {
      // loader was unloaded before its promise resolved
      if (!that._textureSizes.hasOwnProperty(cacheKey)) {
        return;
      }

      const totalSize = loader.texture.sizeInBytes;
      that.texturesByteLength += loader.texture.sizeInBytes;
      that._textureSizes[cacheKey] = totalSize;
    })
    .catch(function () {
      delete that._textureSizes[cacheKey];
    });
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
