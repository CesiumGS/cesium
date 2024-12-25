import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import GltfVertexBufferLoader from "./GltfVertexBufferLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a vertex buffer from a glTF buffer view.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfDefaultVertexBufferLoader
 * @constructor
 * @augments GltfVertexBufferLoader
 *
 * @param {object} options Object with the properties that are required for {@link GltfVertexBufferLoader}, and the following properties:
 * @param {number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 *
 * @private
 */
function GltfDefaultVertexBufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  GltfVertexBufferLoader.call(this, options);

  const bufferViewId = options.bufferViewId;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.bufferViewId", bufferViewId);
  //>>includeEnd('debug');
}

if (defined(Object.create)) {
  GltfDefaultVertexBufferLoader.prototype = Object.create(
    GltfVertexBufferLoader.prototype,
  );
  GltfDefaultVertexBufferLoader.prototype.constructor =
    GltfDefaultVertexBufferLoader;
}

GltfDefaultVertexBufferLoader.prototype.loadInternal = async function () {
  this._promise = this.loadFromBufferView();
  return this._promise;
};

GltfDefaultVertexBufferLoader.prototype.loadFromBufferView = async function () {
  this._state = ResourceLoaderState.LOADING;
  const resourceCache = this._resourceCache;
  try {
    const bufferViewLoader = resourceCache.getBufferViewLoader({
      gltf: this._gltf,
      bufferViewId: this._bufferViewId,
      gltfResource: this._gltfResource,
      baseResource: this._baseResource,
    });
    this._bufferViewLoader = bufferViewLoader;
    await bufferViewLoader.load();

    if (this.isDestroyed()) {
      return;
    }

    this._typedArray = bufferViewLoader.typedArray;
    this._state = ResourceLoaderState.PROCESSING;
    return this;
  } catch (error) {
    if (this.isDestroyed()) {
      return;
    }

    handleError(this, error);
  }
};

function handleError(vertexBufferLoader, error) {
  vertexBufferLoader.unload();
  vertexBufferLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load vertex buffer";
  throw vertexBufferLoader.getError(errorMessage, error);
}

GltfDefaultVertexBufferLoader.prototype.processInternal = function () {};

GltfVertexBufferLoader.prototype.unloadInternal = function () {
  const resourceCache = this._resourceCache;
  if (
    defined(this._bufferViewLoader) &&
    !this._bufferViewLoader.isDestroyed()
  ) {
    resourceCache.unload(this._bufferViewLoader);
  }

  this._bufferViewLoader = undefined;
};

export default GltfDefaultVertexBufferLoader;
