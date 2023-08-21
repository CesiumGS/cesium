import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Color from "../../Core/Color.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import WebGLConstants from "../../Core/WebGLConstants.js";
import MersenneTwister from "mersenne-twister";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import AlphaMode from "../AlphaMode.js";
import AttributeType from "../AttributeType.js";
import Axis from "../Axis.js";
import parseBatchTable from "../parseBatchTable.js";
import DracoLoader from "../DracoLoader.js";
import StructuralMetadata from "../StructuralMetadata.js";
import ResourceLoader from "../ResourceLoader.js";
import ModelComponents from "../ModelComponents.js";
import PntsParser from "../PntsParser.js";
import ResourceLoaderState from "../ResourceLoaderState.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

const Components = ModelComponents.Components;
const Scene = ModelComponents.Scene;
const Node = ModelComponents.Node;
const Primitive = ModelComponents.Primitive;
const Attribute = ModelComponents.Attribute;
const Quantization = ModelComponents.Quantization;
const FeatureIdAttribute = ModelComponents.FeatureIdAttribute;
const Material = ModelComponents.Material;
const MetallicRoughness = ModelComponents.MetallicRoughness;

/**
 * Loads a .pnts point cloud and transcodes it into a {@link ModelComponents}
 *
 * @alias PntsLoader
 * @constructor
 * @augments ResourceLoader
 * @private
 *
 * @param {object} options An object containing the following properties
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the pnts contents
 * @param {number} [options.byteOffset] The byte offset to the beginning of the pnts contents in the array buffer
 * @param {boolean} [options.loadAttributesFor2D=false] If true, load the positions buffer as a typed array for accurately projecting models to 2D.
 */
function PntsLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const arrayBuffer = options.arrayBuffer;
  const byteOffset = defaultValue(options.byteOffset, 0);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  this._arrayBuffer = arrayBuffer;
  this._byteOffset = byteOffset;
  this._loadAttributesFor2D = defaultValue(options.loadAttributesFor2D, false);

  this._parsedContent = undefined;
  this._decodePromise = undefined;
  this._decodedAttributes = undefined;

  this._promise = undefined;
  this._error = undefined;
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
   * The cache key of the resource
   *
   * @memberof PntsLoader.prototype
   *
   * @type {string}
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
 * @returns {Promise<PntsLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
PntsLoader.prototype.load = function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._parsedContent = PntsParser.parse(this._arrayBuffer, this._byteOffset);
  this._state = ResourceLoaderState.PROCESSING;

  this._promise = Promise.resolve(this);
};

PntsLoader.prototype.process = function (frameState) {
  if (defined(this._error)) {
    const error = this._error;
    this._error = undefined;
    throw error;
  }

  if (this._state === ResourceLoaderState.READY) {
    return true;
  }

  if (this._state === ResourceLoaderState.PROCESSING) {
    if (defined(this._decodePromise)) {
      return false;
    }

    this._decodePromise = decodeDraco(this, frameState.context);
  }

  return false;
};

function decodeDraco(loader, context) {
  const parsedContent = loader._parsedContent;
  const draco = parsedContent.draco;

  let decodePromise;
  if (!defined(draco)) {
    // The draco extension wasn't present,
    decodePromise = Promise.resolve();
  } else {
    decodePromise = DracoLoader.decodePointCloud(draco, context);
  }

  if (!defined(decodePromise)) {
    // Could not schedule Draco decoding this frame.
    return;
  }

  loader._decodePromise = decodePromise;
  return decodePromise
    .then(function (decodeDracoResult) {
      if (loader.isDestroyed()) {
        return;
      }

      if (defined(decodeDracoResult)) {
        processDracoAttributes(loader, draco, decodeDracoResult);
      }
      makeComponents(loader, context);
      loader._state = ResourceLoaderState.READY;
      return loader;
    })
    .catch(function (error) {
      loader.unload();
      loader._state = ResourceLoaderState.FAILED;
      const errorMessage = "Failed to load Draco pnts";
      // This error will be thrown next time process is called;
      loader._error = loader.getError(errorMessage, error);
    });
}

function processDracoAttributes(loader, draco, result) {
  loader._state = ResourceLoaderState.READY;
  const parsedContent = loader._parsedContent;

  let attribute;
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
      const quantization = result.POSITION.data.quantization;
      const range = quantization.range;
      const quantizedVolumeScale = Cartesian3.fromElements(range, range, range);
      const quantizedVolumeOffset = Cartesian3.unpack(quantization.minValues);
      const quantizedRange = (1 << quantization.quantizationBits) - 1.0;

      attribute.isQuantized = true;
      attribute.quantizedRange = quantizedRange;
      attribute.quantizedVolumeOffset = quantizedVolumeOffset;
      attribute.quantizedVolumeScale = quantizedVolumeScale;
      attribute.quantizedComponentDatatype =
        quantizedRange <= 255
          ? ComponentDatatype.UNSIGNED_BYTE
          : ComponentDatatype.UNSIGNED_SHORT;
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
      const octEncodedRange =
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
    const batchIds = result.BATCH_ID.array;
    parsedContent.batchIds = {
      name: "_FEATURE_ID",
      semantic: VertexAttributeSemantic.FEATURE_ID,
      setIndex: 0,
      typedArray: batchIds,
      componentDatatype: ComponentDatatype.fromTypedArray(batchIds),
      type: AttributeType.SCALAR,
    };
  }

  let batchTableJson = parsedContent.batchTableJson;

  const batchTableProperties = draco.batchTableProperties;
  for (const name in batchTableProperties) {
    if (batchTableProperties.hasOwnProperty(name)) {
      const property = result[name];

      if (!defined(batchTableJson)) {
        batchTableJson = {};
      }

      parsedContent.hasDracoBatchTable = true;

      const data = property.data;
      batchTableJson[name] = {
        byteOffset: data.byteOffset,
        // Draco returns the results like glTF values, but here
        // we want to transcode to a batch table. It's redundant
        // but necessary to use parseBatchTable()
        type: transcodeAttributeType(data.componentsPerAttribute),
        componentType: transcodeComponentType(data.componentDatatype),
        // Each property is stored as a separate typed array, so
        // store it here. parseBatchTable() will check for this
        // instead of the entire binary body.
        typedArray: property.array,
      };
    }
  }
  parsedContent.batchTableJson = batchTableJson;
}

function transcodeAttributeType(componentsPerAttribute) {
  switch (componentsPerAttribute) {
    case 1:
      return "SCALAR";
    case 2:
      return "VEC2";
    case 3:
      return "VEC3";
    case 4:
      return "VEC4";
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(
        "componentsPerAttribute must be a number from 1-4"
      );
    //>>includeEnd('debug');
  }
}

function transcodeComponentType(value) {
  switch (value) {
    case WebGLConstants.BYTE:
      return "BYTE";
    case WebGLConstants.UNSIGNED_BYTE:
      return "UNSIGNED_BYTE";
    case WebGLConstants.SHORT:
      return "SHORT";
    case WebGLConstants.UNSIGNED_SHORT:
      return "UNSIGNED_SHORT";
    case WebGLConstants.INT:
      return "INT";
    case WebGLConstants.UNSIGNED_INT:
      return "UNSIGNED_INT";
    case WebGLConstants.DOUBLE:
      return "DOUBLE";
    case WebGLConstants.FLOAT:
      return "FLOAT";
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("value is not a valid WebGL constant");
    //>>includeEnd('debug');
  }
}

function makeAttribute(loader, attributeInfo, context) {
  let typedArray = attributeInfo.typedArray;
  let quantization;
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
    const normalizationRange = attributeInfo.quantizedRange;
    quantization.normalizationRange = normalizationRange;
    // volume offset sometimes requires 64-bit precision so this is handled
    // in the components.transform matrix.
    quantization.quantizedVolumeOffset = Cartesian3.ZERO;
    const quantizedVolumeDimensions = attributeInfo.quantizedVolumeScale;
    quantization.quantizedVolumeDimensions = quantizedVolumeDimensions;
    quantization.quantizedVolumeStepSize = Cartesian3.divideByScalar(
      quantizedVolumeDimensions,
      normalizationRange,
      new Cartesian3()
    );
    quantization.componentDatatype = attributeInfo.quantizedComponentDatatype;
    quantization.type = attributeInfo.quantizedType;
  }

  const attribute = new Attribute();
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
    const packedColor = new Array(4);
    attribute.constant = Color.pack(attributeInfo.constantColor, packedColor);
  } else {
    const buffer = Buffer.createVertexBuffer({
      typedArray: typedArray,
      context: context,
      usage: BufferUsage.STATIC_DRAW,
    });
    buffer.vertexArrayDestroyable = false;
    loader._buffers.push(buffer);
    attribute.buffer = buffer;
  }

  const loadAttributesFor2D = loader._loadAttributesFor2D;
  if (
    attribute.semantic === VertexAttributeSemantic.POSITION &&
    loadAttributesFor2D
  ) {
    attribute.typedArray = typedArray;
  }

  return attribute;
}

let randomNumberGenerator;
let randomValues;

function getRandomValues(samplesLength) {
  // Use same random values across all runs
  if (!defined(randomValues)) {
    // Use MersenneTwister directly to avoid interfering with CesiumMath.nextRandomNumber()
    // See https://github.com/CesiumGS/cesium/issues/9730
    randomNumberGenerator = new MersenneTwister(0);
    randomValues = new Array(samplesLength);
    for (let i = 0; i < samplesLength; ++i) {
      randomValues[i] = randomNumberGenerator.random();
    }
  }
  return randomValues;
}

const scratchMin = new Cartesian3();
const scratchMax = new Cartesian3();
const scratchPosition = new Cartesian3();
function computeApproximateExtrema(positions) {
  const positionsArray = positions.typedArray;
  const maximumSamplesLength = 20;
  const pointsLength = positionsArray.length / 3;
  const samplesLength = Math.min(pointsLength, maximumSamplesLength);
  const randomValues = getRandomValues(maximumSamplesLength);
  const maxValue = Number.MAX_VALUE;
  const minValue = -Number.MAX_VALUE;
  let min = Cartesian3.fromElements(maxValue, maxValue, maxValue, scratchMin);
  let max = Cartesian3.fromElements(minValue, minValue, minValue, scratchMax);
  let i;
  let index;
  let position;
  if (positions.isQuantized) {
    // The quantized volume offset is not used here since it will become part of
    // the model matrix.
    min = Cartesian3.ZERO;
    max = positions.quantizedVolumeScale;
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
const defaultColorAttribute = {
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
  const attributes = [];
  let attribute;
  const positions = parsedContent.positions;
  if (defined(positions)) {
    computeApproximateExtrema(positions);
    attribute = makeAttribute(loader, positions, context);
    attribute.count = parsedContent.pointsLength;
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

function makeStructuralMetadata(parsedContent, customAttributeOutput) {
  const batchLength = parsedContent.batchLength;
  const pointsLength = parsedContent.pointsLength;
  const batchTableBinary = parsedContent.batchTableBinary;

  // If there are batch IDs, parse as a property table. Otherwise, parse
  // as property attributes.
  const parseAsPropertyAttributes = !defined(parsedContent.batchIds);

  if (defined(batchTableBinary) || parsedContent.hasDracoBatchTable) {
    const count = defaultValue(batchLength, pointsLength);
    return parseBatchTable({
      count: count,
      batchTable: parsedContent.batchTableJson,
      binaryBody: batchTableBinary,
      parseAsPropertyAttributes: parseAsPropertyAttributes,
      customAttributeOutput: customAttributeOutput,
    });
  }

  return new StructuralMetadata({
    schema: {},
    propertyTables: [],
  });
}

function makeComponents(loader, context) {
  const parsedContent = loader._parsedContent;

  const metallicRoughness = new MetallicRoughness();
  metallicRoughness.metallicFactor = 0;
  metallicRoughness.roughnessFactor = 0.9;

  const material = new Material();
  material.metallicRoughness = metallicRoughness;

  const colors = parsedContent.colors;
  if (defined(colors) && colors.isTranslucent) {
    material.alphaMode = AlphaMode.BLEND;
  }

  // Render point clouds as unlit, unless normals are present, in which case
  // render as a PBR material.
  const isUnlit = !defined(parsedContent.normals);
  material.unlit = isUnlit;

  const primitive = new Primitive();
  primitive.attributes = makeAttributes(loader, parsedContent, context);
  primitive.primitiveType = PrimitiveType.POINTS;
  primitive.material = material;

  if (defined(parsedContent.batchIds)) {
    const featureIdAttribute = new FeatureIdAttribute();
    featureIdAttribute.propertyTableId = 0;
    featureIdAttribute.setIndex = 0;
    featureIdAttribute.positionalLabel = "featureId_0";
    primitive.featureIds.push(featureIdAttribute);
  }

  const node = new Node();
  node.index = 0;
  node.primitives = [primitive];

  const scene = new Scene();
  scene.nodes = [node];
  scene.upAxis = Axis.Z;
  scene.forwardAxis = Axis.X;

  const components = new Components();
  components.scene = scene;
  components.nodes = [node];

  // Per-point features will be parsed as property attributes and handled on
  // the GPU since CPU styling would be too expensive. However, if batch IDs
  // exist, features will be parsed as a property table.
  //
  // Property attributes refer to a custom attribute that will
  // store the values; such attributes will be populated in this array
  // as needed.
  const customAttributeOutput = [];
  components.structuralMetadata = makeStructuralMetadata(
    parsedContent,
    customAttributeOutput
  );

  if (customAttributeOutput.length > 0) {
    addPropertyAttributesToPrimitive(
      loader,
      primitive,
      customAttributeOutput,
      context
    );
  }

  if (defined(parsedContent.rtcCenter)) {
    components.transform = Matrix4.multiplyByTranslation(
      components.transform,
      parsedContent.rtcCenter,
      components.transform
    );
  }

  const positions = parsedContent.positions;
  if (defined(positions) && positions.isQuantized) {
    // The volume offset is sometimes in ECEF, so this is applied here rather
    // than the dequantization shader to avoid jitter
    components.transform = Matrix4.multiplyByTranslation(
      components.transform,
      positions.quantizedVolumeOffset,
      components.transform
    );
  }

  loader._components = components;

  // Free the parsed content and array buffer so we don't hold onto the large arrays.
  loader._parsedContent = undefined;
  loader._arrayBuffer = undefined;
}

function addPropertyAttributesToPrimitive(
  loader,
  primitive,
  customAttributes,
  context
) {
  const attributes = primitive.attributes;

  const length = customAttributes.length;
  for (let i = 0; i < length; i++) {
    const customAttribute = customAttributes[i];

    // Upload the typed array to the GPU and free the CPU copy.
    const buffer = Buffer.createVertexBuffer({
      typedArray: customAttribute.typedArray,
      context: context,
      usage: BufferUsage.STATIC_DRAW,
    });
    buffer.vertexArrayDestroyable = false;
    loader._buffers.push(buffer);
    customAttribute.buffer = buffer;
    customAttribute.typedArray = undefined;

    attributes.push(customAttribute);
  }

  // The batch table is always transcoded as a single property attribute, so
  // it will always be index 0
  primitive.propertyAttributeIds = [0];
}

PntsLoader.prototype.unload = function () {
  const buffers = this._buffers;
  for (let i = 0; i < buffers.length; i++) {
    buffers[i].destroy();
  }
  buffers.length = 0;

  this._components = undefined;
  this._parsedContent = undefined;
  this._arrayBuffer = undefined;
};

export default PntsLoader;
