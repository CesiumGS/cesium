import arraySlice from "../Core/arraySlice.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Matrix4 from "../Core/Matrix4.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import when from "../ThirdParty/when.js";
import ClassificationType from "./ClassificationType.js";
import Vector3DTileBatch from "./Vector3DTileBatch.js";
import Vector3DTilePrimitive from "./Vector3DTilePrimitive.js";

/**
 * Creates a batch of box, cylinder, ellipsoid and/or sphere geometries intersecting terrain or 3D Tiles.
 *
 * @alias Vector3DTileGeometry
 * @constructor
 *
 * @param {Object} options An object with following properties:
 * @param {Float32Array} [options.boxes] The boxes in the tile.
 * @param {Uint16Array} [options.boxBatchIds] The batch ids for each box.
 * @param {Float32Array} [options.cylinders] The cylinders in the tile.
 * @param {Uint16Array} [options.cylinderBatchIds] The batch ids for each cylinder.
 * @param {Float32Array} [options.ellipsoids] The ellipsoids in the tile.
 * @param {Uint16Array} [options.ellipsoidBatchIds] The batch ids for each ellipsoid.
 * @param {Float32Array} [options.spheres] The spheres in the tile.
 * @param {Uint16Array} [options.sphereBatchIds] The batch ids for each sphere.
 * @param {Cartesian3} options.center The RTC center of all geometries.
 * @param {Matrix4} options.modelMatrix The model matrix of all geometries. Applied after the individual geometry model matrices.
 * @param {Cesium3DTileBatchTable} options.batchTable The batch table.
 * @param {BoundingSphere} options.boundingVolume The bounding volume containing all of the geometry in the tile.
 *
 * @private
 */
function Vector3DTileGeometry(options) {
  // these will all be released after the primitive is created
  this._boxes = options.boxes;
  this._boxBatchIds = options.boxBatchIds;
  this._cylinders = options.cylinders;
  this._cylinderBatchIds = options.cylinderBatchIds;
  this._ellipsoids = options.ellipsoids;
  this._ellipsoidBatchIds = options.ellipsoidBatchIds;
  this._spheres = options.spheres;
  this._sphereBatchIds = options.sphereBatchIds;
  this._modelMatrix = options.modelMatrix;
  this._batchTable = options.batchTable;
  this._boundingVolume = options.boundingVolume;

  this._center = options.center;
  if (!defined(this._center)) {
    if (defined(this._boundingVolume)) {
      this._center = Cartesian3.clone(this._boundingVolume.center);
    } else {
      this._center = Cartesian3.clone(Cartesian3.ZERO);
    }
  }

  this._boundingVolumes = undefined;
  this._batchedIndices = undefined;

  this._indices = undefined;
  this._indexOffsets = undefined;
  this._indexCounts = undefined;

  this._positions = undefined;
  this._vertexBatchIds = undefined;

  this._batchIds = undefined;

  this._batchTableColors = undefined;
  this._packedBuffer = undefined;

  this._ready = false;
  this._readyPromise = when.defer();

  this._verticesPromise = undefined;

  this._primitive = undefined;

  /**
   * Draws the wireframe of the classification geometries.
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

Object.defineProperties(Vector3DTileGeometry.prototype, {
  /**
   * Gets the number of triangles.
   *
   * @memberof Vector3DTileGeometry.prototype
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
   * @memberof Vector3DTileGeometry.prototype
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
   * @memberof Vector3DTileGeometry.prototype
   * @type {Promise<void>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

Vector3DTileGeometry.packedBoxLength =
  Matrix4.packedLength + Cartesian3.packedLength;
Vector3DTileGeometry.packedCylinderLength = Matrix4.packedLength + 2;
Vector3DTileGeometry.packedEllipsoidLength =
  Matrix4.packedLength + Cartesian3.packedLength;
Vector3DTileGeometry.packedSphereLength = Cartesian3.packedLength + 1;

function packBuffer(geometries) {
  var packedBuffer = new Float64Array(
    Matrix4.packedLength + Cartesian3.packedLength
  );

  var offset = 0;
  Cartesian3.pack(geometries._center, packedBuffer, offset);
  offset += Cartesian3.packedLength;
  Matrix4.pack(geometries._modelMatrix, packedBuffer, offset);

  return packedBuffer;
}

function unpackBuffer(geometries, packedBuffer) {
  var offset = 0;

  var indicesBytesPerElement = packedBuffer[offset++];
  var numBVS = packedBuffer[offset++];
  var bvs = (geometries._boundingVolumes = new Array(numBVS));

  for (var i = 0; i < numBVS; ++i) {
    bvs[i] = BoundingSphere.unpack(packedBuffer, offset);
    offset += BoundingSphere.packedLength;
  }

  var numBatchedIndices = packedBuffer[offset++];
  var bis = (geometries._batchedIndices = new Array(numBatchedIndices));

  for (var j = 0; j < numBatchedIndices; ++j) {
    var color = Color.unpack(packedBuffer, offset);
    offset += Color.packedLength;

    var indexOffset = packedBuffer[offset++];
    var count = packedBuffer[offset++];

    var length = packedBuffer[offset++];
    var batchIds = new Array(length);

    for (var k = 0; k < length; ++k) {
      batchIds[k] = packedBuffer[offset++];
    }

    bis[j] = new Vector3DTileBatch({
      color: color,
      offset: indexOffset,
      count: count,
      batchIds: batchIds,
    });
  }

  return indicesBytesPerElement;
}

var createVerticesTaskProcessor = new TaskProcessor(
  "createVectorTileGeometries",
  5
);
var scratchColor = new Color();

function createPrimitive(geometries) {
  if (defined(geometries._primitive)) {
    return;
  }

  if (!defined(geometries._verticesPromise)) {
    var boxes = geometries._boxes;
    var boxBatchIds = geometries._boxBatchIds;
    var cylinders = geometries._cylinders;
    var cylinderBatchIds = geometries._cylinderBatchIds;
    var ellipsoids = geometries._ellipsoids;
    var ellipsoidBatchIds = geometries._ellipsoidBatchIds;
    var spheres = geometries._spheres;
    var sphereBatchIds = geometries._sphereBatchIds;

    var batchTableColors = geometries._batchTableColors;
    var packedBuffer = geometries._packedBuffer;

    if (!defined(batchTableColors)) {
      // Copy because they may be the views on the same buffer.
      var length = 0;
      if (defined(geometries._boxes)) {
        boxes = geometries._boxes = arraySlice(boxes);
        boxBatchIds = geometries._boxBatchIds = arraySlice(boxBatchIds);
        length += boxBatchIds.length;
      }
      if (defined(geometries._cylinders)) {
        cylinders = geometries._cylinders = arraySlice(cylinders);
        cylinderBatchIds = geometries._cylinderBatchIds = arraySlice(
          cylinderBatchIds
        );
        length += cylinderBatchIds.length;
      }
      if (defined(geometries._ellipsoids)) {
        ellipsoids = geometries._ellipsoids = arraySlice(ellipsoids);
        ellipsoidBatchIds = geometries._ellipsoidBatchIds = arraySlice(
          ellipsoidBatchIds
        );
        length += ellipsoidBatchIds.length;
      }
      if (defined(geometries._spheres)) {
        spheres = geometries._sphere = arraySlice(spheres);
        sphereBatchIds = geometries._sphereBatchIds = arraySlice(
          sphereBatchIds
        );
        length += sphereBatchIds.length;
      }

      batchTableColors = geometries._batchTableColors = new Uint32Array(length);
      var batchTable = geometries._batchTable;

      for (var i = 0; i < length; ++i) {
        var color = batchTable.getColor(i, scratchColor);
        batchTableColors[i] = color.toRgba();
      }

      packedBuffer = geometries._packedBuffer = packBuffer(geometries);
    }

    var transferrableObjects = [];
    if (defined(boxes)) {
      transferrableObjects.push(boxes.buffer, boxBatchIds.buffer);
    }
    if (defined(cylinders)) {
      transferrableObjects.push(cylinders.buffer, cylinderBatchIds.buffer);
    }
    if (defined(ellipsoids)) {
      transferrableObjects.push(ellipsoids.buffer, ellipsoidBatchIds.buffer);
    }
    if (defined(spheres)) {
      transferrableObjects.push(spheres.buffer, sphereBatchIds.buffer);
    }
    transferrableObjects.push(batchTableColors.buffer, packedBuffer.buffer);

    var parameters = {
      boxes: defined(boxes) ? boxes.buffer : undefined,
      boxBatchIds: defined(boxes) ? boxBatchIds.buffer : undefined,
      cylinders: defined(cylinders) ? cylinders.buffer : undefined,
      cylinderBatchIds: defined(cylinders)
        ? cylinderBatchIds.buffer
        : undefined,
      ellipsoids: defined(ellipsoids) ? ellipsoids.buffer : undefined,
      ellipsoidBatchIds: defined(ellipsoids)
        ? ellipsoidBatchIds.buffer
        : undefined,
      spheres: defined(spheres) ? spheres.buffer : undefined,
      sphereBatchIds: defined(spheres) ? sphereBatchIds.buffer : undefined,
      batchTableColors: batchTableColors.buffer,
      packedBuffer: packedBuffer.buffer,
    };

    var verticesPromise = (geometries._verticesPromise = createVerticesTaskProcessor.scheduleTask(
      parameters,
      transferrableObjects
    ));
    if (!defined(verticesPromise)) {
      // Postponed
      return;
    }

    verticesPromise.then(function (result) {
      var packedBuffer = new Float64Array(result.packedBuffer);
      var indicesBytesPerElement = unpackBuffer(geometries, packedBuffer);

      if (indicesBytesPerElement === 2) {
        geometries._indices = new Uint16Array(result.indices);
      } else {
        geometries._indices = new Uint32Array(result.indices);
      }

      geometries._indexOffsets = new Uint32Array(result.indexOffsets);
      geometries._indexCounts = new Uint32Array(result.indexCounts);

      geometries._positions = new Float32Array(result.positions);
      geometries._vertexBatchIds = new Uint16Array(result.vertexBatchIds);

      geometries._batchIds = new Uint16Array(result.batchIds);

      geometries._ready = true;
    });
  }

  if (geometries._ready && !defined(geometries._primitive)) {
    geometries._primitive = new Vector3DTilePrimitive({
      batchTable: geometries._batchTable,
      positions: geometries._positions,
      batchIds: geometries._batchIds,
      vertexBatchIds: geometries._vertexBatchIds,
      indices: geometries._indices,
      indexOffsets: geometries._indexOffsets,
      indexCounts: geometries._indexCounts,
      batchedIndices: geometries._batchedIndices,
      boundingVolume: geometries._boundingVolume,
      boundingVolumes: geometries._boundingVolumes,
      center: geometries._center,
      pickObject: defaultValue(geometries._pickObject, geometries),
    });

    geometries._boxes = undefined;
    geometries._boxBatchIds = undefined;
    geometries._cylinders = undefined;
    geometries._cylinderBatchIds = undefined;
    geometries._ellipsoids = undefined;
    geometries._ellipsoidBatchIds = undefined;
    geometries._spheres = undefined;
    geometries._sphereBatchIds = undefined;
    geometries._center = undefined;
    geometries._modelMatrix = undefined;
    geometries._batchTable = undefined;
    geometries._boundingVolume = undefined;

    geometries._boundingVolumes = undefined;
    geometries._batchedIndices = undefined;

    geometries._indices = undefined;
    geometries._indexOffsets = undefined;
    geometries._indexCounts = undefined;

    geometries._positions = undefined;
    geometries._vertexBatchIds = undefined;

    geometries._batchIds = undefined;

    geometries._batchTableColors = undefined;
    geometries._packedBuffer = undefined;

    geometries._verticesPromise = undefined;

    geometries._readyPromise.resolve();
  }
}

/**
 * Creates features for each geometry and places it at the batch id index of features.
 *
 * @param {Vector3DTileContent} content The vector tile content.
 * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
 */
Vector3DTileGeometry.prototype.createFeatures = function (content, features) {
  this._primitive.createFeatures(content, features);
};

/**
 * Colors the entire tile when enabled is true. The resulting color will be (geometry batch table color * color).
 *
 * @param {Boolean} enabled Whether to enable debug coloring.
 * @param {Color} color The debug color.
 */
Vector3DTileGeometry.prototype.applyDebugSettings = function (enabled, color) {
  this._primitive.applyDebugSettings(enabled, color);
};

/**
 * Apply a style to the content.
 *
 * @param {Cesium3DTileStyle} style The style.
 * @param {Cesium3DTileFeature[]} features The array of features.
 */
Vector3DTileGeometry.prototype.applyStyle = function (style, features) {
  this._primitive.applyStyle(style, features);
};

/**
 * Call when updating the color of a geometry with batchId changes color. The geometries will need to be re-batched
 * on the next update.
 *
 * @param {Number} batchId The batch id of the geometries whose color has changed.
 * @param {Color} color The new polygon color.
 */
Vector3DTileGeometry.prototype.updateCommands = function (batchId, color) {
  this._primitive.updateCommands(batchId, color);
};

/**
 * Updates the batches and queues the commands for rendering.
 *
 * @param {FrameState} frameState The current frame state.
 */
Vector3DTileGeometry.prototype.update = function (frameState) {
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
Vector3DTileGeometry.prototype.isDestroyed = function () {
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
Vector3DTileGeometry.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  return destroyObject(this);
};
export default Vector3DTileGeometry;
