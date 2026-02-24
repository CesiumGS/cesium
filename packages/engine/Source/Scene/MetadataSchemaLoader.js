import Frozen from "../Core/Frozen.js";
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
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MetadataSchemaLoader extends ResourceLoader {
  /**
   * @param {object} options Object with the following properties:
   * @param {object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource.
   * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema.
   * @param {string} [options.cacheKey] The cache key of the resource.
   *
   * @exception {DeveloperError} One of options.schema and options.resource must be defined.
   */
  constructor(options) {
    super();

    options = options ?? Frozen.EMPTY_OBJECT;
    const schema = options.schema;
    const resource = options.resource;
    const cacheKey = options.cacheKey;

    //>>includeStart('debug', pragmas.debug);
    if (defined(schema) === defined(resource)) {
      throw new DeveloperError(
        "One of options.schema and options.resource must be defined.",
      );
    }
    //>>includeEnd('debug');

    this._schema = defined(schema)
      ? MetadataSchema.fromJson(schema)
      : undefined;
    this._resource = resource;
    this._cacheKey = cacheKey;
    this._state = ResourceLoaderState.UNLOADED;
    this._promise = undefined;
  }

  /**
   * The cache key of the resource.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  get cacheKey() {
    return this._cacheKey;
  }

  /**
   * The metadata schema object.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {MetadataSchema}
   * @readonly
   * @private
   */
  get schema() {
    return this._schema;
  }

  /**
   * Loads the resource.
   * @returns {Promise<MetadataSchemaLoader>} A promise which resolves to the loader when the resource loading is completed.
   * @private
   */
  async load() {
    if (defined(this._promise)) {
      return this._promise;
    }

    if (defined(this._schema)) {
      this._promise = Promise.resolve(this);
      return this._promise;
    }

    this._promise = loadExternalSchema(this);
    return this._promise;
  }

  /**
   * Unloads the resource.
   * @private
   */
  unload() {
    this._schema = undefined;
  }
}

async function loadExternalSchema(schemaLoader) {
  const resource = schemaLoader._resource;
  schemaLoader._state = ResourceLoaderState.LOADING;
  try {
    const json = await resource.fetchJson();
    if (schemaLoader.isDestroyed()) {
      return;
    }

    schemaLoader._schema = MetadataSchema.fromJson(json);
    schemaLoader._state = ResourceLoaderState.READY;
    return schemaLoader;
  } catch (error) {
    if (schemaLoader.isDestroyed()) {
      return;
    }

    schemaLoader._state = ResourceLoaderState.FAILED;
    const errorMessage = `Failed to load schema: ${resource.url}`;
    throw schemaLoader.getError(errorMessage, error);
  }
}

export default MetadataSchemaLoader;
