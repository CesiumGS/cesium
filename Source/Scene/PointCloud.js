import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
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
import MersenneTwister from "../ThirdParty/mersenne-twister.js";
import BlendingState from "./BlendingState.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import DracoLoader from "./DracoLoader.js";
import getClipAndStyleCode from "./getClipAndStyleCode.js";
import getClippingFunction from "./getClippingFunction.js";
import PntsParser from "./PntsParser.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";
import SplitDirection from "./SplitDirection.js";
import Splitter from "./Splitter.js";
import StencilConstants from "./StencilConstants.js";

const DecodingState = {
  NEEDS_DECODE: 0,
  DECODING: 1,
  READY: 2,
  FAILED: 3,
};

/**
 * Represents the contents of a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/PointCloud|Point Cloud}
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
  this._readyPromise = defer();
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

  /**
   * The {@link SplitDirection} to apply to this point cloud.
   *
   * @type {SplitDirection}
   * @default {@link SplitDirection.NONE}
   */
  this.splitDirection = defaultValue(
    options.splitDirection,
    SplitDirection.NONE
  );
  this._splittingEnabled = false;

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

function initialize(pointCloud, options) {
  const parsedContent = PntsParser.parse(
    options.arrayBuffer,
    options.byteOffset
  );
  pointCloud._parsedContent = parsedContent;
  pointCloud._rtcCenter = parsedContent.rtcCenter;
  pointCloud._hasNormals = parsedContent.hasNormals;
  pointCloud._hasColors = parsedContent.hasColors;
  pointCloud._hasBatchIds = parsedContent.hasBatchIds;
  pointCloud._isTranslucent = parsedContent.isTranslucent;

  // If points are not batched and there are per-point properties, use the
  // properties as metadata for styling purposes.
  if (!parsedContent.hasBatchIds && defined(parsedContent.batchTableBinary)) {
    parsedContent.styleableProperties = Cesium3DTileBatchTable.getBinaryProperties(
      parsedContent.pointsLength,
      parsedContent.batchTableJson,
      parsedContent.batchTableBinary
    );
  }

  if (defined(parsedContent.draco)) {
    const draco = parsedContent.draco;
    pointCloud._decodingState = DecodingState.NEEDS_DECODE;
    draco.dequantizeInShader = pointCloud._dequantizeInShader;
  }

  const positions = parsedContent.positions;
  if (defined(positions)) {
    pointCloud._isQuantized = positions.isQuantized;
    pointCloud._quantizedVolumeScale = positions.quantizedVolumeScale;
    pointCloud._quantizedVolumeOffset = positions.quantizedVolumeOffset;
    pointCloud._quantizedRange = positions.quantizedRange;
  }

  const normals = parsedContent.normals;
  if (defined(normals)) {
    pointCloud._isOctEncoded16P = normals.octEncoded;
  }

  const colors = parsedContent.colors;
  if (defined(colors)) {
    if (defined(colors.constantColor)) {
      pointCloud._constantColor = Color.clone(
        colors.constantColor,
        pointCloud._constantColor
      );

      // Constant colors are handled as a uniform rather than a vertex
      // attribute.
      pointCloud._hasColors = false;
    }
    pointCloud._isRGB565 = colors.isRGB565;
  }

  // PntsParser parses BATCH_ID as _FEATURE_ID_0 for EXT_mesh_features.
  // These properties aren't used but rename them to BATCH_ID to avoid
  // confusion when debugging.
  const batchIds = parsedContent.batchIds;
  if (defined(parsedContent.batchIds)) {
    batchIds.name = "BATCH_ID";
    batchIds.semantic = "BATCH_ID";
    batchIds.setIndex = undefined;
  }

  if (parsedContent.hasBatchIds) {
    pointCloud._batchTableLoaded(
      parsedContent.batchLength,
      parsedContent.batchTableJson,
      parsedContent.batchTableBinary
    );
  }

  pointCloud._pointsLength = parsedContent.pointsLength;
}

const scratchMin = new Cartesian3();
const scratchMax = new Cartesian3();
const scratchPosition = new Cartesian3();

// Use MersenneTwister directly to avoid interfering with CesiumMath.nextRandomNumber()
// See https://github.com/CesiumGS/cesium/issues/9730
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

function computeApproximateBoundingSphereFromPositions(positions) {
  const maximumSamplesLength = 20;
  const pointsLength = positions.length / 3;
  const samplesLength = Math.min(pointsLength, maximumSamplesLength);
  const randomValues = getRandomValues(maximumSamplesLength);
  const maxValue = Number.MAX_VALUE;
  const minValue = -Number.MAX_VALUE;
  const min = Cartesian3.fromElements(maxValue, maxValue, maxValue, scratchMin);
  const max = Cartesian3.fromElements(minValue, minValue, minValue, scratchMax);
  for (let i = 0; i < samplesLength; ++i) {
    const index = Math.floor(randomValues[i] * pointsLength);
    const position = Cartesian3.unpack(positions, index * 3, scratchPosition);
    Cartesian3.minimumByComponent(min, position, min);
    Cartesian3.maximumByComponent(max, position, max);
  }

  const boundingSphere = BoundingSphere.fromCornerPoints(min, max);
  boundingSphere.radius += CesiumMath.EPSILON2; // To avoid radius of zero
  return boundingSphere;
}

function prepareVertexAttribute(typedArray, name) {
  // WebGL does not support UNSIGNED_INT, INT, or DOUBLE vertex attributes. Convert these to FLOAT.
  const componentDatatype = ComponentDatatype.fromTypedArray(typedArray);
  if (
    componentDatatype === ComponentDatatype.INT ||
    componentDatatype === ComponentDatatype.UNSIGNED_INT ||
    componentDatatype === ComponentDatatype.DOUBLE
  ) {
    oneTimeWarning(
      "Cast pnts property to floats",
      `Point cloud property "${name}" will be casted to a float array because INT, UNSIGNED_INT, and DOUBLE are not valid WebGL vertex attribute types. Some precision may be lost.`
    );
    return new Float32Array(typedArray);
  }
  return typedArray;
}

const scratchPointSizeAndTimeAndGeometricErrorAndDepthMultiplier = new Cartesian4();
const scratchQuantizedVolumeScaleAndOctEncodedRange = new Cartesian4();
const scratchColor = new Color();

const positionLocation = 0;
const colorLocation = 1;
const normalLocation = 2;
const batchIdLocation = 3;
const numberOfAttributes = 4;

const scratchClippingPlanesMatrix = new Matrix4();
const scratchInverseTransposeClippingPlanesMatrix = new Matrix4();

function createResources(pointCloud, frameState) {
  const context = frameState.context;
  const parsedContent = pointCloud._parsedContent;
  const pointsLength = pointCloud._pointsLength;
  const positions = parsedContent.positions;
  const colors = parsedContent.colors;
  const normals = parsedContent.normals;
  const batchIds = parsedContent.batchIds;
  const styleableProperties = parsedContent.styleableProperties;
  const hasStyleableProperties = defined(styleableProperties);
  const isQuantized = pointCloud._isQuantized;
  const isQuantizedDraco = pointCloud._isQuantizedDraco;
  const isOctEncoded16P = pointCloud._isOctEncoded16P;
  const isOctEncodedDraco = pointCloud._isOctEncodedDraco;
  const quantizedRange = pointCloud._quantizedRange;
  const octEncodedRange = pointCloud._octEncodedRange;
  const isRGB565 = pointCloud._isRGB565;
  const isTranslucent = pointCloud._isTranslucent;
  const hasColors = pointCloud._hasColors;
  const hasNormals = pointCloud._hasNormals;
  const hasBatchIds = pointCloud._hasBatchIds;

  let componentsPerAttribute;
  let componentDatatype;

  const styleableVertexAttributes = [];
  const styleableShaderAttributes = {};
  pointCloud._styleableShaderAttributes = styleableShaderAttributes;

  if (hasStyleableProperties) {
    let attributeLocation = numberOfAttributes;

    for (const name in styleableProperties) {
      if (styleableProperties.hasOwnProperty(name)) {
        const property = styleableProperties[name];
        const typedArray = prepareVertexAttribute(property.typedArray, name);
        componentsPerAttribute = property.componentCount;
        componentDatatype = ComponentDatatype.fromTypedArray(typedArray);

        const vertexBuffer = Buffer.createVertexBuffer({
          context: context,
          typedArray: typedArray,
          usage: BufferUsage.STATIC_DRAW,
        });

        pointCloud._geometryByteLength += vertexBuffer.sizeInBytes;

        const vertexAttribute = {
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

  const positionsVertexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: positions.typedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  pointCloud._geometryByteLength += positionsVertexBuffer.sizeInBytes;

  let colorsVertexBuffer;
  if (hasColors) {
    colorsVertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: colors.typedArray,
      usage: BufferUsage.STATIC_DRAW,
    });
    pointCloud._geometryByteLength += colorsVertexBuffer.sizeInBytes;
  }

  let normalsVertexBuffer;
  if (hasNormals) {
    normalsVertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: normals.typedArray,
      usage: BufferUsage.STATIC_DRAW,
    });
    pointCloud._geometryByteLength += normalsVertexBuffer.sizeInBytes;
  }

  let batchIdsVertexBuffer;
  if (hasBatchIds) {
    batchIds.typedArray = prepareVertexAttribute(
      batchIds.typedArray,
      "batchIds"
    );
    batchIdsVertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: batchIds.typedArray,
      usage: BufferUsage.STATIC_DRAW,
    });
    pointCloud._geometryByteLength += batchIdsVertexBuffer.sizeInBytes;
  }

  let attributes = [];

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
        positions.typedArray
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
      const colorComponentsPerAttribute = isTranslucent ? 4 : 3;
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
      componentDatatype: ComponentDatatype.fromTypedArray(batchIds.typedArray),
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: 0,
    });
  }

  if (hasStyleableProperties) {
    attributes = attributes.concat(styleableVertexAttributes);
  }

  const vertexArray = new VertexArray({
    context: context,
    attributes: attributes,
  });

  const opaqueRenderState = {
    depthTest: {
      enabled: true,
    },
  };

  const translucentRenderState = {
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
  const context = frameState.context;
  const isQuantized = pointCloud._isQuantized;
  const isQuantizedDraco = pointCloud._isQuantizedDraco;
  const isOctEncodedDraco = pointCloud._isOctEncodedDraco;

  let uniformMap = {
    u_pointSizeAndTimeAndGeometricErrorAndDepthMultiplier: function () {
      const scratch = scratchPointSizeAndTimeAndGeometricErrorAndDepthMultiplier;
      scratch.x = pointCloud._attenuation
        ? pointCloud.maximumAttenuation
        : pointCloud._pointSize;
      scratch.x *= frameState.pixelRatio;

      scratch.y = pointCloud.time;

      if (pointCloud._attenuation) {
        const frustum = frameState.camera.frustum;
        let depthMultiplier;
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
      const clippingPlanes = pointCloud.clippingPlanes;
      const isClipped = pointCloud.isClipped;
      return isClipped ? clippingPlanes.texture : context.defaultTexture;
    },
    u_clippingPlanesEdgeStyle: function () {
      const clippingPlanes = pointCloud.clippingPlanes;
      if (!defined(clippingPlanes)) {
        return Color.TRANSPARENT;
      }

      const style = Color.clone(clippingPlanes.edgeColor, scratchColor);
      style.alpha = clippingPlanes.edgeWidth;
      return style;
    },
    u_clippingPlanesMatrix: function () {
      const clippingPlanes = pointCloud.clippingPlanes;
      if (!defined(clippingPlanes)) {
        return Matrix4.IDENTITY;
      }

      const clippingPlanesOriginMatrix = defaultValue(
        pointCloud.clippingPlanesOriginMatrix,
        pointCloud._modelMatrix
      );
      Matrix4.multiply(
        context.uniformState.view3D,
        clippingPlanesOriginMatrix,
        scratchClippingPlanesMatrix
      );
      const transform = Matrix4.multiply(
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

  Splitter.addUniforms(pointCloud, uniformMap);

  if (isQuantized || isQuantizedDraco || isOctEncodedDraco) {
    uniformMap = combine(uniformMap, {
      u_quantizedVolumeScaleAndOctEncodedRange: function () {
        const scratch = scratchQuantizedVolumeScaleAndOctEncodedRange;
        if (defined(pointCloud._quantizedVolumeScale)) {
          const scale = Cartesian3.clone(
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
  const regex = /czm_3dtiles_property_(\d+)/g;
  let matches = regex.exec(source);
  while (matches !== null) {
    const id = parseInt(matches[1]);
    if (propertyIds.indexOf(id) === -1) {
      propertyIds.push(id);
    }
    matches = regex.exec(source);
  }
}

function getBuiltinPropertyNames(source, propertyNames) {
  // Get all the builtin property names used by this style, ignoring the function signature
  source = source.slice(source.indexOf("\n"));
  const regex = /czm_3dtiles_builtin_property_(\w+)/g;
  let matches = regex.exec(source);
  while (matches !== null) {
    const name = matches[1];
    if (propertyNames.indexOf(name) === -1) {
      propertyNames.push(name);
    }
    matches = regex.exec(source);
  }
}

function getVertexAttribute(vertexArray, index) {
  const numberOfAttributes = vertexArray.numberOfAttributes;
  for (let i = 0; i < numberOfAttributes; ++i) {
    const attribute = vertexArray.getAttribute(i);
    if (attribute.index === index) {
      return attribute;
    }
  }
}

const builtinVariableSubstitutionMap = {
  POSITION: "czm_3dtiles_builtin_property_POSITION",
  POSITION_ABSOLUTE: "czm_3dtiles_builtin_property_POSITION_ABSOLUTE",
  COLOR: "czm_3dtiles_builtin_property_COLOR",
  NORMAL: "czm_3dtiles_builtin_property_NORMAL",
};

function createShaders(pointCloud, frameState, style) {
  let i;
  let name;
  let attribute;

  const context = frameState.context;
  const hasStyle = defined(style);
  const isQuantized = pointCloud._isQuantized;
  const isQuantizedDraco = pointCloud._isQuantizedDraco;
  const isOctEncoded16P = pointCloud._isOctEncoded16P;
  const isOctEncodedDraco = pointCloud._isOctEncodedDraco;
  const isRGB565 = pointCloud._isRGB565;
  const isTranslucent = pointCloud._isTranslucent;
  const hasColors = pointCloud._hasColors;
  const hasNormals = pointCloud._hasNormals;
  const hasBatchIds = pointCloud._hasBatchIds;
  const backFaceCulling = pointCloud._backFaceCulling;
  const normalShading = pointCloud._normalShading;
  const vertexArray = pointCloud._drawCommand.vertexArray;
  const clippingPlanes = pointCloud.clippingPlanes;
  const attenuation = pointCloud._attenuation;

  let colorStyleFunction;
  let showStyleFunction;
  let pointSizeStyleFunction;
  let styleTranslucent = isTranslucent;

  const variableSubstitutionMap = clone(builtinVariableSubstitutionMap);
  const propertyIdToAttributeMap = {};
  const styleableShaderAttributes = pointCloud._styleableShaderAttributes;
  for (name in styleableShaderAttributes) {
    if (styleableShaderAttributes.hasOwnProperty(name)) {
      attribute = styleableShaderAttributes[name];
      variableSubstitutionMap[
        name
      ] = `czm_3dtiles_property_${attribute.location}`;
      propertyIdToAttributeMap[attribute.location] = attribute;
    }
  }

  if (hasStyle) {
    const shaderState = {
      translucent: false,
    };
    const parameterList =
      "(" +
      "vec3 czm_3dtiles_builtin_property_POSITION, " +
      "vec3 czm_3dtiles_builtin_property_POSITION_ABSOLUTE, " +
      "vec4 czm_3dtiles_builtin_property_COLOR, " +
      "vec3 czm_3dtiles_builtin_property_NORMAL" +
      ")";
    colorStyleFunction = style.getColorShaderFunction(
      `getColorFromStyle${parameterList}`,
      variableSubstitutionMap,
      shaderState
    );
    showStyleFunction = style.getShowShaderFunction(
      `getShowFromStyle${parameterList}`,
      variableSubstitutionMap,
      shaderState
    );
    pointSizeStyleFunction = style.getPointSizeShaderFunction(
      `getPointSizeFromStyle${parameterList}`,
      variableSubstitutionMap,
      shaderState
    );
    if (defined(colorStyleFunction) && shaderState.translucent) {
      styleTranslucent = true;
    }
  }

  pointCloud._styleTranslucent = styleTranslucent;

  const hasColorStyle = defined(colorStyleFunction);
  const hasShowStyle = defined(showStyleFunction);
  const hasPointSizeStyle = defined(pointSizeStyleFunction);
  const hasClippedContent = pointCloud.isClipped;

  // Get the properties in use by the style
  const styleablePropertyIds = [];
  const builtinPropertyNames = [];

  if (hasColorStyle) {
    getStyleablePropertyIds(colorStyleFunction, styleablePropertyIds);
    getBuiltinPropertyNames(colorStyleFunction, builtinPropertyNames);
  }
  if (hasShowStyle) {
    getStyleablePropertyIds(showStyleFunction, styleablePropertyIds);
    getBuiltinPropertyNames(showStyleFunction, builtinPropertyNames);
  }
  if (hasPointSizeStyle) {
    getStyleablePropertyIds(pointSizeStyleFunction, styleablePropertyIds);
    getBuiltinPropertyNames(pointSizeStyleFunction, builtinPropertyNames);
  }

  const usesColorSemantic = builtinPropertyNames.indexOf("COLOR") >= 0;
  const usesNormalSemantic = builtinPropertyNames.indexOf("NORMAL") >= 0;

  if (usesNormalSemantic && !hasNormals) {
    throw new RuntimeError(
      "Style references the NORMAL semantic but the point cloud does not have normals"
    );
  }

  // Disable vertex attributes that aren't used in the style, enable attributes that are
  for (name in styleableShaderAttributes) {
    if (styleableShaderAttributes.hasOwnProperty(name)) {
      attribute = styleableShaderAttributes[name];
      const enabled = styleablePropertyIds.indexOf(attribute.location) >= 0;
      const vertexAttribute = getVertexAttribute(
        vertexArray,
        attribute.location
      );
      vertexAttribute.enabled = enabled;
    }
  }

  const usesColors = hasColors && (!hasColorStyle || usesColorSemantic);
  if (hasColors) {
    // Disable the color vertex attribute if the color style does not reference the color semantic
    const colorVertexAttribute = getVertexAttribute(vertexArray, colorLocation);
    colorVertexAttribute.enabled = usesColors;
  }

  const usesNormals =
    hasNormals && (normalShading || backFaceCulling || usesNormalSemantic);
  if (hasNormals) {
    // Disable the normal vertex attribute if normals are not used
    const normalVertexAttribute = getVertexAttribute(
      vertexArray,
      normalLocation
    );
    normalVertexAttribute.enabled = usesNormals;
  }

  const attributeLocations = {
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

  let attributeDeclarations = "";

  const length = styleablePropertyIds.length;
  for (i = 0; i < length; ++i) {
    const propertyId = styleablePropertyIds[i];
    attribute = propertyIdToAttributeMap[propertyId];
    const componentCount = attribute.componentCount;
    const attributeName = `czm_3dtiles_property_${propertyId}`;
    let attributeType;
    if (componentCount === 1) {
      attributeType = "float";
    } else {
      attributeType = `vec${componentCount}`;
    }

    attributeDeclarations += `attribute ${attributeType} ${attributeName}; \n`;
    attributeLocations[attributeName] = attribute.location;
  }

  createUniformMap(pointCloud, frameState);

  let vs =
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

  let fs = "varying vec4 v_color; \n";

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

  if (pointCloud.splitDirection !== SplitDirection.NONE) {
    fs = Splitter.modifyFragmentShader(fs);
  }

  if (defined(pointCloud._vertexShaderLoaded)) {
    vs = pointCloud._vertexShaderLoaded(vs);
  }

  if (defined(pointCloud._fragmentShaderLoaded)) {
    fs = pointCloud._fragmentShaderLoaded(fs);
  }

  const drawCommand = pointCloud._drawCommand;
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
    const parsedContent = pointCloud._parsedContent;
    const draco = parsedContent.draco;
    const decodePromise = DracoLoader.decodePointCloud(draco, context);
    if (defined(decodePromise)) {
      pointCloud._decodingState = DecodingState.DECODING;
      decodePromise
        .then(function (result) {
          pointCloud._decodingState = DecodingState.READY;
          const decodedPositions = defined(result.POSITION)
            ? result.POSITION.array
            : undefined;
          const decodedRgb = defined(result.RGB) ? result.RGB.array : undefined;
          const decodedRgba = defined(result.RGBA)
            ? result.RGBA.array
            : undefined;
          const decodedNormals = defined(result.NORMAL)
            ? result.NORMAL.array
            : undefined;
          const decodedBatchIds = defined(result.BATCH_ID)
            ? result.BATCH_ID.array
            : undefined;
          const isQuantizedDraco =
            defined(decodedPositions) &&
            defined(result.POSITION.data.quantization);
          const isOctEncodedDraco =
            defined(decodedNormals) && defined(result.NORMAL.data.quantization);
          if (isQuantizedDraco) {
            // Draco quantization range == quantized volume scale - size in meters of the quantized volume
            // Internal quantized range is the range of values of the quantized data, e.g. 255 for 8-bit, 1023 for 10-bit, etc
            const quantization = result.POSITION.data.quantization;
            const range = quantization.range;
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
          let styleableProperties = parsedContent.styleableProperties;
          const batchTableProperties = draco.batchTableProperties;
          for (const name in batchTableProperties) {
            if (batchTableProperties.hasOwnProperty(name)) {
              const property = result[name];
              if (!defined(styleableProperties)) {
                styleableProperties = {};
              }
              styleableProperties[name] = {
                typedArray: property.array,
                componentCount: property.data.componentsPerAttribute,
              };
            }
          }

          if (defined(decodedPositions)) {
            parsedContent.positions = {
              typedArray: decodedPositions,
            };
          }

          const decodedColors = defaultValue(decodedRgba, decodedRgb);
          if (defined(decodedColors)) {
            parsedContent.colors = {
              typedArray: decodedColors,
            };
          }

          if (defined(decodedNormals)) {
            parsedContent.normals = {
              typedArray: decodedNormals,
            };
          }

          if (defined(decodedBatchIds)) {
            parsedContent.batchIds = {
              typedArray: decodedBatchIds,
            };
          }

          parsedContent.styleableProperties = styleableProperties;
        })
        .catch(function (error) {
          pointCloud._decodingState = DecodingState.FAILED;
          pointCloud._readyPromise.reject(error);
        });
    }
  }
  return true;
}

const scratchComputedTranslation = new Cartesian4();
const scratchScale = new Cartesian3();

PointCloud.prototype.update = function (frameState) {
  const context = frameState.context;
  const decoding = decodeDraco(this, context);
  if (decoding) {
    return;
  }

  let shadersDirty = false;
  let modelMatrixDirty = !Matrix4.equals(this._modelMatrix, this.modelMatrix);

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
    const modelMatrix = this._drawCommand.modelMatrix;
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
      const projection = frameState.mapProjection;
      const translation = Matrix4.getColumn(
        modelMatrix,
        3,
        scratchComputedTranslation
      );
      if (!Cartesian4.equals(translation, Cartesian4.UNIT_W)) {
        Transforms.basisTo2D(projection, modelMatrix, modelMatrix);
      }
    }

    const boundingSphere = this._drawCommand.boundingVolume;
    BoundingSphere.clone(this._boundingSphere, boundingSphere);

    if (this._cull) {
      const center = boundingSphere.center;
      Matrix4.multiplyByPoint(modelMatrix, center, center);
      const scale = Matrix4.getScale(modelMatrix, scratchScale);
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

  const splittingEnabled = this.splitDirection !== SplitDirection.NONE;
  if (this._splittingEnabled !== splittingEnabled) {
    this._splittingEnabled = splittingEnabled;
    shadersDirty = true;
  }

  if (shadersDirty) {
    createShaders(this, frameState, this._style);
  }

  this._drawCommand.castShadows = ShadowMode.castShadows(this.shadows);
  this._drawCommand.receiveShadows = ShadowMode.receiveShadows(this.shadows);

  // Update the render state
  const isTranslucent =
    this._highlightColor.alpha < 1.0 ||
    this._constantColor.alpha < 1.0 ||
    this._styleTranslucent;
  this._drawCommand.renderState = isTranslucent
    ? this._translucentRenderState
    : this._opaqueRenderState;
  this._drawCommand.pass = isTranslucent ? Pass.TRANSLUCENT : this._opaquePass;

  const commandList = frameState.commandList;

  const passes = frameState.passes;
  if (passes.render || passes.pick) {
    commandList.push(this._drawCommand);
  }
};

PointCloud.prototype.isDestroyed = function () {
  return false;
};

PointCloud.prototype.destroy = function () {
  const command = this._drawCommand;
  if (defined(command)) {
    command.vertexArray = command.vertexArray && command.vertexArray.destroy();
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }
  return destroyObject(this);
};
export default PointCloud;
