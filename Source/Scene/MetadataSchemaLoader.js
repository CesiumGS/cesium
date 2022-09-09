import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import MetadataSchema from "./MetadataSchema.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * A {@link MetadataSchema} loader.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias MetadataSchemaLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema.
 * @param {String} [options.cacheKey] The cache key of the resource.
 *
 * @exception {DeveloperError} One of options.schema and options.resource must be defined.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataSchemaLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const schema = options.schema;
  const resource = options.resource;
  const cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  if (defined(schema) === defined(resource)) {
    throw new DeveloperError(
      "One of options.schema and options.resource must be defined."
    );
  }
  //>>includeEnd('debug');

  this._schema = defined(schema) ? new MetadataSchema(schema) : undefined;
  this._resource = resource;
  this._cacheKey = cacheKey;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  MetadataSchemaLoader.prototype = Object.create(ResourceLoader.prototype);
  MetadataSchemaLoader.prototype.constructor = MetadataSchemaLoader;
}

Object.defineProperties(MetadataSchemaLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready, or undefined if the resource hasn't started loading.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {Promise.<MetadataSchemaLoader>|undefined}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The metadata schema object.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {MetadataSchema}
   * @readonly
   * @private
   */
  schema: {
    get: function () {
      return this._schema;
    },
  },
});

/**
 * Loads the resource.
 * @returns {Promise.<MetadataSchemaLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
MetadataSchemaLoader.prototype.load = function () {
  if (defined(this._schema)) {
    this._promise = Promise.resolve(this);
  } else {
    this._promise = loadExternalSchema(this);
  }

  return this._promise;
};

function loadExternalSchema(schemaLoader) {
  const resource = schemaLoader._resource;
  schemaLoader._state = ResourceLoaderState.LOADING;
  return resource
    .fetchJson()
    .then(function (json) {
      if (schemaLoader.isDestroyed()) {
        return;
      }
      schemaLoader._schema = new MetadataSchema(json);
      schemaLoader._state = ResourceLoaderState.READY;
      return schemaLoader;
    })
    .catch(function (error) {
      if (schemaLoader.isDestroyed()) {
        return;
      }
      schemaLoader._state = ResourceLoaderState.FAILED;
      const errorMessage = `Failed to load schema: ${resource.url}`;
      return Promise.reject(schemaLoader.getError(errorMessage, error));
    });
}

/**
 * Unloads the resource.
 * @private
 */
MetadataSchemaLoader.prototype.unload = function () {
  this._schema = undefined;
};

export default MetadataSchemaLoader;
