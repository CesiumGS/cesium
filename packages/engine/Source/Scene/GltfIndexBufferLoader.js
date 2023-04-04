import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import DeveloperError from "../Core/DeveloperError.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import JobType from "./JobType.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads an index buffer from a glTF accessor.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfIndexBufferLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {object} options.gltf The glTF JSON.
 * @param {number} options.accessorId The accessor ID corresponding to the index buffer.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {object} [options.draco] The Draco extension object.
 * @param {string} [options.cacheKey] The cache key of the resource.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.loadBuffer=false] Load the index buffer as a GPU index buffer.
 * @param {boolean} [options.loadTypedArray=false] Load the index buffer as a typed array.
 * @private
 */
function GltfIndexBufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const resourceCache = options.resourceCache;
  const gltf = options.gltf;
  const accessorId = options.accessorId;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const draco = options.draco;
  const cacheKey = options.cacheKey;
  const asynchronous = defaultValue(options.asynchronous, true);
  const loadBuffer = defaultValue(options.loadBuffer, false);
  const loadTypedArray = defaultValue(options.loadTypedArray, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.accessorId", accessorId);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  if (!loadBuffer && !loadTypedArray) {
    throw new DeveloperError(
      "At least one of loadBuffer and loadTypedArray must be true."
    );
  }
  //>>includeEnd('debug');

  const indexDatatype = gltf.accessors[accessorId].componentType;

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._accessorId = accessorId;
  this._indexDatatype = indexDatatype;
  this._draco = draco;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._loadBuffer = loadBuffer;
  this._loadTypedArray = loadTypedArray;
  this._bufferViewLoader = undefined;
  this._dracoLoader = undefined;
  this._typedArray = undefined;
  this._buffer = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  GltfIndexBufferLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfIndexBufferLoader.prototype.constructor = GltfIndexBufferLoader;
}

Object.defineProperties(GltfIndexBufferLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof GltfIndexBufferLoader.prototype
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
   * The index buffer. This is only defined when <code>loadBuffer</code> is true.
   *
   * @memberof GltfIndexBufferLoader.prototype
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
   * The typed array containing indices. This is only defined when <code>loadTypedArray</code> is true.
   *
   * @memberof GltfIndexBufferLoader.prototype
   *
   * @type {Uint8Array|Uint16Array|Uint32Array}
   * @readonly
   * @private
   */
  typedArray: {
    get: function () {
      return this._typedArray;
    },
  },

  /**
   * The index datatype after decode.
   *
   * @memberof GltfIndexBufferLoader.prototype
   *
   * @type {IndexDatatype}
   * @readonly
   * @private
   */
  indexDatatype: {
    get: function () {
      return this._indexDatatype;
    },
  },
});

const scratchIndexBufferJob = new CreateIndexBufferJob();

/**
 * Loads the resource.
 * @returns {Promise<GltfIndexBufferLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfIndexBufferLoader.prototype.load = async function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  if (defined(this._draco)) {
    this._promise = loadFromDraco(this);
    return this._promise;
  }

  this._promise = loadFromBufferView(this);
  return this._promise;
};

async function loadFromDraco(indexBufferLoader) {
  indexBufferLoader._state = ResourceLoaderState.LOADING;
  const resourceCache = indexBufferLoader._resourceCache;

  try {
    const dracoLoader = resourceCache.getDracoLoader({
      gltf: indexBufferLoader._gltf,
      draco: indexBufferLoader._draco,
      gltfResource: indexBufferLoader._gltfResource,
      baseResource: indexBufferLoader._baseResource,
    });
    indexBufferLoader._dracoLoader = dracoLoader;
    await dracoLoader.load();

    if (indexBufferLoader.isDestroyed()) {
      return;
    }

    // Now wait for process() to run to finish loading
    indexBufferLoader._state = ResourceLoaderState.LOADED;
    return indexBufferLoader;
  } catch (error) {
    if (indexBufferLoader.isDestroyed()) {
      return;
    }

    handleError(indexBufferLoader, error);
  }
}

async function loadFromBufferView(indexBufferLoader) {
  const gltf = indexBufferLoader._gltf;
  const accessorId = indexBufferLoader._accessorId;
  const accessor = gltf.accessors[accessorId];
  const bufferViewId = accessor.bufferView;

  indexBufferLoader._state = ResourceLoaderState.LOADING;
  const resourceCache = indexBufferLoader._resourceCache;
  try {
    const bufferViewLoader = resourceCache.getBufferViewLoader({
      gltf: gltf,
      bufferViewId: bufferViewId,
      gltfResource: indexBufferLoader._gltfResource,
      baseResource: indexBufferLoader._baseResource,
    });
    indexBufferLoader._bufferViewLoader = bufferViewLoader;

    await bufferViewLoader.load();
    if (indexBufferLoader.isDestroyed()) {
      return;
    }

    const bufferViewTypedArray = bufferViewLoader.typedArray;
    indexBufferLoader._typedArray = createIndicesTypedArray(
      indexBufferLoader,
      bufferViewTypedArray
    );
    indexBufferLoader._state = ResourceLoaderState.PROCESSING;
    return indexBufferLoader;
  } catch (error) {
    if (indexBufferLoader.isDestroyed()) {
      return;
    }

    handleError(indexBufferLoader, error);
  }
}

function createIndicesTypedArray(indexBufferLoader, bufferViewTypedArray) {
  const gltf = indexBufferLoader._gltf;
  const accessorId = indexBufferLoader._accessorId;
  const accessor = gltf.accessors[accessorId];
  const count = accessor.count;
  const indexDatatype = accessor.componentType;
  const indexSize = IndexDatatype.getSizeInBytes(indexDatatype);

  let arrayBuffer = bufferViewTypedArray.buffer;
  let byteOffset = bufferViewTypedArray.byteOffset + accessor.byteOffset;

  if (byteOffset % indexSize !== 0) {
    const byteLength = count * indexSize;
    const view = new Uint8Array(arrayBuffer, byteOffset, byteLength);
    const copy = new Uint8Array(view);
    arrayBuffer = copy.buffer;
    byteOffset = 0;
    deprecationWarning(
      "index-buffer-unaligned",
      `The index array is not aligned to a ${indexSize}-byte boundary.`
    );
  }

  let typedArray;
  if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
    typedArray = new Uint8Array(arrayBuffer, byteOffset, count);
  } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
    typedArray = new Uint16Array(arrayBuffer, byteOffset, count);
  } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
    typedArray = new Uint32Array(arrayBuffer, byteOffset, count);
  }

  return typedArray;
}

function handleError(indexBufferLoader, error) {
  indexBufferLoader.unload();
  indexBufferLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load index buffer";
  throw indexBufferLoader.getError(errorMessage, error);
}

function CreateIndexBufferJob() {
  this.typedArray = undefined;
  this.indexDatatype = undefined;
  this.context = undefined;
  this.buffer = undefined;
}

CreateIndexBufferJob.prototype.set = function (
  typedArray,
  indexDatatype,
  context
) {
  this.typedArray = typedArray;
  this.indexDatatype = indexDatatype;
  this.context = context;
};

CreateIndexBufferJob.prototype.execute = function () {
  this.buffer = createIndexBuffer(
    this.typedArray,
    this.indexDatatype,
    this.context
  );
};

function createIndexBuffer(typedArray, indexDatatype, context) {
  const buffer = Buffer.createIndexBuffer({
    typedArray: typedArray,
    context: context,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });
  buffer.vertexArrayDestroyable = false;
  return buffer;
}

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfIndexBufferLoader.prototype.process = function (frameState) {
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

  let typedArray = this._typedArray;
  let indexDatatype = this._indexDatatype;

  if (defined(this._dracoLoader)) {
    try {
      const ready = this._dracoLoader.process(frameState);
      if (ready) {
        const dracoLoader = this._dracoLoader;
        typedArray = dracoLoader.decodedData.indices.typedArray;
        this._typedArray = typedArray;
        // The index datatype may be a smaller datatype after draco decode
        indexDatatype = ComponentDatatype.fromTypedArray(typedArray);
        this._indexDatatype = indexDatatype;
      }
    } catch (error) {
      handleError(this, error);
    }
  }

  if (!defined(typedArray)) {
    // Buffer view hasn't been loaded yet
    return false;
  }

  let buffer;
  if (this._loadBuffer && this._asynchronous) {
    const indexBufferJob = scratchIndexBufferJob;
    indexBufferJob.set(typedArray, indexDatatype, frameState.context);
    const jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(indexBufferJob, JobType.BUFFER)) {
      // Job scheduler is full. Try again next frame.
      return false;
    }
    buffer = indexBufferJob.buffer;
  } else if (this._loadBuffer) {
    buffer = createIndexBuffer(typedArray, indexDatatype, frameState.context);
  }

  // Unload everything except the index buffer and/or typed array.
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
GltfIndexBufferLoader.prototype.unload = function () {
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

  if (defined(this._dracoLoader)) {
    resourceCache.unload(this._dracoLoader);
  }

  this._bufferViewLoader = undefined;
  this._dracoLoader = undefined;
  this._typedArray = undefined;
  this._buffer = undefined;
  this._gltf = undefined;
};

export default GltfIndexBufferLoader;
