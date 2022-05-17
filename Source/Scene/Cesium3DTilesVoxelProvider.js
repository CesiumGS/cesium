import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DoubleEndedPriorityQueue from "../Core/DoubleEndedPriorityQueue.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import Cesium3DTilesetMetadata from "./Cesium3DTilesetMetadata.js";
import GltfLoader from "./GltfLoader.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
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
   * @type {Number|undefined}
   * @readonly
   */
  this.paddingBefore = undefined;

  /**
   * Gets the number of padding voxels on the edge of a tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   * TODO: mark this optional
   *
   * @type {Number|undefined}
   * @readonly
   */
  this.paddingAfter = undefined;

  // TODO is there a good user-facing way to set names, types, componentTypes, min, max, etc? MetadataComponents.Primitive is close, but private and has some fields that voxels don't use

  /**
   * Gets stuff
   *
   * @type {String[]}
   * @readonly
   */
  this.names = new Array();

  /**
   * Gets stuff
   *
   * @type {MetadataType[]}
   * @readonly
   */
  this.types = new Array();

  /**
   * Gets stuff
   *
   * @type {MetadataComponentType[]}
   * @readonly
   */
  this.componentTypes = new Array();

  /**
   * TODO is [][] valid JSDOC? https://stackoverflow.com/questions/25602978/jsdoc-two-dimensional-array
   * Gets the minimum value
   *
   * @type {Number[][]|undefined}
   * @readonly
   */
  this.minimumValues = undefined;

  /**
   * TODO is [][] valid JSDOC? https://stackoverflow.com/questions/25602978/jsdoc-two-dimensional-array
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
  const tilesetPromise = resource.fetchJson();
  tilesetPromise
    .then(function (tileset) {
      tilesetJson = tileset;
      tileJson = tilesetJson.root;

      let metadataSchemaLoader;
      if (defined(tilesetJson.schemaUri)) {
        metadataSchemaLoader = ResourceCache.loadSchema({
          resource: resource.getDerivedResource({
            url: tilesetJson.schemaUri,
            preserveQueryParameters: true,
          }),
        });
      } else {
        metadataSchemaLoader = ResourceCache.loadSchema({
          schema: tilesetJson.schema,
        });
      }
      return metadataSchemaLoader.promise;
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
      that._gltfLoaders.splice(that._gltfLoaders.indexOf(rootGltfLoader));
      const gltfPrimitive = rootGltfLoader.components.nodes[0].primitives[0];
      const voxel = gltfPrimitive.voxel;
      const primitiveType = gltfPrimitive.primitiveType;
      const attributes = gltfPrimitive.attributes;

      const attributesLength = attributes.length;
      const names = new Array(attributesLength);
      const types = new Array(attributesLength);
      const componentTypes = new Array(attributesLength);
      let minimumValues = new Array(attributesLength);
      let maximumValues = new Array(attributesLength);

      const schema = metadata.schema;
      const statistics = metadata.statistics;
      const classNames = Object.keys(schema.classes);
      const classNamesLength = classNames.length;
      for (let i = 0; i < classNamesLength; i++) {
        const className = classNames[i];
        const classStatistics = statistics.classes[className];
        const classInfo = schema.classes[className];
        const properties = classInfo.properties;
        const propertyNames = Object.keys(properties);
        const propertyNamesLength = propertyNames.length;
        for (let i = 0; i < propertyNamesLength; i++) {
          const propertyName = propertyNames[i];
          const property = properties[propertyName];

          const metadataType = property.type;
          const metadataComponentType = property.componentType;
          const metadataComponentCount = MetadataType.getComponentCount(
            metadataType
          );

          if (defined(classStatistics)) {
            const propertyStatistics = classStatistics.properties[propertyName];
            const propertyMin = Array.isArray(propertyStatistics.min)
              ? propertyStatistics.min
              : [propertyStatistics.min];
            const propertyMax = Array.isArray(propertyStatistics.max)
              ? propertyStatistics.max
              : [propertyStatistics.max];

            minimumValues[i] = new Array(metadataComponentCount);
            maximumValues[i] = new Array(metadataComponentCount);

            for (let j = 0; j < metadataComponentCount; j++) {
              minimumValues[i][j] = propertyMin[j];
              maximumValues[i][j] = propertyMax[j];
            }
          }

          names[i] = propertyName;
          types[i] = metadataType;
          componentTypes[i] = metadataComponentType;
        }
      }

      let hasMinimumMaximumValues = false;
      for (let i = 0; i < attributesLength; i++) {
        if (defined(minimumValues[i]) && defined(maximumValues[i])) {
          hasMinimumMaximumValues = true;
          break;
        }
      }
      if (!hasMinimumMaximumValues) {
        minimumValues = undefined;
        maximumValues = undefined;
      }

      that.shape = VoxelShapeType.fromPrimitiveType(primitiveType);
      that.minBounds = Cartesian3.clone(voxel.minBounds);
      that.maxBounds = Cartesian3.clone(voxel.maxBounds);
      that.dimensions = Cartesian3.clone(voxel.dimensions);
      that.paddingBefore = Cartesian3.clone(voxel.paddingBefore);
      that.paddingAfter = Cartesian3.clone(voxel.paddingAfter);
      that.maximumTileCount = defined(statistics.classes.tile)
        ? statistics.classes.tile.count
        : undefined;
      that.modelMatrix = Matrix4.clone(tileJson.transform);
      that.names = names;
      that.types = types;
      that.componentTypes = componentTypes;
      that.minimumValues = minimumValues;
      that.maximumValues = maximumValues;
      that.ready = true;
      that._readyPromise.resolve(that);
      that._implicitTileset = implicitTileset;
    })
    .catch(function (error) {
      that._readyPromise.reject(error);
    });
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
  // 1a. If not in the cache, load the subtree resource
  // 1b. If not in the cache, load the subtree object
  // 2. Load the glTF if available

  const implicitTileset = this._implicitTileset;
  const subtreeCache = this._subtreeCache;
  const types = this.types;
  const componentTypes = this.componentTypes;

  // Can't use a scratch variable here because the object is used inside the promise chain.
  const tileCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitTileset.subdivisionScheme,
    subtreeLevels: implicitTileset.subtreeLevels,
    level: tileLevel,
    x: tileX,
    y: tileY,
    z: tileZ,
  });

  // First load the subtree to check if the tile is available.
  // If the subtree has been requested previously it might still be in the cache.
  const subtreeCoord = tileCoordinates.getSubtreeCoordinates();
  let subtree = subtreeCache.find(subtreeCoord);

  const that = this;
  let subtreePromise;
  if (defined(subtree)) {
    subtreePromise = subtree.readyPromise;
  } else {
    const subtreeRelative = implicitTileset.subtreeUriTemplate.getDerivedResource(
      {
        templateValues: subtreeCoord.getTemplateValues(),
      }
    );
    const subtreeResource = implicitTileset.baseResource.getDerivedResource({
      url: subtreeRelative.url,
    });
    this._subtreeResourceLoaders.push(subtreeResource);
    subtreePromise = subtreeResource
      .fetchArrayBuffer()
      .then(function (arrayBuffer) {
        // Check one more time if the subtree is in the cache.
        // This could happen if there are two in-flight tile requests from the same subtree and one finishes before the other.
        subtree = subtreeCache.find(subtreeCoord);
        if (!defined(subtree)) {
          const bufferU8 = new Uint8Array(arrayBuffer);
          subtree = new ImplicitSubtree(
            subtreeResource,
            undefined,
            bufferU8,
            implicitTileset,
            subtreeCoord
          );
          subtreeCache.addSubtree(subtree);
          that._subtreeLoaders.push(subtree);
        }
        that._subtreeResourceLoaders.splice(
          that._subtreeResourceLoaders.indexOf(subtreeResource)
        );
        return subtree.readyPromise;
      });
  }

  return subtreePromise
    .then(function (subtree) {
      const subtreeLoaderIndex = that._subtreeLoaders.indexOf(subtree);
      if (!subtree.tileIsAvailableAtCoordinates(tileCoordinates)) {
        if (subtreeLoaderIndex !== -1) {
          that._subtreeLoaders.splice(subtreeLoaderIndex);
        }
        return Promise.reject("Tile is not available");
      }

      const gltfLoader = getGltfLoader(implicitTileset, tileCoordinates);
      that._gltfLoaders.push(gltfLoader);

      if (subtreeLoaderIndex !== -1) {
        that._subtreeLoaders.splice(subtreeLoaderIndex);
      }

      return gltfLoader.promise;
    })
    .then(function (gltfLoader) {
      const node = gltfLoader.components.scene.nodes[0];
      const primitive = node.primitives[0];
      const attributes = primitive.attributes;
      const attributesLength = attributes.length;

      const data = new Array(attributesLength);
      for (let i = 0; i < attributesLength; i++) {
        const attribute = attributes[i];
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

      that._gltfLoaders.splice(that._gltfLoaders.indexOf(gltfLoader));
      return Promise.resolve(data);
    });
};

/**
 * A hook to update the provider every frame, called from {@link VoxelPrimitive.update}.
 *
 * @param {FrameState} frameState
 */
Cesium3DTilesVoxelProvider.prototype.update = function (frameState) {
  const loaders = this._gltfLoaders;
  const loaderLength = loaders.length;
  for (let i = 0; i < loaderLength; i++) {
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
 * @function
 *
 * @param {ArrayBuffer} gltfBuffer The buffer that comes when the promise from gltfResource.fetchArrayBuffer() resolves.
 * @param {Resource} gltfResource Resource derived from base that points to gltf.
 * @returns {GltfLoader}
 *
 * @private
 */
function getGltfLoader(implicitTileset, tileCoord) {
  const gltfRelative = implicitTileset.contentUriTemplates[0].getDerivedResource(
    {
      templateValues: tileCoord.getTemplateValues(),
    }
  );
  const gltfResource = implicitTileset.baseResource.getDerivedResource({
    url: gltfRelative.url,
  });

  const gltfLoader = new GltfLoader({
    gltfResource: gltfResource,
    releaseGltfJson: false,
    loadAsTypedArray: true,
  });

  gltfLoader.load();
  return gltfLoader;
}

/**
 * @alias ImplicitSubtreeCacheNode
 * @constructor
 *
 * @param {ImplicitSubtree} subtree
 * @param {Number} stamp
 *
 * @private
 */
function ImplicitSubtreeCacheNode(subtree, stamp) {
  this.subtree = subtree;
  this.stamp = stamp;
}

/**
 * @alias ImplicitSubtreeCache
 * @constructor
 *
 * @param {Object} [options] Object with the following properties
 * @param {Number} [options.maximumSubtreeCount=0] The total number of subtrees this cache can store. If adding a new subtree would exceed this limit, the lowest priority subtrees will be removed until there is room, unless the subtree that is going to be removed is the parent of the new subtree, in which case it will not be removed and the new subtree will still be added, exceeding the memory limit.
 *
 * @private
 */
function ImplicitSubtreeCache(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * @type {Number}
   * @private
   */
  this._maximumSubtreeCount = defaultValue(options.maximumSubtreeCount, 0);

  /**
   * A counter that goes up whenever a subtree is added. Used to sort subtrees by recency.
   * @type {Number}
   * @private
   */
  this._subtreeRequestCounter = 0;

  /**
   * @type {DoubleEndedPriorityQueue}
   * @private
   */
  this._queue = new DoubleEndedPriorityQueue({
    comparator: ImplicitSubtreeCache.comparator,
  });
}

/**
 * @param {ImplicitSubtree} subtree
 */
ImplicitSubtreeCache.prototype.addSubtree = function (subtree) {
  const cacheNode = new ImplicitSubtreeCacheNode(
    subtree,
    this._subtreeRequestCounter
  );
  this._subtreeRequestCounter++;
  this._queue.insert(cacheNode);

  // Make sure the parent subtree exists in the cache
  const subtreeCoord = subtree.implicitCoordinates;
  if (subtreeCoord.level > 0) {
    const parentCoord = subtreeCoord.deriveParentSubtreeCoordinates();
    const parentNode = this.find(parentCoord);

    //>>includeStart('debug', pragmas.debug)
    if (parentNode === undefined) {
      throw new DeveloperError("parent node needs to exist");
    }
    //>>includeEnd('debug');
  }

  if (this._maximumSubtreeCount > 0) {
    while (this._queue.length > this._maximumSubtreeCount) {
      const lowestPriorityNode = this._queue.getMinimum();
      if (lowestPriorityNode === cacheNode) {
        // Don't remove itself
        break;
      }

      this._queue.removeMinimum();
    }
  }
};

/**
 * @param {ImplicitTileCoordinates} subtreeCoord
 * @returns {ImplicitSubtree|undefined}
 */
ImplicitSubtreeCache.prototype.find = function (subtreeCoord) {
  const queue = this._queue;
  const array = queue.internalArray;
  const arrayLength = queue.length;

  for (let i = 0; i < arrayLength; i++) {
    const other = array[i];
    const otherSubtree = other.subtree;
    const otherCoord = otherSubtree.implicitCoordinates;
    if (subtreeCoord.isEqual(otherCoord)) {
      return other.subtree;
    }
  }
  return undefined;
};

/**
 * @param {ImplicitSubtreeCacheNode} a
 * @param {ImplicitSubtreeCacheNode} b
 * @returns {Number}
 */
ImplicitSubtreeCache.comparator = function (a, b) {
  const aCoord = a.subtree.implicitCoordinates;
  const bCoord = b.subtree.implicitCoordinates;
  if (aCoord.isAncestorOf(bCoord)) {
    // Technically this shouldn't happen because the ancestor subtree was supposed to be added to the cache first.
    return +1.0;
  } else if (bCoord.isAncestorOf(aCoord)) {
    return -1.0;
  }
  return a.stamp - b.stamp;
};

export default Cesium3DTilesVoxelProvider;
