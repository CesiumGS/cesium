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
import Transforms from "../../Core/Transforms.js";

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
  this._indexedTree = undefined;
  this._beginNode = undefined; // the index of the first point in the indexed tree
  this._boxENU = undefined;
  this._rtcCenter = undefined;
  this._pointsLength = undefined;
  this._rtcCenterEcef = undefined; // ECEF coordinates of the RTCCenter
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

PntsLoader.prototype.process = function (frameState, transformationMatrix) {
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
    this._transformationMatrix = transformationMatrix;
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
        "componentsPerAttribute must be a number from 1-4",
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
      new Cartesian3(),
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

/**
 * Fits a bounding box around a set of points
 * @param {Float32Array} positions, as an array of x, y, z coordinates packed as [x1, y1, z1, x2, y2, z2, ...]
 * @returns {Float64Array} bounding box in the form [minX, maxX, minY, maxY, minZ, maxZ]
 */
function fitBoundingBox(positions) {
  const numberOfPoints = positions.length / 3;
  const bbox = new Float64Array(6);
  bbox[0] = Infinity;
  bbox[1] = -Infinity;
  bbox[2] = Infinity;
  bbox[3] = -Infinity;
  bbox[4] = Infinity;
  bbox[5] = -Infinity;
  for (let i = 0; i < numberOfPoints; i++) {
    // for each axis x,y,z update the min and max values
    for (let axis = 0; axis < 3; axis++) {
      if (bbox[2 * axis] > positions[3 * i + axis]) {
        bbox[2 * axis] = positions[3 * i + axis];
      }
      if (bbox[2 * axis + 1] < positions[3 * i + axis]) {
        bbox[2 * axis + 1] = positions[3 * i + axis];
      }
    }
  }

  return bbox;
}

/**
 * Builds a 3D tree from a set of points
 *
 * Tree format:
 * - tree[0] is the index of the root of the tree
 * - let tree[i] be an index of a vertex of the tree; positions[ 3* tree[i], 3* tree[i] + 1, 3* tree[i] + 2] are the coordinates of the point
 * - the left child of tree[i] is tree[2 * i], and the right child of tree[i] is tree[2 * i + 1]
 * - tree[2 * i] = -1 means there is not left child, and tree[2 * i + 1] = -1 means there is not right child
 */
function make3DTree(positions) {
  const numberOfPoints = positions.length / 3;
  const tree = new Int32Array(numberOfPoints * 2);

  // sortedPnts[i] is the index of the point in the sorted positions array that will be partitioned/sorted as the tree is built
  const sortedPnts = new Int32Array(numberOfPoints);
  for (let i = 0; i < numberOfPoints; i++) {
    sortedPnts[i] = i;
  }
  for (let i = 0; i < 2 * numberOfPoints; i++) {
    tree[i] = -1;
  }
  const boundingBox = fitBoundingBox(positions);

  // pointIndex of the starting point of the tree.
  // tree[2 * p] = index of the left child of p, so positions[3 * tree[2 * p] + axis] < positions[3 * p + axis  ]
  // tree[2 * p + 1] = index of the right child of p, so positions[3 * p + axis] < positions[3 * tree[2 * p + 1] + axis]
  const p = partition(positions, sortedPnts, 0, numberOfPoints - 1, 0);

  quicksort(positions, sortedPnts, 0, p, numberOfPoints - 1, 1, tree);
  return [tree, sortedPnts[p], boundingBox];
}

/**
 * Recursively sorts the array of points via sortedPnts; with every level:
 *  1) the axis of comparison is determined by the depth of recursion as (depth % 3)
 *  2) the pivot is chosen as the median of the first, middle, and last points' axis value in the array segment
 *  3) the points are partitioned so that all elements less than the pivot are on the left and all elements greater than the pivot are on the right
 *  4) the pivot is saved as a vertex in the indexedTree
 *
 * properties:
 *  - tree[0] = sortedPnts[p] is the root of the tree, where p is the pivot point of the very first partition call
 *  - tree[2 * sortedPnts[mid]] = sortedPnts[low], the index of the left child of sortedPnts[mid]
 *  - tree[2 * sortedPnts[mid] + 1] = sortedPnts[high], the index of the right child of sortedPnts[mid]
 *  - positions[3 * tree[mid * 2] + axis] <
 *  positions[3 * tree[mid] + axis] <
 *  positions[3 * tree[mid * 2 + 1] + axis]
 *
 * @param {Float32Array} positions, as an array of x, y, z coordinates packed as [x1, y1, z1, x2, y2, z2, ...]
 * @param {Int32Array} sortedPnts, an array of indices of the points to be partitioned
 * @param {number} lo, the lower index of the array segment
 * @param {number} mid, the middle index of the array segment
 * @param {number} hi, the upper index of the array segment
 * @param {number} depth, the depth of the recursion
 * @param {Int32Array} tree, the 3D tree
 */
function quicksort(positions, sortedPnts, lo, mid, hi, depth, tree) {
  if (lo >= hi || lo < 0) {
    return;
  }
  const loPivot = partition(positions, sortedPnts, lo, mid - 1, depth);
  const hiPivot = partition(positions, sortedPnts, mid + 1, hi, depth);
  if (loPivot > -1) {
    tree[2 * sortedPnts[mid]] = sortedPnts[loPivot];
    quicksort(positions, sortedPnts, lo, loPivot, mid - 1, depth + 1, tree);
  }
  if (hiPivot > -1) {
    tree[2 * sortedPnts[mid] + 1] = sortedPnts[hiPivot];
    quicksort(positions, sortedPnts, mid + 1, hiPivot, hi, depth + 1, tree);
  }
}

/**
 * Partitions an array of points in-place based on the value of the points along a given axis.
 * The given axis is determined by the depth of recursion; the pivot point is chosen as the median of the first, middle, and last points' axis value in the array segment.
 *
 * The partitioned array has the property:
 *  -  for lo < i <= hi, positions[3 * sortedPnts[lo] + axis] < positions[3 * sortedPnts[i] + axis] <= positions[3 * sortedPnts[hi] + axis]
 *
 * @param {Float32Array} positions, as an array of x, y, z coordinates packed as [x1, y1, z1, x2, y2, z2, ...]
 * @param {Int32Array} sortedPnts, an array of indices of the points to be partitioned
 * @param {number} lo, the lower index of the array segment
 * @param {number} hi, the upper index of the array segment
 * @param {number} depth, the depth of the recursion
 * @returns {number} the index of the pivot point of the subarray between lo and hi
 */
// The partition algorithm is designed as a median pick algorithm; take the
// low, middle, and high indicies of the array segment and take the median of
// the three values and uses it as the pivot for the next partition.
function partition(positions, sortedPnts, lo, hi, depth) {
  const axis = depth % 3;
  if (hi < lo) {
    return -1;
  }
  if (lo === hi) {
    return lo;
  }
  if (lo + 1 === hi) {
    if (
      positions[3 * sortedPnts[lo] + axis] >
      positions[3 * sortedPnts[hi] + axis]
    ) {
      const temp = sortedPnts[lo];
      sortedPnts[lo] = sortedPnts[hi];
      sortedPnts[hi] = temp;
    }
    return hi;
  }

  // determine the index of the appropriate pivot
  const mid = sortedPnts[Math.floor((lo + hi) / 2)];
  const lowVal = positions[3 * sortedPnts[lo] + axis];
  const midVal = positions[3 * mid + axis];
  const highVal = positions[3 * sortedPnts[hi] + axis];

  // index of the pivot point in the positions array, divided by 3
  let positionsPivot = sortedPnts[hi];
  // index of the pivot point in the sortedPnts array
  let sortedPntsPivot = hi;

  if (lowVal <= midVal && midVal <= highVal) {
    positionsPivot = mid;
    sortedPntsPivot = Math.floor((lo + hi) / 2);
  } else if (midVal <= highVal && highVal <= lowVal) {
    positionsPivot = sortedPnts[hi];
    sortedPntsPivot = hi;
  } else if (midVal <= lowVal && lowVal <= highVal) {
    positionsPivot = sortedPnts[lo];
    sortedPntsPivot = lo;
  } else if (lowVal <= highVal && highVal <= midVal) {
    positionsPivot = sortedPnts[hi];
    sortedPntsPivot = hi;
  } else if (highVal <= lowVal && lowVal <= midVal) {
    positionsPivot = sortedPnts[lo];
    sortedPntsPivot = lo;
  } else if (highVal <= midVal && midVal <= lowVal) {
    positionsPivot = mid;
    sortedPntsPivot = Math.floor((lo + hi) / 2);
  }

  // swap the pivot with the last element in the partition range
  let temp = sortedPnts[hi];
  sortedPnts[hi] = positionsPivot;
  sortedPnts[sortedPntsPivot] = temp;
  // partition the array so that all elements less than the pivot are on the left and all elements greater than the pivot are on the right
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (
      positions[3 * sortedPnts[j] + axis] <=
      positions[3 * positionsPivot + axis]
    ) {
      const tmp = sortedPnts[i];
      sortedPnts[i] = sortedPnts[j];
      sortedPnts[j] = tmp;
      i += 1;
    }
  }
  // swap the pivot with the element at the partition index and return the partition index
  temp = sortedPnts[hi];
  sortedPnts[hi] = sortedPnts[i];
  sortedPnts[i] = temp;
  return i;
}

/**
 * Calculates the distance between two points represented as Float64Arrays
 * @param {Float64Array} v1, the first point as [x1, y1, z1]
 * @param {Float64Array} v2, the second point as [x2, y2, z2]
 * @returns {number} the distance between the two points
 */
function distance(v1, v2) {
  return Math.sqrt(
    (v1[0] - v2[0]) ** 2 + (v1[1] - v2[1]) ** 2 + (v1[2] - v2[2]) ** 2,
  );
}

/**
 * Normalizes a vector represented as a Float64Array
 * @param {Float64Array} v, the vector to normalize as [x, y, z]
 * @returns {Float64Array} the normalized vector as [x/||v||, y/||v||, z/||v||]
 */
function normalize(v) {
  const newVector = new Float64Array(3);
  const denom = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  newVector[0] = v[0] / denom;
  newVector[1] = v[1] / denom;
  newVector[2] = v[2] / denom;
  return newVector;
}

/**
 * Returns the t-value of the closest point on a line to a point.
 * @param point
 * @param a + t*b
 * @returns t minimizing |point - (a + t*b)|
 */
function closestPointOnLineToPoint(point, a, b) {
  const dir = normalize(b);
  return (
    dir[0] * (point[0] - a[0]) +
    dir[1] * (point[1] - a[1]) +
    dir[2] * (point[2] - a[2])
  );
}

function closestPointOnRayToPoint(point, a, b) {
  const t = closestPointOnLineToPoint(point, a, b);
  if (t < 0.0) {
    return a;
  }
  const intersection = new Float64Array(3);
  intersection[0] = a[0] + t * b[0];
  intersection[1] = a[1] + t * b[1];
  intersection[2] = a[2] + t * b[2];
  return intersection;
}

function distanceFromRayToPoint(ray, point) {
  const origin = new Float64Array(3);
  const dir = new Float64Array(3);
  origin[0] = ray.origin.x;
  origin[1] = ray.origin.y;
  origin[2] = ray.origin.z;
  dir[0] = ray.direction.x;
  dir[1] = ray.direction.y;
  dir[2] = ray.direction.z;
  return distance(point, closestPointOnRayToPoint(point, origin, dir));
}

function boundingSphereOfBox(boundingBox) {
  const minx = boundingBox[0];
  const maxx = boundingBox[1];
  const miny = boundingBox[2];
  const maxy = boundingBox[3];
  const minz = boundingBox[4];
  const maxz = boundingBox[5];

  const center = new Float64Array(3);
  center[0] = (minx + maxx) / 2;
  center[1] = (miny + maxy) / 2;
  center[2] = (minz + maxz) / 2;
  const vertex = new Float64Array(3);
  vertex[0] = minx;
  vertex[1] = miny;
  vertex[2] = minz;
  const radius = distance(center, vertex);
  return [center, radius];
}

/**
 * Finds the point within a radius of a ray in the ENU coordinate system of a tile that is closest to the ray
 * @param {Ray} ray
 * @param {number} radius
 * @returns {Cartesian3} the point within the radius of the ray in the ENU coordinate system of a tile that is closest to the ray
 */
PntsLoader.prototype.findPointsWithinRadiusOfRay = function (ray, radius) {
  const positions = this._enuCoords;
  const indexedTree = this._3DTree;
  const box = new Float64Array(6);
  box[0] = this._boxENU[0];
  box[1] = this._boxENU[1];
  box[2] = this._boxENU[2];
  box[3] = this._boxENU[3];
  box[4] = this._boxENU[4];
  box[5] = this._boxENU[5];

  const curNode = this._beginNode;
  const depth = 0;
  const result = rayIterate(
    indexedTree,
    positions,
    ray,
    box,
    curNode,
    depth,
    radius,
  );
  if (!result) {
    return null;
  }
  const ecefTransformationMatrix = Transforms.eastNorthUpToFixedFrame(
    this._rtcCenterEcef,
  );
  const ecef = matrixMultbyPointasVec(
    ecefTransformationMatrix,
    result[0],
    result[1],
    result[2],
  );
  return new Cartesian3(
    ecef[0] + this._rtcCenterEcef.x,
    ecef[1] + this._rtcCenterEcef.y,
    ecef[2] + this._rtcCenterEcef.z,
  );
};

function compareDistanceToRay(a, b, ray) {
  if (!a) {
    return b;
  } else if (!b) {
    return a;
  } else if (distanceFromRayToPoint(ray, a) < distanceFromRayToPoint(ray, b)) {
    return a;
  }
  return b;
}

function doesRayIntersectSphere(ray, sphere, searchRadius) {
  return distanceFromRayToPoint(ray, sphere[0]) <= sphere[1] + searchRadius;
}

function rayIterate(
  indexedTree,
  positions,
  ray,
  boundingBox,
  curNode,
  depth,
  radius,
) {
  const axis = depth % 3;
  const curAxis = positions[curNode * 3 + axis];
  const curx = positions[curNode * 3];
  const cury = positions[curNode * 3 + 1];
  const curz = positions[curNode * 3 + 2];
  const curPoint = new Float64Array(3);
  curPoint[0] = curx;
  curPoint[1] = cury;
  curPoint[2] = curz;

  const sphere = boundingSphereOfBox(boundingBox);
  let cur = null;
  if (!doesRayIntersectSphere(ray, sphere, radius)) {
    return null;
  }
  if (distanceFromRayToPoint(ray, curPoint) <= radius) {
    cur = curPoint;
  }
  const leftBound = boundingBox[2 * axis];
  const rightBound = boundingBox[2 * axis + 1];
  let left = null;
  let right = null;
  // Left
  if (indexedTree[curNode * 2] !== -1) {
    boundingBox[2 * axis + 1] = curAxis;
    const leftSphere = boundingSphereOfBox(boundingBox);
    if (doesRayIntersectSphere(ray, leftSphere, radius)) {
      left = rayIterate(
        indexedTree,
        positions,
        ray,
        boundingBox,
        indexedTree[curNode * 2],
        depth + 1,
        radius,
      );
    }
  }
  boundingBox[2 * axis + 1] = rightBound;
  boundingBox[2 * axis] = curAxis;
  // Right
  if (indexedTree[curNode * 2 + 1] !== -1) {
    const rightSphere = boundingSphereOfBox(boundingBox);
    if (doesRayIntersectSphere(ray, rightSphere, radius)) {
      right = rayIterate(
        indexedTree,
        positions,
        ray,
        boundingBox,
        indexedTree[curNode * 2 + 1],
        depth + 1,
        radius,
      );
    }
  }
  boundingBox[2 * axis] = leftBound;
  return compareDistanceToRay(cur, compareDistanceToRay(left, right, ray), ray);
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
    customAttributeOutput,
  );

  if (customAttributeOutput.length > 0) {
    addPropertyAttributesToPrimitive(
      loader,
      primitive,
      customAttributeOutput,
      context,
    );
  }

  if (defined(parsedContent.rtcCenter)) {
    components.transform = Matrix4.multiplyByTranslation(
      components.transform,
      parsedContent.rtcCenter,
      components.transform,
    );
  }

  const positions = parsedContent.positions;
  if (defined(positions) && positions.isQuantized) {
    // The volume offset is sometimes in ECEF, so this is applied here rather
    // than the dequantization shader to avoid jitter
    components.transform = Matrix4.multiplyByTranslation(
      components.transform,
      positions.quantizedVolumeOffset,
      components.transform,
    );
  }

  loader._components = components;
  loader._rtcCenter = parsedContent.rtcCenter;
  loader._pointsLength = parsedContent.pointsLength;
  loader._enuCoords = new Float64Array(3 * loader._pointsLength);
  loader._rtcCenterEcef = Matrix4.multiplyByPoint(
    loader._transformationMatrix,
    loader._rtcCenter,
    new Cartesian3(),
  );
  const enuTransformationMatrix = Matrix4.inverseTransformation(
    Transforms.eastNorthUpToFixedFrame(loader._rtcCenterEcef),
    new Matrix4(),
  );
  // convert the points of the tile into ECEF coordinates for use in the 3D Tree
  for (let i = 0; i < loader._pointsLength; i++) {
    const x = positions.typedArray[3 * i] + loader._rtcCenter.x;
    const y = positions.typedArray[3 * i + 1] + loader._rtcCenter.y;
    const z = positions.typedArray[3 * i + 2] + loader._rtcCenter.z;
    const ecefCoords = matrixMultbyPoint(loader._transformationMatrix, x, y, z);
    const enuCoords = matrixMultbyPointasVec(
      enuTransformationMatrix,
      ecefCoords[0] - loader._rtcCenterEcef.x,
      ecefCoords[1] - loader._rtcCenterEcef.y,
      ecefCoords[2] - loader._rtcCenterEcef.z,
    );
    loader._enuCoords[3 * i] = enuCoords[0];
    loader._enuCoords[3 * i + 1] = enuCoords[1];
    loader._enuCoords[3 * i + 2] = enuCoords[2];
  }
  const treeComponents = make3DTree(loader._enuCoords);
  loader._3DTree = treeComponents[0];
  loader._beginNode = treeComponents[1];
  loader._boxENU = treeComponents[2];
  loader._parsedContent = undefined;
  loader._arrayBuffer = undefined;
}

function matrixMultbyPoint(matrix, vX, vY, vZ) {
  const ecef = new Float64Array(3);
  ecef[0] = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
  ecef[1] = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
  ecef[2] = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];
  return ecef;
}

function matrixMultbyPointasVec(matrix, vX, vY, vZ) {
  const enu = new Float64Array(3);
  enu[0] = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
  enu[1] = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
  enu[2] = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;
  return enu;
}

PntsLoader.prototype.drillPickWithRay = function (ray) {};

function addPropertyAttributesToPrimitive(
  loader,
  primitive,
  customAttributes,
  context,
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
