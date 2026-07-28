// @ts-check

/** @import {GeoJson, GeoJsonFeature, GeoJsonGeometry, GeoJsonPosition} from "../Core/globalTypes.js"; */
/** @import FrameState from "./FrameState.js"; */

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
import BufferPoint from "./BufferPoint.js";
import BufferPointCollection from "./BufferPointCollection.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineCollection from "./BufferPolylineCollection.js";

/**
 * @typedef {object} GeoJsonPrimitiveConstructorOptions
 * @property {object} [geoJson]
 * @property {Resource|string} [url]
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default]
 * @property {boolean} [allowPicking=true]
 * @property {boolean} [show=true]
 * @property {function(number, object, Record<string, unknown>):object} [pickObjectFactory]
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
 * @example
 * const loader = await Cesium.GeoJsonPrimitive.fromUrl("./data.geojson");
 * viewer.scene.primitives.add(loader);
 *
 * loader.points;     // BufferPointCollection | undefined
 * loader.polylines;  // BufferPolylineCollection | undefined
 * loader.polygons;   // BufferPolygonCollection | undefined
 * loader.ids;        // source feature IDs
 * loader.properties; // source feature properties
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class GeoJsonPrimitive {
  /**
   * @param {GeoJsonPrimitiveConstructorOptions} [options]
   */
  constructor(options) {
    options = options ?? Frozen.EMPTY_OBJECT;

    //>>includeStart('debug', pragmas.debug);
    if (!defined(options.geoJson)) {
      throw new DeveloperError("options.geoJson is required.");
    }
    //>>includeEnd('debug');

    const parseResult = parseGeoJson(/** @type {GeoJson} */ (options.geoJson));
    const allowPicking = options.allowPicking ?? true;
    const ellipsoid = options.ellipsoid ?? Ellipsoid.default;
    let packedPositionsScratch = new Float64Array(0);
    /** @param {number} requiredLength */
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
      /** @type {Record<string, unknown>} */
      const pointOptions = {
        primitiveCountMax: parseResult.pointCount,
        allowPicking: allowPicking,
      };
      this._points = new BufferPointCollection(pointOptions);
    }

    if (parseResult.polylineCount > 0) {
      /** @type {Record<string, unknown>} */
      const polylineOptions = {
        primitiveCountMax: parseResult.polylineCount,
        vertexCountMax: parseResult.polylineVertexCount,
        allowPicking: allowPicking,
      };
      this._polylines = new BufferPolylineCollection(polylineOptions);
    }

    if (parseResult.polygonCount > 0) {
      /** @type {Record<string, unknown>} */
      const polygonOptions = {
        primitiveCountMax: parseResult.polygonCount,
        vertexCountMax: parseResult.polygonVertexCount,
        holeCountMax: parseResult.polygonHoleCount,
        triangleCountMax: parseResult.polygonTriangleCount,
        allowPicking: allowPicking,
      };
      this._polygons = new BufferPolygonCollection(polygonOptions);
    }

    const scratch = new Cartesian3();
    let pointIndex = 0;
    let polylineIndex = 0;
    let polygonIndex = 0;

    for (let i = 0; i < parseResult.features.length; i++) {
      const feature = parseResult.features[i];
      const featureId = feature.featureId;
      const sourceProperties = this._properties[featureId];

      for (let j = 0; j < feature.points.length; j++) {
        const idx = pointIndex++;
        this._points.add({
          featureId: featureId,
          position: toCartesian(feature.points[j], ellipsoid, scratch),
          pickObject: allowPicking
            ? createPickObject(
                this,
                idx,
                this._points,
                BufferPoint,
                sourceProperties,
              )
            : undefined,
        });
      }

      for (let j = 0; j < feature.polylines.length; j++) {
        const idx = polylineIndex++;
        this._polylines.add({
          featureId: featureId,
          positions: packPositionsToScratch(
            feature.polylines[j],
            ellipsoid,
            getPackedPositionScratch,
          ),
          pickObject: allowPicking
            ? createPickObject(
                this,
                idx,
                this._polylines,
                BufferPolyline,
                sourceProperties,
              )
            : undefined,
        });
      }

      for (let j = 0; j < feature.polygons.length; j++) {
        const polygon = feature.polygons[j];
        const idx = polygonIndex++;
        this._polygons.add({
          featureId: featureId,
          positions: packPositionsToScratch(
            polygon.positions,
            ellipsoid,
            getPackedPositionScratch,
          ),
          holes: polygon.holes,
          triangles: polygon.triangles,
          pickObject: allowPicking
            ? createPickObject(
                this,
                idx,
                this._polygons,
                BufferPolygon,
                sourceProperties,
              )
            : undefined,
        });
      }
    }
  }

  /**
   * Loader source URL when created via {@link GeoJsonPrimitive.fromUrl}.
   *
   * @type {string|undefined}
   * @readonly
   */
  get url() {
    const url = this._url;
    if (!defined(url)) {
      return undefined;
    }
    return url instanceof Resource ? url.getUrlComponent(true) : url;
  }

  /**
   * Feature count represented by the loaded collections.
   *
   * @type {number}
   * @readonly
   */
  get featureCount() {
    return this._featureCount;
  }

  /**
   * Lookup table from integer ID generated by GeoJsonPrimitive, to integer or string Feature ID from GeoJSON source.
   *
   * @type {Array<string|number|undefined>}
   * @readonly
   */
  get ids() {
    return this._ids;
  }

  /**
   * Source GeoJSON properties, indexed by generated integer ID.
   *
   * @type {Array<Record<string, unknown>>}
   * @readonly
   */
  get properties() {
    return this._properties;
  }

  /**
   * Buffer point collection for point geometries.
   *
   * @type {BufferPointCollection|undefined}
   * @readonly
   */
  get points() {
    return this._points;
  }

  /**
   * Buffer polyline collection for linestring geometries.
   *
   * @type {BufferPolylineCollection|undefined}
   * @readonly
   */
  get polylines() {
    return this._polylines;
  }

  /**
   * Buffer polygon collection for polygon geometries.
   *
   * @type {BufferPolygonCollection|undefined}
   * @readonly
   */
  get polygons() {
    return this._polygons;
  }

  /**
   * Loads GeoJSON from a URL or {@link Resource}.
   *
   * @param {Resource|string} url
   * @param {GeoJsonPrimitiveConstructorOptions} [options]
   * @returns {Promise<GeoJsonPrimitive>}
   */
  static async fromUrl(url, options) {
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

    return GeoJsonPrimitive.fromGeoJson(geoJson, {
      ...options,
      url: resource,
    });
  }

  /**
   * Creates a loader directly from a parsed GeoJSON object.
   *
   * @param {object} geoJson
   * @param {GeoJsonPrimitiveConstructorOptions} [options]
   * @returns {GeoJsonPrimitive}
   */
  static fromGeoJson(geoJson, options) {
    return new GeoJsonPrimitive({
      ...options,
      geoJson: geoJson,
    });
  }

  /**
   * @param {number} featureId
   */
  getId(featureId) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("featureId", featureId, 0);
    Check.typeOf.number.lessThan("featureId", featureId, this._featureCount);
    //>>includeEnd('debug');
    return this._ids[featureId];
  }

  /**
   * @param {number} featureId
   */
  getProperties(featureId) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("featureId", featureId, 0);
    Check.typeOf.number.lessThan("featureId", featureId, this._featureCount);
    //>>includeEnd('debug');
    return this._properties[featureId];
  }

  /**
   * @param {FrameState} frameState
   * @private
   */
  update(frameState) {
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
  }

  destroy() {
    if (this._points) {
      this._points.destroy();
      this._points = undefined;
    }
    if (this._polylines) {
      this._polylines.destroy();
      this._polylines = undefined;
    }
    if (this._polygons) {
      this._polygons.destroy();
      this._polygons = undefined;
    }
    return destroyObject(this);
  }

  isDestroyed() {
    return false;
  }
}

/**
 * @param {GeoJsonPrimitive} loader
 * @param {number} index
 * @param {{get: function(number, object): object}} collection
 * @param {function(new: object)} PrimitiveClass
 * @param {Record<string, unknown>} properties
 * @returns {object}
 * @ignore
 */
function createPickObject(
  loader,
  index,
  collection,
  PrimitiveClass,
  properties,
) {
  if (defined(loader._pickObjectFactory)) {
    return loader._pickObjectFactory(index, collection, properties);
  }
  return {
    index,
    collection,
    get primitive() {
      // Cannot reuse primitives; scene.drillPick() appends to a list.
      return collection.get(index, new PrimitiveClass());
    },
    parentPrimitive: loader,
    properties,
  };
}

/**
 * @param {GeoJson} geoJson
 * @ignore
 */
function parseGeoJson(geoJson) {
  const featureInputs = getInputFeatures(geoJson);

  /** @type {Array<{featureId:number, points:Array<GeoJsonPosition>, polylines:Array<Array<GeoJsonPosition>>, polygons:Array<{positions:Array<GeoJsonPosition>, holes:Uint32Array, triangles:Uint32Array}>}>} */
  const features = [];
  /** @type {Array<string|number|undefined>} */
  const ids = [];
  /** @type {Array<Record<string, unknown>>} */
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
    /** @type {{points: Array<GeoJsonPosition>, polylines: Array<Array<GeoJsonPosition>>, polygons: Array<{positions: Array<GeoJsonPosition>, holes: Uint32Array, triangles: Uint32Array}>}} */
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
    ids.push(featureInput.id);
    properties.push(
      // @ts-expect-error Casting changes .d.ts output, a suspected bug in tsd-jsdoc.
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

/**
 * @param {GeoJson} geoJson
 * @returns {Array<GeoJsonFeature>}
 * @ignore
 */
function getInputFeatures(geoJson) {
  if (!defined(geoJson) || !defined(geoJson.type)) {
    throw new RuntimeError("GeoJSON object must define 'type'.");
  }

  switch (geoJson.type) {
    case "FeatureCollection": {
      const fc = /** @type {{ features: GeoJsonFeature[] }} */ (geoJson);
      return fc.features;
    }
    case "Feature":
      return [/** @type {GeoJsonFeature} */ (geoJson)];
    default:
      if (isGeometryType(geoJson.type)) {
        return [
          {
            type: "Feature",
            geometry: /** @type {GeoJsonGeometry} */ (geoJson),
            properties: Frozen.EMPTY_OBJECT,
            id: undefined,
          },
        ];
      }
      throw new RuntimeError(`Unsupported GeoJSON type: ${geoJson.type}`);
  }
}

/**
 * @param {GeoJsonGeometry | null | undefined} geometry
 * @param {{points: Array<GeoJsonPosition>, polylines: Array<GeoJsonPosition[]>, polygons: Array<object>}} result
 * @ignore
 */
function appendGeometry(geometry, result) {
  if (!defined(geometry) || !defined(geometry.type)) {
    return;
  }

  switch (geometry.type) {
    case "Point":
      appendPoint(geometry.coordinates, result.points);
      return;
    case "MultiPoint":
      appendMultiPoint(
        /** @type {unknown[]} */ (geometry.coordinates),
        result.points,
      );
      return;
    case "LineString":
      appendLineString(geometry.coordinates, result.polylines);
      return;
    case "MultiLineString":
      appendMultiLineString(
        /** @type {unknown[]} */ (geometry.coordinates),
        result.polylines,
      );
      return;
    case "Polygon":
      appendPolygon(geometry.coordinates, result.polygons);
      return;
    case "MultiPolygon":
      appendMultiPolygon(
        /** @type {unknown[]} */ (geometry.coordinates),
        result.polygons,
      );
      return;
    case "GeometryCollection":
      appendGeometryCollection(geometry.geometries, result);
      return;
    default:
      return;
  }
}

/**
 * @param {Array<GeoJsonGeometry>} geometries
 * @param {{points: Array<GeoJsonPosition>, polylines: Array<Array<GeoJsonPosition>>, polygons: Array<object>}} result
 * @ignore
 */
function appendGeometryCollection(geometries, result) {
  if (!Array.isArray(geometries)) {
    return;
  }

  for (let i = 0; i < geometries.length; i++) {
    appendGeometry(geometries[i], result);
  }
}

/**
 * @param {unknown} coordinates
 * @param {Array<GeoJsonPosition>} points
 * @ignore
 */
function appendPoint(coordinates, points) {
  const position = normalizePosition(coordinates);
  if (defined(position)) {
    points.push(position);
  }
}

/**
 * @param {Array.<unknown>} coordinates
 * @param {Array<GeoJsonPosition>} points
 * @ignore
 */
function appendMultiPoint(coordinates, points) {
  for (let i = 0; i < coordinates.length; i++) {
    appendPoint(coordinates[i], points);
  }
}

/**
 * @param {unknown} coordinates
 * @param {Array<Array<GeoJsonPosition>>} polylines
 * @ignore
 */
function appendLineString(coordinates, polylines) {
  const polyline = normalizeLine(coordinates);
  if (defined(polyline) && polyline.length >= 2) {
    polylines.push(polyline);
  }
}

/**
 * @param {Array.<unknown>} coordinates
 * @param {Array<Array<GeoJsonPosition>>} polylines
 * @ignore
 */
function appendMultiLineString(coordinates, polylines) {
  for (let i = 0; i < coordinates.length; i++) {
    appendLineString(coordinates[i], polylines);
  }
}

/**
 * @param {unknown} coordinates
 * @param {Array<object>} polygons
 * @ignore
 */
function appendPolygon(coordinates, polygons) {
  const polygon = normalizePolygon(coordinates);
  if (defined(polygon)) {
    polygons.push(polygon);
  }
}

/**
 * @param {Array.<unknown>} coordinates
 * @param {Array<object>} polygons
 * @ignore
 */
function appendMultiPolygon(coordinates, polygons) {
  for (let i = 0; i < coordinates.length; i++) {
    appendPolygon(coordinates[i], polygons);
  }
}

/**
 * @param {unknown} coordinates
 * @returns {Array<GeoJsonPosition> | undefined}
 * @ignore
 */
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

/**
 * @param {unknown} rings
 * @returns {{positions: Array<GeoJsonPosition>, holes: Uint32Array, triangles: Uint32Array} | undefined}
 * @ignore
 */
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

/**
 * @param {unknown} coordinates
 * @returns {Array<GeoJsonPosition> | undefined}
 * @ignore
 */
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
    // GeoJSON rings require the first and last position to be identical.
    // BufferPolygonCollection uses LINE_LOOP topology and prohibits duplicate
    // start/end vertices, so we remove the closing duplicate here.
    ring.pop();
  }

  return ring.length >= 3 ? ring : undefined;
}

/**
 * @param {unknown} coordinates
 * @returns {GeoJsonPosition | undefined}
 * @ignore
 */
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

/**
 * @param {GeoJsonPosition} left
 * @param {GeoJsonPosition} right
 * @ignore
 */
function samePosition(left, right) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

/**
 * @param {string} type
 * @returns {boolean}
 * @ignore
 */
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

/**
 * @param {GeoJsonPosition} position
 * @param {Ellipsoid} ellipsoid
 * @param {Cartesian3} result
 * @returns {Cartesian3}
 * @ignore
 */
function toCartesian(position, ellipsoid, result) {
  return Cartesian3.fromDegrees(
    position[0],
    position[1],
    position[2] ?? 0,
    ellipsoid,
    result,
  );
}

const scratchCartesian = new Cartesian3();

/**
 * Packs positions into a reusable scratch typed array and returns a subarray
 * view matching the required length. Callers may reuse the underlying scratch
 * buffer after collection.add(), since values are copied into collection memory.
 *
 * @param {Array<GeoJsonPosition>} positions
 * @param {Ellipsoid} ellipsoid
 * @param {function(number):Float64Array} getScratch
 * @returns {Float64Array}
 * @ignore
 */
function packPositionsToScratch(positions, ellipsoid, getScratch) {
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

/**
 * @param {unknown} value
 * @returns {boolean}
 * @ignore
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default GeoJsonPrimitive;
