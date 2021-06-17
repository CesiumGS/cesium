import arraySlice from "../Core/arraySlice.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import RuntimeError from "../Core/RuntimeError.js";
import Transforms from "../Core/Transforms.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import VertexArray from "../Renderer/VertexArray.js";
import when from "../ThirdParty/when.js";
import BlendingState from "./BlendingState.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import Cesium3DTileFeatureTable from "./Cesium3DTileFeatureTable.js";
import DracoLoader from "./DracoLoader.js";
import getClipAndStyleCode from "./getClipAndStyleCode.js";
import getClippingFunction from "./getClippingFunction.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";
import StencilConstants from "./StencilConstants.js";

var DecodingState = {
  NEEDS_DECODE: 0,
  DECODING: 1,
  READY: 2,
  FAILED: 3,
};

/**
 * Represents the contents of a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/PointCloud|Point Cloud}
 * tile. Used internally by {@link PointCloud3DTileContent} and {@link TimeDynamicPointCloud}.
 *
 * @alias PointCloud
 * @constructor
 *
 * @see PointCloud3DTileContent
 * @see TimeDynamicPointCloud
 *
 * @private
 */
function PointCloud(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.arrayBuffer", options.arrayBuffer);
  //>>includeEnd('debug');

  // Hold onto the payload until the render resources are created
  this._parsedContent = undefined;

  this._drawCommand = undefined;
  this._isTranslucent = false;
  this._styleTranslucent = false;
  this._constantColor = Color.clone(Color.DARKGRAY);
  this._highlightColor = Color.clone(Color.WHITE);
  this._pointSize = 1.0;

  this._rtcCenter = undefined;
  this._quantizedVolumeScale = undefined;
  this._quantizedVolumeOffset = undefined;

  // These values are used to regenerate the shader when the style changes
  this._styleableShaderAttributes = undefined;
  this._isQuantized = false;
  this._isOctEncoded16P = false;
  this._isRGB565 = false;
  this._hasColors = false;
  this._hasNormals = false;
  this._hasBatchIds = false;

  // Draco
  this._decodingState = DecodingState.READY;
  this._dequantizeInShader = true;
  this._isQuantizedDraco = false;
  this._isOctEncodedDraco = false;
  this._quantizedRange = 0.0;
  this._octEncodedRange = 0.0;

  // Use per-point normals to hide back-facing points.
  this.backFaceCulling = false;
  this._backFaceCulling = false;

  // Whether to enable normal shading
  this.normalShading = true;
  this._normalShading = true;

  this._opaqueRenderState = undefined;
  this._translucentRenderState = undefined;

  this._mode = undefined;

  this._ready = false;
  this._readyPromise = when.defer();
  this._pointsLength = 0;
  this._geometryByteLength = 0;

  this._vertexShaderLoaded = options.vertexShaderLoaded;
  this._fragmentShaderLoaded = options.fragmentShaderLoaded;
  this._uniformMapLoaded = options.uniformMapLoaded;
  this._batchTableLoaded = options.batchTableLoaded;
  this._pickIdLoaded = options.pickIdLoaded;
  this._opaquePass = defaultValue(options.opaquePass, Pass.OPAQUE);
  this._cull = defaultValue(options.cull, true);

  this.style = undefined;
  this._style = undefined;
  this.styleDirty = false;

  this.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

  this.time = 0.0; // For styling
  this.shadows = ShadowMode.ENABLED;
  this._boundingSphere = undefined;

  this.clippingPlanes = undefined;
  this.isClipped = false;
  this.clippingPlanesDirty = false;
  // If defined, use this matrix to position the clipping planes instead of the modelMatrix.
  // This is so that when point clouds are part of a tileset they all get clipped relative
  // to the root tile.
  this.clippingPlanesOriginMatrix = undefined;

  this.attenuation = false;
  this._attenuation = false;

  // Options for geometric error based attenuation
  this.geometricError = 0.0;
  this.geometricErrorScale = 1.0;
  this.maximumAttenuation = this._pointSize;

  initialize(this, options);
}

Object.defineProperties(PointCloud.prototype, {
  pointsLength: {
    get: function () {
      return this._pointsLength;
    },
  },

  geometryByteLength: {
    get: function () {
      return this._geometryByteLength;
    },
  },

  ready: {
    get: function () {
      return this._ready;
    },
  },

  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  color: {
    get: function () {
      return Color.clone(this._highlightColor);
    },
    set: function (value) {
      this._highlightColor = Color.clone(value, this._highlightColor);
    },
  },

  boundingSphere: {
    get: function () {
      if (defined(this._drawCommand)) {
        return this._drawCommand.boundingVolume;
      }
      return undefined;
    },
    set: function (value) {
      this._boundingSphere = BoundingSphere.clone(value, this._boundingSphere);
    },
  },
});

var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

function initialize(pointCloud, options) {
  var arrayBuffer = options.arrayBuffer;
  var byteOffset = defaultValue(options.byteOffset, 0);

  var uint8Array = new Uint8Array(arrayBuffer);
  var view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic

  var version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Point Cloud tile version 1 is supported.  Version " +
        version +
        " is not."
    );
  }
  byteOffset += sizeOfUint32;

  // Skip byteLength
  byteOffset += sizeOfUint32;

  var featureTableJsonByteLength = view.getUint32(byteOffset, true);
  if (featureTableJsonByteLength === 0) {
    throw new RuntimeError(
      "Feature table must have a byte length greater than zero"
    );
  }
  byteOffset += sizeOfUint32;

  var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var featureTableJson = getJsonFromTypedArray(
    uint8Array,
    byteOffset,
    featureTableJsonByteLength
  );
  byteOffset += featureTableJsonByteLength;

  var featureTableBinary = new Uint8Array(
    arrayBuffer,
    byteOffset,
    featureTableBinaryByteLength
  );
  byteOffset += featureTableBinaryByteLength;

  // Get the batch table JSON and binary
  var batchTableJson;
  var batchTableBinary;
  if (batchTableJsonByteLength > 0) {
    // Has a batch table JSON
    batchTableJson = getJsonFromTypedArray(
      uint8Array,
      byteOffset,
      batchTableJsonByteLength
    );
    byteOffset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      // Has a batch table binary
      batchTableBinary = new Uint8Array(
        arrayBuffer,
        byteOffset,
        batchTableBinaryByteLength
      );
      byteOffset += batchTableBinaryByteLength;
    }
  }

  var featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );

  var pointsLength = featureTable.getGlobalProperty("POINTS_LENGTH");
  featureTable.featuresLength = pointsLength;

  if (!defined(pointsLength)) {
    throw new RuntimeError(
      "Feature table global property: POINTS_LENGTH must be defined"
    );
  }

  var rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(rtcCenter)) {
    pointCloud._rtcCenter = Cartesian3.unpack(rtcCenter);
  }

  var positions;
  var colors;
  var normals;
  var batchIds;

  var hasPositions = false;
  var hasColors = false;
  var hasNormals = false;
  var hasBatchIds = false;

  var isQuantized = false;
  var isTranslucent = false;
  var isRGB565 = false;
  var isOctEncoded16P = false;

  var dracoBuffer;
  var dracoFeatureTableProperties;
  var dracoBatchTableProperties;

  var featureTableDraco = defined(featureTableJson.extensions)
    ? featureTableJson.extensions["3DTILES_draco_point_compression"]
    : undefined;
  var batchTableDraco =
    defined(batchTableJson) && defined(batchTableJson.extensions)
      ? batchTableJson.extensions["3DTILES_draco_point_compression"]
      : undefined;

  if (defined(batchTableDraco)) {
    dracoBatchTableProperties = batchTableDraco.properties;
  }

  if (defined(featureTableDraco)) {
    dracoFeatureTableProperties = featureTableDraco.properties;
    var dracoByteOffset = featureTableDraco.byteOffset;
    var dracoByteLength = featureTableDraco.byteLength;
    if (
      !defined(dracoFeatureTableProperties) ||
      !defined(dracoByteOffset) ||
      !defined(dracoByteLength)
    ) {
      throw new RuntimeError(
        "Draco properties, byteOffset, and byteLength must be defined"
      );
    }
    dracoBuffer = arraySlice(
      featureTableBinary,
      dracoByteOffset,
      dracoByteOffset + dracoByteLength
    );
    hasPositions = defined(dracoFeatureTableProperties.POSITION);
    hasColors =
      defined(dracoFeatureTableProperties.RGB) ||
      defined(dracoFeatureTableProperties.RGBA);
    hasNormals = defined(dracoFeatureTableProperties.NORMAL);
    hasBatchIds = defined(dracoFeatureTableProperties.BATCH_ID);
    isTranslucent = defined(dracoFeatureTableProperties.RGBA);
    pointCloud._decodingState = DecodingState.NEEDS_DECODE;
  }

  var draco;
  if (defined(dracoBuffer)) {
    draco = {
      buffer: dracoBuffer,
      featureTableProperties: dracoFeatureTableProperties,
      batchTableProperties: dracoBatchTableProperties,
      properties: combine(
        dracoFeatureTableProperties,
        dracoBatchTableProperties
      ),
      dequantizeInShader: pointCloud._dequantizeInShader,
    };
  }

  if (!hasPositions) {
    if (defined(featureTableJson.POSITION)) {
      positions = featureTable.getPropertyArray(
        "POSITION",
        ComponentDatatype.FLOAT,
        3
      );
      hasPositions = true;
    } else if (defined(featureTableJson.POSITION_QUANTIZED)) {
      positions = featureTable.getPropertyArray(
        "POSITION_QUANTIZED",
        ComponentDatatype.UNSIGNED_SHORT,
        3
      );
      isQuantized = true;
      hasPositions = true;

      var quantizedVolumeScale = featureTable.getGlobalProperty(
        "QUANTIZED_VOLUME_SCALE",
        ComponentDatatype.FLOAT,
        3
      );
      if (!defined(quantizedVolumeScale)) {
        throw new RuntimeError(
          "Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions."
        );
      }
      pointCloud._quantizedVolumeScale = Cartesian3.unpack(
        quantizedVolumeScale
      );
      pointCloud._quantizedRange = (1 << 16) - 1;

      var quantizedVolumeOffset = featureTable.getGlobalProperty(
        "QUANTIZED_VOLUME_OFFSET",
        ComponentDatatype.FLOAT,
        3
      );
      if (!defined(quantizedVolumeOffset)) {
        throw new RuntimeError(
          "Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions."
        );
      }
      pointCloud._quantizedVolumeOffset = Cartesian3.unpack(
        quantizedVolumeOffset
      );
    }
  }

  if (!hasColors) {
    if (defined(featureTableJson.RGBA)) {
      colors = featureTable.getPropertyArray(
        "RGBA",
        ComponentDatatype.UNSIGNED_BYTE,
        4
      );
      isTranslucent = true;
      hasColors = true;
    } else if (defined(featureTableJson.RGB)) {
      colors = featureTable.getPropertyArray(
        "RGB",
        ComponentDatatype.UNSIGNED_BYTE,
        3
      );
      hasColors = true;
    } else if (defined(featureTableJson.RGB565)) {
      colors = featureTable.getPropertyArray(
        "RGB565",
        ComponentDatatype.UNSIGNED_SHORT,
        1
      );
      isRGB565 = true;
      hasColors = true;
    }
  }

  if (!hasNormals) {
    if (defined(featureTableJson.NORMAL)) {
      normals = featureTable.getPropertyArray(
        "NORMAL",
        ComponentDatatype.FLOAT,
        3
      );
      hasNormals = true;
    } else if (defined(featureTableJson.NORMAL_OCT16P)) {
      normals = featureTable.getPropertyArray(
        "NORMAL_OCT16P",
        ComponentDatatype.UNSIGNED_BYTE,
        2
      );
      isOctEncoded16P = true;
      hasNormals = true;
    }
  }

  if (!hasBatchIds) {
    if (defined(featureTableJson.BATCH_ID)) {
      batchIds = featureTable.getPropertyArray(
        "BATCH_ID",
        ComponentDatatype.UNSIGNED_SHORT,
        1
      );
      hasBatchIds = true;
    }
  }

  if (!hasPositions) {
    throw new RuntimeError(
      "Either POSITION or POSITION_QUANTIZED must be defined."
    );
  }

  if (defined(featureTableJson.CONSTANT_RGBA)) {
    var constantRGBA = featureTable.getGlobalProperty(
      "CONSTANT_RGBA",
      ComponentDatatype.UNSIGNED_BYTE,
      4
    );
    pointCloud._constantColor = Color.fromBytes(
      constantRGBA[0],
      constantRGBA[1],
      constantRGBA[2],
      constantRGBA[3],
      pointCloud._constantColor
    );
  }

  if (hasBatchIds) {
    var batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
    if (!defined(batchLength)) {
      throw new RuntimeError(
        "Global property: BATCH_LENGTH must be defined when BATCH_ID is defined."
      );
    }

    if (defined(batchTableBinary)) {
      // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
      batchTableBinary = new Uint8Array(batchTableBinary);
    }

    if (defined(pointCloud._batchTableLoaded)) {
      pointCloud._batchTableLoaded(
        batchLength,
        batchTableJson,
        batchTableBinary
      );
    }
  }

  // If points are not batched and there are per-point properties, use these properties for styling purposes
  var styleableProperties;
  if (!hasBatchIds && defined(batchTableBinary)) {
    styleableProperties = Cesium3DTileBatchTable.getBinaryProperties(
      pointsLength,
      batchTableJson,
      batchTableBinary
    );
  }

  pointCloud._parsedContent = {
    positions: positions,
    colors: colors,
    normals: normals,
    batchIds: batchIds,
    styleableProperties: styleableProperties,
    draco: draco,
  };
  pointCloud._pointsLength = pointsLength;
  pointCloud._isQuantized = isQuantized;
  pointCloud._isOctEncoded16P = isOctEncoded16P;
  pointCloud._isRGB565 = isRGB565;
  pointCloud._isTranslucent = isTranslucent;
  pointCloud._hasColors = hasColors;
  pointCloud._hasNormals = hasNormals;
  pointCloud._hasBatchIds = hasBatchIds;
}

var scratchMin = new Cartesian3();
var scratchMax = new Cartesian3();
var scratchPosition = new Cartesian3();
var randomValues;

function getRandomValues(samplesLength) {
  // Use same random values across all runs
  if (!defined(randomValues)) {
    CesiumMath.setRandomNumberSeed(0);
    randomValues = new Array(samplesLength);
    for (var i = 0; i < samplesLength; ++i) {
      randomValues[i] = CesiumMath.nextRandomNumber();
    }
  }
  return randomValues;
}

function computeApproximateBoundingSphereFromPositions(positions) {
  var maximumSamplesLength = 20;
  var pointsLength = positions.length / 3;
  var samplesLength = Math.min(pointsLength, maximumSamplesLength);
  var randomValues = getRandomValues(maximumSamplesLength);
  var maxValue = Number.MAX_VALUE;
  var minValue = -Number.MAX_VALUE;
  var min = Cartesian3.fromElements(maxValue, maxValue, maxValue, scratchMin);
  var max = Cartesian3.fromElements(minValue, minValue, minValue, scratchMax);
  for (var i = 0; i < samplesLength; ++i) {
    var index = Math.floor(randomValues[i] * pointsLength);
    var position = Cartesian3.unpack(positions, index * 3, scratchPosition);
    Cartesian3.minimumByComponent(min, position, min);
    Cartesian3.maximumByComponent(max, position, max);
  }

  var boundingSphere = BoundingSphere.fromCornerPoints(min, max);
  boundingSphere.radius += CesiumMath.EPSILON2; // To avoid radius of zero
  return boundingSphere;
}

function prepareVertexAttribute(typedArray, name) {
  // WebGL does not support UNSIGNED_INT, INT, or DOUBLE vertex attributes. Convert these to FLOAT.
  var componentDatatype = ComponentDatatype.fromTypedArray(typedArray);
  if (
    componentDatatype === ComponentDatatype.INT ||
    componentDatatype === ComponentDatatype.UNSIGNED_INT ||
    componentDatatype === ComponentDatatype.DOUBLE
  ) {
    oneTimeWarning(
      "Cast pnts property to floats",
      'Point cloud property "' +
        name +
        '" will be casted to a float array because INT, UNSIGNED_INT, and DOUBLE are not valid WebGL vertex attribute types. Some precision may be lost.'
    );
    return new Float32Array(typedArray);
  }
  return typedArray;
}

var scratchPointSizeAndTimeAndGeometricErrorAndDepthMultiplier = new Cartesian4();
var scratchQuantizedVolumeScaleAndOctEncodedRange = new Cartesian4();
var scratchColor = new Color();

var positionLocation = 0;
var colorLocation = 1;
var normalLocation = 2;
var batchIdLocation = 3;
var numberOfAttributes = 4;

var scratchClippingPlanesMatrix = new Matrix4();
var scratchInverseTransposeClippingPlanesMatrix = new Matrix4();

function createResources(pointCloud, frameState) {
  var context = frameState.context;
  var parsedContent = pointCloud._parsedContent;
  var pointsLength = pointCloud._pointsLength;
  var positions = parsedContent.positions;
  var colors = parsedContent.colors;
  var normals = parsedContent.normals;
  var batchIds = parsedContent.batchIds;
  var styleableProperties = parsedContent.styleableProperties;
  var hasStyleableProperties = defined(styleableProperties);
  var isQuantized = pointCloud._isQuantized;
  var isQuantizedDraco = pointCloud._isQuantizedDraco;
  var isOctEncoded16P = pointCloud._isOctEncoded16P;
  var isOctEncodedDraco = pointCloud._isOctEncodedDraco;
  var quantizedRange = pointCloud._quantizedRange;
  var octEncodedRange = pointCloud._octEncodedRange;
  var isRGB565 = pointCloud._isRGB565;
  var isTranslucent = pointCloud._isTranslucent;
  var hasColors = pointCloud._hasColors;
  var hasNormals = pointCloud._hasNormals;
  var hasBatchIds = pointCloud._hasBatchIds;

  var componentsPerAttribute;
  var componentDatatype;

  var styleableVertexAttributes = [];
  var styleableShaderAttributes = {};
  pointCloud._styleableShaderAttributes = styleableShaderAttributes;

  if (hasStyleableProperties) {
    var attributeLocation = numberOfAttributes;

    for (var name in styleableProperties) {
      if (styleableProperties.hasOwnProperty(name)) {
        var property = styleableProperties[name];
        var typedArray = prepareVertexAttribute(property.typedArray, name);
        componentsPerAttribute = property.componentCount;
        componentDatatype = ComponentDatatype.fromTypedArray(typedArray);

        var vertexBuffer = Buffer.createVertexBuffer({
          context: context,
          typedArray: typedArray,
          usage: BufferUsage.STATIC_DRAW,
        });

        pointCloud._geometryByteLength += vertexBuffer.sizeInBytes;

        var vertexAttribute = {
          index: attributeLocation,
          vertexBuffer: vertexBuffer,
          componentsPerAttribute: componentsPerAttribute,
          componentDatatype: componentDatatype,
          normalize: false,
          offsetInBytes: 0,
          strideInBytes: 0,
        };

        styleableVertexAttributes.push(vertexAttribute);
        styleableShaderAttributes[name] = {
          location: attributeLocation,
          componentCount: componentsPerAttribute,
        };
        ++attributeLocation;
      }
    }
  }

  var positionsVertexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: positions,
    usage: BufferUsage.STATIC_DRAW,
  });
  pointCloud._geometryByteLength += positionsVertexBuffer.sizeInBytes;

  var colorsVertexBuffer;
  if (hasColors) {
    colorsVertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: colors,
      usage: BufferUsage.STATIC_DRAW,
    });
    pointCloud._geometryByteLength += colorsVertexBuffer.sizeInBytes;
  }

  var normalsVertexBuffer;
  if (hasNormals) {
    normalsVertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: normals,
      usage: BufferUsage.STATIC_DRAW,
    });
    pointCloud._geometryByteLength += normalsVertexBuffer.sizeInBytes;
  }

  var batchIdsVertexBuffer;
  if (hasBatchIds) {
    batchIds = prepareVertexAttribute(batchIds, "batchIds");
    batchIdsVertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: batchIds,
      usage: BufferUsage.STATIC_DRAW,
    });
    pointCloud._geometryByteLength += batchIdsVertexBuffer.sizeInBytes;
  }

  var attributes = [];

  if (isQuantized) {
    componentDatatype = ComponentDatatype.UNSIGNED_SHORT;
  } else if (isQuantizedDraco) {
    componentDatatype =
      quantizedRange <= 255
        ? ComponentDatatype.UNSIGNED_BYTE
        : ComponentDatatype.UNSIGNED_SHORT;
  } else {
    componentDatatype = ComponentDatatype.FLOAT;
  }

  attributes.push({
    index: positionLocation,
    vertexBuffer: positionsVertexBuffer,
    componentsPerAttribute: 3,
    componentDatatype: componentDatatype,
    normalize: false,
    offsetInBytes: 0,
    strideInBytes: 0,
  });

  if (pointCloud._cull) {
    if (isQuantized || isQuantizedDraco) {
      pointCloud._boundingSphere = BoundingSphere.fromCornerPoints(
        Cartesian3.ZERO,
        pointCloud._quantizedVolumeScale
      );
    } else {
      pointCloud._boundingSphere = computeApproximateBoundingSphereFromPositions(
        positions
      );
    }
  }

  if (hasColors) {
    if (isRGB565) {
      attributes.push({
        index: colorLocation,
        vertexBuffer: colorsVertexBuffer,
        componentsPerAttribute: 1,
        componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
        normalize: false,
        offsetInBytes: 0,
        strideInBytes: 0,
      });
    } else {
      var colorComponentsPerAttribute = isTranslucent ? 4 : 3;
      attributes.push({
        index: colorLocation,
        vertexBuffer: colorsVertexBuffer,
        componentsPerAttribute: colorComponentsPerAttribute,
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        normalize: true,
        offsetInBytes: 0,
        strideInBytes: 0,
      });
    }
  }

  if (hasNormals) {
    if (isOctEncoded16P) {
      componentsPerAttribute = 2;
      componentDatatype = ComponentDatatype.UNSIGNED_BYTE;
    } else if (isOctEncodedDraco) {
      componentsPerAttribute = 2;
      componentDatatype =
        octEncodedRange <= 255
          ? ComponentDatatype.UNSIGNED_BYTE
          : ComponentDatatype.UNSIGNED_SHORT;
    } else {
      componentsPerAttribute = 3;
      componentDatatype = ComponentDatatype.FLOAT;
    }
    attributes.push({
      index: normalLocation,
      vertexBuffer: normalsVertexBuffer,
      componentsPerAttribute: componentsPerAttribute,
      componentDatatype: componentDatatype,
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: 0,
    });
  }

  if (hasBatchIds) {
    attributes.push({
      index: batchIdLocation,
      vertexBuffer: batchIdsVertexBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.fromTypedArray(batchIds),
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: 0,
    });
  }

  if (hasStyleableProperties) {
    attributes = attributes.concat(styleableVertexAttributes);
  }

  var vertexArray = new VertexArray({
    context: context,
    attributes: attributes,
  });

  var opaqueRenderState = {
    depthTest: {
      enabled: true,
    },
  };

  var translucentRenderState = {
    depthTest: {
      enabled: true,
    },
    depthMask: false,
    blending: BlendingState.ALPHA_BLEND,
  };

  if (pointCloud._opaquePass === Pass.CESIUM_3D_TILE) {
    opaqueRenderState.stencilTest = StencilConstants.setCesium3DTileBit();
    opaqueRenderState.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
    translucentRenderState.stencilTest = StencilConstants.setCesium3DTileBit();
    translucentRenderState.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
  }

  pointCloud._opaqueRenderState = RenderState.fromCache(opaqueRenderState);
  pointCloud._translucentRenderState = RenderState.fromCache(
    translucentRenderState
  );

  pointCloud._drawCommand = new DrawCommand({
    boundingVolume: new BoundingSphere(),
    cull: pointCloud._cull,
    modelMatrix: new Matrix4(),
    primitiveType: PrimitiveType.POINTS,
    vertexArray: vertexArray,
    count: pointsLength,
    shaderProgram: undefined, // Updated in createShaders
    uniformMap: undefined, // Updated in createShaders
    renderState: isTranslucent
      ? pointCloud._translucentRenderState
      : pointCloud._opaqueRenderState,
    pass: isTranslucent ? Pass.TRANSLUCENT : pointCloud._opaquePass,
    owner: pointCloud,
    castShadows: false,
    receiveShadows: false,
    pickId: pointCloud._pickIdLoaded(),
  });
}

function createUniformMap(pointCloud, frameState) {
  var context = frameState.context;
  var isQuantized = pointCloud._isQuantized;
  var isQuantizedDraco = pointCloud._isQuantizedDraco;
  var isOctEncodedDraco = pointCloud._isOctEncodedDraco;

  var uniformMap = {
    u_pointSizeAndTimeAndGeometricErrorAndDepthMultiplier: function () {
      var scratch = scratchPointSizeAndTimeAndGeometricErrorAndDepthMultiplier;
      scratch.x = pointCloud._attenuation
        ? pointCloud.maximumAttenuation
        : pointCloud._pointSize;
      scratch.x *= frameState.pixelRatio;

      scratch.y = pointCloud.time;

      if (pointCloud._attenuation) {
        var frustum = frameState.camera.frustum;
        var depthMultiplier;
        // Attenuation is maximumAttenuation in 2D/ortho
        if (
          frameState.mode === SceneMode.SCENE2D ||
          frustum instanceof OrthographicFrustum
        ) {
          depthMultiplier = Number.POSITIVE_INFINITY;
        } else {
          depthMultiplier =
            context.drawingBufferHeight /
            frameState.camera.frustum.sseDenominator;
        }

        scratch.z = pointCloud.geometricError * pointCloud.geometricErrorScale;
        scratch.w = depthMultiplier;
      }

      return scratch;
    },
    u_highlightColor: function () {
      return pointCloud._highlightColor;
    },
    u_constantColor: function () {
      return pointCloud._constantColor;
    },
    u_clippingPlanes: function () {
      var clippingPlanes = pointCloud.clippingPlanes;
      var isClipped = pointCloud.isClipped;
      return isClipped ? clippingPlanes.texture : context.defaultTexture;
    },
    u_clippingPlanesEdgeStyle: function () {
      var clippingPlanes = pointCloud.clippingPlanes;
      if (!defined(clippingPlanes)) {
        return Color.TRANSPARENT;
      }

      var style = Color.clone(clippingPlanes.edgeColor, scratchColor);
      style.alpha = clippingPlanes.edgeWidth;
      return style;
    },
    u_clippingPlanesMatrix: function () {
      var clippingPlanes = pointCloud.clippingPlanes;
      if (!defined(clippingPlanes)) {
        return Matrix4.IDENTITY;
      }

      var clippingPlanesOriginMatrix = defaultValue(
        pointCloud.clippingPlanesOriginMatrix,
        pointCloud._modelMatrix
      );
      Matrix4.multiply(
        context.uniformState.view3D,
        clippingPlanesOriginMatrix,
        scratchClippingPlanesMatrix
      );
      var transform = Matrix4.multiply(
        scratchClippingPlanesMatrix,
        clippingPlanes.modelMatrix,
        scratchClippingPlanesMatrix
      );

      return Matrix4.inverseTranspose(
        transform,
        scratchInverseTransposeClippingPlanesMatrix
      );
    },
  };

  if (isQuantized || isQuantizedDraco || isOctEncodedDraco) {
    uniformMap = combine(uniformMap, {
      u_quantizedVolumeScaleAndOctEncodedRange: function () {
        var scratch = scratchQuantizedVolumeScaleAndOctEncodedRange;
        if (defined(pointCloud._quantizedVolumeScale)) {
          var scale = Cartesian3.clone(
            pointCloud._quantizedVolumeScale,
            scratch
          );
          Cartesian3.divideByScalar(scale, pointCloud._quantizedRange, scratch);
        }
        scratch.w = pointCloud._octEncodedRange;
        return scratch;
      },
    });
  }

  if (defined(pointCloud._uniformMapLoaded)) {
    uniformMap = pointCloud._uniformMapLoaded(uniformMap);
  }

  pointCloud._drawCommand.uniformMap = uniformMap;
}

function getStyleablePropertyIds(source, propertyIds) {
  // Get all the property IDs used by this style
  var regex = /czm_3dtiles_property_(\d+)/g;
  var matches = regex.exec(source);
  while (matches !== null) {
    var id = parseInt(matches[1]);
    if (propertyIds.indexOf(id) === -1) {
      propertyIds.push(id);
    }
    matches = regex.exec(source);
  }
}

function getBuiltinPropertyNames(source, propertyNames) {
  // Get all the builtin property names used by this style, ignoring the function signature
  source = source.slice(source.indexOf("\n"));
  var regex = /czm_3dtiles_builtin_property_(\w+)/g;
  var matches = regex.exec(source);
  while (matches !== null) {
    var name = matches[1];
    if (propertyNames.indexOf(name) === -1) {
      propertyNames.push(name);
    }
    matches = regex.exec(source);
  }
}

function getVertexAttribute(vertexArray, index) {
  var numberOfAttributes = vertexArray.numberOfAttributes;
  for (var i = 0; i < numberOfAttributes; ++i) {
    var attribute = vertexArray.getAttribute(i);
    if (attribute.index === index) {
      return attribute;
    }
  }
}

var builtinVariableSubstitutionMap = {
  POSITION: "czm_3dtiles_builtin_property_POSITION",
  POSITION_ABSOLUTE: "czm_3dtiles_builtin_property_POSITION_ABSOLUTE",
  COLOR: "czm_3dtiles_builtin_property_COLOR",
  NORMAL: "czm_3dtiles_builtin_property_NORMAL",
};

function createShaders(pointCloud, frameState, style) {
  var i;
  var name;
  var attribute;

  var context = frameState.context;
  var hasStyle = defined(style);
  var isQuantized = pointCloud._isQuantized;
  var isQuantizedDraco = pointCloud._isQuantizedDraco;
  var isOctEncoded16P = pointCloud._isOctEncoded16P;
  var isOctEncodedDraco = pointCloud._isOctEncodedDraco;
  var isRGB565 = pointCloud._isRGB565;
  var isTranslucent = pointCloud._isTranslucent;
  var hasColors = pointCloud._hasColors;
  var hasNormals = pointCloud._hasNormals;
  var hasBatchIds = pointCloud._hasBatchIds;
  var backFaceCulling = pointCloud._backFaceCulling;
  var normalShading = pointCloud._normalShading;
  var vertexArray = pointCloud._drawCommand.vertexArray;
  var clippingPlanes = pointCloud.clippingPlanes;
  var attenuation = pointCloud._attenuation;

  var colorStyleFunction;
  var showStyleFunction;
  var pointSizeStyleFunction;
  var styleTranslucent = isTranslucent;

  var variableSubstitutionMap = clone(builtinVariableSubstitutionMap);
  var propertyIdToAttributeMap = {};
  var styleableShaderAttributes = pointCloud._styleableShaderAttributes;
  for (name in styleableShaderAttributes) {
    if (styleableShaderAttributes.hasOwnProperty(name)) {
      attribute = styleableShaderAttributes[name];
      variableSubstitutionMap[name] =
        "czm_3dtiles_property_" + attribute.location;
      propertyIdToAttributeMap[attribute.location] = attribute;
    }
  }

  if (hasStyle) {
    var shaderState = {
      translucent: false,
    };
    var parameterList =
      "(" +
      "vec3 czm_3dtiles_builtin_property_POSITION, " +
      "vec3 czm_3dtiles_builtin_property_POSITION_ABSOLUTE, " +
      "vec4 czm_3dtiles_builtin_property_COLOR, " +
      "vec3 czm_3dtiles_builtin_property_NORMAL" +
      ")";
    colorStyleFunction = style.getColorShaderFunction(
      "getColorFromStyle" + parameterList,
      variableSubstitutionMap,
      shaderState
    );
    showStyleFunction = style.getShowShaderFunction(
      "getShowFromStyle" + parameterList,
      variableSubstitutionMap,
      shaderState
    );
    pointSizeStyleFunction = style.getPointSizeShaderFunction(
      "getPointSizeFromStyle" + parameterList,
      variableSubstitutionMap,
      shaderState
    );
    if (defined(colorStyleFunction) && shaderState.translucent) {
      styleTranslucent = true;
    }
  }

  pointCloud._styleTranslucent = styleTranslucent;

  var hasColorStyle = defined(colorStyleFunction);
  var hasShowStyle = defined(showStyleFunction);
  var hasPointSizeStyle = defined(pointSizeStyleFunction);
  var hasClippedContent = pointCloud.isClipped;

  // Get the properties in use by the style
  var styleablePropertyIds = [];
  var builtinPropertyNames = [];

  if (hasColorStyle) {
    getStyleablePropertyIds(colorStyleFunction, styleablePropertyIds);
    getBuiltinPropertyNames(colorStyleFunction, builtinPropertyNames);
    //colorStyleFunction = modifyStyleFunction(colorStyleFunction);
  }
  if (hasShowStyle) {
    getStyleablePropertyIds(showStyleFunction, styleablePropertyIds);
    getBuiltinPropertyNames(showStyleFunction, builtinPropertyNames);
    //showStyleFunction = modifyStyleFunction(showStyleFunction);
  }
  if (hasPointSizeStyle) {
    getStyleablePropertyIds(pointSizeStyleFunction, styleablePropertyIds);
    getBuiltinPropertyNames(pointSizeStyleFunction, builtinPropertyNames);
    //pointSizeStyleFunction = modifyStyleFunction(pointSizeStyleFunction);
  }

  var usesColorSemantic = builtinPropertyNames.indexOf("COLOR") >= 0;
  var usesNormalSemantic = builtinPropertyNames.indexOf("NORMAL") >= 0;

  if (usesNormalSemantic && !hasNormals) {
    throw new RuntimeError(
      "Style references the NORMAL semantic but the point cloud does not have normals"
    );
  }

  // Disable vertex attributes that aren't used in the style, enable attributes that are
  for (name in styleableShaderAttributes) {
    if (styleableShaderAttributes.hasOwnProperty(name)) {
      attribute = styleableShaderAttributes[name];
      var enabled = styleablePropertyIds.indexOf(attribute.location) >= 0;
      var vertexAttribute = getVertexAttribute(vertexArray, attribute.location);
      vertexAttribute.enabled = enabled;
    }
  }

  var usesColors = hasColors && (!hasColorStyle || usesColorSemantic);
  if (hasColors) {
    // Disable the color vertex attribute if the color style does not reference the color semantic
    var colorVertexAttribute = getVertexAttribute(vertexArray, colorLocation);
    colorVertexAttribute.enabled = usesColors;
  }

  var usesNormals =
    hasNormals && (normalShading || backFaceCulling || usesNormalSemantic);
  if (hasNormals) {
    // Disable the normal vertex attribute if normals are not used
    var normalVertexAttribute = getVertexAttribute(vertexArray, normalLocation);
    normalVertexAttribute.enabled = usesNormals;
  }

  var attributeLocations = {
    a_position: positionLocation,
  };
  if (usesColors) {
    attributeLocations.a_color = colorLocation;
  }
  if (usesNormals) {
    attributeLocations.a_normal = normalLocation;
  }
  if (hasBatchIds) {
    attributeLocations.a_batchId = batchIdLocation;
  }

  var attributeDeclarations = "";

  var length = styleablePropertyIds.length;
  for (i = 0; i < length; ++i) {
    var propertyId = styleablePropertyIds[i];
    attribute = propertyIdToAttributeMap[propertyId];
    var componentCount = attribute.componentCount;
    var attributeName = "czm_3dtiles_property_" + propertyId;
    var attributeType;
    if (componentCount === 1) {
      attributeType = "float";
    } else {
      attributeType = "vec" + componentCount;
    }

    attributeDeclarations +=
      "attribute " + attributeType + " " + attributeName + "; \n";
    attributeLocations[attributeName] = attribute.location;
  }

  createUniformMap(pointCloud, frameState);

  var vs =
    "attribute vec3 a_position; \n" +
    "varying vec4 v_color; \n" +
    "uniform vec4 u_pointSizeAndTimeAndGeometricErrorAndDepthMultiplier; \n" +
    "uniform vec4 u_constantColor; \n" +
    "uniform vec4 u_highlightColor; \n";
  vs += "float u_pointSize; \n" + "float u_time; \n";

  if (attenuation) {
    vs += "float u_geometricError; \n" + "float u_depthMultiplier; \n";
  }

  vs += attributeDeclarations;

  if (usesColors) {
    if (isTranslucent) {
      vs += "attribute vec4 a_color; \n";
    } else if (isRGB565) {
      vs +=
        "attribute float a_color; \n" +
        "const float SHIFT_RIGHT_11 = 1.0 / 2048.0; \n" +
        "const float SHIFT_RIGHT_5 = 1.0 / 32.0; \n" +
        "const float SHIFT_LEFT_11 = 2048.0; \n" +
        "const float SHIFT_LEFT_5 = 32.0; \n" +
        "const float NORMALIZE_6 = 1.0 / 64.0; \n" +
        "const float NORMALIZE_5 = 1.0 / 32.0; \n";
    } else {
      vs += "attribute vec3 a_color; \n";
    }
  }
  if (usesNormals) {
    if (isOctEncoded16P || isOctEncodedDraco) {
      vs += "attribute vec2 a_normal; \n";
    } else {
      vs += "attribute vec3 a_normal; \n";
    }
  }

  if (hasBatchIds) {
    vs += "attribute float a_batchId; \n";
  }

  if (isQuantized || isQuantizedDraco || isOctEncodedDraco) {
    vs += "uniform vec4 u_quantizedVolumeScaleAndOctEncodedRange; \n";
  }

  if (hasColorStyle) {
    vs += colorStyleFunction;
  }

  if (hasShowStyle) {
    vs += showStyleFunction;
  }

  if (hasPointSizeStyle) {
    vs += pointSizeStyleFunction;
  }

  vs +=
    "void main() \n" +
    "{ \n" +
    "    u_pointSize = u_pointSizeAndTimeAndGeometricErrorAndDepthMultiplier.x; \n" +
    "    u_time = u_pointSizeAndTimeAndGeometricErrorAndDepthMultiplier.y; \n";

  if (attenuation) {
    vs +=
      "    u_geometricError = u_pointSizeAndTimeAndGeometricErrorAndDepthMultiplier.z; \n" +
      "    u_depthMultiplier = u_pointSizeAndTimeAndGeometricErrorAndDepthMultiplier.w; \n";
  }

  if (usesColors) {
    if (isTranslucent) {
      vs += "    vec4 color = a_color; \n";
    } else if (isRGB565) {
      vs +=
        "    float compressed = a_color; \n" +
        "    float r = floor(compressed * SHIFT_RIGHT_11); \n" +
        "    compressed -= r * SHIFT_LEFT_11; \n" +
        "    float g = floor(compressed * SHIFT_RIGHT_5); \n" +
        "    compressed -= g * SHIFT_LEFT_5; \n" +
        "    float b = compressed; \n" +
        "    vec3 rgb = vec3(r * NORMALIZE_5, g * NORMALIZE_6, b * NORMALIZE_5); \n" +
        "    vec4 color = vec4(rgb, 1.0); \n";
    } else {
      vs += "    vec4 color = vec4(a_color, 1.0); \n";
    }
  } else {
    vs += "    vec4 color = u_constantColor; \n";
  }

  if (isQuantized || isQuantizedDraco) {
    vs +=
      "    vec3 position = a_position * u_quantizedVolumeScaleAndOctEncodedRange.xyz; \n";
  } else {
    vs += "    vec3 position = a_position; \n";
  }
  vs +=
    "    vec3 position_absolute = vec3(czm_model * vec4(position, 1.0)); \n";

  if (usesNormals) {
    if (isOctEncoded16P) {
      vs += "    vec3 normal = czm_octDecode(a_normal); \n";
    } else if (isOctEncodedDraco) {
      // Draco oct-encoding decodes to zxy order
      vs +=
        "    vec3 normal = czm_octDecode(a_normal, u_quantizedVolumeScaleAndOctEncodedRange.w).zxy; \n";
    } else {
      vs += "    vec3 normal = a_normal; \n";
    }
    vs += "    vec3 normalEC = czm_normal * normal; \n";
  } else {
    vs += "    vec3 normal = vec3(1.0); \n";
  }

  if (hasColorStyle) {
    vs +=
      "    color = getColorFromStyle(position, position_absolute, color, normal); \n";
  }

  if (hasShowStyle) {
    vs +=
      "    float show = float(getShowFromStyle(position, position_absolute, color, normal)); \n";
  }

  if (hasPointSizeStyle) {
    vs +=
      "    gl_PointSize = getPointSizeFromStyle(position, position_absolute, color, normal) * czm_pixelRatio; \n";
  } else if (attenuation) {
    vs +=
      "    vec4 positionEC = czm_modelView * vec4(position, 1.0); \n" +
      "    float depth = -positionEC.z; \n" +
      // compute SSE for this point
      "    gl_PointSize = min((u_geometricError / depth) * u_depthMultiplier, u_pointSize); \n";
  } else {
    vs += "    gl_PointSize = u_pointSize; \n";
  }

  vs += "    color = color * u_highlightColor; \n";

  if (usesNormals && normalShading) {
    vs +=
      "    float diffuseStrength = czm_getLambertDiffuse(czm_lightDirectionEC, normalEC); \n" +
      "    diffuseStrength = max(diffuseStrength, 0.4); \n" + // Apply some ambient lighting
      "    color.xyz *= diffuseStrength * czm_lightColor; \n";
  }

  vs +=
    "    v_color = color; \n" +
    "    gl_Position = czm_modelViewProjection * vec4(position, 1.0); \n";

  if (usesNormals && backFaceCulling) {
    vs +=
      "    float visible = step(-normalEC.z, 0.0); \n" +
      "    gl_Position *= visible; \n" +
      "    gl_PointSize *= visible; \n";
  }

  if (hasShowStyle) {
    vs +=
      "    gl_Position.w *= float(show); \n" +
      "    gl_PointSize *= float(show); \n";
  }

  vs += "} \n";

  var fs = "varying vec4 v_color; \n";

  if (hasClippedContent) {
    fs +=
      "uniform highp sampler2D u_clippingPlanes; \n" +
      "uniform mat4 u_clippingPlanesMatrix; \n" +
      "uniform vec4 u_clippingPlanesEdgeStyle; \n";
    fs += "\n";
    fs += getClippingFunction(clippingPlanes, context);
    fs += "\n";
  }

  fs +=
    "void main() \n" +
    "{ \n" +
    "    gl_FragColor = czm_gammaCorrect(v_color); \n";

  if (hasClippedContent) {
    fs += getClipAndStyleCode(
      "u_clippingPlanes",
      "u_clippingPlanesMatrix",
      "u_clippingPlanesEdgeStyle"
    );
  }

  fs += "} \n";

  if (defined(pointCloud._vertexShaderLoaded)) {
    vs = pointCloud._vertexShaderLoaded(vs);
  }

  if (defined(pointCloud._fragmentShaderLoaded)) {
    fs = pointCloud._fragmentShaderLoaded(fs);
  }

  var drawCommand = pointCloud._drawCommand;
  if (defined(drawCommand.shaderProgram)) {
    // Destroy the old shader
    drawCommand.shaderProgram.destroy();
  }
  drawCommand.shaderProgram = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });

  try {
    // Check if the shader compiles correctly. If not there is likely a syntax error with the style.
    drawCommand.shaderProgram._bind();
  } catch (error) {
    // Rephrase the error.
    throw new RuntimeError(
      "Error generating style shader: this may be caused by a type mismatch, index out-of-bounds, or other syntax error."
    );
  }
}

function decodeDraco(pointCloud, context) {
  if (pointCloud._decodingState === DecodingState.READY) {
    return false;
  }
  if (pointCloud._decodingState === DecodingState.NEEDS_DECODE) {
    var parsedContent = pointCloud._parsedContent;
    var draco = parsedContent.draco;
    var decodePromise = DracoLoader.decodePointCloud(draco, context);
    if (defined(decodePromise)) {
      pointCloud._decodingState = DecodingState.DECODING;
      decodePromise
        .then(function (result) {
          pointCloud._decodingState = DecodingState.READY;
          var decodedPositions = defined(result.POSITION)
            ? result.POSITION.array
            : undefined;
          var decodedRgb = defined(result.RGB) ? result.RGB.array : undefined;
          var decodedRgba = defined(result.RGBA)
            ? result.RGBA.array
            : undefined;
          var decodedNormals = defined(result.NORMAL)
            ? result.NORMAL.array
            : undefined;
          var decodedBatchIds = defined(result.BATCH_ID)
            ? result.BATCH_ID.array
            : undefined;
          var isQuantizedDraco =
            defined(decodedPositions) &&
            defined(result.POSITION.data.quantization);
          var isOctEncodedDraco =
            defined(decodedNormals) && defined(result.NORMAL.data.quantization);
          if (isQuantizedDraco) {
            // Draco quantization range == quantized volume scale - size in meters of the quantized volume
            // Internal quantized range is the range of values of the quantized data, e.g. 255 for 8-bit, 1023 for 10-bit, etc
            var quantization = result.POSITION.data.quantization;
            var range = quantization.range;
            pointCloud._quantizedVolumeScale = Cartesian3.fromElements(
              range,
              range,
              range
            );
            pointCloud._quantizedVolumeOffset = Cartesian3.unpack(
              quantization.minValues
            );
            pointCloud._quantizedRange =
              (1 << quantization.quantizationBits) - 1.0;
            pointCloud._isQuantizedDraco = true;
          }
          if (isOctEncodedDraco) {
            pointCloud._octEncodedRange =
              (1 << result.NORMAL.data.quantization.quantizationBits) - 1.0;
            pointCloud._isOctEncodedDraco = true;
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
          parsedContent.normals = defaultValue(
            decodedNormals,
            parsedContent.normals
          );
          parsedContent.batchIds = defaultValue(
            decodedBatchIds,
            parsedContent.batchIds
          );
          parsedContent.styleableProperties = styleableProperties;
        })
        .otherwise(function (error) {
          pointCloud._decodingState = DecodingState.FAILED;
          pointCloud._readyPromise.reject(error);
        });
    }
  }
  return true;
}

var scratchComputedTranslation = new Cartesian4();
var scratchScale = new Cartesian3();

PointCloud.prototype.update = function (frameState) {
  var context = frameState.context;
  var decoding = decodeDraco(this, context);
  if (decoding) {
    return;
  }

  var shadersDirty = false;
  var modelMatrixDirty = !Matrix4.equals(this._modelMatrix, this.modelMatrix);

  if (this._mode !== frameState.mode) {
    this._mode = frameState.mode;
    modelMatrixDirty = true;
  }

  if (!defined(this._drawCommand)) {
    createResources(this, frameState);
    modelMatrixDirty = true;
    shadersDirty = true;
    this._ready = true;
    this._readyPromise.resolve(this);
    this._parsedContent = undefined; // Unload
  }

  if (modelMatrixDirty) {
    Matrix4.clone(this.modelMatrix, this._modelMatrix);
    var modelMatrix = this._drawCommand.modelMatrix;
    Matrix4.clone(this._modelMatrix, modelMatrix);

    if (defined(this._rtcCenter)) {
      Matrix4.multiplyByTranslation(modelMatrix, this._rtcCenter, modelMatrix);
    }
    if (defined(this._quantizedVolumeOffset)) {
      Matrix4.multiplyByTranslation(
        modelMatrix,
        this._quantizedVolumeOffset,
        modelMatrix
      );
    }

    if (frameState.mode !== SceneMode.SCENE3D) {
      var projection = frameState.mapProjection;
      var translation = Matrix4.getColumn(
        modelMatrix,
        3,
        scratchComputedTranslation
      );
      if (!Cartesian4.equals(translation, Cartesian4.UNIT_W)) {
        Transforms.basisTo2D(projection, modelMatrix, modelMatrix);
      }
    }

    var boundingSphere = this._drawCommand.boundingVolume;
    BoundingSphere.clone(this._boundingSphere, boundingSphere);

    if (this._cull) {
      var center = boundingSphere.center;
      Matrix4.multiplyByPoint(modelMatrix, center, center);
      var scale = Matrix4.getScale(modelMatrix, scratchScale);
      boundingSphere.radius *= Cartesian3.maximumComponent(scale);
    }
  }

  if (this.clippingPlanesDirty) {
    this.clippingPlanesDirty = false;
    shadersDirty = true;
  }

  if (this._attenuation !== this.attenuation) {
    this._attenuation = this.attenuation;
    shadersDirty = true;
  }

  if (this.backFaceCulling !== this._backFaceCulling) {
    this._backFaceCulling = this.backFaceCulling;
    shadersDirty = true;
  }

  if (this.normalShading !== this._normalShading) {
    this._normalShading = this.normalShading;
    shadersDirty = true;
  }

  if (this._style !== this.style || this.styleDirty) {
    this._style = this.style;
    this.styleDirty = false;
    shadersDirty = true;
  }

  if (shadersDirty) {
    createShaders(this, frameState, this._style);
  }

  this._drawCommand.castShadows = ShadowMode.castShadows(this.shadows);
  this._drawCommand.receiveShadows = ShadowMode.receiveShadows(this.shadows);

  // Update the render state
  var isTranslucent =
    this._highlightColor.alpha < 1.0 ||
    this._constantColor.alpha < 1.0 ||
    this._styleTranslucent;
  this._drawCommand.renderState = isTranslucent
    ? this._translucentRenderState
    : this._opaqueRenderState;
  this._drawCommand.pass = isTranslucent ? Pass.TRANSLUCENT : this._opaquePass;

  var commandList = frameState.commandList;

  var passes = frameState.passes;
  if (passes.render || passes.pick) {
    commandList.push(this._drawCommand);
  }
};

PointCloud.prototype.isDestroyed = function () {
  return false;
};

PointCloud.prototype.destroy = function () {
  var command = this._drawCommand;
  if (defined(command)) {
    command.vertexArray = command.vertexArray && command.vertexArray.destroy();
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }
  return destroyObject(this);
};
export default PointCloud;
