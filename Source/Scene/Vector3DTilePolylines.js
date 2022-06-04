import arraySlice from "../Core/arraySlice.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import IndexDatatype from "../Core/IndexDatatype.js";
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
import Vector3DTilePolylinesVS from "../Shaders/Vector3DTilePolylinesVS.js";
import BlendingState from "./BlendingState.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";

/**
 * Creates a batch of polylines that have been subdivided to be draped on terrain.
 *
 * @alias Vector3DTilePolylines
 * @constructor
 *
 * @param {Object} options An object with following properties:
 * @param {Uint16Array} options.positions The positions of the polylines
 * @param {Uint32Array} options.counts The number or positions in the each polyline.
 * @param {Uint16Array} options.widths The width of each polyline.
 * @param {Number} options.minimumHeight The minimum height of the terrain covered by the tile.
 * @param {Number} options.maximumHeight The maximum height of the terrain covered by the tile.
 * @param {Rectangle} options.rectangle The rectangle containing the tile.
 * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
 * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polylines.
 * @param {Uint16Array} options.batchIds The batch ids for each polyline.
 * @param {BoundingSphere} options.boundingVolume The bounding volume for the entire batch of polylines.
 * @param {Boolean} options.keepDecodedPositions Whether to keep decoded positions in memory.
 *
 * @private
 */
function Vector3DTilePolylines(options) {
  // these arrays are all released after the first update.
  this._positions = options.positions;
  this._widths = options.widths;
  this._counts = options.counts;
  this._batchIds = options.batchIds;

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._minimumHeight = options.minimumHeight;
  this._maximumHeight = options.maximumHeight;
  this._center = options.center;
  this._rectangle = options.rectangle;

  this._boundingVolume = options.boundingVolume;
  this._batchTable = options.batchTable;

  this._va = undefined;
  this._sp = undefined;
  this._rs = undefined;
  this._uniformMap = undefined;
  this._command = undefined;

  this._transferrableBatchIds = undefined;
  this._packedBuffer = undefined;

  this._keepDecodedPositions = options.keepDecodedPositions;
  this._decodedPositions = undefined;
  this._decodedPositionOffsets = undefined;

  this._currentPositions = undefined;
  this._previousPositions = undefined;
  this._nextPositions = undefined;
  this._expandAndWidth = undefined;
  this._vertexBatchIds = undefined;
  this._indices = undefined;

  this._constantColor = Color.clone(Color.WHITE);
  this._highlightColor = this._constantColor;

  this._trianglesLength = 0;
  this._geometryByteLength = 0;

  this._ready = false;
  this._update = function (polylines, frameState) {};
  this._readyPromise = initialize(this);

  this._verticesPromise = undefined;
}

Object.defineProperties(Vector3DTilePolylines.prototype, {
  /**
   * Gets the number of triangles.
   *
   * @memberof Vector3DTilePolylines.prototype
   *
   * @type {Number}
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
   * @memberof Vector3DTilePolylines.prototype
   *
   * @type {Number}
   * @readonly
   */
  geometryByteLength: {
    get: function () {
      return this._geometryByteLength;
    },
  },

  /**
   * Gets a promise that resolves when the primitive is ready to render.
   * @memberof Vector3DTilePolylines.prototype
   * @type {Promise<void>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

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
  "createVectorTilePolylines",
  5
);
const attributeLocations = {
  previousPosition: 0,
  currentPosition: 1,
  nextPosition: 2,
  expandAndWidth: 3,
  a_batchId: 4,
};

function createVertexArray(polylines, context) {
  if (defined(polylines._va)) {
    return;
  }

  if (!defined(polylines._verticesPromise)) {
    let positions = polylines._positions;
    let widths = polylines._widths;
    let counts = polylines._counts;
    let batchIds = polylines._transferrableBatchIds;

    let packedBuffer = polylines._packedBuffer;

    if (!defined(packedBuffer)) {
      // Copy because they may be the views on the same buffer.
      positions = polylines._positions = arraySlice(positions);
      widths = polylines._widths = arraySlice(widths);
      counts = polylines._counts = arraySlice(counts);

      batchIds = polylines._transferrableBatchIds = arraySlice(
        polylines._batchIds
      );

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

    const verticesPromise = (polylines._verticesPromise = createVerticesTaskProcessor.scheduleTask(
      parameters,
      transferrableObjects
    ));
    if (!defined(verticesPromise)) {
      // Postponed
      return;
    }

    return verticesPromise.then(function (result) {
      if (polylines._keepDecodedPositions) {
        polylines._decodedPositions = new Float64Array(result.decodedPositions);
        polylines._decodedPositionOffsets = new Uint32Array(
          result.decodedPositionOffsets
        );
      }

      polylines._currentPositions = new Float32Array(result.currentPositions);
      polylines._previousPositions = new Float32Array(result.previousPositions);
      polylines._nextPositions = new Float32Array(result.nextPositions);
      polylines._expandAndWidth = new Float32Array(result.expandAndWidth);
      polylines._vertexBatchIds = new Uint16Array(result.batchIds);

      const indexDatatype = result.indexDatatype;
      polylines._indices =
        indexDatatype === IndexDatatype.UNSIGNED_SHORT
          ? new Uint16Array(result.indices)
          : new Uint32Array(result.indices);

      polylines._ready = true;
    });
  }
}

function finishVertexArray(polylines, context) {
  if (polylines._ready && !defined(polylines._va)) {
    const curPositions = polylines._currentPositions;
    const prevPositions = polylines._previousPositions;
    const nextPositions = polylines._nextPositions;
    const expandAndWidth = polylines._expandAndWidth;
    const vertexBatchIds = polylines._vertexBatchIds;
    const indices = polylines._indices;

    let byteLength =
      prevPositions.byteLength +
      curPositions.byteLength +
      nextPositions.byteLength;
    byteLength +=
      expandAndWidth.byteLength +
      vertexBatchIds.byteLength +
      indices.byteLength;
    polylines._trianglesLength = indices.length / 3;
    polylines._geometryByteLength = byteLength;

    const prevPositionBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: prevPositions,
      usage: BufferUsage.STATIC_DRAW,
    });
    const curPositionBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: curPositions,
      usage: BufferUsage.STATIC_DRAW,
    });
    const nextPositionBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: nextPositions,
      usage: BufferUsage.STATIC_DRAW,
    });
    const expandAndWidthBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: expandAndWidth,
      usage: BufferUsage.STATIC_DRAW,
    });
    const idBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: vertexBatchIds,
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
        index: attributeLocations.previousPosition,
        vertexBuffer: prevPositionBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
      },
      {
        index: attributeLocations.currentPosition,
        vertexBuffer: curPositionBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
      },
      {
        index: attributeLocations.nextPosition,
        vertexBuffer: nextPositionBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
      },
      {
        index: attributeLocations.expandAndWidth,
        vertexBuffer: expandAndWidthBuffer,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
      },
      {
        index: attributeLocations.a_batchId,
        vertexBuffer: idBuffer,
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

    polylines._currentPositions = undefined;
    polylines._previousPositions = undefined;
    polylines._nextPositions = undefined;
    polylines._expandAndWidth = undefined;
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
  };
}

function createRenderStates(primitive) {
  if (defined(primitive._rs)) {
    return;
  }

  const polygonOffset = {
    enabled: true,
    factor: -5.0,
    units: -5.0,
  };

  primitive._rs = RenderState.fromCache({
    blending: BlendingState.ALPHA_BLEND,
    depthMask: false,
    depthTest: {
      enabled: true,
    },
    polygonOffset: polygonOffset,
  });
}

const PolylineFS =
  "uniform vec4 u_highlightColor; \n" +
  "void main()\n" +
  "{\n" +
  "    gl_FragColor = u_highlightColor;\n" +
  "}\n";

function createShaders(primitive, context) {
  if (defined(primitive._sp)) {
    return;
  }

  const batchTable = primitive._batchTable;

  const vsSource = batchTable.getVertexShaderCallback(
    false,
    "a_batchId",
    undefined
  )(Vector3DTilePolylinesVS);
  const fsSource = batchTable.getFragmentShaderCallback(
    false,
    undefined,
    false
  )(PolylineFS);

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
  if (!defined(primitive._command)) {
    const uniformMap = primitive._batchTable.getUniformMapCallback()(
      primitive._uniformMap
    );
    primitive._command = new DrawCommand({
      owner: primitive,
      vertexArray: primitive._va,
      renderState: primitive._rs,
      shaderProgram: primitive._sp,
      uniformMap: uniformMap,
      boundingVolume: primitive._boundingVolume,
      pass: Pass.TRANSLUCENT,
      pickId: primitive._batchTable.getPickId(),
    });
  }

  frameState.commandList.push(primitive._command);
}

Vector3DTilePolylines.getPolylinePositions = function (polylines, batchId) {
  const batchIds = polylines._batchIds;
  const positions = polylines._decodedPositions;
  const offsets = polylines._decodedPositionOffsets;

  if (!defined(batchIds) || !defined(positions)) {
    return undefined;
  }

  let i;
  let j;
  const polylinesLength = batchIds.length;
  let positionsLength = 0;
  let resultCounter = 0;

  for (i = 0; i < polylinesLength; ++i) {
    if (batchIds[i] === batchId) {
      positionsLength += offsets[i + 1] - offsets[i];
    }
  }

  if (positionsLength === 0) {
    return undefined;
  }

  const results = new Float64Array(positionsLength * 3);

  for (i = 0; i < polylinesLength; ++i) {
    if (batchIds[i] === batchId) {
      const offset = offsets[i];
      const count = offsets[i + 1] - offset;
      for (j = 0; j < count; ++j) {
        const decodedOffset = (offset + j) * 3;
        results[resultCounter++] = positions[decodedOffset];
        results[resultCounter++] = positions[decodedOffset + 1];
        results[resultCounter++] = positions[decodedOffset + 2];
      }
    }
  }

  return results;
};

/**
 * Get the polyline positions for the given feature.
 *
 * @param {Number} batchId The batch ID of the feature.
 */
Vector3DTilePolylines.prototype.getPositions = function (batchId) {
  return Vector3DTilePolylines.getPolylinePositions(this, batchId);
};

/**
 * Creates features for each polyline and places it at the batch id index of features.
 *
 * @param {Vector3DTileContent} content The vector tile content.
 * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
 */
Vector3DTilePolylines.prototype.createFeatures = function (content, features) {
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
 * @param {Boolean} enabled Whether to enable debug coloring.
 * @param {Color} color The debug color.
 */
Vector3DTilePolylines.prototype.applyDebugSettings = function (enabled, color) {
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
 * @param {Cesium3DTileFeature[]} features The array of features.
 */
Vector3DTilePolylines.prototype.applyStyle = function (style, features) {
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
  return new Promise(function (resolve, reject) {
    polylines._update = function (polylines, frameState) {
      const context = frameState.context;
      const promise = createVertexArray(polylines, context);
      createUniformMap(polylines, context);
      createShaders(polylines, context);
      createRenderStates(polylines);

      if (polylines._ready) {
        const passes = frameState.passes;
        if (passes.render || passes.pick) {
          queueCommands(polylines, frameState);
        }
      }

      if (!defined(promise)) {
        return;
      }

      promise
        .then(function () {
          finishVertexArray(polylines, context);
          resolve();
        })
        .catch(function (e) {
          reject(e);
        });
    };
  });
}

/**
 * Updates the batches and queues the commands for rendering.
 *
 * @param {FrameState} frameState The current frame state.
 */
Vector3DTilePolylines.prototype.update = function (frameState) {
  this._update(this, frameState);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
Vector3DTilePolylines.prototype.isDestroyed = function () {
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
Vector3DTilePolylines.prototype.destroy = function () {
  this._va = this._va && this._va.destroy();
  this._sp = this._sp && this._sp.destroy();
  return destroyObject(this);
};
export default Vector3DTilePolylines;
