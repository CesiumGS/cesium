import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import ResourceLoader from "./ResourceLoader.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * Loads a GeoJson model.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GeoJsonLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.json The {@link Resource} containing the GeoJson. This is often a .json or .geojson file.
 *
 * @private
 */
export default function GeoJsonLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.json", options.json);
  //>>includeEnd('debug');

  this._resource = options.json;
  this._promise = defer();
  // Loaded results
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
  const that = this;
  this._resource
    .fetchJson()
    .then(function (json) {
      if (that.isDestroyed()) {
        return;
      }
      that._components = parse(json);
      that._promise.resolve(that);
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      handleError(that, error);
    });
};

const scratchPosition = new Cartesian3();

function parse(json) {
  const coords = json.coordinates[0];
  const coordsLength = coords.length;
  const vertexCount = coordsLength;

  const positionsArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < coordsLength; i++) {
    const coord = coords[i];
    const cartesian = Cartesian3.fromDegrees(
      coord[0],
      coord[1],
      0.0,
      Ellipsoid.WGS84,
      scratchPosition
    );
    Cartesian3.pack(cartesian, positionsArray, i * 3);
  }

  const attribute = new ModelComponents.Attribute();
  attribute.name = "POSITION";
  attribute.semantic = VertexAttributeSemantic.POSITION;
  attribute.componentDatatype = ComponentDatatype.FLOAT;
  attribute.type = AttributeType.VEC3;
  attribute.count = vertexCount;
  attribute.min = new Cartesian3();
  attribute.max = new Cartesian3();
  attribute.packedTypedArray = positionsArray;

  const attributes = new Array(1);
  attributes[0] = attribute;

  const material = new ModelComponents.Material();
  material.unlit = true;

  const primitive = new ModelComponents.Primitive();
  primitive.attributes = attributes;
  // primitive.indices = indices; // not necessary?
  primitive.primitiveType = PrimitiveType.LINE_STRIP;

  // primitive.featureIds = featureIds; // TODO

  const primitives = new Array(1);
  primitives[0] = primitive;

  const node = new ModelComponents.Node();
  node.name = "root";
  node.index = 0;
  node.primitives = primitives;

  const nodes = new Array(1);
  nodes[0] = node;

  const skins = new Array(0);
  const animations = new Array(0);

  const scene = new ModelComponents.Scene();
  scene.nodes = nodes;

  const asset = new ModelComponents.Asset();
  asset.credits = undefined; // TODO?

  const components = new ModelComponents.Components();
  components.asset = asset;
  components.scene = scene;
  components.nodes = nodes;
  components.skins = skins;
  components.animations = animations;
  return components;
}

function handleError(GeoJsonLoader, error) {
  GeoJsonLoader.unload();
  const errorMessage = "Failed to load GeoJSON";
  error = GeoJsonLoader.getError(errorMessage, error);
  GeoJsonLoader._promise.reject(error);
}

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
