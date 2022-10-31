import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import Cesium3DTilesetMetadata from "./Cesium3DTilesetMetadata.js";
import GltfLoader from "./GltfLoader.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
import ImplicitSubtreeCache from "./ImplicitSubtreeCache.js";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates.js";
import ImplicitTileset from "./ImplicitTileset.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";
import ResourceCache from "./ResourceCache.js";
import VoxelShapeType from "./VoxelShapeType.js";

/**
 * A {@link VoxelProvider} that fetches voxel data from a 3D Tiles tileset.
 *
 * @alias Cesium3DTilesVoxelProvider
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {String|Resource|Uint8Array} options.url The URL to the tileset directory
 *
 * @see GltfVoxelProvider
 * @see VoxelProvider
 * @see VoxelPrimitive
 * @see VoxelShapeType
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Cesium3DTilesVoxelProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug)
  Check.defined("options.url", options.url);
  //>>includeEnd('debug');

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   *
   * @type {Boolean}
   * @readonly
   */
  this.ready = false;

  /**
   * @type {Promise.<VoxelProvider>}
   * @private
   */
  this._readyPromise = defer();

  /**
   * Gets the promise that will be resolved when the provider is ready for use.
   *
   * @type {Promise.<VoxelProvider>}
   * @readonly
   */
  this.readyPromise = this._readyPromise.promise;

  /**
   * An optional model matrix that is applied to all tiles
   *
   * @type {Matrix4|undefined}
   * @readonly
   */
  this.modelMatrix = undefined;

  /**
   * Gets the {@link VoxelShapeType}
   *
   * @type {VoxelShapeType}
   * @readonly
   */
  this.shape = undefined;

  /**
   * Gets the minimum bounds.
   * If undefined, the shape's default minimum bounds will be used instead.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.minBounds = undefined;

  /**
   * Gets the maximum bounds.
   * If undefined, the shape's default maximum bounds will be used instead.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.maxBounds = undefined;

  /**
   * Gets the number of voxels per dimension of a tile. This is the same for all tiles in the dataset.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Cartesian3}
   * @readonly
   */
  this.dimensions = undefined;

  /**
   * Gets the number of padding voxels on the edge of a tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   * TODO: mark this optional
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.paddingBefore = undefined;

  /**
   * Gets the number of padding voxels on the edge of a tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   * TODO: mark this optional
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.paddingAfter = undefined;

  // TODO is there a good user-facing way to set names, types, componentTypes, min, max, etc? MetadataComponents.Primitive is close, but private and has some fields that voxels don't use

  /**
   * Gets the metadata names.
   *
   * @type {String[]}
   * @readonly
   */
  this.names = new Array();

  /**
   * Gets the metadata types
   *
   * @type {MetadataType[]}
   * @readonly
   * @private
   */
  this.types = new Array();

  /**
   * Gets the metadata component types
   *
   * @type {MetadataComponentType[]}
   * @readonly
   * @private
   */
  this.componentTypes = new Array();

  /**
   * Gets the minimum value
   *
   * @type {Number[][]|undefined}
   * @readonly
   */
  this.minimumValues = undefined;

  /**
   * Gets the maximum value
   *
   * @type {Number[][]|undefined}
   * @readonly
   */
  this.maximumValues = undefined;

  /**
   * The maximum number of tiles that exist for this provider. This value is used as a hint to the voxel renderer to allocate an appropriate amount of GPU memory. If this value is not known it can be set to 0.
   *
   * @type {Number|undefined}
   * @readonly
   */
  this.maximumTileCount = undefined;

  /**
   * @type {ImplicitTileset}
   * @private
   */
  this._implicitTileset = undefined;

  /**
   * @type {ImplicitSubtreeCache}
   * @private
   */
  // TODO: set a default maximumSubtreeCount to limit memory usage
  this._subtreeCache = new ImplicitSubtreeCache();

  /**
   * glTFs that are in the process of being loaded.
   *
   * @type {GltfLoader[]}
   * @private
   */
  this._gltfLoaders = new Array();

  /**
   * Subtrees that are in the process of being loaded.
   * This member exists for unit test purposes only. See doneLoading.
   *
   * @type {Subtree[]}
   * @private
   */
  this._subtreeLoaders = new Array();

  /**
   * Subtree resources that are in the process of being loaded.
   * This member exists for unit test purposes only. See doneLoading.
   *
   * @type {Resource[]}
   * @private
   */
  this._subtreeResourceLoaders = new Array();

  const that = this;
  let tilesetJson;
  let tileJson;
  let metadata;
  let implicitTileset;

  // 1. Load tileset.json
  // 2. Load schema.json
  // 3. Load root glTF to get provider properties
  const resource = Resource.createIfNeeded(options.url);
  resource
    .fetchJson()
    .then(function (tileset) {
      tilesetJson = tileset;
      tileJson = tilesetJson.root;
      return getMetadataSchemaLoader(tilesetJson, resource).promise;
    })
    .then(function (schemaLoader) {
      const metadataSchema = schemaLoader.schema;
      metadata = new Cesium3DTilesetMetadata({
        metadataJson: tilesetJson,
        schema: metadataSchema,
      });
      implicitTileset = new ImplicitTileset(resource, tileJson, metadataSchema);

      // TODO make sure this fails when root tile is not available?
      const rootCoord = new ImplicitTileCoordinates({
        subdivisionScheme: implicitTileset.subdivisionScheme,
        subtreeLevels: implicitTileset.subtreeLevels,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      });
      const rootGltfLoader = getGltfLoader(implicitTileset, rootCoord);
      that._gltfLoaders.push(rootGltfLoader);
      return rootGltfLoader.promise;
    })
    .then(function (rootGltfLoader) {
      that._gltfLoaders.splice(that._gltfLoaders.indexOf(rootGltfLoader), 1);

      addAttributeInfo(metadata, that);

      const gltfPrimitive = rootGltfLoader.components.nodes[0].primitives[0];
      const { primitiveType, voxel } = gltfPrimitive;

      that.shape = VoxelShapeType.fromPrimitiveType(primitiveType);

      that.minBounds = Cartesian3.clone(voxel.minBounds);
      that.maxBounds = Cartesian3.clone(voxel.maxBounds);
      that.dimensions = Cartesian3.clone(voxel.dimensions);
      that.paddingBefore = Cartesian3.clone(voxel.paddingBefore);
      that.paddingAfter = Cartesian3.clone(voxel.paddingAfter);

      that.maximumTileCount = metadata.statistics.classes.tile?.count;

      that.modelMatrix = Matrix4.clone(tileJson.transform);
      that.ready = true;
      that._readyPromise.resolve(that);
      that._implicitTileset = implicitTileset;
    })
    .catch(function (error) {
      that._readyPromise.reject(error);
    });
}

/**
 * Get a schema loader to load the metadata schema referenced in a tileset JSON file
 * @param {Object} tilesetJson A tileset JSON object describing a 3DTiles tileset
 * @param {Resource} resource
 * @returns {MetadataSchemaLoader}
 * @private
 */
function getMetadataSchemaLoader(tilesetJson, resource) {
  const { schemaUri, schema } = tilesetJson;
  if (!defined(schemaUri)) {
    return ResourceCache.loadSchema({ schema });
  }
  return ResourceCache.loadSchema({
    resource: resource.getDerivedResource({
      url: schemaUri,
      preserveQueryParameters: true,
    }),
  });
}

/**
 * Add info about metadata attributes to a VoxelPrimitive:
 *  names, types, componentTypes, minimumValues, maximumValues
 * @param {Cesium3DTilesetMetadata} metadata
 * @param {VoxelPrimitive} primitive
 * @private
 */
function addAttributeInfo(metadata, primitive) {
  const { schema, statistics } = metadata;

  // Collect a flattened array of info from all properties in all classes.
  const propertyInfo = Object.entries(schema.classes).flatMap(getPropertyInfo);

  function getPropertyInfo([className, classInfo]) {
    const classStatistics = statistics.classes[className];
    const { properties } = classInfo;
    return Object.entries(properties).map(([name, property]) => {
      const { type, componentType } = property;

      const min = classStatistics?.properties[name].min;
      const max = classStatistics?.properties[name].max;
      const componentCount = MetadataType.getComponentCount(type);
      const minValue = copyArray(min, componentCount);
      const maxValue = copyArray(max, componentCount);

      return { name, type, componentType, minValue, maxValue };
    });
  }

  primitive.names = propertyInfo.map((info) => info.name);
  primitive.types = propertyInfo.map((info) => info.type);
  primitive.componentTypes = propertyInfo.map((info) => info.componentType);

  const minimumValues = propertyInfo.map((info) => info.minValue);
  const maximumValues = propertyInfo.map((info) => info.maxValue);
  const hasMinimumValues = minimumValues.some(defined);

  primitive.minimumValues = hasMinimumValues ? minimumValues : undefined;
  primitive.maximumValues = hasMinimumValues ? maximumValues : undefined;
}

/**
 * Copy input values into a new array of a specified length.
 * If the input is not an array, its value will be copied into the first element
 * of the returned array. If the input is an array shorter than the returned
 * array, the extra elements in the returned array will be undefined. If the
 * input is undefined, the return will be undefined.
 * @param {*} values The values to copy
 * @param {Number} length The length of the returned array
 * @returns {Array} A new array filled with the supplied values
 * @private
 */
function copyArray(values, length) {
  if (!defined(values)) {
    return;
  }
  const valuesArray = Array.isArray(values) ? values : [values];
  return Array.from({ length }, (v, i) => valuesArray[i]);
}

/**
 * Requests the data for a given tile. The data is a flattened 3D array ordered by X, then Y, then Z.
 * This function should not be called before {@link VoxelProvider#ready} returns true.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Number} [options.tileLevel=0] The tile's level.
 * @param {Number} [options.tileX=0] The tile's X coordinate.
 * @param {Number} [options.tileY=0] The tile's Y coordinate.
 * @param {Number} [options.tileZ=0] The tile's Z coordinate.
 * @param {Number} [options.keyframe=0] The requested keyframe.
 * @returns {Promise<Array[]>|undefined} An array of promises for the requested voxel data or undefined if there was a problem loading the data.
 *
 * @exception {DeveloperError} The provider must be ready.
 */
Cesium3DTilesVoxelProvider.prototype.requestData = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!this.ready) {
    throw new DeveloperError(
      "The provider is not ready. Use Cesium3DTilesVoxelProvider.readyPromise or wait for Cesium3DTilesVoxelProvider.ready to be true."
    );
  }
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const tileLevel = defaultValue(options.tileLevel, 0);
  const tileX = defaultValue(options.tileX, 0);
  const tileY = defaultValue(options.tileY, 0);
  const tileZ = defaultValue(options.tileZ, 0);
  const keyframe = defaultValue(options.keyframe, 0);

  // 3D Tiles currently doesn't support time-dynamic data.
  if (keyframe !== 0) {
    return undefined;
  }

  // 1. Load the subtree that the tile belongs to (possibly from the subtree cache)
  // 2. Load the glTF if available

  const implicitTileset = this._implicitTileset;
  const types = this.types;
  const componentTypes = this.componentTypes;
  const names = this.names;

  // Can't use a scratch variable here because the object is used inside the promise chain.
  const tileCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitTileset.subdivisionScheme,
    subtreeLevels: implicitTileset.subtreeLevels,
    level: tileLevel,
    x: tileX,
    y: tileY,
    z: tileZ,
  });

  // Find the coordinates of the parent subtree containing tileCoordinates
  // If tileCoordinates is a subtree child, use that subtree
  // If tileCoords is a subtree root, use its parent subtree
  const isSubtreeRoot =
    tileCoordinates.isSubtreeRoot() && tileCoordinates.level > 0;

  const subtreeCoord = isSubtreeRoot
    ? tileCoordinates.getParentSubtreeCoordinates()
    : tileCoordinates.getSubtreeCoordinates();

  const that = this;

  return getSubtreePromise(that, subtreeCoord)
    .then(function (subtree) {
      const available = isSubtreeRoot
        ? subtree.childSubtreeIsAvailableAtCoordinates(tileCoordinates)
        : subtree.tileIsAvailableAtCoordinates(tileCoordinates);

      const subtreeLoaderIndex = that._subtreeLoaders.indexOf(subtree);
      if (subtreeLoaderIndex !== -1) {
        that._subtreeLoaders.splice(subtreeLoaderIndex, 1);
      }
      if (!available) {
        return Promise.reject("Tile is not available");
      }

      const gltfLoader = getGltfLoader(implicitTileset, tileCoordinates);
      that._gltfLoaders.push(gltfLoader);

      return gltfLoader.promise;
    })
    .then(function (gltfLoader) {
      const node = gltfLoader.components.scene.nodes[0];
      const attributes = node.primitives[0].attributes;
      const attributesLength = attributes.length;

      const data = new Array(attributesLength);
      for (let i = 0; i < attributesLength; i++) {
        // The attributes array from GltfLoader is not in the same order as
        // names, types, etc. from the provider.
        // Find the appropriate glTF attribute based on its name.
        // Note: glTF custom attribute names are prefixed with "_"
        const name = `_${names[i]}`;
        const attribute = attributes.find((a) => a.name === name);
        if (!defined(attribute)) {
          continue;
        }

        const type = types[i];
        const componentType = componentTypes[i];
        const componentDatatype = MetadataComponentType.toComponentDatatype(
          componentType
        );
        const componentCount = MetadataType.getComponentCount(type);
        const totalCount = attribute.count * componentCount;
        data[i] = ComponentDatatype.createArrayBufferView(
          componentDatatype,
          attribute.typedArray.buffer,
          attribute.typedArray.byteOffset + attribute.byteOffset,
          totalCount
        );
      }

      that._gltfLoaders.splice(that._gltfLoaders.indexOf(gltfLoader), 1);
      return data;
    });
};

/**
 *
 * @param {VoxelPrimitive} primitive
 * @param {ImplicitTileCoordinates} subtreeCoord
 * @returns {Promise.<ImplicitSubtree>}
 * @private
 */
function getSubtreePromise(primitive, subtreeCoord) {
  const implicitTileset = primitive._implicitTileset;
  const subtreeCache = primitive._subtreeCache;

  // First load the subtree to check if the tile is available.
  // If the subtree has been requested previously it might still be in the cache
  const subtree = subtreeCache.find(subtreeCoord);
  if (defined(subtree)) {
    return subtree.readyPromise;
  }

  const { subtreeUriTemplate, baseResource } = implicitTileset;
  const subtreeRelative = subtreeUriTemplate.getDerivedResource({
    templateValues: subtreeCoord.getTemplateValues(),
  });
  const subtreeResource = baseResource.getDerivedResource({
    url: subtreeRelative.url,
  });
  primitive._subtreeResourceLoaders.push(subtreeResource);

  return subtreeResource.fetchArrayBuffer().then(addSubtree);

  function addSubtree(arrayBuffer) {
    // Check one more time if the subtree is in the cache.
    // This could happen if there are two in-flight tile requests from the same
    // subtree and one finishes before the other.
    let subtree = subtreeCache.find(subtreeCoord);
    if (defined(subtree)) {
      return subtree.readyPromise;
    }
    const bufferU8 = new Uint8Array(arrayBuffer);
    subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      bufferU8,
      implicitTileset,
      subtreeCoord
    );
    subtreeCache.addSubtree(subtree);
    primitive._subtreeLoaders.push(subtree);
    const subtreeResourceIndex = primitive._subtreeResourceLoaders.indexOf(
      subtreeResource
    );
    primitive._subtreeResourceLoaders.splice(subtreeResourceIndex, 1);
    return subtree.readyPromise;
  }
}

/**
 * A hook to update the provider every frame, called from {@link VoxelPrimitive.update}.
 * @function
 *
 * @param {FrameState} frameState
 * @private
 */
Cesium3DTilesVoxelProvider.prototype.update = function (frameState) {
  const loaders = this._gltfLoaders;
  for (let i = 0; i < loaders.length; i++) {
    loaders[i].process(frameState);
  }
};

/**
 * Check if anything is still being loaded.
 * This is intended for unit test purposes only.
 *
 * @returns {Boolean}
 *
 * @private
 */
Cesium3DTilesVoxelProvider.prototype.doneLoading = function () {
  return (
    this._gltfLoaders.length === 0 &&
    this._subtreeLoaders.length === 0 &&
    this._subtreeResourceLoaders.length === 0
  );
};

/**
 * Get a loader for a glTF tile from a tileset
 * @param {ImplicitTileset} implicitTileset The tileset from which the loader will retrieve a glTF tile
 * @param {ImplicitTileCoordinates} tileCoord The coordinates of the desired tile
 * @returns {GltfLoader} A loader for the requested tile
 * @private
 */
function getGltfLoader(implicitTileset, tileCoord) {
  const { contentUriTemplates, baseResource } = implicitTileset;
  const gltfRelative = contentUriTemplates[0].getDerivedResource({
    templateValues: tileCoord.getTemplateValues(),
  });
  const gltfResource = baseResource.getDerivedResource({
    url: gltfRelative.url,
  });

  const gltfLoader = new GltfLoader({
    gltfResource: gltfResource,
    releaseGltfJson: false,
    loadAttributesAsTypedArray: true,
  });

  gltfLoader.load();
  return gltfLoader;
}

export default Cesium3DTilesVoxelProvider;
