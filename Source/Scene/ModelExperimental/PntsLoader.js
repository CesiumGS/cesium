import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import when from "../../ThirdParty/when.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
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
  var pnts = PntsParser.parse(this._arrayBuffer, this._byteOffset);

  var primitive = makePrimitive(pnts);

  var node = new Node();
  node.primitives = [primitive];
  node.matrix = undefined; // TODO: where should RTC be handled again?

  var scene = new Scene();
  scene.nodes = [node];
  scene.upAxis = undefined; // TODO
  scene.forwardAxis = undefined; // TODO

  var components = new Components();
  components.scene = scene;
  components.nodes = [node];
  components.featureMetadata = undefined; // TODO

  this._components = components;
  this._promise.resolve(this);
};

function makePositionAttribute(pnts) {
  var positionInfo = pnts.position;

  var quantization;
  if (positionInfo.isQuantized) {
    quantization = new Quantization();
    // TODO: Check these names
    quantization.normalizationRange = positionInfo.quantizationRange;
    quantization.quantizedVolumeOffset = positionInfo.quantizedVolumeOffset;
    quantization.quantizedVolumeDimensions =
      positionInfo.quantizedVolumeDimensions;
    // TODO: Check how GltfLoader does this. should be dimensions / offset
    quantization.quantizedVolumeStepSize = undefined;
    quantization.componentDatatype = positionInfo.quantizedDatatype;
    quantization.type = positionInfo.quantizationType;
  }

  var positionAttribute = new Attribute();
  positionAttribute.name = "POSITION";
  positionAttribute.semantic = "POSITION";
  positionAttribute.componentDatatype = positionInfo.componentDatatype;
  positionAttribute.type = AttributeType.VEC3;
  positionAttribute.min = undefined; // TODO
  positionAttribute.max = undefined; // TODO
  positionAttribute.quantization = undefined; // TODO: handle Draco
  positionAttribute.buffer = undefined; // TODO
  positionAttribute.typedArray = positionInfo.typedArray; // TODO: what about packedTypedArray?
}

function makePrimitive(pnts) {
  var primitive = new Primitive();
  primitive.attributes = []; // TODO
  primitive.indices = undefined; // TODO: do we need this for points?
  primitive.material = undefined; // TODO: do we supply a material?
  primitive.primitiveType = PrimitiveType.POINTS;

  // TODO: What if this is draco compressed?
  if (defined(pnts.batchId)) {
    var featureIdAttribute = new FeatureIdAttribute();
    featureIdAttribute.propertyTableId = 0;
    featureIdAttribute.setIndex = 0;
    primitive.featureIdAttributes = [featureIdAttribute]; // TODO
  }

  return primitive;
}

function decodeDraco(loader, context) {
  // TODO: only run this when decoding is in process

  var parsedContent = loader._parsedContent;
  var draco = parsedContent.draco;
  var decodePromise = DracoLoader.decodePointCloud(draco, context);
  if (defined(decodePromise)) {
    // TODO: point cloud sets a "DECODING" state. is this loading or processing?
    decodePromise
      .then(function (result) {
        handleDracoResult(loader, result);
      })
      .otherwise(function (error) {
        loader._state = ResourceLoaderState.FAILED;
        loader._readyPromise.reject(error);
      });
  }
}

function handleDracoResult(loader, result) {
  loader._state = ResourceLoaderState.READY; // TODO: should this be PROCESSING?

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

  parsedContent.positions = defaultValue(
    decodedPositions,
    parsedContent.positions
  );
  parsedContent.colors = defaultValue(
    defaultValue(decodedRgba, decodedRgb),
    parsedContent.colors
  );
  parsedContent.normals = defaultValue(decodedNormals, parsedContent.normals);
  parsedContent.batchIds = defaultValue(
    decodedBatchIds,
    parsedContent.batchIds
  );
  parsedContent.styleableProperties = styleableProperties;
}
