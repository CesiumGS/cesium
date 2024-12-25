import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import AttributeType from "./AttributeType.js";
import GltfVertexBufferLoader from "./GltfVertexBufferLoader.js";
import ModelComponents from "./ModelComponents.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads a vertex buffer from a glTF buffer view.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfDracoVertexBufferLoader
 * @constructor
 * @augments GltfVertexBufferLoader
 *
 * @param {object} options Object with the properties that are required for {@link GltfVertexBufferLoader}, and the following properties:
 * @param {object} [options.draco] The Draco extension object.
 * @param {string} [options.attributeSemantic] The attribute semantic, e.g. POSITION or NORMAL.
 *
 * @private
 */
function GltfDracoVertexBufferLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  GltfVertexBufferLoader.call(this, options);

  const draco = options.draco;
  const attributeSemantic = options.attributeSemantic;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.draco", draco);
  Check.typeOf.string("options.attributeSemantic", attributeSemantic);
  //>>includeEnd('debug');

  this._accessorId = draco.attributes[attributeSemantic];
  this._dracoLoader = undefined;
  this._quantization = undefined;
}

if (defined(Object.create)) {
  GltfDracoVertexBufferLoader.prototype = Object.create(
    GltfVertexBufferLoader.prototype,
  );
  GltfDracoVertexBufferLoader.prototype.constructor =
    GltfDracoVertexBufferLoader;
}

Object.defineProperties(GltfDracoVertexBufferLoader.prototype, {
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

GltfDracoVertexBufferLoader.prototype.loadInternal = async function () {
  this._promise = loadFromDraco(this);
  return this._promise;
};

async function loadFromDraco(vertexBufferLoader) {
  vertexBufferLoader._state = ResourceLoaderState.LOADING;
  const resourceCache = vertexBufferLoader._resourceCache;
  try {
    const dracoLoader = resourceCache.getDracoLoader({
      gltf: vertexBufferLoader._gltf,
      draco: vertexBufferLoader._draco,
      gltfResource: vertexBufferLoader._gltfResource,
      baseResource: vertexBufferLoader._baseResource,
    });
    vertexBufferLoader._dracoLoader = dracoLoader;
    await dracoLoader.load();

    if (vertexBufferLoader.isDestroyed()) {
      return;
    }

    // Now wait for process() to run to finish loading
    vertexBufferLoader._state = ResourceLoaderState.LOADED;
    return vertexBufferLoader;
  } catch {
    if (vertexBufferLoader.isDestroyed()) {
      return;
    }

    handleError(vertexBufferLoader);
  }
}

GltfDracoVertexBufferLoader.prototype.processDraco = function () {
  this._state = ResourceLoaderState.PROCESSING;
  const dracoLoader = this._dracoLoader;

  // Get the typed array and quantization information
  const decodedVertexAttributes = dracoLoader.decodedData.vertexAttributes;
  const attributeSemantic = this._attributeSemantic;
  const dracoAttribute = decodedVertexAttributes[attributeSemantic];
  const accessorId = this._accessorId;
  const accessor = this._gltf.accessors[accessorId];
  const type = accessor.type;
  const typedArray = dracoAttribute.array;
  const dracoQuantization = dracoAttribute.data.quantization;
  if (defined(dracoQuantization)) {
    this._quantization = getQuantizationInformation(
      dracoQuantization,
      dracoAttribute.data.componentDatatype,
      dracoAttribute.data.componentsPerAttribute,
      type,
    );
  }

  this._typedArray = new Uint8Array(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  );
};

function getQuantizationInformation(
  dracoQuantization,
  componentDatatype,
  componentCount,
  type,
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
        dracoQuantization.minValues,
      );
      quantization.normalizationRange = MathType.unpack(
        new Array(componentCount).fill(normalizationRange),
      );
      const packedDimensions = new Array(componentCount).fill(
        dracoQuantization.range,
      );
      quantization.quantizedVolumeDimensions =
        MathType.unpack(packedDimensions);

      // Computing the step size
      const packedSteps = packedDimensions.map(function (dimension) {
        return dimension * normalizationDivisor;
      });
      quantization.quantizedVolumeStepSize = MathType.unpack(packedSteps);
    }
  }

  return quantization;
}

function handleError(vertexBufferLoader, error) {
  vertexBufferLoader.unload();
  vertexBufferLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load vertex buffer";
  throw vertexBufferLoader.getError(errorMessage, error);
}

GltfDracoVertexBufferLoader.prototype.processInternal = function (frameState) {
  try {
    const ready = this._dracoLoader.process(frameState);
    if (!ready) {
      return;
    }
  } catch (error) {
    handleError(this, error);
  }
  this.processDraco();
};

GltfDracoVertexBufferLoader.prototype.processDraco = function () {
  this._state = ResourceLoaderState.PROCESSING;
  const dracoLoader = this._dracoLoader;

  // Get the typed array and quantization information
  const decodedVertexAttributes = dracoLoader.decodedData.vertexAttributes;
  const attributeSemantic = this._attributeSemantic;
  const dracoAttribute = decodedVertexAttributes[attributeSemantic];
  const accessorId = this._accessorId;
  const accessor = this._gltf.accessors[accessorId];
  const type = accessor.type;
  const typedArray = dracoAttribute.array;
  const dracoQuantization = dracoAttribute.data.quantization;
  if (defined(dracoQuantization)) {
    this._quantization = getQuantizationInformation(
      dracoQuantization,
      dracoAttribute.data.componentDatatype,
      dracoAttribute.data.componentsPerAttribute,
      type,
    );
  }

  this._typedArray = new Uint8Array(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  );
};

GltfDracoVertexBufferLoader.prototype.unloadInternal = function () {
  const resourceCache = this._resourceCache;
  resourceCache.unload(this._dracoLoader);
  this._dracoLoader = undefined;
};

export default GltfDracoVertexBufferLoader;
