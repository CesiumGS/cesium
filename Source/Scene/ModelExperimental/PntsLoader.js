import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Color from "../../Core/Color.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import MersenneTwister from "../../ThirdParty/mersenne-twister.js";
import when from "../../ThirdParty/when.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import AlphaMode from "../AlphaMode.js";
import AttributeType from "../AttributeType.js";
import Axis from "../Axis.js";
import parseBatchTable from "../parseBatchTable.js";
import DracoLoader from "../DracoLoader.js";
import FeatureMetadata from "../FeatureMetadata.js";
import ResourceLoader from "../ResourceLoader.js";
import MetadataClass from "../MetadataClass.js";
import ModelComponents from "../ModelComponents.js";
import PntsParser from "../PntsParser.js";
import PropertyTable from "../PropertyTable.js";
import ResourceLoaderState from "../ResourceLoaderState.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

var Components = ModelComponents.Components;
var Scene = ModelComponents.Scene;
var Node = ModelComponents.Node;
var Primitive = ModelComponents.Primitive;
var Attribute = ModelComponents.Attribute;
var Quantization = ModelComponents.Quantization;
var FeatureIdAttribute = ModelComponents.FeatureIdAttribute;
var Material = ModelComponents.Material;
var MetallicRoughness = ModelComponents.MetallicRoughness;

/**
 * Loads a .pnts point cloud and transcodes it into a {@link ModelComponents}
 *
 * @alias PntsLoader
 * @constructor
 * @augments ResourceLoader
 * @private
 *
 * @param {Object} options An object containing the following properties
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the pnts contents
 * @param {Number} [options.byteOffset] The byte offset to the beginning of the pnts contents in the array buffer
 */
export default function PntsLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var arrayBuffer = options.arrayBuffer;
  var byteOffset = defaultValue(options.byteOffset, 0);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  this._arrayBuffer = arrayBuffer;
  this._byteOffset = byteOffset;

  this._parsedContent = undefined;
  this._decodePromise = undefined;
  this._decodedAttributes = undefined;

  this._promise = when.defer();
  this._state = ResourceLoaderState.UNLOADED;
  this._buffers = [];

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

  loader._decodePromise = decodePromise;
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
      loader._promise.resolve(loader);
    })
    .otherwise(function (error) {
      loader.unload();
      loader._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load Draco";
      loader._promise.reject(loader.getError(errorMessage, error));
    });
}

function processDracoAttributes(loader, draco, result) {
  loader._state = ResourceLoaderState.READY;
  var parsedContent = loader._parsedContent;

  var attribute;
  if (defined(result.POSITION)) {
    attribute = {
      name: "POSITION",
      semantic: VertexAttributeSemantic.POSITION,
      typedArray: result.POSITION.array,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
      isQuantized: false,
    };

    if (defined(result.POSITION.data.quantization)) {
      // Draco quantization range == quantized volume scale - size in meters of the quantized volume
      // Internal quantized range is the range of values of the quantized data, e.g. 255 for 8-bit, 1023 for 10-bit, etc
      var quantization = result.POSITION.data.quantization;
      var range = quantization.range;
      var quantizedVolumeScale = Cartesian3.fromElements(range, range, range);
      var quantizedVolumeOffset = Cartesian3.unpack(quantization.minValues);
      var quantizedRange = (1 << quantization.quantizationBits) - 1.0;

      attribute.isQuantized = true;
      attribute.quantizedRange = quantizedRange;
      attribute.quantizedVolumeOffset = quantizedVolumeOffset;
      attribute.quantizedVolumeScale = quantizedVolumeScale;
      attribute.quantizedComponentDatatype = ComponentDatatype.UNSIGNED_SHORT;
      attribute.quantizedType = AttributeType.VEC3;
    }

    parsedContent.positions = attribute;
  }

  if (defined(result.NORMAL)) {
    attribute = {
      name: "NORMAL",
      semantic: VertexAttributeSemantic.NORMAL,
      typedArray: result.NORMAL.array,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
      isQuantized: false,
      octEncoded: false,
      octEncodedZXY: false,
    };

    if (defined(result.NORMAL.data.quantization)) {
      var octEncodedRange =
        (1 << result.NORMAL.data.quantization.quantizationBits) - 1.0;
      attribute.quantizedRange = octEncodedRange;
      attribute.octEncoded = true;
      attribute.octEncodedZXY = true;
      attribute.quantizedComponentDatatype = ComponentDatatype.UNSIGNED_BYTE;
      attribute.quantizedType = AttributeType.VEC2;
    }

    parsedContent.normals = attribute;
  }

  if (defined(result.RGBA)) {
    parsedContent.colors = {
      name: "COLOR",
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      typedArray: result.RGBA.array,
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      type: AttributeType.VEC4,
      normalized: true,
      isTranslucent: true,
    };
  } else if (defined(result.RGB)) {
    parsedContent.colors = {
      name: "COLOR",
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      typedArray: result.RGB.array,
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      type: AttributeType.VEC3,
      normalized: true,
      isTranslucent: false,
    };
  }

  // Transcode Batch ID (3D Tiles 1.0) -> Feature ID (3D Tiles Next)
  if (defined(result.BATCH_ID)) {
    parsedContent.batchIds = {
      name: "BATCH_ID",
      semantic: VertexAttributeSemantic.FEATURE_ID,
      setIndex: 0,
      typedArray: result.BATCH_ID.array,
      componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
      type: AttributeType.SCALAR,
    };
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
  parsedContent.styleableProperties = styleableProperties;
}

function makeAttribute(loader, attributeInfo, context) {
  var typedArray = attributeInfo.typedArray;
  var quantization;
  if (attributeInfo.octEncoded) {
    quantization = new Quantization();
    quantization.octEncoded = attributeInfo.octEncoded;
    quantization.octEncodedZXY = attributeInfo.octEncodedZXY;
    quantization.normalizationRange = attributeInfo.quantizedRange;
    quantization.type = attributeInfo.quantizedType;
    quantization.componentDatatype = attributeInfo.quantizedComponentDatatype;
  }
  if (attributeInfo.isQuantized) {
    quantization = new Quantization();
    var normalizationRange = attributeInfo.quantizedRange;
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
  attribute.type = attributeInfo.type;
  attribute.normalized = defaultValue(attributeInfo.normalized, false);
  attribute.min = attributeInfo.min;
  attribute.max = attributeInfo.max;
  attribute.quantization = quantization;

  if (attributeInfo.isRGB565) {
    typedArray = AttributeCompression.decodeRGB565(typedArray);
  }

  if (defined(attributeInfo.constantColor)) {
    var packedColor = new Array(4);
    attribute.constant = Color.pack(attributeInfo.constantColor, packedColor);
  } else {
    var buffer = Buffer.createVertexBuffer({
      typedArray: typedArray,
      context: context,
      usage: BufferUsage.STATIC_DRAW,
    });
    loader._buffers.push(buffer);
    attribute.buffer = buffer;
  }

  return attribute;
}

var randomNumberGenerator;
var randomValues;

function getRandomValues(samplesLength) {
  // Use same random values across all runs
  if (!defined(randomValues)) {
    // Use MersenneTwister directly to avoid interfering with CesiumMath.nextRandomNumber()
    // See https://github.com/CesiumGS/cesium/issues/9730
    randomNumberGenerator = new MersenneTwister(0);
    randomValues = new Array(samplesLength);
    for (var i = 0; i < samplesLength; ++i) {
      randomValues[i] = randomNumberGenerator.random();
    }
  }
  return randomValues;
}

var scratchMin = new Cartesian3();
var scratchMax = new Cartesian3();
var scratchPosition = new Cartesian3();
function computeApproximateExtrema(positions) {
  var positionsArray = positions.typedArray;
  var maximumSamplesLength = 20;
  var pointsLength = positionsArray.length / 3;
  var samplesLength = Math.min(pointsLength, maximumSamplesLength);
  var randomValues = getRandomValues(maximumSamplesLength);
  var maxValue = Number.MAX_VALUE;
  var minValue = -Number.MAX_VALUE;
  var min = Cartesian3.fromElements(maxValue, maxValue, maxValue, scratchMin);
  var max = Cartesian3.fromElements(minValue, minValue, minValue, scratchMax);
  var i;
  var index;
  var position;
  if (positions.isQuantized) {
    // Use the quantized volume to compute the min and max without sampling
    min = Cartesian3.clone(positions.quantizedVolumeOffset, scratchMin);
    max = Cartesian3.add(min, positions.quantizedVolumeScale, scratchMax);
  } else {
    for (i = 0; i < samplesLength; ++i) {
      index = Math.floor(randomValues[i] * pointsLength);
      position = Cartesian3.unpack(positionsArray, index * 3, scratchPosition);

      Cartesian3.minimumByComponent(min, position, min);
      Cartesian3.maximumByComponent(max, position, max);
    }
  }

  positions.min = Cartesian3.clone(min);
  positions.max = Cartesian3.clone(max);
}

// By default, point clouds are rendered as dark gray.
var defaultColorAttribute = {
  name: VertexAttributeSemantic.COLOR,
  semantic: VertexAttributeSemantic.COLOR,
  setIndex: 0,
  constantColor: Color.DARKGRAY,
  componentDatatype: ComponentDatatype.FLOAT,
  type: AttributeType.VEC4,
  isQuantized: false,
  isTranslucent: false,
};

function makeAttributes(loader, parsedContent, context) {
  var attributes = [];
  var attribute;
  var positions = parsedContent.positions;
  if (defined(positions)) {
    computeApproximateExtrema(positions);
    attribute = makeAttribute(loader, positions, context);
    attributes.push(attribute);
  }

  if (defined(parsedContent.normals)) {
    attribute = makeAttribute(loader, parsedContent.normals, context);
    attributes.push(attribute);
  }

  if (defined(parsedContent.colors)) {
    attribute = makeAttribute(loader, parsedContent.colors, context);
    attributes.push(attribute);
  } else {
    attribute = makeAttribute(loader, defaultColorAttribute, context);
    attributes.push(attribute);
  }

  if (defined(parsedContent.batchIds)) {
    attribute = makeAttribute(loader, parsedContent.batchIds, context);
    attributes.push(attribute);
  }

  return attributes;
}

function makeFeatureMetadata(parsedContent) {
  var batchLength = parsedContent.batchLength;
  var pointsLength = parsedContent.pointsLength;
  var batchTableBinary = parsedContent.batchTableBinary;

  if (defined(batchTableBinary)) {
    var count = defaultValue(batchLength, pointsLength);
    return parseBatchTable({
      count: count,
      batchTable: parsedContent.batchTableJson,
      binaryBody: batchTableBinary,
    });
  }

  // If batch table is not defined, create a property table without any properties.
  var emptyPropertyTable = new PropertyTable({
    name: MetadataClass.BATCH_TABLE_CLASS_NAME,
    count: pointsLength,
  });
  return new FeatureMetadata({
    schema: {},
    propertyTables: [emptyPropertyTable],
  });
}

function makeComponents(loader, context) {
  var parsedContent = loader._parsedContent;

  var metallicRoughness = new MetallicRoughness();
  metallicRoughness.metallicFactor = 0;
  metallicRoughness.roughnessFactor = 0.9;

  var material = new Material();
  material.metallicRoughness = metallicRoughness;

  var colors = parsedContent.colors;
  if (defined(colors) && colors.isTranslucent) {
    material.alphaMode = AlphaMode.BLEND;
  }

  // Render point clouds as unlit, unless normals are present, in which case
  // render as a PBR material.
  var isUnlit = !defined(parsedContent.normals);
  material.unlit = isUnlit;

  var primitive = new Primitive();
  primitive.attributes = makeAttributes(loader, parsedContent, context);
  primitive.primitiveType = PrimitiveType.POINTS;
  primitive.material = material;

  if (defined(parsedContent.batchIds)) {
    var featureIdAttribute = new FeatureIdAttribute();
    featureIdAttribute.propertyTableId = 0;
    featureIdAttribute.setIndex = 0;
    primitive.featureIdAttributes = [featureIdAttribute];
  }

  var node = new Node();
  node.primitives = [primitive];

  var scene = new Scene();
  scene.nodes = [node];
  scene.upAxis = Axis.Z;
  scene.forwardAxis = Axis.X;

  var components = new Components();
  components.scene = scene;
  components.nodes = [node];
  components.featureMetadata = makeFeatureMetadata(parsedContent);

  if (defined(parsedContent.rtcCenter)) {
    components.transform = Matrix4.fromTranslation(parsedContent.rtcCenter);
  }

  loader._components = components;

  // Free the parsed content so we don't hold onto the large typed arrays.
  loader._parsedContent = undefined;
}

PntsLoader.prototype.unload = function () {
  var buffers = this._buffers;
  for (var i = 0; i < buffers.length; i++) {
    buffers[i].destroy();
  }
  buffers.length = 0;

  this._components = undefined;
  this._parsedContent = undefined;
};
