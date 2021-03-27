import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
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
 */
function MetadataSchemaLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var schema = options.schema;
  var resource = options.resource;
  var cacheKey = options.cacheKey;

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
  this._promise = when.defer();
}

Object.defineProperties(MetadataSchemaLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {Promise.<MetadataSchemaLoader>}
   * @readonly
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {String}
   * @readonly
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
   */
  schema: {
    get: function () {
      return this._schema;
    },
  },
});

/**
 * Loads the resource.
 */
MetadataSchemaLoader.prototype.load = function () {
  if (defined(this._schema)) {
    this._promise.resolve(this);
    return;
  }

  loadExternalSchema(this);
};

function loadExternalSchema(schemaLoader) {
  var resource = schemaLoader._resource;
  schemaLoader._state = ResourceLoaderState.LOADING;
  resource
    .fetchJson()
    .then(function (json) {
      if (schemaLoader._state === ResourceLoaderState.DESTROYED) {
        unload(schemaLoader);
        return;
      }
      unload(schemaLoader);
      schemaLoader._schema = new MetadataSchema(json);
      schemaLoader._state = ResourceLoaderState.READY;
      schemaLoader._promise.resolve(schemaLoader);
    })
    .otherwise(function (error) {
      unload(schemaLoader);
      schemaLoader._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load schema: " + resource.url;
      schemaLoader._promise.reject(
        ResourceLoader.getError(errorMessage, error)
      );
    });
}

function unload(schemaLoader) {
  schemaLoader._schema = undefined;
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see SchemaLoader#destroy
 */
MetadataSchemaLoader.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the loaded resource.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * schemaLoader = schemaLoader && schemaLoader.destroy();
 *
 * @see SchemaLoader#isDestroyed
 */
MetadataSchemaLoader.prototype.destroy = function () {
  unload(this);
  this._state = ResourceLoaderState.DESTROYED;

  return destroyObject(this);
};

export default MetadataSchemaLoader;
