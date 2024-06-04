import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Matrix4 from "../Core/Matrix4.js";
import Rectangle from "../Core/Rectangle.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import VertexArray from "../Renderer/VertexArray.js";
import PolylineCommon from "../Shaders/PolylineCommon.js";
import Vector3DTileClampedPolylinesVS from "../Shaders/Vector3DTileClampedPolylinesVS.js";
import Vector3DTileClampedPolylinesFS from "../Shaders/Vector3DTileClampedPolylinesFS.js";
import BlendingState from "./BlendingState.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import ClassificationType from "./ClassificationType.js";
import CullFace from "./CullFace.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";
import Vector3DTilePolylines from "./Vector3DTilePolylines.js";

/**
 * Creates a batch of polylines as volumes with shader-adjustable width.
 *
 * @alias Vector3DTileClampedPolylines
 * @constructor
 *
 * @param {object} options An object with following properties:
 * @param {Uint16Array} options.positions The positions of the polylines
 * @param {Uint32Array} options.counts The number or positions in the each polyline.
 * @param {Uint16Array} options.widths The width of each polyline.
 * @param {number} options.minimumHeight The minimum height of the tile's region.
 * @param {number} options.maximumHeight The maximum height of the tile's region.
 * @param {Rectangle} options.rectangle The rectangle containing the tile.
 * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
 * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polylines.
 * @param {Uint16Array} options.batchIds The batch ids for each polyline.
 * @param {ClassificationType} options.classificationType The classification type.
 * @param {boolean} options.keepDecodedPositions Whether to keep decoded positions in memory.
 *
 * @private
 */
function Vector3DTileClampedPolylines(options) {
  // these arrays hold data from the tile payload
  // and are all released after the first update.
  this._positions = options.positions;
  this._widths = options.widths;
  this._counts = options.counts;
  this._batchIds = options.batchIds;

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._minimumHeight = options.minimumHeight;
  this._maximumHeight = options.maximumHeight;
  this._center = options.center;
  this._rectangle = options.rectangle;

  this._batchTable = options.batchTable;

  this._va = undefined;
  this._sp = undefined;
  this._rs = undefined;
  this._uniformMap = undefined;
  this._command = undefined;

  this._transferrableBatchIds = undefined;
  this._packedBuffer = undefined;
  this._minimumMaximumVectorHeights = new Cartesian2(
    ApproximateTerrainHeights._defaultMinTerrainHeight,
    ApproximateTerrainHeights._defaultMaxTerrainHeight
  );
  this._boundingVolume = OrientedBoundingBox.fromRectangle(
    options.rectangle,
    ApproximateTerrainHeights._defaultMinTerrainHeight,
    ApproximateTerrainHeights._defaultMaxTerrainHeight,
    this._ellipsoid
  );
  this._classificationType = options.classificationType;

  this._keepDecodedPositions = options.keepDecodedPositions;
  this._decodedPositions = undefined;
  this._decodedPositionOffsets = undefined;

  // Fat vertices - all information for each volume packed to a vec3 and 5 vec4s
  this._startEllipsoidNormals = undefined;
  this._endEllipsoidNormals = undefined;
  this._startPositionAndHeights = undefined;
  this._startFaceNormalAndVertexCornerIds = undefined;
  this._endPositionAndHeights = undefined;
  this._endFaceNormalAndHalfWidths = undefined;
  this._vertexBatchIds = undefined;

  this._indices = undefined;

  this._constantColor = Color.clone(Color.WHITE);
  this._highlightColor = this._constantColor;

  this._trianglesLength = 0;
  this._geometryByteLength = 0;

  this._ready = false;
  this._promise = undefined;
  this._error = undefined;
}

Object.defineProperties(Vector3DTileClampedPolylines.prototype, {
  /**
   * Gets the number of triangles.
   *
   * @memberof Vector3DTileClampedPolylines.prototype
   *
   * @type {number}
   * @readonly
   */
  trianglesLength: {
    get: function () {
      return this._trianglesLength;
    },
  },

  /**
   * Gets the geometry memory in bytes.
   *
   * @memberof Vector3DTileClampedPolylines.prototype
   *
   * @type {number}
   * @readonly
   */
  geometryByteLength: {
    get: function () {
      return this._geometryByteLength;
    },
  },

  /**
   * Returns true when the primitive is ready to render.
   * @memberof Vector3DTileClampedPolylines.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },
});

function updateMinimumMaximumHeights(polylines, rectangle, ellipsoid) {
  const result = ApproximateTerrainHeights.getMinimumMaximumHeights(
    rectangle,
    ellipsoid
  );
  const min = result.minimumTerrainHeight;
  const max = result.maximumTerrainHeight;
  const minimumMaximumVectorHeights = polylines._minimumMaximumVectorHeights;
  minimumMaximumVectorHeights.x = min;
  minimumMaximumVectorHeights.y = max;

  const obb = polylines._boundingVolume;
  const rect = polylines._rectangle;
  OrientedBoundingBox.fromRectangle(rect, min, max, ellipsoid, obb);
}

function packBuffer(polylines) {
  const rectangle = polylines._rectangle;
  const minimumHeight = polylines._minimumHeight;
  const maximumHeight = polylines._maximumHeight;
  const ellipsoid = polylines._ellipsoid;
  const center = polylines._center;

  const packedLength =
    2 +
    Rectangle.packedLength +
    Ellipsoid.packedLength +
    Cartesian3.packedLength;
  const packedBuffer = new Float64Array(packedLength);

  let offset = 0;
  packedBuffer[offset++] = minimumHeight;
  packedBuffer[offset++] = maximumHeight;

  Rectangle.pack(rectangle, packedBuffer, offset);
  offset += Rectangle.packedLength;

  Ellipsoid.pack(ellipsoid, packedBuffer, offset);
  offset += Ellipsoid.packedLength;

  Cartesian3.pack(center, packedBuffer, offset);

  return packedBuffer;
}

const createVerticesTaskProcessor = new TaskProcessor(
  "createVectorTileClampedPolylines"
);
const attributeLocations = {
  startEllipsoidNormal: 0,
  endEllipsoidNormal: 1,
  startPositionAndHeight: 2,
  endPositionAndHeight: 3,
  startFaceNormalAndVertexCorner: 4,
  endFaceNormalAndHalfWidth: 5,
  a_batchId: 6,
};

function createVertexArray(polylines, context) {
  if (defined(polylines._va)) {
    return;
  }

  let positions = polylines._positions;
  let widths = polylines._widths;
  let counts = polylines._counts;
  let batchIds = polylines._transferrableBatchIds;

  let packedBuffer = polylines._packedBuffer;

  if (!defined(packedBuffer)) {
    // Copy because they may be the views on the same buffer.
    positions = polylines._positions = positions.slice();
    widths = polylines._widths = widths.slice();
    counts = polylines._counts = counts.slice();

    batchIds = polylines._transferrableBatchIds = polylines._batchIds.slice();

    packedBuffer = polylines._packedBuffer = packBuffer(polylines);
  }

  const transferrableObjects = [
    positions.buffer,
    widths.buffer,
    counts.buffer,
    batchIds.buffer,
    packedBuffer.buffer,
  ];
  const parameters = {
    positions: positions.buffer,
    widths: widths.buffer,
    counts: counts.buffer,
    batchIds: batchIds.buffer,
    packedBuffer: packedBuffer.buffer,
    keepDecodedPositions: polylines._keepDecodedPositions,
  };

  const verticesPromise = createVerticesTaskProcessor.scheduleTask(
    parameters,
    transferrableObjects
  );
  if (!defined(verticesPromise)) {
    // Postponed
    return;
  }

  return verticesPromise
    .then(function (result) {
      if (polylines.isDestroyed()) {
        return;
      }

      if (polylines._keepDecodedPositions) {
        polylines._decodedPositions = new Float64Array(result.decodedPositions);
        polylines._decodedPositionOffsets = new Uint32Array(
          result.decodedPositionOffsets
        );
      }

      polylines._startEllipsoidNormals = new Float32Array(
        result.startEllipsoidNormals
      );
      polylines._endEllipsoidNormals = new Float32Array(
        result.endEllipsoidNormals
      );
      polylines._startPositionAndHeights = new Float32Array(
        result.startPositionAndHeights
      );
      polylines._startFaceNormalAndVertexCornerIds = new Float32Array(
        result.startFaceNormalAndVertexCornerIds
      );
      polylines._endPositionAndHeights = new Float32Array(
        result.endPositionAndHeights
      );
      polylines._endFaceNormalAndHalfWidths = new Float32Array(
        result.endFaceNormalAndHalfWidths
      );
      polylines._vertexBatchIds = new Uint16Array(result.vertexBatchIds);

      const indexDatatype = result.indexDatatype;
      polylines._indices =
        indexDatatype === IndexDatatype.UNSIGNED_SHORT
          ? new Uint16Array(result.indices)
          : new Uint32Array(result.indices);

      finishVertexArray(polylines, context);
      polylines._ready = true;
    })
    .catch((error) => {
      if (polylines.isDestroyed()) {
        return;
      }

      // Throw the error next frame
      polylines._error = error;
    });
}

function finishVertexArray(polylines, context) {
  if (!defined(polylines._va)) {
    const startEllipsoidNormals = polylines._startEllipsoidNormals;
    const endEllipsoidNormals = polylines._endEllipsoidNormals;
    const startPositionAndHeights = polylines._startPositionAndHeights;
    const endPositionAndHeights = polylines._endPositionAndHeights;
    const startFaceNormalAndVertexCornerIds =
      polylines._startFaceNormalAndVertexCornerIds;
    const endFaceNormalAndHalfWidths = polylines._endFaceNormalAndHalfWidths;
    const batchIdAttribute = polylines._vertexBatchIds;

    const indices = polylines._indices;

    let byteLength =
      startEllipsoidNormals.byteLength + endEllipsoidNormals.byteLength;
    byteLength +=
      startPositionAndHeights.byteLength + endPositionAndHeights.byteLength;
    byteLength +=
      startFaceNormalAndVertexCornerIds.byteLength +
      endFaceNormalAndHalfWidths.byteLength;
    byteLength += batchIdAttribute.byteLength + indices.byteLength;

    polylines._trianglesLength = indices.length / 3;
    polylines._geometryByteLength = byteLength;

    const startEllipsoidNormalsBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: startEllipsoidNormals,
      usage: BufferUsage.STATIC_DRAW,
    });
    const endEllipsoidNormalsBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: endEllipsoidNormals,
      usage: BufferUsage.STATIC_DRAW,
    });
    const startPositionAndHeightsBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: startPositionAndHeights,
      usage: BufferUsage.STATIC_DRAW,
    });
    const endPositionAndHeightsBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: endPositionAndHeights,
      usage: BufferUsage.STATIC_DRAW,
    });
    const startFaceNormalAndVertexCornerIdsBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: startFaceNormalAndVertexCornerIds,
      usage: BufferUsage.STATIC_DRAW,
    });
    const endFaceNormalAndHalfWidthsBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: endFaceNormalAndHalfWidths,
      usage: BufferUsage.STATIC_DRAW,
    });
    const batchIdAttributeBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: batchIdAttribute,
      usage: BufferUsage.STATIC_DRAW,
    });

    const indexBuffer = Buffer.createIndexBuffer({
      context: context,
      typedArray: indices,
      usage: BufferUsage.STATIC_DRAW,
      indexDatatype:
        indices.BYTES_PER_ELEMENT === 2
          ? IndexDatatype.UNSIGNED_SHORT
          : IndexDatatype.UNSIGNED_INT,
    });

    const vertexAttributes = [
      {
        index: attributeLocations.startEllipsoidNormal,
        vertexBuffer: startEllipsoidNormalsBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
      },
      {
        index: attributeLocations.endEllipsoidNormal,
        vertexBuffer: endEllipsoidNormalsBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
      },
      {
        index: attributeLocations.startPositionAndHeight,
        vertexBuffer: startPositionAndHeightsBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 4,
      },
      {
        index: attributeLocations.endPositionAndHeight,
        vertexBuffer: endPositionAndHeightsBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 4,
      },
      {
        index: attributeLocations.startFaceNormalAndVertexCorner,
        vertexBuffer: startFaceNormalAndVertexCornerIdsBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 4,
      },
      {
        index: attributeLocations.endFaceNormalAndHalfWidth,
        vertexBuffer: endFaceNormalAndHalfWidthsBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 4,
      },
      {
        index: attributeLocations.a_batchId,
        vertexBuffer: batchIdAttributeBuffer,
        componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
        componentsPerAttribute: 1,
      },
    ];

    polylines._va = new VertexArray({
      context: context,
      attributes: vertexAttributes,
      indexBuffer: indexBuffer,
    });

    polylines._positions = undefined;
    polylines._widths = undefined;
    polylines._counts = undefined;

    polylines._ellipsoid = undefined;
    polylines._minimumHeight = undefined;
    polylines._maximumHeight = undefined;
    polylines._rectangle = undefined;

    polylines._transferrableBatchIds = undefined;
    polylines._packedBuffer = undefined;

    polylines._startEllipsoidNormals = undefined;
    polylines._endEllipsoidNormals = undefined;
    polylines._startPositionAndHeights = undefined;
    polylines._startFaceNormalAndVertexCornerIds = undefined;
    polylines._endPositionAndHeights = undefined;
    polylines._endFaceNormalAndHalfWidths = undefined;
    polylines._vertexBatchIds = undefined;

    polylines._indices = undefined;
  }
}

const modifiedModelViewScratch = new Matrix4();
const rtcScratch = new Cartesian3();

function createUniformMap(primitive, context) {
  if (defined(primitive._uniformMap)) {
    return;
  }

  primitive._uniformMap = {
    u_modifiedModelView: function () {
      const viewMatrix = context.uniformState.view;
      Matrix4.clone(viewMatrix, modifiedModelViewScratch);
      Matrix4.multiplyByPoint(
        modifiedModelViewScratch,
        primitive._center,
        rtcScratch
      );
      Matrix4.setTranslation(
        modifiedModelViewScratch,
        rtcScratch,
        modifiedModelViewScratch
      );
      return modifiedModelViewScratch;
    },
    u_highlightColor: function () {
      return primitive._highlightColor;
    },
    u_minimumMaximumVectorHeights: function () {
      return primitive._minimumMaximumVectorHeights;
    },
  };
}

function getRenderState(mask3DTiles) {
  /**
   * Cull front faces of each volume (relative to camera) to prevent
   * classification drawing from both the front and back faces, double-draw.
   * The geometry is "inverted" (inside-out winding order for the indices) but
   * the vertex shader seems to re-invert so that the triangles face "out" again.
   * So cull FRONT faces.
   */
  return RenderState.fromCache({
    cull: {
      enabled: true,
      face: CullFace.FRONT,
    },
    blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
    depthMask: false,
    stencilTest: {
      enabled: mask3DTiles,
      frontFunction: StencilFunction.EQUAL,
      frontOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.KEEP,
        zPass: StencilOperation.KEEP,
      },
      backFunction: StencilFunction.EQUAL,
      backOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.KEEP,
        zPass: StencilOperation.KEEP,
      },
      reference: StencilConstants.CESIUM_3D_TILE_MASK,
      mask: StencilConstants.CESIUM_3D_TILE_MASK,
    },
  });
}

function createRenderStates(primitive) {
  if (defined(primitive._rs)) {
    return;
  }

  primitive._rs = getRenderState(false);
  primitive._rs3DTiles = getRenderState(true);
}

function createShaders(primitive, context) {
  if (defined(primitive._sp)) {
    return;
  }

  const batchTable = primitive._batchTable;

  const vsSource = batchTable.getVertexShaderCallback(
    false,
    "a_batchId",
    undefined
  )(Vector3DTileClampedPolylinesVS);
  const fsSource = batchTable.getFragmentShaderCallback(
    false,
    undefined,
    true
  )(Vector3DTileClampedPolylinesFS);

  const vs = new ShaderSource({
    defines: [
      "VECTOR_TILE",
      !FeatureDetection.isInternetExplorer() ? "CLIP_POLYLINE" : "",
    ],
    sources: [PolylineCommon, vsSource],
  });
  const fs = new ShaderSource({
    defines: ["VECTOR_TILE"],
    sources: [fsSource],
  });

  primitive._sp = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

function queueCommands(primitive, frameState) {
  let command = primitive._command;
  if (!defined(primitive._command)) {
    const uniformMap = primitive._batchTable.getUniformMapCallback()(
      primitive._uniformMap
    );
    command = primitive._command = new DrawCommand({
      owner: primitive,
      vertexArray: primitive._va,
      renderState: primitive._rs,
      shaderProgram: primitive._sp,
      uniformMap: uniformMap,
      boundingVolume: primitive._boundingVolume,
      pass: Pass.TERRAIN_CLASSIFICATION,
      pickId: primitive._batchTable.getPickId(),
    });

    const derivedTilesetCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.tileset
    );
    derivedTilesetCommand.renderState = primitive._rs3DTiles;
    derivedTilesetCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    command.derivedCommands.tileset = derivedTilesetCommand;
  }

  const classificationType = primitive._classificationType;
  if (
    classificationType === ClassificationType.TERRAIN ||
    classificationType === ClassificationType.BOTH
  ) {
    frameState.commandList.push(command);
  }
  if (
    classificationType === ClassificationType.CESIUM_3D_TILE ||
    classificationType === ClassificationType.BOTH
  ) {
    frameState.commandList.push(command.derivedCommands.tileset);
  }
}

/**
 * Get the polyline positions for the given feature.
 *
 * @param {number} batchId The batch ID of the feature.
 */
Vector3DTileClampedPolylines.prototype.getPositions = function (batchId) {
  return Vector3DTilePolylines.getPolylinePositions(this, batchId);
};

/**
 * Creates features for each polyline and places it at the batch id index of features.
 *
 * @param {Vector3DTileContent} content The vector tile content.
 * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
 */
Vector3DTileClampedPolylines.prototype.createFeatures = function (
  content,
  features
) {
  const batchIds = this._batchIds;
  const length = batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    features[batchId] = new Cesium3DTileFeature(content, batchId);
  }
};

/**
 * Colors the entire tile when enabled is true. The resulting color will be (polyline batch table color * color).
 *
 * @param {boolean} enabled Whether to enable debug coloring.
 * @param {Color} color The debug color.
 */
Vector3DTileClampedPolylines.prototype.applyDebugSettings = function (
  enabled,
  color
) {
  this._highlightColor = enabled ? color : this._constantColor;
};

function clearStyle(polygons, features) {
  const batchIds = polygons._batchIds;
  const length = batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    const feature = features[batchId];

    feature.show = true;
    feature.color = Color.WHITE;
  }
}

const scratchColor = new Color();

const DEFAULT_COLOR_VALUE = Color.WHITE;
const DEFAULT_SHOW_VALUE = true;

/**
 * Apply a style to the content.
 *
 * @param {Cesium3DTileStyle} style The style.
 * @param {Cesium3DTileFeature[]} features The dictionary of features.
 */
Vector3DTileClampedPolylines.prototype.applyStyle = function (style, features) {
  if (!defined(style)) {
    clearStyle(this, features);
    return;
  }

  const batchIds = this._batchIds;
  const length = batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    const feature = features[batchId];

    feature.color = defined(style.color)
      ? style.color.evaluateColor(feature, scratchColor)
      : DEFAULT_COLOR_VALUE;
    feature.show = defined(style.show)
      ? style.show.evaluate(feature)
      : DEFAULT_SHOW_VALUE;
  }
};

function initialize(polylines) {
  return ApproximateTerrainHeights.initialize()
    .then(function () {
      updateMinimumMaximumHeights(
        polylines,
        polylines._rectangle,
        polylines._ellipsoid
      );
    })
    .catch((error) => {
      if (polylines.isDestroyed()) {
        return;
      }

      // Throw the error next frame
      polylines._error = error;
    });
}

/**
 * Updates the batches and queues the commands for rendering.
 *
 * @param {FrameState} frameState The current frame state.
 */
Vector3DTileClampedPolylines.prototype.update = function (frameState) {
  const context = frameState.context;
  if (!this._ready) {
    if (!defined(this._promise)) {
      this._promise = initialize(this).then(createVertexArray(this, context));
    }

    if (defined(this._error)) {
      const error = this._error;
      this._error = undefined;
      throw error;
    }

    return;
  }

  createUniformMap(this, context);
  createShaders(this, context);
  createRenderStates(this);

  const passes = frameState.passes;
  if (passes.render || passes.pick) {
    queueCommands(this, frameState);
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
Vector3DTileClampedPolylines.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
Vector3DTileClampedPolylines.prototype.destroy = function () {
  this._va = this._va && this._va.destroy();
  this._sp = this._sp && this._sp.destroy();
  return destroyObject(this);
};
export default Vector3DTileClampedPolylines;
