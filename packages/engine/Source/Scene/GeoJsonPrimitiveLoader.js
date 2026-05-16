import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Frozen from "../Core/Frozen.js";
import PolygonPipeline from "../Core/PolygonPipeline.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import BufferPointCollection from "./BufferPointCollection.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolylineCollection from "./BufferPolylineCollection.js";

/**
 * @typedef {object} GeoJsonPrimitiveLoader.ConstructorOptions
 * @property {object} [geoJson]
 * @property {Resource|string} [url]
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default]
 * @property {Matrix4} [modelMatrix]
 * @property {boolean} [allowPicking=true]
 * @property {boolean} [show=true]
 * @property {function(number, (string|number|undefined), Object.<string, *>, string):object} [pickObjectFactory]
 */

/**
 * Lightweight GeoJSON loader that converts features directly into
 * {@link BufferPointCollection}, {@link BufferPolylineCollection}, and
 * {@link BufferPolygonCollection}.
 *
 * Unlike {@link GeoJsonDataSource}, this path does not create entities.
 * Instead, it exposes high-throughput buffer primitive collections that can be
 * added directly to {@link Scene#primitives}.
 *
 * @alias GeoJsonPrimitiveLoader
 * @constructor
 *
 * @param {GeoJsonPrimitiveLoader.ConstructorOptions} [options]
 *
 * @example
 * const loader = await Cesium.GeoJsonPrimitiveLoader.fromUrl("./data.geojson");
 * viewer.scene.primitives.add(loader);
 *
 * loader.points;     // BufferPointCollection | undefined
 * loader.polylines;  // BufferPolylineCollection | undefined
 * loader.polygons;   // BufferPolygonCollection | undefined
 * loader.ids;        // source feature IDs
 * loader.properties; // source feature properties
 */
function GeoJsonPrimitiveLoader(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.geoJson)) {
    throw new DeveloperError("options.geoJson is required.");
  }
  //>>includeEnd('debug');

  const parseResult = parseGeoJson(options.geoJson);
  const allowPicking = options.allowPicking ?? true;
  const ellipsoid = options.ellipsoid ?? Ellipsoid.default;
  const modelMatrix = options.modelMatrix;
  const scratchCartesian = new Cartesian3();
  let packedPositionsScratch = new Float64Array(0);
  function getPackedPositionScratch(requiredLength) {
    if (packedPositionsScratch.length < requiredLength) {
      packedPositionsScratch = new Float64Array(requiredLength);
    }
    return packedPositionsScratch;
  }

  this.show = options.show ?? true;
  this._url = options.url;
  this._ids = parseResult.ids;
  this._properties = parseResult.properties;
  this._featureCount = parseResult.ids.length;
  this._pickObjectFactory = options.pickObjectFactory;
  this._points = undefined;
  this._polylines = undefined;
  this._polygons = undefined;

  if (parseResult.pointCount > 0) {
    const pointOptions = {
      primitiveCountMax: parseResult.pointCount,
      allowPicking: allowPicking,
    };
    if (defined(modelMatrix)) {
      pointOptions.modelMatrix = modelMatrix;
    }
    this._points = new BufferPointCollection(pointOptions);
  }

  if (parseResult.polylineCount > 0) {
    const polylineOptions = {
      primitiveCountMax: parseResult.polylineCount,
      vertexCountMax: parseResult.polylineVertexCount,
      allowPicking: allowPicking,
    };
    if (defined(modelMatrix)) {
      polylineOptions.modelMatrix = modelMatrix;
    }
    this._polylines = new BufferPolylineCollection(polylineOptions);
  }

  if (parseResult.polygonCount > 0) {
    const polygonOptions = {
      primitiveCountMax: parseResult.polygonCount,
      vertexCountMax: parseResult.polygonVertexCount,
      holeCountMax: parseResult.polygonHoleCount,
      triangleCountMax: parseResult.polygonTriangleCount,
      allowPicking: allowPicking,
    };
    if (defined(modelMatrix)) {
      polygonOptions.modelMatrix = modelMatrix;
    }
    this._polygons = new BufferPolygonCollection(polygonOptions);
  }

  const scratch = new Cartesian3();
  const getPickObject = allowPicking
    ? (featureId, sourceId, sourceProperties, primitiveType) =>
        createPickObject(
          this,
          featureId,
          sourceId,
          sourceProperties,
          primitiveType,
        )
    : () => undefined;

  for (let i = 0; i < parseResult.features.length; i++) {
    const feature = parseResult.features[i];
    const featureId = feature.featureId;
    const sourceId = this._ids[featureId];
    const sourceProperties = this._properties[featureId];

    for (let j = 0; j < feature.points.length; j++) {
      this._points.add({
        featureId: featureId,
        position: toCartesian(feature.points[j], ellipsoid, scratch),
        pickObject: getPickObject(
          featureId,
          sourceId,
          sourceProperties,
          "point",
        ),
      });
    }

    for (let j = 0; j < feature.polylines.length; j++) {
      this._polylines.add({
        featureId: featureId,
        positions: packPositionsToScratch(
          feature.polylines[j],
          ellipsoid,
          scratchCartesian,
          getPackedPositionScratch,
        ),
        pickObject: getPickObject(
          featureId,
          sourceId,
          sourceProperties,
          "polyline",
        ),
      });
    }

    for (let j = 0; j < feature.polygons.length; j++) {
      const polygon = feature.polygons[j];
      this._polygons.add({
        featureId: featureId,
        positions: packPositionsToScratch(
          polygon.positions,
          ellipsoid,
          scratchCartesian,
          getPackedPositionScratch,
        ),
        holes: polygon.holes,
        triangles: polygon.triangles,
        pickObject: getPickObject(
          featureId,
          sourceId,
          sourceProperties,
          "polygon",
        ),
      });
    }
  }
}

Object.defineProperties(GeoJsonPrimitiveLoader.prototype, {
  /**
   * Loader source URL when created via {@link GeoJsonPrimitiveLoader.fromUrl}.
   *
   * @memberof GeoJsonPrimitiveLoader.prototype
   * @type {string|undefined}
   * @readonly
   */
  url: {
    get: function () {
      return defined(this._url) ? this._url.getUrlComponent(true) : undefined;
    },
  },

  /**
   * Feature count represented by the loaded collections.
   *
   * @memberof GeoJsonPrimitiveLoader.prototype
   * @type {number}
   * @readonly
   */
  featureCount: {
    get: function () {
      return this._featureCount;
    },
  },

  /**
   * Source feature IDs indexed by generated integer feature ID.
   *
   * @memberof GeoJsonPrimitiveLoader.prototype
   * @type {Array<string|number|undefined>}
   * @readonly
   */
  ids: {
    get: function () {
      return this._ids;
    },
  },

  /**
   * Source feature properties indexed by generated integer feature ID.
   *
   * @memberof GeoJsonPrimitiveLoader.prototype
   * @type {Array<Record<string, unknown>>}
   * @readonly
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * Buffer point collection for point geometries.
   *
   * @memberof GeoJsonPrimitiveLoader.prototype
   * @type {BufferPointCollection|undefined}
   * @readonly
   */
  points: {
    get: function () {
      return this._points;
    },
  },

  /**
   * Buffer polyline collection for linestring geometries.
   *
   * @memberof GeoJsonPrimitiveLoader.prototype
   * @type {BufferPolylineCollection|undefined}
   * @readonly
   */
  polylines: {
    get: function () {
      return this._polylines;
    },
  },

  /**
   * Buffer polygon collection for polygon geometries.
   *
   * @memberof GeoJsonPrimitiveLoader.prototype
   * @type {BufferPolygonCollection|undefined}
   * @readonly
   */
  polygons: {
    get: function () {
      return this._polygons;
    },
  },
});

/**
 * Loads GeoJSON from a URL or {@link Resource}.
 *
 * @param {Resource|string} url
 * @param {GeoJsonPrimitiveLoader.ConstructorOptions} [options]
 * @returns {Promise<GeoJsonPrimitiveLoader>}
 */
GeoJsonPrimitiveLoader.fromUrl = async function (url, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(url)) {
    throw new DeveloperError("url is required.");
  }
  //>>includeEnd('debug');

  const resource = Resource.createIfNeeded(url);
  const geoJson = await resource.fetchJson();
  if (!defined(geoJson)) {
    throw new RuntimeError(
      `Failed to load GeoJSON from ${resource.getUrlComponent(true)}.`,
    );
  }

  return GeoJsonPrimitiveLoader.fromGeoJson(geoJson, {
    ...options,
    url: resource,
  });
};

/**
 * Creates a loader directly from a parsed GeoJSON object.
 *
 * @param {object} geoJson
 * @param {GeoJsonPrimitiveLoader.ConstructorOptions} [options]
 * @returns {GeoJsonPrimitiveLoader}
 */
GeoJsonPrimitiveLoader.fromGeoJson = function (geoJson, options) {
  return new GeoJsonPrimitiveLoader({
    ...options,
    geoJson: geoJson,
  });
};

GeoJsonPrimitiveLoader.prototype.getId = function (featureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("featureId", featureId, 0);
  Check.typeOf.number.lessThan("featureId", featureId, this._featureCount);
  //>>includeEnd('debug');
  return this._ids[featureId];
};

GeoJsonPrimitiveLoader.prototype.getProperties = function (featureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("featureId", featureId, 0);
  Check.typeOf.number.lessThan("featureId", featureId, this._featureCount);
  //>>includeEnd('debug');
  return this._properties[featureId];
};

GeoJsonPrimitiveLoader.prototype.update = function (frameState) {
  if (!this.show) {
    return;
  }

  if (defined(this._points)) {
    this._points.update(frameState);
  }
  if (defined(this._polylines)) {
    this._polylines.update(frameState);
  }
  if (defined(this._polygons)) {
    this._polygons.update(frameState);
  }
};

GeoJsonPrimitiveLoader.prototype.destroy = function () {
  this._points = this._points && this._points.destroy();
  this._polylines = this._polylines && this._polylines.destroy();
  this._polygons = this._polygons && this._polygons.destroy();
  return destroyObject(this);
};

GeoJsonPrimitiveLoader.prototype.isDestroyed = function () {
  return false;
};

function createPickObject(
  loader,
  featureId,
  sourceId,
  properties,
  primitiveType,
) {
  if (defined(loader._pickObjectFactory)) {
    return loader._pickObjectFactory(
      featureId,
      sourceId,
      properties,
      primitiveType,
    );
  }

  return {
    loader: loader,
    featureId: featureId,
    id: sourceId,
    properties: properties,
    primitiveType: primitiveType,
  };
}

function parseGeoJson(geoJson) {
  const featureInputs = getInputFeatures(geoJson);

  /** @type {Array<{featureId:number, points:Array<number[]>, polylines:Array<Array<number[]>>, polygons:Array<{positions:Array<number[]>, holes:Uint32Array, triangles:Uint32Array}>}>} */
  const features = [];
  const ids = [];
  const properties = [];

  let pointCount = 0;
  let polylineCount = 0;
  let polylineVertexCount = 0;
  let polygonCount = 0;
  let polygonVertexCount = 0;
  let polygonHoleCount = 0;
  let polygonTriangleCount = 0;

  for (let i = 0; i < featureInputs.length; i++) {
    const featureInput = featureInputs[i];
    const featureGeometries = {
      points: [],
      polylines: [],
      polygons: [],
    };

    appendGeometry(featureInput.geometry, featureGeometries);

    if (
      featureGeometries.points.length === 0 &&
      featureGeometries.polylines.length === 0 &&
      featureGeometries.polygons.length === 0
    ) {
      continue;
    }

    const featureId = ids.length;
    ids.push(
      typeof featureInput.id === "string" || typeof featureInput.id === "number"
        ? featureInput.id
        : undefined,
    );
    properties.push(
      isPlainObject(featureInput.properties)
        ? featureInput.properties
        : Frozen.EMPTY_OBJECT,
    );

    for (let j = 0; j < featureGeometries.polygons.length; j++) {
      const polygon = featureGeometries.polygons[j];
      polygonHoleCount += polygon.holes.length;
      polygonTriangleCount += polygon.triangles.length / 3;
      polygonVertexCount += polygon.positions.length;
    }

    for (let j = 0; j < featureGeometries.polylines.length; j++) {
      polylineVertexCount += featureGeometries.polylines[j].length;
    }

    pointCount += featureGeometries.points.length;
    polylineCount += featureGeometries.polylines.length;
    polygonCount += featureGeometries.polygons.length;

    features.push({
      featureId: featureId,
      points: featureGeometries.points,
      polylines: featureGeometries.polylines,
      polygons: featureGeometries.polygons,
    });
  }

  return {
    features: features,
    ids: ids,
    properties: properties,
    pointCount: pointCount,
    polylineCount: polylineCount,
    polylineVertexCount: polylineVertexCount,
    polygonCount: polygonCount,
    polygonVertexCount: polygonVertexCount,
    polygonHoleCount: polygonHoleCount,
    polygonTriangleCount: polygonTriangleCount,
  };
}

function getInputFeatures(geoJson) {
  if (!defined(geoJson) || !defined(geoJson.type)) {
    throw new RuntimeError("GeoJSON object must define 'type'.");
  }

  switch (geoJson.type) {
    case "FeatureCollection":
      if (!Array.isArray(geoJson.features)) {
        throw new RuntimeError(
          "GeoJSON FeatureCollection is missing features.",
        );
      }
      return geoJson.features;
    case "Feature":
      return [geoJson];
    default:
      if (isGeometryType(geoJson.type)) {
        return [{ geometry: geoJson, properties: Frozen.EMPTY_OBJECT }];
      }
      throw new RuntimeError(`Unsupported GeoJSON type: ${geoJson.type}`);
  }
}

function appendGeometry(geometry, result) {
  if (!defined(geometry) || !defined(geometry.type)) {
    return;
  }

  switch (geometry.type) {
    case "Point":
      appendPoint(geometry.coordinates, result.points);
      return;
    case "MultiPoint":
      appendMultiPoint(geometry.coordinates, result.points);
      return;
    case "LineString":
      appendLineString(geometry.coordinates, result.polylines);
      return;
    case "MultiLineString":
      appendMultiLineString(geometry.coordinates, result.polylines);
      return;
    case "Polygon":
      appendPolygon(geometry.coordinates, result.polygons);
      return;
    case "MultiPolygon":
      appendMultiPolygon(geometry.coordinates, result.polygons);
      return;
    case "GeometryCollection":
      appendGeometryCollection(geometry.geometries, result);
      return;
    default:
      return;
  }
}

function appendGeometryCollection(geometries, result) {
  if (!Array.isArray(geometries)) {
    return;
  }

  for (let i = 0; i < geometries.length; i++) {
    appendGeometry(geometries[i], result);
  }
}

function appendPoint(coordinates, points) {
  const position = normalizePosition(coordinates);
  if (defined(position)) {
    points.push(position);
  }
}

function appendMultiPoint(coordinates, points) {
  if (!Array.isArray(coordinates)) {
    return;
  }
  for (let i = 0; i < coordinates.length; i++) {
    appendPoint(coordinates[i], points);
  }
}

function appendLineString(coordinates, polylines) {
  const polyline = normalizeLine(coordinates);
  if (defined(polyline) && polyline.length >= 2) {
    polylines.push(polyline);
  }
}

function appendMultiLineString(coordinates, polylines) {
  if (!Array.isArray(coordinates)) {
    return;
  }
  for (let i = 0; i < coordinates.length; i++) {
    appendLineString(coordinates[i], polylines);
  }
}

function appendPolygon(coordinates, polygons) {
  const polygon = normalizePolygon(coordinates);
  if (defined(polygon)) {
    polygons.push(polygon);
  }
}

function appendMultiPolygon(coordinates, polygons) {
  if (!Array.isArray(coordinates)) {
    return;
  }
  for (let i = 0; i < coordinates.length; i++) {
    appendPolygon(coordinates[i], polygons);
  }
}

function normalizeLine(coordinates) {
  if (!Array.isArray(coordinates)) {
    return undefined;
  }

  const line = [];
  for (let i = 0; i < coordinates.length; i++) {
    const position = normalizePosition(coordinates[i]);
    if (defined(position)) {
      line.push(position);
    }
  }

  return line.length >= 2 ? line : undefined;
}

function normalizePolygon(rings) {
  if (!Array.isArray(rings) || rings.length === 0) {
    return undefined;
  }

  const normalizedRings = [];
  for (let i = 0; i < rings.length; i++) {
    const ring = normalizeRing(rings[i]);
    if (defined(ring)) {
      normalizedRings.push(ring);
    }
  }

  if (normalizedRings.length === 0) {
    return undefined;
  }

  const outerRing = normalizedRings[0];
  if (outerRing.length < 3) {
    return undefined;
  }

  const positions2D = [];
  const positions = [];
  const holes = [];

  for (let i = 0; i < normalizedRings.length; i++) {
    const ring = normalizedRings[i];
    if (ring.length < 3) {
      continue;
    }

    if (i > 0) {
      holes.push(positions.length);
    }

    for (let j = 0; j < ring.length; j++) {
      const position = ring[j];
      positions.push(position);
      positions2D.push(new Cartesian2(position[0], position[1]));
    }
  }

  if (positions.length < 3) {
    return undefined;
  }

  const triangles = PolygonPipeline.triangulate(positions2D, holes);
  if (!defined(triangles) || triangles.length < 3) {
    return undefined;
  }

  return {
    positions: positions,
    holes: new Uint32Array(holes),
    triangles: new Uint32Array(triangles),
  };
}

function normalizeRing(coordinates) {
  if (!Array.isArray(coordinates)) {
    return undefined;
  }

  const ring = [];
  for (let i = 0; i < coordinates.length; i++) {
    const position = normalizePosition(coordinates[i]);
    if (defined(position)) {
      ring.push(position);
    }
  }

  if (ring.length < 3) {
    return undefined;
  }

  if (ring.length > 1 && samePosition(ring[0], ring[ring.length - 1])) {
    ring.pop();
  }

  return ring.length >= 3 ? ring : undefined;
}

function normalizePosition(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return undefined;
  }

  const longitude = coordinates[0];
  const latitude = coordinates[1];
  const height = coordinates[2] ?? 0.0;

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(height)
  ) {
    return undefined;
  }

  return [longitude, latitude, height];
}

function samePosition(left, right) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

function isGeometryType(type) {
  return (
    type === "Point" ||
    type === "MultiPoint" ||
    type === "LineString" ||
    type === "MultiLineString" ||
    type === "Polygon" ||
    type === "MultiPolygon" ||
    type === "GeometryCollection"
  );
}

function toCartesian(position, ellipsoid, result) {
  return Cartesian3.fromDegrees(
    position[0],
    position[1],
    position[2],
    ellipsoid,
    result,
  );
}

/**
 * Packs positions into a reusable scratch typed array and returns a subarray
 * view matching the required length. Callers may reuse the underlying scratch
 * buffer after collection.add(), since values are copied into collection memory.
 *
 * @param {Array<number[]>} positions
 * @param {Ellipsoid} ellipsoid
 * @param {Cartesian3} scratchCartesian
 * @param {function(number):Float64Array} getScratch
 * @returns {Float64Array}
 */
function packPositionsToScratch(
  positions,
  ellipsoid,
  scratchCartesian,
  getScratch,
) {
  const requiredLength = positions.length * 3;
  const packed = getScratch(requiredLength);

  for (let i = 0; i < positions.length; i++) {
    const cartesian = toCartesian(positions[i], ellipsoid, scratchCartesian);
    packed[i * 3] = cartesian.x;
    packed[i * 3 + 1] = cartesian.y;
    packed[i * 3 + 2] = cartesian.z;
  }

  return packed.subarray(0, requiredLength);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default GeoJsonPrimitiveLoader;
