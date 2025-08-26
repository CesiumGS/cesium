import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import JobType from "./JobType.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a vertex buffer from a glTF buffer view.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias SpzVertexBufferLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {string} [options.attributeSemantic] The attribute semantic, e.g. POSITION or NORMAL.
 * @param {string} [options.cacheKey] The cache key of the resource.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.loadBuffer=false] Load vertex buffer as a GPU vertex buffer.
 * @param {boolean} [options.loadTypedArray=false] Load vertex buffer as a typed array.
 * @private
 */
function SpzVertexBufferLoader(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const resourceCache = options.resourceCache;
  const gltf = options.gltf;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const attributeSemantic = options.attributeSemantic;
  const cacheKey = options.cacheKey;
  const asynchronous = options.asynchronous ?? true;
  const loadBuffer = options.loadBuffer ?? false;
  const loadTypedArray = options.loadTypedArray ?? false;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  if (!loadBuffer && !loadTypedArray) {
    throw new DeveloperError(
      "At least one of loadBuffer and loadTypedArray must be true.",
    );
  }
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._attributeSemantic = attributeSemantic;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._loadBuffer = loadBuffer;
  this._loadTypedArray = loadTypedArray;
  this._bufferViewLoader = undefined;
  this._typedArray = undefined;
  this._buffer = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  SpzVertexBufferLoader.prototype = Object.create(ResourceLoader.prototype);
  SpzVertexBufferLoader.prototype.constructor = SpzVertexBufferLoader;
}

Object.defineProperties(SpzVertexBufferLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof SpzVertexBufferLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The vertex buffer. This is only defined when <code>loadAsTypedArray</code> is false.
   *
   * @memberof SpzVertexBufferLoader.prototype
   *
   * @type {Buffer}
   * @readonly
   * @private
   */
  buffer: {
    get: function () {
      return this._buffer;
    },
  },
  /**
   * The typed array containing vertex buffer data. This is only defined when <code>loadAsTypedArray</code> is true.
   *
   * @memberof SpzVertexBufferLoader.prototype
   *
   * @type {Uint8Array}
   * @readonly
   * @private
   */
  typedArray: {
    get: function () {
      return this._typedArray;
    },
  },
});

/**
 * Loads the resource.
 * @returns {Promise<SpzVertexBufferLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
SpzVertexBufferLoader.prototype.load = async function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._promise = loadFromSpz(this);
  return this._promise;
}

async function loadFromSpz(vertexBufferLoader) {
  vertexBufferLoader._state = ResourceLoaderState.LOADING;
  const resourceCache = vertexBufferLoader._resourceCache;
  try {
    const spzLoader = resourceCache.getSpzLoader({
      gltf: vertexBufferLoader._gltf,
      gltfResource: vertexBufferLoader._gltfResource,
      baseResource: vertexBufferLoader._baseResource,
    });
    vertexBufferLoader._spzLoader = spzLoader;
    await spzLoader.load();

    if (vertexBufferLoader.isDestroyed()) {
      return;
    }

    vertexBufferLoader._state = ResourceLoaderState.LOADED;
    return vertexBufferLoader;
  } catch {
    if (vertexBufferLoader.isDestroyed()) {
      return;
    }
  }
}

function handleError(vertexBufferLoader, error) {
  vertexBufferLoader.unload();
  vertexBufferLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load vertex buffer";
  throw vertexBufferLoader.getError(errorMessage, error);
}

function CreateVertexBufferJob() {
  this.typedArray = undefined;
  this.context = undefined;
  this.buffer = undefined;
}

CreateVertexBufferJob.prototype.set = function (typedArray, context) {
  this.typedArray = typedArray;
  this.context = context;
};

CreateVertexBufferJob.prototype.execute = function () {
  this.buffer = createVertexBuffer(this.typedArray, this.context);
};

function createVertexBuffer(typedArray, context) {
  const buffer = Buffer.createVertexBuffer({
    typedArray: typedArray,
    context: context,
    usage: BufferUsage.STATIC_DRAW,
  });
  buffer.vertexArrayDestroyable = false;
  return buffer;
}

const scratchVertexBufferJob = new CreateVertexBufferJob();

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
SpzVertexBufferLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === ResourceLoaderState.READY) {
    return true;
  }

  if (
    this._state !== ResourceLoaderState.LOADED &&
    this._state !== ResourceLoaderState.PROCESSING
  ) {
    return false;
  }

  if (defined(this._spzLoader)) {
    try {
      const ready = this._spzLoader.process(frameState);
      if (!ready) {
        return false;
      }

      this._typedArray = this._spzLoader.typedArray;
    } catch (error) {
      handleError(this, error);
    }
  }

  let buffer;
  const typedArray = this._typedArray;
  if (this._loadBuffer && this._asynchronous) {
    const vertexBufferJob = scratchVertexBufferJob;
    vertexBufferJob.set(typedArray, frameState.context);
    const jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(vertexBufferJob, JobType.BUFFER)) {
      // Job scheduler is full. Try again next frame.
      return false;
    }
    buffer = vertexBufferJob.buffer;
  } else if (this._loadBuffer) {
    buffer = createVertexBuffer(typedArray, frameState.context);
  }

  // Unload everything except the vertex buffer
  this.unload();

  this._buffer = buffer;
  this._typedArray = this._loadTypedArray ? typedArray : undefined;
  this._state = ResourceLoaderState.READY;
  this._resourceCache.statistics.addGeometryLoader(this);
  return true;
};

/**
 * Unloads the resource.
 * @private
 */
SpzVertexBufferLoader.prototype.unload = function () {
  if (defined(this._buffer)) {
    this._buffer.destroy();
  }

  const resourceCache = this._resourceCache;

  if (
    defined(this._bufferViewLoader) &&
    !this._bufferViewLoader.isDestroyed()
  ) {
    resourceCache.unload(this._bufferViewLoader);
  }

  if (defined(this._spzLoader)) {
    resourceCache.unload(this._spzLoader);
  }

  this._bufferViewLoader = undefined;
  this._spzLoader = undefined;
  this._typedArray = undefined;
  this._buffer = undefined;
  this._gltf = undefined;
};

export default SpzVertexBufferLoader;
