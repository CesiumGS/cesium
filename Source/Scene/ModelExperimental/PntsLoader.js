import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import when from "../../ThirdParty/when.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import AttributeType from "../AttributeType.js";
import Axis from "../Axis.js";
import DracoLoader from "../DracoLoader.js";
import ResourceLoader from "../ResourceLoader.js";
import ModelComponents from "../ModelComponents.js";
import PntsParser from "../PntsParser.js";
import ResourceLoaderState from "../ResourceLoaderState.js";

var Components = ModelComponents.Components;
var Scene = ModelComponents.Scene;
var Node = ModelComponents.Node;
var Primitive = ModelComponents.Primitive;
var Attribute = ModelComponents.Attribute;
var Quantization = ModelComponents.Quantization;
var FeatureIdAttribute = ModelComponents.FeatureIdAttribute;

export default function PntsLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var pntsResource = options.pntsResource;
  var baseResource = options.baseResource;
  var arrayBuffer = options.arrayBuffer;
  var byteOffset = defaultValue(options.byteOffset, 0);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.pntsResource", pntsResource);
  Check.typeOf.object("options.arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  this._pntsResource = pntsResource;
  this._baseResource = baseResource;
  this._arrayBuffer = arrayBuffer;
  this._byteOffset = byteOffset;

  this._parsedContent = undefined;
  this._decodePromise = undefined;
  this._decodedAttributes = undefined;

  this._promise = when.defer();
  this._state = ResourceLoaderState.UNLOADED;

  // The batch table object contains a json and a binary component access using keys of the same name.
  this._components = undefined;
  this._transform = Matrix4.IDENTITY;
}

if (defined(Object.create)) {
  PntsLoader.prototype = Object.create(ResourceLoader.prototype);
  PntsLoader.prototype.constructor = PntsLoader;
}

Object.defineProperties(PntsLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof PntsLoader.prototype
   *
   * @type {Promise.<PntsLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource
   *
   * @memberof PntsLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return undefined;
    },
  },

  /**
   * The loaded components.
   *
   * @memberof PntsLoader.prototype
   *
   * @type {ModelComponents.Components}
   * @default {@link Matrix4.IDENTITY}
   * @readonly
   * @private
   */
  components: {
    get: function () {
      return this._components;
    },
  },

  /**
   * A world-space transform to apply to the primitives.
   * See {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/PointCloud#global-semantics}
   *
   * @memberof PntsLoader.prototype
   *
   * @type {Matrix4}
   * @readonly
   * @private
   */
  transform: {
    get: function () {
      return this._transform;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
PntsLoader.prototype.load = function () {
  this._parsedContent = PntsParser.parse(this._arrayBuffer, this._byteOffset);
  this._state = ResourceLoaderState.PROCESSING;
};

PntsLoader.prototype.process = function (frameState) {
  if (this._state === ResourceLoaderState.PROCESSING) {
    if (!defined(this._decodePromise)) {
      decodeDraco(this, frameState.context);
    }
  }
};

function decodeDraco(loader, context) {
  var parsedContent = loader._parsedContent;
  var draco = parsedContent.draco;

  var decodePromise;
  if (!defined(draco)) {
    // The draco extension wasn't present,
    decodePromise = when.resolve();
  } else {
    decodePromise = DracoLoader.decodePointCloud(draco, context);
  }

  if (!defined(decodePromise)) {
    // Could not schedule Draco decoding this frame.
    return;
  }

  decodePromise
    .then(function (decodeDracoResult) {
      if (loader.isDestroyed()) {
        return;
      }

      if (defined(decodeDracoResult)) {
        processDracoAttributes(loader, draco, decodeDracoResult);
      }
      makeComponents(loader, context);
      loader._state = ResourceLoaderState.READY;
    })
    .otherwise(function (error) {
      loader.unload();
      loader._state = ResourceLoaderState.FAILED;
      loader._readyPromise.reject(error);
      var errorMessage = "Failed to load Draco";
      loader._promise.reject(loader.getError(errorMessage, error));
    });
}

function processDracoAttributes(loader, draco, result) {
  loader._state = ResourceLoaderState.READY;
  var parsedContent = loader._parsedContent;

  var decodedPositions = defined(result.POSITION)
    ? result.POSITION.array
    : undefined;
  var decodedRgb = defined(result.RGB) ? result.RGB.array : undefined;
  var decodedRgba = defined(result.RGBA) ? result.RGBA.array : undefined;
  var decodedNormals = defined(result.NORMAL) ? result.NORMAL.array : undefined;
  var decodedBatchIds = defined(result.BATCH_ID)
    ? result.BATCH_ID.array
    : undefined;
  var isQuantizedDraco =
    defined(decodedPositions) && defined(result.POSITION.data.quantization);
  var isOctEncodedDraco =
    defined(decodedNormals) && defined(result.NORMAL.data.quantization);

  if (isQuantizedDraco) {
    // Draco quantization range == quantized volume scale - size in meters of the quantized volume
    // Internal quantized range is the range of values of the quantized data, e.g. 255 for 8-bit, 1023 for 10-bit, etc
    var quantization = result.POSITION.data.quantization;
    var range = quantization.range;
    var quantizedVolumeDimensions = Cartesian3.fromElements(
      range,
      range,
      range
    );
    var quantizedVolumeOffset = Cartesian3.unpack(quantization.minValues);
    var normalizationRange = (1 << quantization.quantizationBits) - 1.0;

    var quantizedPositions = new Quantization();
    // TODO: Check these names
    quantizedPositions.normalizationRange = normalizationRange;
    quantization.quantizedVolumeOffset = quantizedVolumeOffset;
    quantization.quantizedVolumeDimensions = quantizedVolumeDimensions;
    // TODO: Check how GltfLoader does this. should be dimensions / offset
    quantization.quantizedVolumeStepSize = undefined;
    quantization.componentDatatype = ComponentDatatype.UNSIGNED_SHORT;
    quantization.type = AttributeType.VEC3;
  }

  if (isOctEncodedDraco) {
    var octEncodedRange =
      (1 << result.NORMAL.data.quantization.quantizationBits) - 1.0;

    var quantizedNormals = new Quantization();
    quantizedNormals.normalizationRange = octEncodedRange;
    quantizedNormals.octEncoded = true;
    quantizedNormals.octEncodedZYX = true;
    quantizedNormals.componentDatatype = undefined; // TODO: where can I find this?
  }

  var styleableProperties = parsedContent.styleableProperties;
  var batchTableProperties = draco.batchTableProperties;
  for (var name in batchTableProperties) {
    if (batchTableProperties.hasOwnProperty(name)) {
      var property = result[name];
      if (!defined(styleableProperties)) {
        styleableProperties = {};
      }
      styleableProperties[name] = {
        typedArray: property.array,
        componentCount: property.data.componentsPerAttribute,
      };
    }
  }

  parsedContent.positions = decodedPositions;
  parsedContent.colors = defaultValue(decodedRgba, decodedRgb);
  parsedContent.normals = decodedNormals;
  parsedContent.batchIds = decodedBatchIds;
  parsedContent.styleableProperties = styleableProperties;
}

function makeAttribute(attributeInfo, context) {
  var typedArray = attributeInfo.typedArray;
  var quantization;
  if (defined(attributeInfo.isQuantized)) {
    quantization = new Quantization();
    var normalizationRange = attributeInfo.quantizationRange;
    quantization.normalizationRange = normalizationRange;
    quantization.quantizedVolumeOffset = attributeInfo.quantizedVolumeOffset;
    var quantizedVolumeDimensions = attributeInfo.quantizedVolumeScale;
    quantization.quantizedVolumeDimensions = quantizedVolumeDimensions;
    quantization.quantizedVolumeStepSize = Cartesian3.divideByScalar(
      quantizedVolumeDimensions,
      normalizationRange,
      new Cartesian3()
    );
    quantization.componentDatatype = attributeInfo.quantizedComponentDatatype;
    quantization.type = attributeInfo.quantizedType;
  }

  var attribute = new Attribute();
  attribute.name = attributeInfo.name;
  attribute.semantic = attributeInfo.semantic;
  attribute.setIndex = attributeInfo.setIndex;
  attribute.componentDatatype = attributeInfo.componentDatatype;
  attribute.type = AttributeType.VEC3;
  attribute.min = attributeInfo.min;
  attribute.max = attributeInfo.max;
  attribute.quantization = quantization;
  attribute.buffer = Buffer.createVertexBuffer({
    typedArray: typedArray,
    context: context,
    usage: BufferUsage.STATIC_DRAW,
  });
  attribute.typedArray = typedArray;
}

function makeAttributes(parsedContent, context) {
  var attributes = [];
  var attribute;
  if (defined(parsedContent.positions)) {
    attribute = makeAttribute(parsedContent.positions, context);
    attributes.push(attribute);
  }

  if (defined(parsedContent.normals)) {
    attribute = makeAttribute(parsedContent.normals, context);
    attributes.push(attribute);
  }

  if (defined(parsedContent.colors)) {
    attribute = makeAttribute(parsedContent.colors, context);
    attributes.push(attribute);
  }

  if (defined(parsedContent.batchIds)) {
    attribute = makeAttribute(parsedContent.batchesIds, context);
    attributes.push(attribute);
  }

  return attributes;
}

function makeFeatureMetadata(parsedContent) {
  // TODO:
  return undefined;
}

function makeComponents(loader, context) {
  var parsedContent = loader._parsedContent;

  var primitive = new Primitive();
  primitive.attributes = makeAttributes(parsedContent, context);
  primitive.primitiveType = PrimitiveType.POINTS;

  if (defined(parsedContent.batchIds)) {
    var featureIdAttribute = new FeatureIdAttribute();
    featureIdAttribute.propertyTableId = 0;
    featureIdAttribute.setIndex = 0;
    primitive.featureIdAttributes = [featureIdAttribute];
  }

  var node = new Node();
  node.primitives = [primitive];
  node.matrix = loader._transform;

  var scene = new Scene();
  scene.nodes = [node];
  scene.upAxis = Axis.Z;
  scene.forwardAxis = Axis.X;

  var components = new Components();
  components.scene = scene;
  components.nodes = [node];
  components.featureMetadata = makeFeatureMetadata(parsedContent);

  loader._components = components;
}

PntsLoader.prototype.unload = function () {
  this._components = undefined;
};
