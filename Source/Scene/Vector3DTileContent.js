import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import Rectangle from "../Core/Rectangle.js";
import RuntimeError from "../Core/RuntimeError.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import Cesium3DTileFeatureTable from "./Cesium3DTileFeatureTable.js";
import Vector3DTilePoints from "./Vector3DTilePoints.js";
import Vector3DTilePolygons from "./Vector3DTilePolygons.js";
import Vector3DTilePolylines from "./Vector3DTilePolylines.js";
import Vector3DTileClampedPolylines from "./Vector3DTileClampedPolylines.js";
import decodeVectorPolylinePositions from "../Core/decodeVectorPolylinePositions.js";

/**
 * Represents the contents of a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/vctr/TileFormats/VectorData|Vector}
 * tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Vector3DTileContent
 * @constructor
 *
 * @private
 */
function Vector3DTileContent(tileset, tile, resource, arrayBuffer, byteOffset) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  this._polygons = undefined;
  this._polylines = undefined;
  this._points = undefined;

  this._metadata = undefined;

  this._batchTable = undefined;
  this._features = undefined;

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  this.featurePropertiesDirty = false;
  this._group = undefined;

  initialize(this, arrayBuffer, byteOffset);
}

Object.defineProperties(Vector3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      return defined(this._batchTable) ? this._batchTable.featuresLength : 0;
    },
  },

  pointsLength: {
    get: function () {
      if (defined(this._points)) {
        return this._points.pointsLength;
      }
      return 0;
    },
  },

  trianglesLength: {
    get: function () {
      let trianglesLength = 0;
      if (defined(this._polygons)) {
        trianglesLength += this._polygons.trianglesLength;
      }
      if (defined(this._polylines)) {
        trianglesLength += this._polylines.trianglesLength;
      }
      return trianglesLength;
    },
  },

  geometryByteLength: {
    get: function () {
      let geometryByteLength = 0;
      if (defined(this._polygons)) {
        geometryByteLength += this._polygons.geometryByteLength;
      }
      if (defined(this._polylines)) {
        geometryByteLength += this._polylines.geometryByteLength;
      }
      return geometryByteLength;
    },
  },

  texturesByteLength: {
    get: function () {
      if (defined(this._points)) {
        return this._points.texturesByteLength;
      }
      return 0;
    },
  },

  batchTableByteLength: {
    get: function () {
      return defined(this._batchTable)
        ? this._batchTable.batchTableByteLength
        : 0;
    },
  },

  innerContents: {
    get: function () {
      return undefined;
    },
  },

  readyPromise: {
    get: function () {
      const pointsPromise = defined(this._points)
        ? this._points.readyPromise
        : undefined;
      const polygonPromise = defined(this._polygons)
        ? this._polygons.readyPromise
        : undefined;
      const polylinePromise = defined(this._polylines)
        ? this._polylines.readyPromise
        : undefined;

      const that = this;
      return Promise.all([pointsPromise, polygonPromise, polylinePromise]).then(
        function () {
          return that;
        }
      );
    },
  },

  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  tile: {
    get: function () {
      return this._tile;
    },
  },

  url: {
    get: function () {
      return this._resource.getUrlComponent(true);
    },
  },

  metadata: {
    get: function () {
      return this._metadata;
    },
    set: function (value) {
      this._metadata = value;
    },
  },

  batchTable: {
    get: function () {
      return this._batchTable;
    },
  },

  group: {
    get: function () {
      return this._group;
    },
    set: function (value) {
      this._group = value;
    },
  },
});

function createColorChangedCallback(content) {
  return function (batchId, color) {
    if (defined(content._polygons)) {
      content._polygons.updateCommands(batchId, color);
    }
  };
}

function getBatchIds(featureTableJson, featureTableBinary) {
  let polygonBatchIds;
  let polylineBatchIds;
  let pointBatchIds;
  let i;

  const numberOfPolygons = defaultValue(featureTableJson.POLYGONS_LENGTH, 0);
  const numberOfPolylines = defaultValue(featureTableJson.POLYLINES_LENGTH, 0);
  const numberOfPoints = defaultValue(featureTableJson.POINTS_LENGTH, 0);

  if (numberOfPolygons > 0 && defined(featureTableJson.POLYGON_BATCH_IDS)) {
    const polygonBatchIdsByteOffset =
      featureTableBinary.byteOffset +
      featureTableJson.POLYGON_BATCH_IDS.byteOffset;
    polygonBatchIds = new Uint16Array(
      featureTableBinary.buffer,
      polygonBatchIdsByteOffset,
      numberOfPolygons
    );
  }

  if (numberOfPolylines > 0 && defined(featureTableJson.POLYLINE_BATCH_IDS)) {
    const polylineBatchIdsByteOffset =
      featureTableBinary.byteOffset +
      featureTableJson.POLYLINE_BATCH_IDS.byteOffset;
    polylineBatchIds = new Uint16Array(
      featureTableBinary.buffer,
      polylineBatchIdsByteOffset,
      numberOfPolylines
    );
  }

  if (numberOfPoints > 0 && defined(featureTableJson.POINT_BATCH_IDS)) {
    const pointBatchIdsByteOffset =
      featureTableBinary.byteOffset +
      featureTableJson.POINT_BATCH_IDS.byteOffset;
    pointBatchIds = new Uint16Array(
      featureTableBinary.buffer,
      pointBatchIdsByteOffset,
      numberOfPoints
    );
  }

  const atLeastOneDefined =
    defined(polygonBatchIds) ||
    defined(polylineBatchIds) ||
    defined(pointBatchIds);
  const atLeastOneUndefined =
    (numberOfPolygons > 0 && !defined(polygonBatchIds)) ||
    (numberOfPolylines > 0 && !defined(polylineBatchIds)) ||
    (numberOfPoints > 0 && !defined(pointBatchIds));

  if (atLeastOneDefined && atLeastOneUndefined) {
    throw new RuntimeError(
      "If one group of batch ids is defined, then all batch ids must be defined."
    );
  }

  const allUndefinedBatchIds =
    !defined(polygonBatchIds) &&
    !defined(polylineBatchIds) &&
    !defined(pointBatchIds);
  if (allUndefinedBatchIds) {
    let id = 0;
    if (!defined(polygonBatchIds) && numberOfPolygons > 0) {
      polygonBatchIds = new Uint16Array(numberOfPolygons);
      for (i = 0; i < numberOfPolygons; ++i) {
        polygonBatchIds[i] = id++;
      }
    }
    if (!defined(polylineBatchIds) && numberOfPolylines > 0) {
      polylineBatchIds = new Uint16Array(numberOfPolylines);
      for (i = 0; i < numberOfPolylines; ++i) {
        polylineBatchIds[i] = id++;
      }
    }
    if (!defined(pointBatchIds) && numberOfPoints > 0) {
      pointBatchIds = new Uint16Array(numberOfPoints);
      for (i = 0; i < numberOfPoints; ++i) {
        pointBatchIds[i] = id++;
      }
    }
  }

  return {
    polygons: polygonBatchIds,
    polylines: polylineBatchIds,
    points: pointBatchIds,
  };
}

const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

function createFloatingPolylines(options) {
  return new Vector3DTilePolylines(options);
}

function createClampedPolylines(options) {
  return new Vector3DTileClampedPolylines(options);
}

function initialize(content, arrayBuffer, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);

  const uint8Array = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic number

  const version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      `Only Vector tile version 1 is supported.  Version ${version} is not.`
    );
  }
  byteOffset += sizeOfUint32;

  const byteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  if (byteLength === 0) {
    return Promise.resolve(content);
  }

  const featureTableJSONByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  if (featureTableJSONByteLength === 0) {
    throw new RuntimeError(
      "Feature table must have a byte length greater than zero"
    );
  }

  const featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  const batchTableJSONByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  const batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  const indicesByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  const positionByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  const polylinePositionByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  const pointsPositionByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  const featureTableJson = getJsonFromTypedArray(
    uint8Array,
    byteOffset,
    featureTableJSONByteLength
  );
  byteOffset += featureTableJSONByteLength;

  const featureTableBinary = new Uint8Array(
    arrayBuffer,
    byteOffset,
    featureTableBinaryByteLength
  );
  byteOffset += featureTableBinaryByteLength;

  let batchTableJson;
  let batchTableBinary;
  if (batchTableJSONByteLength > 0) {
    // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
    // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
    //
    // We could also make another request for it, but that would make the property set/get
    // API async, and would double the number of numbers in some cases.
    batchTableJson = getJsonFromTypedArray(
      uint8Array,
      byteOffset,
      batchTableJSONByteLength
    );
    byteOffset += batchTableJSONByteLength;

    if (batchTableBinaryByteLength > 0) {
      // Has a batch table binary
      batchTableBinary = new Uint8Array(
        arrayBuffer,
        byteOffset,
        batchTableBinaryByteLength
      );
      // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
      batchTableBinary = new Uint8Array(batchTableBinary);
      byteOffset += batchTableBinaryByteLength;
    }
  }

  const numberOfPolygons = defaultValue(featureTableJson.POLYGONS_LENGTH, 0);
  const numberOfPolylines = defaultValue(featureTableJson.POLYLINES_LENGTH, 0);
  const numberOfPoints = defaultValue(featureTableJson.POINTS_LENGTH, 0);
  const totalPrimitives = numberOfPolygons + numberOfPolylines + numberOfPoints;

  const batchTable = new Cesium3DTileBatchTable(
    content,
    totalPrimitives,
    batchTableJson,
    batchTableBinary,
    createColorChangedCallback(content)
  );
  content._batchTable = batchTable;

  if (totalPrimitives === 0) {
    return;
  }

  const featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );
  const region = featureTable.getGlobalProperty("REGION");
  if (!defined(region)) {
    throw new RuntimeError(
      "Feature table global property: REGION must be defined"
    );
  }
  const rectangle = Rectangle.unpack(region);
  const minHeight = region[4];
  const maxHeight = region[5];

  const modelMatrix = content._tile.computedTransform;

  let center = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(center)) {
    center = Cartesian3.unpack(center);
    Matrix4.multiplyByPoint(modelMatrix, center, center);
  } else {
    center = Rectangle.center(rectangle);
    center.height = CesiumMath.lerp(minHeight, maxHeight, 0.5);
    center = Ellipsoid.WGS84.cartographicToCartesian(center);
  }

  const batchIds = getBatchIds(featureTableJson, featureTableBinary);
  byteOffset += (4 - (byteOffset % 4)) % 4;

  if (numberOfPolygons > 0) {
    featureTable.featuresLength = numberOfPolygons;

    const polygonCounts = defaultValue(
      featureTable.getPropertyArray(
        "POLYGON_COUNTS",
        ComponentDatatype.UNSIGNED_INT,
        1
      ),
      featureTable.getPropertyArray(
        "POLYGON_COUNT",
        ComponentDatatype.UNSIGNED_INT,
        1
      ) // Workaround for old vector tilesets using the non-plural name
    );

    if (!defined(polygonCounts)) {
      throw new RuntimeError(
        "Feature table property: POLYGON_COUNTS must be defined when POLYGONS_LENGTH is greater than 0"
      );
    }

    const polygonIndexCounts = defaultValue(
      featureTable.getPropertyArray(
        "POLYGON_INDEX_COUNTS",
        ComponentDatatype.UNSIGNED_INT,
        1
      ),
      featureTable.getPropertyArray(
        "POLYGON_INDEX_COUNT",
        ComponentDatatype.UNSIGNED_INT,
        1
      ) // Workaround for old vector tilesets using the non-plural name
    );

    if (!defined(polygonIndexCounts)) {
      throw new RuntimeError(
        "Feature table property: POLYGON_INDEX_COUNTS must be defined when POLYGONS_LENGTH is greater than 0"
      );
    }

    // Use the counts array to determine how many position values we want. If we used the byte length then
    // zero padding values would be included and cause the delta zig-zag decoding to fail
    const numPolygonPositions = polygonCounts.reduce(function (total, count) {
      return total + count * 2;
    }, 0);

    const numPolygonIndices = polygonIndexCounts.reduce(function (
      total,
      count
    ) {
      return total + count;
    },
    0);

    const indices = new Uint32Array(arrayBuffer, byteOffset, numPolygonIndices);
    byteOffset += indicesByteLength;

    const polygonPositions = new Uint16Array(
      arrayBuffer,
      byteOffset,
      numPolygonPositions
    );
    byteOffset += positionByteLength;

    let polygonMinimumHeights;
    let polygonMaximumHeights;
    if (
      defined(featureTableJson.POLYGON_MINIMUM_HEIGHTS) &&
      defined(featureTableJson.POLYGON_MAXIMUM_HEIGHTS)
    ) {
      polygonMinimumHeights = featureTable.getPropertyArray(
        "POLYGON_MINIMUM_HEIGHTS",
        ComponentDatatype.FLOAT,
        1
      );
      polygonMaximumHeights = featureTable.getPropertyArray(
        "POLYGON_MAXIMUM_HEIGHTS",
        ComponentDatatype.FLOAT,
        1
      );
    }

    content._polygons = new Vector3DTilePolygons({
      positions: polygonPositions,
      counts: polygonCounts,
      indexCounts: polygonIndexCounts,
      indices: indices,
      minimumHeight: minHeight,
      maximumHeight: maxHeight,
      polygonMinimumHeights: polygonMinimumHeights,
      polygonMaximumHeights: polygonMaximumHeights,
      center: center,
      rectangle: rectangle,
      boundingVolume: content.tile.boundingVolume.boundingVolume,
      batchTable: batchTable,
      batchIds: batchIds.polygons,
      modelMatrix: modelMatrix,
    });
  }

  if (numberOfPolylines > 0) {
    featureTable.featuresLength = numberOfPolylines;

    const polylineCounts = defaultValue(
      featureTable.getPropertyArray(
        "POLYLINE_COUNTS",
        ComponentDatatype.UNSIGNED_INT,
        1
      ),
      featureTable.getPropertyArray(
        "POLYLINE_COUNT",
        ComponentDatatype.UNSIGNED_INT,
        1
      ) // Workaround for old vector tilesets using the non-plural name
    );

    if (!defined(polylineCounts)) {
      throw new RuntimeError(
        "Feature table property: POLYLINE_COUNTS must be defined when POLYLINES_LENGTH is greater than 0"
      );
    }

    let widths = featureTable.getPropertyArray(
      "POLYLINE_WIDTHS",
      ComponentDatatype.UNSIGNED_SHORT,
      1
    );
    if (!defined(widths)) {
      widths = new Uint16Array(numberOfPolylines);
      for (let i = 0; i < numberOfPolylines; ++i) {
        widths[i] = 2.0;
      }
    }

    // Use the counts array to determine how many position values we want. If we used the byte length then
    // zero padding values would be included and cause the delta zig-zag decoding to fail
    const numPolylinePositions = polylineCounts.reduce(function (total, count) {
      return total + count * 3;
    }, 0);
    const polylinePositions = new Uint16Array(
      arrayBuffer,
      byteOffset,
      numPolylinePositions
    );
    byteOffset += polylinePositionByteLength;

    const tileset = content._tileset;
    const examineVectorLinesFunction = tileset.examineVectorLinesFunction;
    if (defined(examineVectorLinesFunction)) {
      const decodedPositions = decodeVectorPolylinePositions(
        new Uint16Array(polylinePositions),
        rectangle,
        minHeight,
        maxHeight,
        Ellipsoid.WGS84
      );
      examineVectorLines(
        decodedPositions,
        polylineCounts,
        batchIds.polylines,
        batchTable,
        content.url,
        examineVectorLinesFunction
      );
    }

    let createPolylines = createFloatingPolylines;
    if (defined(tileset.classificationType)) {
      createPolylines = createClampedPolylines;
    }

    content._polylines = createPolylines({
      positions: polylinePositions,
      widths: widths,
      counts: polylineCounts,
      batchIds: batchIds.polylines,
      minimumHeight: minHeight,
      maximumHeight: maxHeight,
      center: center,
      rectangle: rectangle,
      boundingVolume: content.tile.boundingVolume.boundingVolume,
      batchTable: batchTable,
      classificationType: tileset.classificationType,
      keepDecodedPositions: tileset.vectorKeepDecodedPositions,
    });
  }

  if (numberOfPoints > 0) {
    const pointPositions = new Uint16Array(
      arrayBuffer,
      byteOffset,
      numberOfPoints * 3
    );
    byteOffset += pointsPositionByteLength;
    content._points = new Vector3DTilePoints({
      positions: pointPositions,
      batchIds: batchIds.points,
      minimumHeight: minHeight,
      maximumHeight: maxHeight,
      rectangle: rectangle,
      batchTable: batchTable,
    });
  }

  return Promise.resolve(content);
}

function createFeatures(content) {
  const featuresLength = content.featuresLength;
  if (!defined(content._features) && featuresLength > 0) {
    const features = new Array(featuresLength);

    if (defined(content._polygons)) {
      content._polygons.createFeatures(content, features);
    }
    if (defined(content._polylines)) {
      content._polylines.createFeatures(content, features);
    }
    if (defined(content._points)) {
      content._points.createFeatures(content, features);
    }
    content._features = features;
  }
}

Vector3DTileContent.prototype.hasProperty = function (batchId, name) {
  return this._batchTable.hasProperty(batchId, name);
};

Vector3DTileContent.prototype.getFeature = function (batchId) {
  //>>includeStart('debug', pragmas.debug);
  const featuresLength = this.featuresLength;
  if (!defined(batchId) || batchId < 0 || batchId >= featuresLength) {
    throw new DeveloperError(
      `batchId is required and between zero and featuresLength - 1 (${
        featuresLength - 1
      }).`
    );
  }
  //>>includeEnd('debug');

  createFeatures(this);
  return this._features[batchId];
};

Vector3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  if (defined(this._polygons)) {
    this._polygons.applyDebugSettings(enabled, color);
  }
  if (defined(this._polylines)) {
    this._polylines.applyDebugSettings(enabled, color);
  }
  if (defined(this._points)) {
    this._points.applyDebugSettings(enabled, color);
  }
};

Vector3DTileContent.prototype.applyStyle = function (style) {
  createFeatures(this);
  if (defined(this._polygons)) {
    this._polygons.applyStyle(style, this._features);
  }
  if (defined(this._polylines)) {
    this._polylines.applyStyle(style, this._features);
  }
  if (defined(this._points)) {
    this._points.applyStyle(style, this._features);
  }
};

Vector3DTileContent.prototype.update = function (tileset, frameState) {
  let ready = true;
  if (defined(this._polygons)) {
    this._polygons.classificationType = this._tileset.classificationType;
    this._polygons.debugWireframe = this._tileset.debugWireframe;
    this._polygons.update(frameState);
    ready = ready && this._polygons._ready;
  }
  if (defined(this._polylines)) {
    this._polylines.update(frameState);
    ready = ready && this._polylines._ready;
  }
  if (defined(this._points)) {
    this._points.update(frameState);
    ready = ready && this._points._ready;
  }
  if (defined(this._batchTable) && ready) {
    this._batchTable.update(tileset, frameState);
  }
};

Vector3DTileContent.prototype.getPolylinePositions = function (batchId) {
  const polylines = this._polylines;
  if (!defined(polylines)) {
    return undefined;
  }

  return polylines.getPositions(batchId);
};

Vector3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Vector3DTileContent.prototype.destroy = function () {
  this._polygons = this._polygons && this._polygons.destroy();
  this._polylines = this._polylines && this._polylines.destroy();
  this._points = this._points && this._points.destroy();
  this._batchTable = this._batchTable && this._batchTable.destroy();
  return destroyObject(this);
};

function examineVectorLines(
  positions,
  counts,
  batchIds,
  batchTable,
  url,
  callback
) {
  const countsLength = counts.length;
  let polylineStart = 0;
  for (let i = 0; i < countsLength; i++) {
    const count = counts[i] * 3;
    const linePositions = positions.slice(polylineStart, polylineStart + count);
    polylineStart += count;

    callback(linePositions, batchIds[i], url, batchTable);
  }
}

export default Vector3DTileContent;
