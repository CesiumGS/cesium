import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defer from "../../Core/defer.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import RuntimeError from "../../Core/RuntimeError.js";
import AttributeType from "../AttributeType.js";
import ModelComponents from "../ModelComponents.js";
import ResourceLoader from "../ResourceLoader.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import IndexDatatype from "../../Core/IndexDatatype.js";

/**
 * Loads a GeoJson model.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GeoJsonLoader
 * @constructor
 * @augments ResourceLoader
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.json The GeoJson object.
 */
export default function GeoJsonLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.json", options.json);
  //>>includeEnd('debug');

  this._json = options.json;
  this._promise = defer();
  this._components = undefined;
}

if (defined(Object.create)) {
  GeoJsonLoader.prototype = Object.create(ResourceLoader.prototype);
  GeoJsonLoader.prototype.constructor = GeoJsonLoader;
}

Object.defineProperties(GeoJsonLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GeoJsonLoader.prototype
   *
   * @type {Promise.<GeoJsonLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GeoJsonLoader.prototype
   *
   * @type {String}
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
   * @memberof GeoJsonLoader.prototype
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
});

/**
 * Loads the resource.
 * @private
 */
GeoJsonLoader.prototype.load = function () {
  this._components = parse(this._json);
  this._promise.resolve(this);
};

const scratchPosition = new Cartesian3();

function ParsedFeature() {
  this.lines = undefined;
  this.properties = undefined;
}

function ParseResult() {
  this.features = [];
}

function parsePosition(position) {
  const x = position[0];
  const y = position[1];
  const z = position[2];
  return new Cartesian3(x, y, z);
}

function parseLineString(coordinates) {
  const positionsLength = coordinates.length;
  const line = new Array(positionsLength);
  for (let i = 0; i < positionsLength; i++) {
    line[i] = parsePosition(coordinates[i]);
  }
  const lines = [line];
  return lines;
}

function parseMultiLineString(coordinates) {
  const linesLength = coordinates.length;
  const lines = new Array(linesLength);
  for (let i = 0; i < linesLength; i++) {
    lines[i] = parseLineString(coordinates[i])[0];
  }
  return lines;
}

function parsePolygon(coordinates) {
  // Treat exterior polygon and interior polygons as lines
  const linesLength = coordinates.length;
  const lines = new Array(linesLength);
  for (let i = 0; i < linesLength; i++) {
    lines[i] = parseLineString(coordinates[i]);
  }
  return lines;
}

function parseMultiPolygon(coordinates) {
  const polygonsLength = coordinates.length;
  const lines = [];
  for (let i = 0; i < polygonsLength; i++) {
    lines.push.apply(parsePolygon(coordinates[i]));
  }
  return lines;
}

const geometryTypes = {
  LineString: parseLineString,
  MultiLineString: parseMultiLineString,
  MultiPolygon: parseMultiPolygon,
  Polygon: parsePolygon,
};

function parseFeature(feature, result) {
  if (!defined(feature.geometry)) {
    return;
  }

  const geometryType = feature.geometry.type;
  const geometryFunction = geometryTypes[geometryType];
  const coordinates = feature.geometry.coordinates;

  if (!defined(geometryFunction)) {
    return;
  }

  if (!defined(coordinates)) {
    return;
  }

  const parsedFeature = new ParsedFeature();
  parsedFeature.lines = geometryFunction(coordinates);
  parsedFeature.properties = feature.properties;

  result.features.push(parsedFeature);
}

function parseFeatureCollection(featureCollection, result) {
  const features = featureCollection.features;
  const featuresLength = features.length;
  for (let i = 0; i < featuresLength; i++) {
    parseFeature(features[i], result);
  }
}

const geoJsonObjectTypes = {
  FeatureCollection: parseFeatureCollection,
  Feature: parseFeature,
};

function parse(json) {
  const result = new ParseResult();
  result.features = [];

  const processFunction = geoJsonObjectTypes[json.type];
  if (defined(processFunction)) {
    processFunction(json, result);
  }

  let vertexCount = 0;
  let indexCount = 0;

  const featuresLength = result.features.length;
  for (let i = 0; i < featuresLength; i++) {
    const feature = result.features[i];
    const linesLength = feature.lines.length;
    for (let j = 0; j < linesLength; j++) {
      const line = feature.lines[j];
      vertexCount += line.length;
      indexCount += line.length * 2;
    }
  }

  const positionsTypedArray = new Float32Array(vertexCount * 3);
  const indicesTypedArray = IndexDatatype.createTypedArray(
    vertexCount,
    indexCount
  );

  let vertexCounter = 0;
  let indexCounter = 0;

  const cartoMin = new Cartesian3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  );

  const cartoMax = new Cartesian3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  );

  for (let i = 0; i < featuresLength; i++) {
    const feature = result.features[i];
    const linesLength = feature.lines.length;
    for (let j = 0; j < linesLength; j++) {
      const line = feature.lines[j];
      const positionsLength = line.length;
      for (let k = 0; k < positionsLength; k++) {
        Cartesian3.minimumByComponent(cartoMin, line[k]);
      }
    }
  }

  const cartoBottomCenter = new Cartesian3(
    cartoMax[0] - cartoMin[0],
    cartoMax[1] - cartoMin[0],
    cartoMin[2]
  );
}

// function parse(json) {
//   const coords = json.coordinates[0];
//   const coordsLength = coords.length;
//   const vertexCount = coordsLength;

//   const positionsArray = new Float32Array(vertexCount * 3);
//   for (let i = 0; i < coordsLength; i++) {
//     const coord = coords[i];
//     const cartesian = Cartesian3.fromDegrees(
//       coord[0],
//       coord[1],
//       0.0,
//       Ellipsoid.WGS84,
//       scratchPosition
//     );
//     Cartesian3.pack(cartesian, positionsArray, i * 3);
//   }

//   const attribute = new ModelComponents.Attribute();
//   attribute.name = "POSITION";
//   attribute.semantic = VertexAttributeSemantic.POSITION;
//   attribute.componentDatatype = ComponentDatatype.FLOAT;
//   attribute.type = AttributeType.VEC3;
//   attribute.count = vertexCount;
//   attribute.min = new Cartesian3();
//   attribute.max = new Cartesian3();
//   attribute.packedTypedArray = positionsArray;

//   const attributes = new Array(1);
//   attributes[0] = attribute;

//   const material = new ModelComponents.Material();
//   material.unlit = true;

//   const primitive = new ModelComponents.Primitive();
//   primitive.attributes = attributes;
//   // primitive.indices = indices; // not necessary?
//   primitive.primitiveType = PrimitiveType.LINE_STRIP;
//   primitive.material = material;

//   // primitive.featureIds = featureIds; // TODO

//   const primitives = new Array(1);
//   primitives[0] = primitive;

//   const node = new ModelComponents.Node();
//   node.name = "root";
//   node.index = 0;
//   node.primitives = primitives;

//   const nodes = new Array(1);
//   nodes[0] = node;

//   const skins = new Array(0);
//   const animations = new Array(0);

//   const scene = new ModelComponents.Scene();
//   scene.nodes = nodes;

//   const asset = new ModelComponents.Asset();
//   asset.credits = undefined; // TODO?

//   const components = new ModelComponents.Components();
//   components.asset = asset;
//   components.scene = scene;
//   components.nodes = nodes;
//   components.skins = skins;
//   components.animations = animations;
//   return components;
// }

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GeoJsonLoader.prototype.process = function (frameState) {};

/**
 * Unloads the resource.
 * @private
 */
GeoJsonLoader.prototype.unload = function () {
  this._components = undefined;
};
