import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import AttributeType from "./AttributeType.js";
import JobType from "./JobType.js";
import ModelComponents from "./ModelComponents.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a vertex buffer from a glTF buffer view.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfVertexBufferLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {object} [options.draco] The Draco extension object.
 * @param {string} [options.attributeSemantic] The attribute semantic, e.g. POSITION or NORMAL.
 * @param {number} [options.accessorId] The accessor id.
 * @param {string} [options.cacheKey] The cache key of the resource.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.loadBuffer=false] Load vertex buffer as a GPU vertex buffer.
 * @param {boolean} [options.loadTypedArray=false] Load vertex buffer as a typed array.
 *
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.attributeSemantic must also be defined.
 * @exception {DeveloperError} When options.draco is defined options.accessorId must also be defined.
 *
 * @private
 */
function GltfVertexBufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const resourceCache = options.resourceCache;
  const gltf = options.gltf;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const bufferViewId = options.bufferViewId;
  const draco = options.draco;
  const attributeSemantic = options.attributeSemantic;
  const accessorId = options.accessorId;
  const cacheKey = options.cacheKey;
  const asynchronous = defaultValue(options.asynchronous, true);
  const loadBuffer = defaultValue(options.loadBuffer, false);
  const loadTypedArray = defaultValue(options.loadTypedArray, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  if (!loadBuffer && !loadTypedArray) {
    throw new DeveloperError(
      "At least one of loadBuffer and loadTypedArray must be true."
    );
  }

  const hasBufferViewId = defined(bufferViewId);
  const hasDraco = hasDracoCompression(draco, attributeSemantic);
  const hasAttributeSemantic = defined(attributeSemantic);
  const hasAccessorId = defined(accessorId);

  if (hasBufferViewId === hasDraco) {
    throw new DeveloperError(
      "One of options.bufferViewId and options.draco must be defined."
    );
  }

  if (hasDraco && !hasAttributeSemantic) {
    throw new DeveloperError(
      "When options.draco is defined options.attributeSemantic must also be defined."
    );
  }

  if (hasDraco && !hasAccessorId) {
    throw new DeveloperError(
      "When options.draco is defined options.accessorId must also be defined."
    );
  }

  if (hasDraco) {
    Check.typeOf.object("options.draco", draco);
    Check.typeOf.string("options.attributeSemantic", attributeSemantic);
    Check.typeOf.number("options.accessorId", accessorId);
  }
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._bufferViewId = bufferViewId;
  this._draco = draco;
  this._attributeSemantic = attributeSemantic;
  this._accessorId = accessorId;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._loadBuffer = loadBuffer;
  this._loadTypedArray = loadTypedArray;
  this._bufferViewLoader = undefined;
  this._dracoLoader = undefined;
  this._quantization = undefined;
  this._typedArray = undefined;
  this._buffer = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
  this._process = function (loader, frameState) {};
}

if (defined(Object.create)) {
  GltfVertexBufferLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfVertexBufferLoader.prototype.constructor = GltfVertexBufferLoader;
}

Object.defineProperties(GltfVertexBufferLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready, or undefined if the resource hasn't started loading.
   *
   * @memberof GltfVertexBufferLoader.prototype
   *
   * @type {Promise<GltfVertexBufferLoader>|undefined}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfVertexBufferLoader.prototype
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
   * @memberof GltfVertexBufferLoader.prototype
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
   * @memberof GltfVertexBufferLoader.prototype
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
  /**
   * Information about the quantized vertex attribute after Draco decode.
   *
   * @memberof GltfVertexBufferLoader.prototype
   *
   * @type {ModelComponents.Quantization}
   * @readonly
   * @private
   */
  quantization: {
    get: function () {
      return this._quantization;
    },
  },
});

function hasDracoCompression(draco, semantic) {
  return (
    defined(draco) &&
    defined(draco.attributes) &&
    defined(draco.attributes[semantic])
  );
}

/**
 * Loads the resource.
 * @returns {Promise<GltfVertexBufferLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfVertexBufferLoader.prototype.load = function () {
  let promise;

  if (hasDracoCompression(this._draco, this._attributeSemantic)) {
    promise = loadFromDraco(this);
  } else {
    promise = loadFromBufferView(this);
  }

  const that = this;
  const scratchVertexBufferJob = new CreateVertexBufferJob();
  const processPromise = new Promise(function (resolve) {
    that._process = function (loader, frameState) {
      if (loader._state === ResourceLoaderState.READY) {
        return;
      }

      const typedArray = loader._typedArray;

      if (defined(loader._dracoLoader)) {
        loader._dracoLoader.process(frameState);
      }

      if (defined(loader._bufferViewLoader)) {
        loader._bufferViewLoader.process(frameState);
      }

      if (!defined(typedArray)) {
        // Buffer view hasn't been loaded yet
        return;
      }

      let buffer;
      if (loader._loadBuffer && loader._asynchronous) {
        const vertexBufferJob = scratchVertexBufferJob;
        vertexBufferJob.set(typedArray, frameState.context);
        const jobScheduler = frameState.jobScheduler;
        if (!jobScheduler.execute(vertexBufferJob, JobType.BUFFER)) {
          // Job scheduler is full. Try again next frame.
          return;
        }
        buffer = vertexBufferJob.buffer;
      } else if (loader._loadBuffer) {
        buffer = createVertexBuffer(typedArray, frameState.context);
      }

      // Unload everything except the vertex buffer
      loader.unload();

      loader._buffer = buffer;
      loader._typedArray = loader._loadTypedArray ? typedArray : undefined;
      loader._state = ResourceLoaderState.READY;
      resolve(loader);
    };
  });

  this._promise = promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }

      return processPromise;
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }

      return handleError(that, error);
    });
  return this._promise;
};

function getQuantizationInformation(
  dracoQuantization,
  componentDatatype,
  componentCount,
  type
) {
  const quantizationBits = dracoQuantization.quantizationBits;
  const normalizationRange = (1 << quantizationBits) - 1;
  const normalizationDivisor = 1.0 / normalizationRange;

  const quantization = new ModelComponents.Quantization();
  quantization.componentDatatype = componentDatatype;
  quantization.octEncoded = dracoQuantization.octEncoded;
  quantization.octEncodedZXY = true;
  quantization.type = type;

  if (quantization.octEncoded) {
    quantization.type = AttributeType.VEC2;
    quantization.normalizationRange = normalizationRange;
  } else {
    const MathType = AttributeType.getMathType(type);
    if (MathType === Number) {
      const dimensions = dracoQuantization.range;
      quantization.quantizedVolumeOffset = dracoQuantization.minValues[0];
      quantization.quantizedVolumeDimensions = dimensions;
      quantization.normalizationRange = normalizationRange;
      quantization.quantizedVolumeStepSize = dimensions * normalizationDivisor;
    } else {
      quantization.quantizedVolumeOffset = MathType.unpack(
        dracoQuantization.minValues
      );
      quantization.normalizationRange = MathType.unpack(
        new Array(componentCount).fill(normalizationRange)
      );
      const packedDimensions = new Array(componentCount).fill(
        dracoQuantization.range
      );
      quantization.quantizedVolumeDimensions = MathType.unpack(
        packedDimensions
      );

      // Computing the step size
      const packedSteps = packedDimensions.map(function (dimension) {
        return dimension * normalizationDivisor;
      });
      quantization.quantizedVolumeStepSize = MathType.unpack(packedSteps);
    }
  }

  return quantization;
}

function loadFromDraco(vertexBufferLoader) {
  const resourceCache = vertexBufferLoader._resourceCache;
  const dracoLoader = resourceCache.loadDraco({
    gltf: vertexBufferLoader._gltf,
    draco: vertexBufferLoader._draco,
    gltfResource: vertexBufferLoader._gltfResource,
    baseResource: vertexBufferLoader._baseResource,
  });

  vertexBufferLoader._dracoLoader = dracoLoader;
  vertexBufferLoader._state = ResourceLoaderState.LOADING;

  return dracoLoader.promise.then(function () {
    if (vertexBufferLoader.isDestroyed()) {
      return;
    }
    // Get the typed array and quantization information
    const decodedVertexAttributes = dracoLoader.decodedData.vertexAttributes;
    const attributeSemantic = vertexBufferLoader._attributeSemantic;
    const dracoAttribute = decodedVertexAttributes[attributeSemantic];
    const accessorId = vertexBufferLoader._accessorId;
    const accessor = vertexBufferLoader._gltf.accessors[accessorId];
    const type = accessor.type;
    const typedArray = dracoAttribute.array;
    const dracoQuantization = dracoAttribute.data.quantization;
    if (defined(dracoQuantization)) {
      vertexBufferLoader._quantization = getQuantizationInformation(
        dracoQuantization,
        dracoAttribute.data.componentDatatype,
        dracoAttribute.data.componentsPerAttribute,
        type
      );
    }

    // Now wait for process() to run to finish loading
    vertexBufferLoader._typedArray = new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength
    );
    vertexBufferLoader._state = ResourceLoaderState.PROCESSING;
    return vertexBufferLoader;
  });
}

function loadFromBufferView(vertexBufferLoader) {
  const resourceCache = vertexBufferLoader._resourceCache;
  const bufferViewLoader = resourceCache.loadBufferView({
    gltf: vertexBufferLoader._gltf,
    bufferViewId: vertexBufferLoader._bufferViewId,
    gltfResource: vertexBufferLoader._gltfResource,
    baseResource: vertexBufferLoader._baseResource,
  });
  vertexBufferLoader._state = ResourceLoaderState.LOADING;
  vertexBufferLoader._bufferViewLoader = bufferViewLoader;

  return bufferViewLoader.promise.then(function () {
    if (vertexBufferLoader.isDestroyed()) {
      return;
    }
    // Now wait for process() to run to finish loading
    vertexBufferLoader._typedArray = bufferViewLoader.typedArray;
    vertexBufferLoader._state = ResourceLoaderState.PROCESSING;
    return vertexBufferLoader;
  });
}

function handleError(vertexBufferLoader, error) {
  vertexBufferLoader.unload();
  vertexBufferLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load vertex buffer";
  error = vertexBufferLoader.getError(errorMessage, error);
  return Promise.reject(error);
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

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfVertexBufferLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  return this._process(this, frameState);
};

/**
 * Unloads the resource.
 * @private
 */
GltfVertexBufferLoader.prototype.unload = function () {
  if (defined(this._buffer)) {
    this._buffer.destroy();
  }

  const resourceCache = this._resourceCache;

  if (defined(this._bufferViewLoader)) {
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

export default GltfVertexBufferLoader;
