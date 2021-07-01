import arrayFill from "../Core/arrayFill.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import when from "../ThirdParty/when.js";
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
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Number} [options.bufferViewId] The bufferView ID corresponding to the vertex buffer.
 * @param {Object} [options.draco] The Draco extension object.
 * @param {String} [options.dracoAttributeSemantic] The Draco attribute semantic, e.g. POSITION or NORMAL.
 * @param {String} [options.dracoAccessorId] The Draco accessor id.
 * @param {String} [options.cacheKey] The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @exception {DeveloperError} One of options.bufferViewId and options.draco must be defined.
 * @exception {DeveloperError} When options.draco is defined options.dracoAttributeSemantic must also be defined.
 * @exception {DeveloperError} When options.draco is defined options.dracoAccessorId must also be defined.
 *
 * @private
 */
export default function GltfVertexBufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var bufferViewId = options.bufferViewId;
  var draco = options.draco;
  var dracoAttributeSemantic = options.dracoAttributeSemantic;
  var dracoAccessorId = options.dracoAccessorId;
  var cacheKey = options.cacheKey;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);

  var hasBufferViewId = defined(bufferViewId);
  var hasDraco = defined(draco);
  var hasDracoAttributeSemantic = defined(dracoAttributeSemantic);
  var hasDracoAccessorId = defined(dracoAccessorId);

  if (hasBufferViewId === hasDraco) {
    throw new DeveloperError(
      "One of options.bufferViewId and options.draco must be defined."
    );
  }

  if (hasDraco && !hasDracoAttributeSemantic) {
    throw new DeveloperError(
      "When options.draco is defined options.dracoAttributeSemantic must also be defined."
    );
  }

  if (hasDraco && !hasDracoAccessorId) {
    throw new DeveloperError(
      "When options.draco is defined options.dracoAccessorId must also be defined."
    );
  }

  if (hasDraco) {
    Check.typeOf.object("options.draco", draco);
    Check.typeOf.string(
      "options.dracoAttributeSemantic",
      dracoAttributeSemantic
    );
    Check.typeOf.number("options.dracoAccessorId", dracoAccessorId);
  }
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._bufferViewId = bufferViewId;
  this._draco = draco;
  this._dracoAttributeSemantic = dracoAttributeSemantic;
  this._dracoAccessorId = dracoAccessorId;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._bufferViewLoader = undefined;
  this._dracoLoader = undefined;
  this._quantization = undefined;
  this._typedArray = undefined;
  this._vertexBuffer = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfVertexBufferLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfVertexBufferLoader.prototype.constructor = GltfVertexBufferLoader;
}

Object.defineProperties(GltfVertexBufferLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfVertexBufferLoader.prototype
   *
   * @type {Promise.<GltfVertexBufferLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfVertexBufferLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The vertex buffer.
   *
   * @memberof GltfVertexBufferLoader.prototype
   *
   * @type {Buffer}
   * @readonly
   * @private
   */
  vertexBuffer: {
    get: function () {
      return this._vertexBuffer;
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

/**
 * Loads the resource.
 * @private
 */
GltfVertexBufferLoader.prototype.load = function () {
  if (defined(this._draco)) {
    loadFromDraco(this);
  } else {
    loadFromBufferView(this);
  }
};

function getQuantizationInformation(
  dracoQuantization,
  componentDatatype,
  componentCount,
  type
) {
  var quantizationBits = dracoQuantization.quantizationBits;
  var normalizationRange = (1 << quantizationBits) - 1;

  var quantization = new ModelComponents.Quantization();
  quantization.componentDatatype = componentDatatype;
  quantization.octEncoded = dracoQuantization.octEncoded;
  quantization.octEncodedZXY = true;
  quantization.type = type;

  if (quantization.octEncoded) {
    quantization.type = AttributeType.VEC2;
    quantization.normalizationRange = normalizationRange;
  } else {
    var MathType = AttributeType.getMathType(type);
    if (MathType === Number) {
      quantization.quantizedVolumeOffset = dracoQuantization.minValues[0];
      quantization.quantizedVolumeDimensions = dracoQuantization.range;
      quantization.normalizationRange = normalizationRange;
    } else {
      quantization.quantizedVolumeOffset = MathType.unpack(
        dracoQuantization.minValues
      );
      quantization.quantizedVolumeDimensions = MathType.unpack(
        arrayFill(new Array(componentCount), dracoQuantization.range)
      );
      quantization.normalizationRange = MathType.unpack(
        arrayFill(new Array(componentCount), normalizationRange)
      );
    }
  }

  return quantization;
}

function loadFromDraco(vertexBufferLoader) {
  var resourceCache = vertexBufferLoader._resourceCache;
  var dracoLoader = resourceCache.loadDraco({
    gltf: vertexBufferLoader._gltf,
    draco: vertexBufferLoader._draco,
    gltfResource: vertexBufferLoader._gltfResource,
    baseResource: vertexBufferLoader._baseResource,
  });

  vertexBufferLoader._dracoLoader = dracoLoader;
  vertexBufferLoader._state = ResourceLoaderState.LOADING;

  dracoLoader.promise
    .then(function () {
      if (vertexBufferLoader.isDestroyed()) {
        return;
      }
      // Get the typed array and quantization information
      var decodedVertexAttributes = dracoLoader.decodedData.vertexAttributes;
      var dracoSemantic = vertexBufferLoader._dracoAttributeSemantic;
      var dracoAttribute = decodedVertexAttributes[dracoSemantic];
      var dracoAccessorId = vertexBufferLoader._dracoAccessorId;
      var dracoAccessor = vertexBufferLoader._gltf.accessors[dracoAccessorId];
      var type = dracoAccessor.type;
      var typedArray = dracoAttribute.array;
      var dracoQuantization = dracoAttribute.data.quantization;
      if (defined(dracoQuantization)) {
        vertexBufferLoader._quantization = getQuantizationInformation(
          dracoQuantization,
          dracoAttribute.data.componentDatatype,
          dracoAttribute.data.componentsPerAttribute,
          type
        );
      }

      // Now wait for process() to run to finish loading
      vertexBufferLoader._typedArray = typedArray;
      vertexBufferLoader._state = ResourceLoaderState.PROCESSING;
    })
    .otherwise(function (error) {
      if (vertexBufferLoader.isDestroyed()) {
        return;
      }
      handleError(vertexBufferLoader, error);
    });
}

function loadFromBufferView(vertexBufferLoader) {
  var resourceCache = vertexBufferLoader._resourceCache;
  var bufferViewLoader = resourceCache.loadBufferView({
    gltf: vertexBufferLoader._gltf,
    bufferViewId: vertexBufferLoader._bufferViewId,
    gltfResource: vertexBufferLoader._gltfResource,
    baseResource: vertexBufferLoader._baseResource,
  });
  vertexBufferLoader._state = ResourceLoaderState.LOADING;
  vertexBufferLoader._bufferViewLoader = bufferViewLoader;

  bufferViewLoader.promise
    .then(function () {
      if (vertexBufferLoader.isDestroyed()) {
        return;
      }
      // Now wait for process() to run to finish loading
      vertexBufferLoader._typedArray = bufferViewLoader.typedArray;
      vertexBufferLoader._state = ResourceLoaderState.PROCESSING;
    })
    .otherwise(function (error) {
      if (vertexBufferLoader.isDestroyed()) {
        return;
      }
      handleError(vertexBufferLoader, error);
    });
}

function handleError(vertexBufferLoader, error) {
  vertexBufferLoader.unload();
  vertexBufferLoader._state = ResourceLoaderState.FAILED;
  var errorMessage = "Failed to load vertex buffer";
  error = vertexBufferLoader.getError(errorMessage, error);
  vertexBufferLoader._promise.reject(error);
}

function CreateVertexBufferJob() {
  this.typedArray = undefined;
  this.context = undefined;
  this.vertexBuffer = undefined;
}

CreateVertexBufferJob.prototype.set = function (typedArray, context) {
  this.typedArray = typedArray;
  this.context = context;
};

CreateVertexBufferJob.prototype.execute = function () {
  this.vertexBuffer = createVertexBuffer(this.typedArray, this.context);
};

function createVertexBuffer(typedArray, context) {
  var vertexBuffer = Buffer.createVertexBuffer({
    typedArray: typedArray,
    context: context,
    usage: BufferUsage.STATIC_DRAW,
  });
  vertexBuffer.vertexArrayDestroyable = false;
  return vertexBuffer;
}

var scratchVertexBufferJob = new CreateVertexBufferJob();

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

  if (defined(this._dracoLoader)) {
    this._dracoLoader.process(frameState);
  }

  if (defined(this._vertexBuffer)) {
    // Already created vertex buffer
    return;
  }

  if (!defined(this._typedArray)) {
    // Not ready to create vertex buffer
    return;
  }

  var vertexBuffer;

  if (this._asynchronous) {
    var vertexBufferJob = scratchVertexBufferJob;
    vertexBufferJob.set(this._typedArray, frameState.context);
    var jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(vertexBufferJob, JobType.BUFFER)) {
      // Job scheduler is full. Try again next frame.
      return;
    }
    vertexBuffer = vertexBufferJob.vertexBuffer;
  } else {
    vertexBuffer = createVertexBuffer(this._typedArray, frameState.context);
  }

  // Unload everything except the vertex buffer
  this.unload();

  this._vertexBuffer = vertexBuffer;
  this._state = ResourceLoaderState.READY;
  this._promise.resolve(this);
};

/**
 * Unloads the resource.
 * @private
 */
GltfVertexBufferLoader.prototype.unload = function () {
  if (defined(this._vertexBuffer)) {
    this._vertexBuffer.destroy();
  }

  var resourceCache = this._resourceCache;

  if (defined(this._bufferViewLoader)) {
    resourceCache.unload(this._bufferViewLoader);
  }

  if (defined(this._dracoLoader)) {
    resourceCache.unload(this._dracoLoader);
  }

  this._bufferViewLoader = undefined;
  this._dracoLoader = undefined;
  this._typedArray = undefined;
  this._vertexBuffer = undefined;
  this._gltf = undefined;
};
