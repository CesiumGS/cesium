import Cartesian3 from "../Core/Cartesian3.js";
import Cesium3DTilesetMetadata from "./Cesium3DTilesetMetadata.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import hasExtension from "./hasExtension.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
import ImplicitSubtreeCache from "./ImplicitSubtreeCache.js";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates.js";
import ImplicitTileset from "./ImplicitTileset.js";
import Matrix4 from "../Core/Matrix4.js";
import MetadataSemantic from "./MetadataSemantic.js";
import MetadataType from "./MetadataType.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import preprocess3DTileContent from "./preprocess3DTileContent.js";
import Resource from "../Core/Resource.js";
import ResourceCache from "./ResourceCache.js";
import RuntimeError from "../Core/RuntimeError.js";
import VoxelBoxShape from "./VoxelBoxShape.js";
import VoxelContent from "./VoxelContent.js";
import VoxelCylinderShape from "./VoxelCylinderShape.js";
import VoxelShapeType from "./VoxelShapeType.js";

/**
 * A {@link VoxelProvider} that fetches voxel data from a 3D Tiles tileset.
 * <p>
 * Implements the {@link VoxelProvider} interface.
 * </p>
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link Cesium3DTilesVoxelProvider.fromUrl}.
 * </div>
 *
 * @alias Cesium3DTilesVoxelProvider
 * @constructor
 * @augments VoxelProvider
 *
 * @param {object} options Object with the following properties:
 *
 * @see Cesium3DTilesVoxelProvider.fromUrl
 * @see VoxelProvider
 * @see VoxelPrimitive
 * @see VoxelShapeType
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Cesium3DTilesVoxelProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * A transform from shape space to local space. If undefined, the identity matrix will be used instead.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {Matrix4|undefined}
   * @readonly
   */
  this.shapeTransform = undefined;

  /**
   * A transform from local space to global space. If undefined, the identity matrix will be used instead.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {Matrix4|undefined}
   * @readonly
   */
  this.globalTransform = undefined;

  /**
   * Gets the {@link VoxelShapeType}
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {VoxelShapeType}
   * @readonly
   */
  this.shape = undefined;

  /**
   * Gets the minimum bounds.
   * If undefined, the shape's default minimum bounds will be used instead.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.minBounds = undefined;

  /**
   * Gets the maximum bounds.
   * If undefined, the shape's default maximum bounds will be used instead.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.maxBounds = undefined;

  /**
   * Gets the number of voxels per dimension of a tile.
   * This is the same for all tiles in the dataset.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {Cartesian3}
   * @readonly
   */
  this.dimensions = undefined;

  /**
   * Gets the number of padding voxels before the tile.
   * This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.paddingBefore = undefined;

  /**
   * Gets the number of padding voxels after the tile.
   * This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.paddingAfter = undefined;

  /**
   * The metadata class for this tileset.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {string|undefined}
   * @readonly
   */
  this.className = undefined;

  /**
   * Gets the metadata names.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {string[]}
   * @readonly
   */
  this.names = undefined;

  /**
   * Gets the metadata types.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {MetadataType[]}
   * @readonly
   */
  this.types = undefined;

  /**
   * Gets the metadata component types.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {MetadataComponentType[]}
   * @readonly
   */
  this.componentTypes = undefined;

  /**
   * Gets the metadata minimum values.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {number[][]|undefined}
   * @readonly
   */
  this.minimumValues = undefined;

  /**
   * Gets the metadata maximum values.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {number[][]|undefined}
   * @readonly
   */
  this.maximumValues = undefined;

  /**
   * The maximum number of tiles that exist for this provider.
   * This value is used as a hint to the voxel renderer to allocate an appropriate amount of GPU memory.
   * If this value is not known it can be undefined.
   *
   * @memberof Cesium3DTilesVoxelProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  this.maximumTileCount = undefined;

  this._implicitTileset = undefined;
  this._subtreeCache = new ImplicitSubtreeCache();
}

/**
 * Creates a {@link Cesium3DTilesVoxelProvider} that fetches voxel data from a 3D Tiles tileset.
 *
 * @param {Resource|string} url The URL to a tileset JSON file
 * @returns {Promise<Cesium3DTilesVoxelProvider>} The created provider
 *
 * @exception {RuntimeException} Root must have content
 * @exception {RuntimeException} Root tile content must have 3DTILES_content_voxels extension
 * @exception {RuntimeException} Root tile must have implicit tiling
 * @exception {RuntimeException} Tileset must have a metadata schema
 * @exception {RuntimeException} Only box, region and 3DTILES_bounding_volume_cylinder are supported in Cesium3DTilesVoxelProvider
 */
Cesium3DTilesVoxelProvider.fromUrl = async function (url) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  const resource = Resource.createIfNeeded(url);
  const tilesetJson = await resource.fetchJson();

  validate(tilesetJson);

  const schemaLoader = getMetadataSchemaLoader(tilesetJson, resource);
  await schemaLoader.load();

  const root = tilesetJson.root;
  const voxel = root.content.extensions["3DTILES_content_voxels"];
  const className = voxel.class;

  const metadataJson = hasExtension(tilesetJson, "3DTILES_metadata")
    ? tilesetJson.extensions["3DTILES_metadata"]
    : tilesetJson;

  const metadataSchema = schemaLoader.schema;
  const tilesetMetadata = new Cesium3DTilesetMetadata({
    metadataJson: metadataJson,
    schema: metadataSchema,
  });

  const provider = new Cesium3DTilesVoxelProvider();

  addAttributeInfo(provider, tilesetMetadata, className);

  const implicitTileset = new ImplicitTileset(resource, root, metadataSchema);

  const { shape, minBounds, maxBounds, shapeTransform, globalTransform } =
    getShape(root);

  provider.shape = shape;
  provider.minBounds = minBounds;
  provider.maxBounds = maxBounds;
  provider.dimensions = Cartesian3.unpack(voxel.dimensions);
  provider.shapeTransform = shapeTransform;
  provider.globalTransform = globalTransform;
  provider.maximumTileCount = getTileCount(tilesetMetadata);

  let paddingBefore;
  let paddingAfter;

  if (defined(voxel.padding)) {
    paddingBefore = Cartesian3.unpack(voxel.padding.before);
    paddingAfter = Cartesian3.unpack(voxel.padding.after);
  }

  provider.paddingBefore = paddingBefore;
  provider.paddingAfter = paddingAfter;

  provider._implicitTileset = implicitTileset;

  ResourceCache.unload(schemaLoader);

  return provider;
};

function getTileCount(metadata) {
  if (!defined(metadata.tileset)) {
    return undefined;
  }

  return metadata.tileset.getPropertyBySemantic(
    MetadataSemantic.TILESET_TILE_COUNT,
  );
}

function validate(tileset) {
  const root = tileset.root;

  if (!defined(root.content)) {
    throw new RuntimeError("Root must have content");
  }

  if (!hasExtension(root.content, "3DTILES_content_voxels")) {
    throw new RuntimeError(
      "Root tile content must have 3DTILES_content_voxels extension",
    );
  }

  if (
    !hasExtension(root, "3DTILES_implicit_tiling") &&
    !defined(root.implicitTiling)
  ) {
    throw new RuntimeError("Root tile must have implicit tiling");
  }

  if (
    !defined(tileset.schema) &&
    !defined(tileset.schemaUri) &&
    !hasExtension(tileset, "3DTILES_metadata")
  ) {
    throw new RuntimeError("Tileset must have a metadata schema");
  }
}

function getShape(tile) {
  const boundingVolume = tile.boundingVolume;

  let tileTransform;
  if (defined(tile.transform)) {
    tileTransform = Matrix4.unpack(tile.transform);
  } else {
    tileTransform = Matrix4.clone(Matrix4.IDENTITY);
  }

  if (defined(boundingVolume.box)) {
    return getBoxShape(boundingVolume.box, tileTransform);
  } else if (defined(boundingVolume.region)) {
    return getEllipsoidShape(boundingVolume.region);
  } else if (hasExtension(boundingVolume, "3DTILES_bounding_volume_cylinder")) {
    return getCylinderShape(
      boundingVolume.extensions["3DTILES_bounding_volume_cylinder"].cylinder,
      tileTransform,
    );
  }

  throw new RuntimeError(
    "Only box, region and 3DTILES_bounding_volume_cylinder are supported in Cesium3DTilesVoxelProvider",
  );
}

function getEllipsoidShape(region) {
  const west = region[0];
  const south = region[1];
  const east = region[2];
  const north = region[3];
  const minHeight = region[4];
  const maxHeight = region[5];

  const shapeTransform = Matrix4.fromScale(Ellipsoid.WGS84.radii);

  const minBounds = new Cartesian3(west, south, minHeight);
  const maxBounds = new Cartesian3(east, north, maxHeight);

  return {
    shape: VoxelShapeType.ELLIPSOID,
    minBounds: minBounds,
    maxBounds: maxBounds,
    shapeTransform: shapeTransform,
    globalTransform: Matrix4.clone(Matrix4.IDENTITY),
  };
}

function getBoxShape(box, tileTransform) {
  const obb = OrientedBoundingBox.unpack(box);
  const shapeTransform = Matrix4.fromRotationTranslation(
    obb.halfAxes,
    obb.center,
  );

  return {
    shape: VoxelShapeType.BOX,
    minBounds: Cartesian3.clone(VoxelBoxShape.DefaultMinBounds),
    maxBounds: Cartesian3.clone(VoxelBoxShape.DefaultMaxBounds),
    shapeTransform: shapeTransform,
    globalTransform: tileTransform,
  };
}

function getCylinderShape(cylinder, tileTransform) {
  const obb = OrientedBoundingBox.unpack(cylinder);
  const shapeTransform = Matrix4.fromRotationTranslation(
    obb.halfAxes,
    obb.center,
  );

  return {
    shape: VoxelShapeType.CYLINDER,
    minBounds: Cartesian3.clone(VoxelCylinderShape.DefaultMinBounds),
    maxBounds: Cartesian3.clone(VoxelCylinderShape.DefaultMaxBounds),
    shapeTransform: shapeTransform,
    globalTransform: tileTransform,
  };
}

function getMetadataSchemaLoader(tilesetJson, resource) {
  const { schemaUri, schema } = tilesetJson;
  if (!defined(schemaUri)) {
    return ResourceCache.getSchemaLoader({ schema });
  }
  return ResourceCache.getSchemaLoader({
    resource: resource.getDerivedResource({
      url: schemaUri,
    }),
  });
}

function addAttributeInfo(provider, metadata, className) {
  const { schema, statistics } = metadata;
  const classStatistics = statistics?.classes[className];
  const properties = schema.classes[className].properties;

  const propertyInfo = Object.entries(properties).map(([id, property]) => {
    const { type, componentType } = property;
    const min = classStatistics?.properties[id].min;
    const max = classStatistics?.properties[id].max;
    const componentCount = MetadataType.getComponentCount(type);
    const minValue = copyArray(min, componentCount);
    const maxValue = copyArray(max, componentCount);

    return { id, type, componentType, minValue, maxValue };
  });

  provider.className = className;
  provider.names = propertyInfo.map((info) => info.id);
  provider.types = propertyInfo.map((info) => info.type);
  provider.componentTypes = propertyInfo.map((info) => info.componentType);

  const minimumValues = propertyInfo.map((info) => info.minValue);
  const maximumValues = propertyInfo.map((info) => info.maxValue);
  const hasMinimumValues = minimumValues.some(defined);

  provider.minimumValues = hasMinimumValues ? minimumValues : undefined;
  provider.maximumValues = hasMinimumValues ? maximumValues : undefined;
}

function copyArray(values, length) {
  // Copy input values into a new array of a specified length.
  // If the input is not an array, its value will be copied into the first element
  // of the returned array. If the input is an array shorter than the returned
  // array, the extra elements in the returned array will be undefined. If the
  // input is undefined, the return will be undefined.
  if (!defined(values)) {
    return;
  }
  const valuesArray = Array.isArray(values) ? values : [values];
  return Array.from({ length }, (v, i) => valuesArray[i]);
}

async function getSubtree(provider, subtreeCoord) {
  const implicitTileset = provider._implicitTileset;
  const subtreeCache = provider._subtreeCache;

  // First load the subtree to check if the tile is available.
  // If the subtree has been requested previously it might still be in the cache
  let subtree = subtreeCache.find(subtreeCoord);
  if (defined(subtree)) {
    return subtree;
  }

  const subtreeRelative = implicitTileset.subtreeUriTemplate.getDerivedResource(
    {
      templateValues: subtreeCoord.getTemplateValues(),
    },
  );
  const subtreeResource = implicitTileset.baseResource.getDerivedResource({
    url: subtreeRelative.url,
  });

  const arrayBuffer = await subtreeResource.fetchArrayBuffer();
  // Check one more time if the subtree is in the cache.
  // This could happen if there are two in-flight tile requests from the same
  // subtree and one finishes before the other.
  subtree = subtreeCache.find(subtreeCoord);
  if (defined(subtree)) {
    return subtree;
  }

  const preprocessed = preprocess3DTileContent(arrayBuffer);
  subtree = await ImplicitSubtree.fromSubtreeJson(
    subtreeResource,
    preprocessed.jsonPayload,
    preprocessed.binaryPayload,
    implicitTileset,
    subtreeCoord,
  );
  subtreeCache.addSubtree(subtree);
  return subtree;
}

/**
 * Requests the data for a given tile.
 *
 * @private
 *
 * @param {object} [options] Object with the following properties:
 * @param {number} [options.tileLevel=0] The tile's level.
 * @param {number} [options.tileX=0] The tile's X coordinate.
 * @param {number} [options.tileY=0] The tile's Y coordinate.
 * @param {number} [options.tileZ=0] The tile's Z coordinate.
 * @privateparam {number} [options.keyframe=0] The requested keyframe.
 * @returns {Promise<VoxelContent>} A promise resolving to a VoxelContent containing the data for the tile.
 */
Cesium3DTilesVoxelProvider.prototype.requestData = async function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const {
    tileLevel = 0,
    tileX = 0,
    tileY = 0,
    tileZ = 0,
    keyframe = 0,
  } = options;

  if (keyframe !== 0) {
    return Promise.reject(
      `3D Tiles currently doesn't support time-dynamic data.`,
    );
  }

  // 1. Load the subtree that the tile belongs to (possibly from the subtree cache)
  // 2. Load the voxel content if available

  // Can't use a scratch variable here because the object is used inside the promise chain.
  const implicitTileset = this._implicitTileset;
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
  // If tileCoordinates is a subtree root, use its parent subtree
  const isSubtreeRoot =
    tileCoordinates.isSubtreeRoot() && tileCoordinates.level > 0;

  const subtreeCoord = isSubtreeRoot
    ? tileCoordinates.getParentSubtreeCoordinates()
    : tileCoordinates.getSubtreeCoordinates();

  const that = this;

  const subtree = await getSubtree(that, subtreeCoord);
  // NOTE: these two subtree methods are ONLY used by voxels!
  const isAvailable = isSubtreeRoot
    ? subtree.childSubtreeIsAvailableAtCoordinates
    : subtree.tileIsAvailableAtCoordinates;

  const available = isAvailable(tileCoordinates);

  if (!available) {
    return Promise.reject(
      `Tile is not available at level ${tileLevel}, x ${tileX}, y ${tileY}, z ${tileZ}.`,
    );
  }

  const { contentUriTemplates, baseResource } = implicitTileset;
  const gltfRelative = contentUriTemplates[0].getDerivedResource({
    templateValues: tileCoordinates.getTemplateValues(),
  });
  const gltfResource = baseResource.getDerivedResource({
    url: gltfRelative.url,
  });

  return VoxelContent.fromGltf(gltfResource);
};

export default Cesium3DTilesVoxelProvider;
