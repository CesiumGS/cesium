import arraySlice from "../Core/arraySlice.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import ClassificationType from "./ClassificationType.js";
import Vector3DTileBatch from "./Vector3DTileBatch.js";
import Vector3DTilePrimitive from "./Vector3DTilePrimitive.js";

/**
 * Creates a batch of pre-triangulated polygons draped on terrain and/or 3D Tiles.
 *
 * @alias Vector3DTilePolygons
 * @constructor
 *
 * @param {Object} options An object with following properties:
 * @param {Float32Array|Uint16Array} options.positions The positions of the polygons. The positions must be contiguous
 * so that the positions for polygon n are in [c, c + counts[n]] where c = sum{counts[0], counts[n - 1]} and they are the outer ring of
 * the polygon in counter-clockwise order.
 * @param {Uint32Array} options.counts The number of positions in the each polygon.
 * @param {Uint32Array} options.indices The indices of the triangulated polygons. The indices must be contiguous so that
 * the indices for polygon n are in [i, i + indexCounts[n]] where i = sum{indexCounts[0], indexCounts[n - 1]}.
 * @param {Uint32Array} options.indexCounts The number of indices for each polygon.
 * @param {Number} options.minimumHeight The minimum height of the terrain covered by the tile.
 * @param {Number} options.maximumHeight The maximum height of the terrain covered by the tile.
 * @param {Float32Array} [options.polygonMinimumHeights] An array containing the minimum heights for each polygon.
 * @param {Float32Array} [options.polygonMaximumHeights] An array containing the maximum heights for each polygon.
 * @param {Rectangle} options.rectangle The rectangle containing the tile.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
 * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
 * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polygons.
 * @param {Uint16Array} options.batchIds The batch ids for each polygon.
 * @param {BoundingSphere} options.boundingVolume The bounding volume for the entire batch of polygons.
 *
 * @private
 */
function Vector3DTilePolygons(options) {
  // All of the private properties will be released except _readyPromise
  // and _primitive after the Vector3DTilePrimitive is created.
  this._batchTable = options.batchTable;

  this._batchIds = options.batchIds;
  this._positions = options.positions;
  this._counts = options.counts;

  this._indices = options.indices;
  this._indexCounts = options.indexCounts;
  this._indexOffsets = undefined;

  this._batchTableColors = undefined;
  this._packedBuffer = undefined;

  this._batchedPositions = undefined;
  this._transferrableBatchIds = undefined;
  this._vertexBatchIds = undefined;

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._minimumHeight = options.minimumHeight;
  this._maximumHeight = options.maximumHeight;
  this._polygonMinimumHeights = options.polygonMinimumHeights;
  this._polygonMaximumHeights = options.polygonMaximumHeights;
  this._center = defaultValue(options.center, Cartesian3.ZERO);
  this._rectangle = options.rectangle;

  this._center = undefined;

  this._boundingVolume = options.boundingVolume;
  this._boundingVolumes = undefined;

  this._batchedIndices = undefined;

  this._ready = false;
  this._readyPromise = defer();

  this._verticesPromise = undefined;

  this._primitive = undefined;

  /**
   * Draws the wireframe of the classification meshes.
   * @type {Boolean}
   * @default false
   */
  this.debugWireframe = false;

  /**
   * Forces a re-batch instead of waiting after a number of frames have been rendered. For testing only.
   * @type {Boolean}
   * @default false
   */
  this.forceRebatch = false;

  /**
   * What this tile will classify.
   * @type {ClassificationType}
   * @default ClassificationType.BOTH
   */
  this.classificationType = ClassificationType.BOTH;
}

Object.defineProperties(Vector3DTilePolygons.prototype, {
  /**
   * Gets the number of triangles.
   *
   * @memberof Vector3DTilePolygons.prototype
   *
   * @type {Number}
   * @readonly
   */
  trianglesLength: {
    get: function () {
      if (defined(this._primitive)) {
        return this._primitive.trianglesLength;
      }
      return 0;
    },
  },

  /**
   * Gets the geometry memory in bytes.
   *
   * @memberof Vector3DTilePolygons.prototype
   *
   * @type {Number}
   * @readonly
   */
  geometryByteLength: {
    get: function () {
      if (defined(this._primitive)) {
        return this._primitive.geometryByteLength;
      }
      return 0;
    },
  },

  /**
   * Gets a promise that resolves when the primitive is ready to render.
   * @memberof Vector3DTilePolygons.prototype
   * @type {Promise<void>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

function packBuffer(polygons) {
  const packedBuffer = new Float64Array(
    3 +
      Cartesian3.packedLength +
      Ellipsoid.packedLength +
      Rectangle.packedLength
  );

  let offset = 0;
  packedBuffer[offset++] = polygons._indices.BYTES_PER_ELEMENT;

  packedBuffer[offset++] = polygons._minimumHeight;
  packedBuffer[offset++] = polygons._maximumHeight;

  Cartesian3.pack(polygons._center, packedBuffer, offset);
  offset += Cartesian3.packedLength;

  Ellipsoid.pack(polygons._ellipsoid, packedBuffer, offset);
  offset += Ellipsoid.packedLength;

  Rectangle.pack(polygons._rectangle, packedBuffer, offset);

  return packedBuffer;
}

function unpackBuffer(polygons, packedBuffer) {
  let offset = 1;

  const numBVS = packedBuffer[offset++];
  const bvs = (polygons._boundingVolumes = new Array(numBVS));

  for (let i = 0; i < numBVS; ++i) {
    bvs[i] = OrientedBoundingBox.unpack(packedBuffer, offset);
    offset += OrientedBoundingBox.packedLength;
  }

  const numBatchedIndices = packedBuffer[offset++];
  const bis = (polygons._batchedIndices = new Array(numBatchedIndices));

  for (let j = 0; j < numBatchedIndices; ++j) {
    const color = Color.unpack(packedBuffer, offset);
    offset += Color.packedLength;

    const indexOffset = packedBuffer[offset++];
    const count = packedBuffer[offset++];

    const length = packedBuffer[offset++];
    const batchIds = new Array(length);

    for (let k = 0; k < length; ++k) {
      batchIds[k] = packedBuffer[offset++];
    }

    bis[j] = new Vector3DTileBatch({
      color: color,
      offset: indexOffset,
      count: count,
      batchIds: batchIds,
    });
  }
}

const createVerticesTaskProcessor = new TaskProcessor(
  "createVectorTilePolygons",
  5
);
const scratchColor = new Color();

function createPrimitive(polygons) {
  if (defined(polygons._primitive)) {
    return;
  }

  if (!defined(polygons._verticesPromise)) {
    let positions = polygons._positions;
    let counts = polygons._counts;
    let indexCounts = polygons._indexCounts;
    let indices = polygons._indices;

    let batchIds = polygons._transferrableBatchIds;
    let batchTableColors = polygons._batchTableColors;

    let packedBuffer = polygons._packedBuffer;

    if (!defined(batchTableColors)) {
      // Copy because they may be the views on the same buffer.
      positions = polygons._positions = arraySlice(polygons._positions);
      counts = polygons._counts = arraySlice(polygons._counts);
      indexCounts = polygons._indexCounts = arraySlice(polygons._indexCounts);
      indices = polygons._indices = arraySlice(polygons._indices);

      polygons._center = polygons._ellipsoid.cartographicToCartesian(
        Rectangle.center(polygons._rectangle)
      );

      batchIds = polygons._transferrableBatchIds = new Uint32Array(
        polygons._batchIds
      );
      batchTableColors = polygons._batchTableColors = new Uint32Array(
        batchIds.length
      );
      const batchTable = polygons._batchTable;

      const length = batchTableColors.length;
      for (let i = 0; i < length; ++i) {
        const color = batchTable.getColor(i, scratchColor);
        batchTableColors[i] = color.toRgba();
      }

      packedBuffer = polygons._packedBuffer = packBuffer(polygons);
    }

    const transferrableObjects = [
      positions.buffer,
      counts.buffer,
      indexCounts.buffer,
      indices.buffer,
      batchIds.buffer,
      batchTableColors.buffer,
      packedBuffer.buffer,
    ];
    const parameters = {
      packedBuffer: packedBuffer.buffer,
      positions: positions.buffer,
      counts: counts.buffer,
      indexCounts: indexCounts.buffer,
      indices: indices.buffer,
      batchIds: batchIds.buffer,
      batchTableColors: batchTableColors.buffer,
    };

    let minimumHeights = polygons._polygonMinimumHeights;
    let maximumHeights = polygons._polygonMaximumHeights;
    if (defined(minimumHeights) && defined(maximumHeights)) {
      minimumHeights = arraySlice(minimumHeights);
      maximumHeights = arraySlice(maximumHeights);

      transferrableObjects.push(minimumHeights.buffer, maximumHeights.buffer);
      parameters.minimumHeights = minimumHeights;
      parameters.maximumHeights = maximumHeights;
    }

    const verticesPromise = (polygons._verticesPromise = createVerticesTaskProcessor.scheduleTask(
      parameters,
      transferrableObjects
    ));
    if (!defined(verticesPromise)) {
      // Postponed
      return;
    }

    verticesPromise.then(function (result) {
      polygons._positions = undefined;
      polygons._counts = undefined;
      polygons._polygonMinimumHeights = undefined;
      polygons._polygonMaximumHeights = undefined;

      const packedBuffer = new Float64Array(result.packedBuffer);
      const indexDatatype = packedBuffer[0];
      unpackBuffer(polygons, packedBuffer);

      polygons._indices =
        IndexDatatype.getSizeInBytes(indexDatatype) === 2
          ? new Uint16Array(result.indices)
          : new Uint32Array(result.indices);
      polygons._indexOffsets = new Uint32Array(result.indexOffsets);
      polygons._indexCounts = new Uint32Array(result.indexCounts);

      // will be released
      polygons._batchedPositions = new Float32Array(result.positions);
      polygons._vertexBatchIds = new Uint16Array(result.batchIds);

      polygons._ready = true;
    });
  }

  if (polygons._ready && !defined(polygons._primitive)) {
    polygons._primitive = new Vector3DTilePrimitive({
      batchTable: polygons._batchTable,
      positions: polygons._batchedPositions,
      batchIds: polygons._batchIds,
      vertexBatchIds: polygons._vertexBatchIds,
      indices: polygons._indices,
      indexOffsets: polygons._indexOffsets,
      indexCounts: polygons._indexCounts,
      batchedIndices: polygons._batchedIndices,
      boundingVolume: polygons._boundingVolume,
      boundingVolumes: polygons._boundingVolumes,
      center: polygons._center,
    });

    polygons._batchTable = undefined;
    polygons._batchIds = undefined;
    polygons._positions = undefined;
    polygons._counts = undefined;
    polygons._indices = undefined;
    polygons._indexCounts = undefined;
    polygons._indexOffsets = undefined;
    polygons._batchTableColors = undefined;
    polygons._packedBuffer = undefined;
    polygons._batchedPositions = undefined;
    polygons._transferrableBatchIds = undefined;
    polygons._vertexBatchIds = undefined;
    polygons._ellipsoid = undefined;
    polygons._minimumHeight = undefined;
    polygons._maximumHeight = undefined;
    polygons._polygonMinimumHeights = undefined;
    polygons._polygonMaximumHeights = undefined;
    polygons._center = undefined;
    polygons._rectangle = undefined;
    polygons._boundingVolume = undefined;
    polygons._boundingVolumes = undefined;
    polygons._batchedIndices = undefined;
    polygons._verticesPromise = undefined;

    polygons._readyPromise.resolve();
  }
}

/**
 * Creates features for each polygon and places it at the batch id index of features.
 *
 * @param {Vector3DTileContent} content The vector tile content.
 * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
 */
Vector3DTilePolygons.prototype.createFeatures = function (content, features) {
  this._primitive.createFeatures(content, features);
};

/**
 * Colors the entire tile when enabled is true. The resulting color will be (polygon batch table color * color).
 *
 * @param {Boolean} enabled Whether to enable debug coloring.
 * @param {Color} color The debug color.
 */
Vector3DTilePolygons.prototype.applyDebugSettings = function (enabled, color) {
  this._primitive.applyDebugSettings(enabled, color);
};

/**
 * Apply a style to the content.
 *
 * @param {Cesium3DTileStyle} style The style.
 * @param {Cesium3DTileFeature[]} features The array of features.
 */
Vector3DTilePolygons.prototype.applyStyle = function (style, features) {
  this._primitive.applyStyle(style, features);
};

/**
 * Call when updating the color of a polygon with batchId changes color. The polygons will need to be re-batched
 * on the next update.
 *
 * @param {Number} batchId The batch id of the polygon whose color has changed.
 * @param {Color} color The new polygon color.
 */
Vector3DTilePolygons.prototype.updateCommands = function (batchId, color) {
  this._primitive.updateCommands(batchId, color);
};

/**
 * Updates the batches and queues the commands for rendering.
 *
 * @param {FrameState} frameState The current frame state.
 */
Vector3DTilePolygons.prototype.update = function (frameState) {
  createPrimitive(this);

  if (!this._ready) {
    return;
  }

  this._primitive.debugWireframe = this.debugWireframe;
  this._primitive.forceRebatch = this.forceRebatch;
  this._primitive.classificationType = this.classificationType;
  this._primitive.update(frameState);
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
Vector3DTilePolygons.prototype.isDestroyed = function () {
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
Vector3DTilePolygons.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  return destroyObject(this);
};
export default Vector3DTilePolygons;
