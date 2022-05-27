import defined from "../Core/defined.js";

export default function ResourceCacheStatistics() {
  this.geometryByteLength = 0;
  this.texturesByteLength = 0;

  this._geometrySizes = {};
  this._textureSizes = {};
}

ResourceCacheStatistics.prototype.clear = function () {
  this.geometryByteLength = 0;
  this.texturesByteLength = 0;

  this._geometrySizes = {};
  this._textureSizes = {};
};

ResourceCacheStatistics.prototype.addGeometryLoader = function (loader) {
  this._geometrySizes[loader.cacheKey] = 0;

  loader.promise.then(function (loader) {
    // loader was unloaded before its promise resolved
    if (!this._geometrySizes.hasOwnProperty(loader.cacheKey)) {
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

    this.geometryByteLength += totalSize;
    this._geometrySizes[loader.cacheKey] = totalSize;
  });
};

ResourceCacheStatistics.prototype.addTextureLoader = function (loader) {
  this._textureSizes[loader.cacheKey] = 0;

  loader.promise.then(function (loader) {
    // loader was unloaded before its promise resolved
    if (!this._textureSizes.hasOwnProperty(loader.cacheKey)) {
      return;
    }

    const totalSize = loader.texture.sizeInBytes;

    this.texturesByteLength += totalSize;
    this._textureSizes[loader.cacheKey] = totalSize;
  });
};

ResourceCacheStatistics.prototype.removeLoader = function (loader) {
  const cacheKey = loader.cacheKey;
  const geometrySize = this._geometrySizes[cacheKey];
  delete this._geometrySizes[cacheKey];

  if (defined(geometrySize)) {
    this.geometrySize -= geometrySize;
  }

  const textureSize = this._textureSizes[cacheKey];
  delete this._textureSizes[cacheKey];

  if (defined(textureSize)) {
    this.textureSizes -= textureSize;
  }
};
