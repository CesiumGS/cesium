import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import when from "../ThirdParty/when.js";
import ResourceCache from "./ResourceCache.js";

/**
 * Manages glTF load resources.
 *
 * @alias GltfLoadResources
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfVertexBufferCacheResource[]} options.vertexBuffers Vertex buffers to load.
 * @param {GltfIndexBufferCacheResource[]} options.indexBuffers Index buffers to load.
 * @param {GltfTextureCacheResource[]} options.textures Textures to load.
 *
 * @see GltfLoader
 *
 * @private
 */
export default function GltfLoadResources(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var vertexBuffers = options.vertexBuffers;
  var indexBuffers = options.indexBuffers;
  var textures = options.textures;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.vertexBuffers", vertexBuffers);
  Check.typeOf.object("options.indexBuffers", indexBuffers);
  Check.typeOf.object("options.textures", textures);
  //>>includeEnd('debug');

  this._vertexBuffers = vertexBuffers;
  this._indexBuffers = indexBuffers;
  this._textures = textures;
  this._promise = when.defer();
}

Object.defineProperties(GltfLoadResources.prototype, {
  /**
   * A promise that resolves when the resources are ready.
   *
   * @memberof GltfLoadResources.prototype
   *
   * @type {Promise.<GltfLoadResources>}
   * @readonly
   */
  promise: {
    get: function () {
      return this._promise;
    },
  },
});

/**
 * Load resources.
 */
GltfLoadResources.prototype.load = function () {
  var vertexBuffers = this._vertexBuffers;
  var indexBuffers = this._indexBuffers;
  var textures = this._textures;

  var promises = [];
  for (var vertexBufferId in vertexBuffers) {
    if (vertexBuffers.hasOwnProperty(vertexBufferId)) {
      var vertexBuffer = vertexBuffers[vertexBufferId];
      promises.push(vertexBuffer.promise);
    }
  }
  for (var indexBufferId in indexBuffers) {
    if (indexBuffers.hasOwnProperty(indexBufferId)) {
      var indexBuffer = indexBuffers[indexBufferId];
      promises.push(indexBuffer.promise);
    }
  }
  for (var textureId in textures) {
    if (textures.hasOwnProperty(textureId)) {
      var texture = textures[textureId];
      promises.push(texture.promise);
    }
  }

  var that = this;

  when
    .all(promises)
    .then(function () {
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      that._promise.reject(error);
    });
};

/**
 * Unload resources.
 */
GltfLoadResources.prototype.unload = function () {
  var vertexBuffers = this._vertexBuffers;
  var indexBuffers = this._indexBuffers;
  var textures = this._textures;

  for (var vertexBufferId in vertexBuffers) {
    if (vertexBuffers.hasOwnProperty(vertexBufferId)) {
      var vertexBuffer = vertexBuffers[vertexBufferId];
      ResourceCache.unload(vertexBuffer);
    }
  }
  for (var indexBufferId in indexBuffers) {
    if (indexBuffers.hasOwnProperty(indexBufferId)) {
      var indexBuffer = indexBuffers[indexBufferId];
      ResourceCache.unload(indexBuffer);
    }
  }
  for (var textureId in textures) {
    if (textures.hasOwnProperty(textureId)) {
      var texture = textures[textureId];
      ResourceCache.unload(texture);
    }
  }
};

/**
 * Updates resources.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfLoadResources.prototype.update = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  var vertexBuffers = this._vertexBuffers;
  var indexBuffers = this._indexBuffers;
  var textures = this._textures;

  for (var vertexBufferId in vertexBuffers) {
    if (vertexBuffers.hasOwnProperty(vertexBufferId)) {
      var vertexBuffer = vertexBuffers[vertexBufferId];
      vertexBuffer.update(frameState);
    }
  }
  for (var indexBufferId in indexBuffers) {
    if (indexBuffers.hasOwnProperty(indexBufferId)) {
      var indexBuffer = indexBuffers[indexBufferId];
      indexBuffer.update(frameState);
    }
  }
  for (var textureId in textures) {
    if (textures.hasOwnProperty(textureId)) {
      var texture = textures[textureId];
      texture.update(frameState);
    }
  }
};
