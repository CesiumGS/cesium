import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import Cesium3DTilesetMetadata from "./Cesium3DTilesetMetadata.js";
import hasExtension from "./hasExtension.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
import ImplicitSubtreeCache from "./ImplicitSubtreeCache.js";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates.js";
import ImplicitTileset from "./ImplicitTileset.js";
import MetadataType from "./MetadataType.js";
import preprocess3DTileContent from "./preprocess3DTileContent.js";
import ResourceCache from "./ResourceCache.js";
import VoxelBoxShape from "./VoxelBoxShape.js";
import VoxelContent from "./VoxelContent.js";
import VoxelCylinderShape from "./VoxelCylinderShape.js";
import VoxelShapeType from "./VoxelShapeType.js";

/**
 * A {@link VoxelProvider} that fetches voxel data from a 3D Tiles tileset.
 * <p>
 * Implements the {@link VoxelProvider} interface.
 * </p>
 *
 * @alias Cesium3DTilesVoxelProvider
 * @constructor
 * @augments VoxelProvider
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String|Promise<Resource>|Promise<String>} options.url The URL to a tileset JSON file.
 *
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

  /** @inheritdoc */
  this.ready = false;

  /** @inheritdoc */
  this.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

  /** @inheritdoc */
  this.shape = undefined;

  /** @inheritdoc */
  this.minBounds = undefined;

  /** @inheritdoc */
  this.maxBounds = undefined;

  /** @inheritdoc */
  this.dimensions = undefined;

  /** @inheritdoc */
  this.paddingBefore = undefined;

  /** @inheritdoc */
  this.paddingAfter = undefined;

  /** @inheritdoc */
  this.names = undefined;

  /** @inheritdoc */
  this.types = undefined;

  /** @inheritdoc */
  this.componentTypes = undefined;

  /** @inheritdoc */
  this.minimumValues = undefined;

  /** @inheritdoc */
  this.maximumValues = undefined;

  /** @inheritdoc */
  this.maximumTileCount = undefined;

  this._implicitTileset = undefined;
  this._subtreeCache = new ImplicitSubtreeCache();

  const that = this;
  let tilesetJson;

  this._readyPromise = Promise.resolve(options.url).then(function (url) {
    const resource = Resource.createIfNeeded(url);
    return resource
      .fetchJson()
      .then(function (tileset) {
        tilesetJson = tileset;
        validate(tilesetJson);
        return getMetadataSchemaLoader(tilesetJson, resource).promise;
      })
      .then(function (schemaLoader) {
        const root = tilesetJson.root;

        const metadataJson = hasExtension(tilesetJson, "3DTILES_metadata")
          ? tilesetJson.extensions["3DTILES_metadata"]
          : tilesetJson;

        const metadataSchema = schemaLoader.schema;
        const metadata = new Cesium3DTilesetMetadata({
          metadataJson: metadataJson,
          schema: metadataSchema,
        });

        addAttributeInfo(metadata, that);

        const implicitTileset = new ImplicitTileset(
          resource,
          root,
          metadataSchema
        );

        const voxel = root.content.extensions["3DTILES_content_voxels"];

        const { shape, transform, minBounds, maxBounds } = getShape(root);

        that.shape = shape;
        that.minBounds = minBounds;
        that.maxBounds = maxBounds;
        that.dimensions = Cartesian3.unpack(voxel.dimensions);
        that.paddingBefore = Cartesian3.unpack(voxel.padding.before);
        that.paddingAfter = Cartesian3.unpack(voxel.padding.after);
        that.modelMatrix = transform;

        // TODO: this tile class stuff needs to be documented
        that.maximumTileCount = metadata.statistics.classes.tile?.count;

        that._implicitTileset = implicitTileset;
        that.ready = true;
        return that;
      });
  });
}

Object.defineProperties(Cesium3DTilesVoxelProvider.prototype, {
  /** @inheritdoc */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

function validate(tileset) {
  const root = tileset.root;

  if (!defined(root.content)) {
    throw new RuntimeError("Root must have content");
  }

  if (!hasExtension(root.content, "3DTILES_content_voxels")) {
    throw new RuntimeError(
      "Root tile content must have 3DTILES_content_voxels extension"
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

  let tileTransform = Matrix4.IDENTITY;
  if (defined(tile.transform)) {
    tileTransform = Matrix4.unpack(tile.transform);
  }

  if (defined(boundingVolume.box)) {
    return getBoxShape(boundingVolume.box, tileTransform);
  } else if (defined(boundingVolume.region)) {
    return getEllipsoidShape(boundingVolume.region);
  } else if (hasExtension(boundingVolume, "3DTILES_bounding_volume_cylinder")) {
    return getCylinderShape(
      boundingVolume.extensions["3DTILES_bounding_volume_cylinder"].cylinder,
      tileTransform
    );
  }

  throw new RuntimeError(
    "Only box, region and 3DTILES_bounding_volume_cylinder are supported in Cesium3DTilesVoxelProvider"
  );
}

function getEllipsoidShape(region) {
  const west = region[0];
  const south = region[1];
  const east = region[2];
  const north = region[3];
  const minHeight = region[4];
  const maxHeight = region[5];

  const scale = Cartesian3.clone(Ellipsoid.WGS84.radii);
  const scaleFromHeight = new Cartesian3(maxHeight, maxHeight, maxHeight);
  Cartesian3.add(scale, scaleFromHeight);

  const shapeTransform = Matrix4.fromScale(scale);

  const minBoundsX = west;
  const maxBoundsX = east;
  const minBoundsY = south;
  const maxBoundsY = north;
  const minBoundsZ =
    (minHeight + Ellipsoid.WGS84.maximumRadius) /
    (maxHeight + Ellipsoid.WGS84.maximumRadius);
  const maxBoundsZ = 1.0;

  const minBounds = new Cartesian3(minBoundsX, minBoundsY, minBoundsZ);
  const maxBounds = new Cartesian3(maxBoundsX, maxBoundsY, maxBoundsZ);

  return {
    shape: VoxelShapeType.ELLIPSOID,
    minBounds: minBounds,
    maxBounds: maxBounds,
    transform: shapeTransform,
  };
}

function getBoxShape(box, tileTransform) {
  const obb = OrientedBoundingBox.unpack(box);
  const shapeTransform = Matrix4.fromRotationTranslation(
    obb.halfAxes,
    obb.center
  );

  const transform = Matrix4.multiply(
    tileTransform,
    shapeTransform,
    new Matrix4()
  );

  return {
    shape: VoxelShapeType.BOX,
    minBounds: Cartesian3.clone(VoxelBoxShape.DefaultMinBounds),
    maxBounds: Cartesian3.clone(VoxelBoxShape.DefaultMaxBounds),
    transform: transform,
  };
}

function getCylinderShape(cylinder, tileTransform) {
  const obb = OrientedBoundingBox.unpack(cylinder);
  const shapeTransform = Matrix4.fromRotationTranslation(
    obb.halfAxes,
    obb.center
  );

  const transform = Matrix4.multiply(
    tileTransform,
    shapeTransform,
    new Matrix4()
  );

  return {
    shape: VoxelShapeType.CYLINDER,
    minBounds: Cartesian3.clone(VoxelCylinderShape.DefaultMinBounds),
    maxBounds: Cartesian3.clone(VoxelCylinderShape.DefaultMaxBounds),
    transform: transform,
  };
}

function getMetadataSchemaLoader(tilesetJson, resource) {
  const { schemaUri, schema } = tilesetJson;
  if (!defined(schemaUri)) {
    return ResourceCache.loadSchema({ schema });
  }
  return ResourceCache.loadSchema({
    resource: resource.getDerivedResource({
      url: schemaUri,
    }),
  });
}

function addAttributeInfo(metadata, provider) {
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

  provider.names = propertyInfo.map((info) => info.name);
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

function getVoxelPromise(implicitTileset, tileCoordinates) {
  const voxelRelative = implicitTileset.contentUriTemplates[0].getDerivedResource(
    {
      templateValues: tileCoordinates.getTemplateValues(),
    }
  );
  const voxelResource = implicitTileset.baseResource.getDerivedResource({
    url: voxelRelative.url,
  });

  return voxelResource.fetchArrayBuffer().then(function (arrayBuffer) {
    const preprocessed = preprocess3DTileContent(arrayBuffer);

    const voxelContent = new VoxelContent(
      voxelResource,
      preprocessed.jsonPayload,
      preprocessed.binaryPayload,
      implicitTileset.metadataSchema
    );

    return voxelContent.readyPromise;
  });
}

function getSubtreePromise(provider, subtreeCoord) {
  const implicitTileset = provider._implicitTileset;
  const subtreeCache = provider._subtreeCache;

  // First load the subtree to check if the tile is available.
  // If the subtree has been requested previously it might still be in the cache
  const subtree = subtreeCache.find(subtreeCoord);
  if (defined(subtree)) {
    return subtree.readyPromise;
  }

  const subtreeRelative = implicitTileset.subtreeUriTemplate.getDerivedResource(
    {
      templateValues: subtreeCoord.getTemplateValues(),
    }
  );
  const subtreeResource = implicitTileset.baseResource.getDerivedResource({
    url: subtreeRelative.url,
  });

  return subtreeResource.fetchArrayBuffer().then(function (arrayBuffer) {
    // Check one more time if the subtree is in the cache.
    // This could happen if there are two in-flight tile requests from the same
    // subtree and one finishes before the other.
    let subtree = subtreeCache.find(subtreeCoord);
    if (defined(subtree)) {
      return subtree.readyPromise;
    }

    const preprocessed = preprocess3DTileContent(arrayBuffer);
    subtree = new ImplicitSubtree(
      subtreeResource,
      preprocessed.jsonPayload,
      preprocessed.binaryPayload,
      implicitTileset,
      subtreeCoord
    );
    subtreeCache.addSubtree(subtree);
    return subtree.readyPromise;
  });
}

/** @inheritdoc */
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
  // 2. Load the voxel content if available

  const implicitTileset = this._implicitTileset;
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
  // If tileCoordinates is a subtree root, use its parent subtree
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

      if (!available) {
        return Promise.reject("Tile is not available");
      }

      return getVoxelPromise(implicitTileset, tileCoordinates);
    })
    .then(function (voxelContent) {
      return names.map(function (name) {
        return voxelContent.metadataTable.getPropertyTypedArray(name);
      });
    });
};

export default Cesium3DTilesVoxelProvider;
