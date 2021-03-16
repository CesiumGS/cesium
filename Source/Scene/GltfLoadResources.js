import Check from "./Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
import GltfCache from "./GltfCache.js";

/**
 * Manages glTF load resources.
 *
 * @see GltfLoader
 *
 * @private
 */
function GltfLoadResources() {
  this._vertexBuffers = defaultValue.EMPTY_OBJECT;
  this._indexBuffers = defaultValue.EMPTY_OBJECT;
  this._promise = undefined;
}

Object.defineProperties(GltfLoadResources.prototype, {
  /**
   * A promise that resolves when the resources are ready.
   *
   * @memberof GltfLoadResources.prototype
   *
   * @type {Promise}
   * @readonly
   *
   * @exception {DeveloperError} The resources are not loaded.
   */
  promise: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(this._promise)) {
        throw new DeveloperError("The resources are not loaded");
      }
      //>>includeEnd('debug');
      return this._promise;
    },
  },
});

/**
 * Load resources.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {GltfVertexBufferCacheResource[]} [options.vertexBuffers] Vertex buffers to load.
 * @param {GltfIndexBufferCacheResource[]} [options.indexBuffers] Index buffers to load.
 *
 * @returns {Promise} A promise that resolves once all the resources are loaded.
 */
GltfLoadResources.prototype.load = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var vertexBuffers = defaultValue(
    options.vertexBuffers,
    defaultValue.EMPTY_OBJECT
  );
  var indexBuffers = defaultValue(
    options.indexBuffers,
    defaultValue.EMPTY_OBJECT
  );

  this._vertexBuffers = vertexBuffers;
  this._indexBuffers = indexBuffers;

  var promises = [];
  for (var vertexBufferId in vertexBuffers) {
    if (vertexBuffers.hasOwnProperty(vertexBufferId)) {
      var vertexBuffer = vertexBuffers[vertexBufferId];
      promises.push(vertexBuffer.promise);
    }
  }
  for (var indexBufferId in indexBuffers) {
    if (indexBuffers.hasOwnProperty(indexBufferId)) {
      var indexBuffer = vertexBuffers[indexBufferId];
      promises.push(indexBuffer.promise);
    }
  }

  return when.all(promises);
};

/**
 * Unload resources.
 */
GltfLoadResources.prototype.unload = function () {
  var vertexBuffers = this._vertexBuffers;
  var indexBuffers = this._indexBuffers;

  for (var vertexBufferId in vertexBuffers) {
    if (vertexBuffers.hasOwnProperty(vertexBufferId)) {
      var vertexBuffer = vertexBuffers[vertexBufferId];
      GltfCache.unloadVertexBuffer(vertexBuffer);
    }
  }
  for (var indexBufferId in indexBuffers) {
    if (indexBuffers.hasOwnProperty(indexBufferId)) {
      var indexBuffer = vertexBuffers[indexBufferId];
      GltfCache.unloadIndexBuffer(indexBuffer);
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
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');

  var vertexBuffers = this._vertexBuffers;
  var indexBuffers = this._indexBuffers;

  for (var vertexBufferId in vertexBuffers) {
    if (vertexBuffers.hasOwnProperty(vertexBufferId)) {
      var vertexBuffer = vertexBuffers[vertexBufferId];
      vertexBuffer.update(frameState);
    }
  }
  for (var indexBufferId in indexBuffers) {
    if (indexBuffers.hasOwnProperty(indexBufferId)) {
      var indexBuffer = vertexBuffers[indexBufferId];
      indexBuffer.update(frameState);
    }
  }
};
