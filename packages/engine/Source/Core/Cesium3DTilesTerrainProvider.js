import BoundingSphere from "./BoundingSphere.js";
import Cesium3DTilesTerrainData from "./Cesium3DTilesTerrainData.js";
import CesiumMath from "./Math.js";
import Check from "./Check.js";
import Credit from "./Credit.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import DoubleEndedPriorityQueue from "./DoubleEndedPriorityQueue.js";
import Ellipsoid from "./Ellipsoid.js";
import Event from "./Event.js";
import Frozen from "./Frozen.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import ImplicitSubtree from "../Scene/ImplicitSubtree.js";
import ImplicitTileCoordinates from "../Scene/ImplicitTileCoordinates.js";
import IonResource from "./IonResource.js";
import ImplicitTileset from "../Scene/ImplicitTileset.js";
import loadImageFromTypedArray from "./loadImageFromTypedArray.js";
import MetadataSchema from "../Scene/MetadataSchema.js";
import MetadataSchemaLoader from "../Scene/MetadataSchemaLoader.js";
import MetadataSemantic from "../Scene/MetadataSemantic.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import parseGlb from "../Scene/GltfPipeline/parseGlb.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";
import ResourceCache from "../Scene/ResourceCache.js";
import RuntimeError from "./RuntimeError.js";
import TerrainProvider from "./TerrainProvider.js";

/**
 * @private
 * @param {Number} level The level of the tile
 * @param {Number} x The x coordinate of the tile
 * @returns {Number}
 */
function getRootIdFromGeographic(level, x) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  //>>includeEnd('debug');

  const nuberOfYTilesAtLevel = 1 << level;
  const rootId = (x / nuberOfYTilesAtLevel) | 0;
  return rootId;
}

/**
 * @private
 * @param {ImplicitTileset} implicitTileset
 * @param {Number} level The level of the tile
 * @param {Number} x The x coordinate of the tile
 * @param {Number} y The y coordinate of the tile
 * @returns {ImplicitTileCoordinates}
 */
function getImplicitTileCoordinatesFromGeographicCoordinates(
  implicitTileset,
  level,
  x,
  y,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  //>>includeEnd('debug');

  const nuberOfYTilesAtLevel = 1 << level;
  const implicitLevel = level;
  const implicitX = x % nuberOfYTilesAtLevel;
  const implicitY = nuberOfYTilesAtLevel - y - 1;
  // @ts-ignore
  const subdivisionScheme = implicitTileset.subdivisionScheme;
  // @ts-ignore
  const subtreeLevels = implicitTileset.subtreeLevels;

  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: implicitLevel,
    x: implicitX,
    y: implicitY,
  });
}

/**
 * @private
 * @param {ImplicitTileset} implicitTileset
 * @param {Number} level The level of the tile
 * @param {Number} x The x coordinate of the tile
 * @param {Number} y The y coordinate of the tile
 * @returns {ImplicitTileCoordinates}
 */
function getImplicitTileCoordinates(implicitTileset, level, x, y) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  //>>includeEnd('debug');

  // @ts-ignore
  const subdivisionScheme = implicitTileset.subdivisionScheme;
  // @ts-ignore
  const subtreeLevels = implicitTileset.subtreeLevels;

  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: level,
    x: x,
    y: y,
  });
}

/**
 * @private
 * @param {ImplicitTileset} implicitTileset
 * @param {ImplicitTileCoordinates} subtreeCoord
 * @param {Number} u
 * @param {Number} v
 * @param {Number} levelOffset
 * @returns {ImplicitTileCoordinates} The parent subtree coordinate
 */

function computeDescendantCoordinatesAtUv(
  implicitTileset,
  subtreeCoord,
  u,
  v,
  levelOffset,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.object("subtreeCoord", subtreeCoord);
  Check.typeOf.number("u", u);
  Check.typeOf.number("v", v);
  Check.typeOf.number("levelOffset", levelOffset);
  //>>includeEnd('debug');

  const dimension = 1 << levelOffset;
  const localX = CesiumMath.clamp((u * dimension) | 0, 0, dimension - 1);
  const localY = CesiumMath.clamp((v * dimension) | 0, 0, dimension - 1);
  const offset = getImplicitTileCoordinates(
    implicitTileset,
    levelOffset,
    localX,
    localY,
  );
  // @ts-ignore
  return subtreeCoord.getDescendantCoordinates(offset);
}

/**
 * @private
 * @param {ImplicitTileset} implicitTileset
 * @param {ImplicitSubtree} subtree
 * @param {ImplicitTileCoordinates} coord
 * @param {Number} x
 * @param {Number} y
 * @returns {Boolean}
 */
function isChildAvailable(implicitTileset, subtree, coord, x, y) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.object("subtree", subtree);
  Check.typeOf.object("coord", coord);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  //>>includeEnd('debug');

  // For terrain it's required that the root tile of any available subtree is also available, so when the child tile belongs to a child subtree, we only need to check if the child subtree itself is available.
  // @ts-ignore
  const isBottomOfSubtree = coord.isBottomOfSubtree();

  const localLevel = 1;
  const offset = getImplicitTileCoordinates(implicitTileset, localLevel, x, y);
  // @ts-ignore
  const childCoord = coord.getDescendantCoordinates(offset);

  const isAvailable = isBottomOfSubtree
    ? // @ts-ignore
      subtree.childSubtreeIsAvailableAtCoordinates(childCoord)
    : // @ts-ignore
      subtree.tileIsAvailableAtCoordinates(childCoord);

  return isAvailable;
}

/**
 * @typedef {Object} Cesium3DTilesTerrainProvider.ConstructorOptions
 *
 * Initialization options for the Cesium3DTilesTerrainProvider constructor
 *
 * @property {boolean} [requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server, in the form of per vertex normals if available.
 * @property {boolean} [requestWaterMask=false] Flag that indicates if the client should request per tile water masks from the server, if available.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 */

/**
 * A {@link TerrainProvider} that accesses terrain data in a 3D Tiles format.
 *
 * @alias Cesium3DTilesTerrainProvider
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @constructor
 *
 * @param {Cesium3DTilesTerrainProvider.ConstructorOptions}[options] An object describing initialization options
 *
 * @see TerrainProvider
 * @see Cesium3DTilesTerrainProvider.fromUrl
 * @see Cesium3DTilesTerrainProvider.fromIonAssetId
 *
 * // Create GTOPO30 with vertex normals
 * try {
 *   const viewer = new Cesium.Viewer("cesiumContainer", {
 *     terrainProvider: await Cesium.Cesium3DTilesTerrainProvider.fromIonAssetId(2732686, {
 *         requestVertexNormals: true
 *     })
 *   });
 * } catch (error) {
 *   console.log(error);
 * }
 */
function Cesium3DTilesTerrainProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;
  /** @type {Credit[]} */
  // @ts-ignore
  this._tileCredits = undefined;

  this._errorEvent = new Event();

  this._ellipsoid = options.ellipsoid ?? Ellipsoid.WGS84;

  this._tilingScheme = new GeographicTilingScheme({
    ellipsoid: this._ellipsoid,
  });

  this._subtreeCache = new ImplicitSubtreeCache({
    provider: this,
  });

  /**
   * @private
   * @type {ImplicitTileset|undefined}
   */
  this._tileset0 = undefined;
  /**
   * @private
   * @type {ImplicitTileset|undefined}
   */
  this._tileset1 = undefined;

  /** @type {Resource} */
  // @ts-ignore
  this._resource = undefined;

  /**
   * Boolean flag that indicates if the client should request vertex normals from the server.
   * @type {boolean}
   * @default false
   * @private
   */
  this._requestVertexNormals = options.requestVertexNormals ?? false;

  /**
   * Boolean flag that indicates if the client should request tile watermasks from the server.
   * @type {boolean}
   * @default false
   * @private
   */
  this._requestWaterMask = options.requestWaterMask ?? false;
}

/**
 * Creates a {@link TerrainProvider} that accesses terrain data in a Cesium 3D Tiles format.
 *
 * @param {Resource|String|Promise<Resource>|Promise<String>} url The URL of the Cesium terrain server.
 * @param {Cesium3DTilesTerrainProvider.ConstructorOptions} [options] An object describing initialization options.
 * @returns {Promise<Cesium3DTilesTerrainProvider>}
 *
 * @example
 * // Create terrain with normals.
 * try {
 *   const viewer = new Cesium.Viewer("cesiumContainer", {
 *     terrainProvider: await Cesium.Cesium3DTilesTerrainProvider.fromUrl(
 *       Cesium.IonResource.fromAssetId(3956), {
 *         requestVertexNormals: true
 *     })
 *   });
 * } catch (error) {
 *   console.log(error);
 * }
 */
Cesium3DTilesTerrainProvider.fromUrl = async function (url, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  options = options ?? Frozen.EMPTY_OBJECT;

  url = await Promise.resolve(url);
  const resource = Resource.createIfNeeded(url);

  let tilesetJson;
  try {
    tilesetJson = await resource.fetchJson();
  } catch (error) {
    throw new RuntimeError("Could not load tileset JSON", error);
  }

  const provider = new Cesium3DTilesTerrainProvider(options);
  // ion resources have a credits property we can use for additional attribution.
  // @ts-ignore
  provider._tileCredits = resource.credits;
  provider._resource = resource;

  const childrenJson = tilesetJson["root"]["children"];
  const child0Json = childrenJson[0];
  const child1Json = childrenJson[1];

  const metadataSchemaJson = tilesetJson["schema"];
  const metadataSchema = MetadataSchema.fromJson(metadataSchemaJson);

  provider._tileset0 = new ImplicitTileset(
    resource,
    child0Json,
    metadataSchema,
  );
  provider._tileset1 = new ImplicitTileset(
    resource,
    child1Json,
    metadataSchema,
  );

  return provider;
};

async function loadWaterMask(gltf, gltfResource) {
  if (!defined(gltf.extensions)) {
    return;
  }

  const extension = gltf.extensions["EXT_structural_metadata"];
  if (!defined(extension)) {
    return;
  }

  if (!defined(extension.propertyTextures)) {
    return;
  }

  const schemaLoader = new MetadataSchemaLoader({
    schema: extension.schema,
  });

  await schemaLoader.load();
  const schema = schemaLoader.schema;

  let metadataClass, waterMaskProperty;
  if (defined(schema.classes)) {
    for (const classId in schema.classes) {
      if (schema.classes.hasOwnProperty(classId)) {
        metadataClass = schema.classes[classId];
        waterMaskProperty = metadataClass.propertiesBySemantic["WATERMASK"];
        if (defined(waterMaskProperty)) {
          break;
        }
      }
    }
  }

  if (!defined(waterMaskProperty)) {
    return;
  }

  const propertyTextureData = extension.propertyTextures.find(
    (data) => data.class === metadataClass.id,
  );
  if (!defined(propertyTextureData)) {
    throw new DeveloperError(
      `Expected a propertyTexture with a class ${metadataClass.id}`,
    );
  }

  const textureInfo = propertyTextureData.properties[waterMaskProperty.id];
  const texture = gltf.textures[textureInfo.index];
  const bufferViewId = gltf.images[texture.source]?.bufferView;

  const bufferViewLoader = ResourceCache.getBufferViewLoader({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: gltfResource,
  });
  await bufferViewLoader.load();

  const image = await loadImageFromTypedArray({
    uint8Array: new Uint8Array(bufferViewLoader.typedArray),
    format: "image/png",
    flipY: false,
    skipColorSpaceConversion: true,
  });

  return image;
}

/**
 * Creates a {@link TerrainProvider} from a Cesium ion asset ID that accesses terrain data in a Cesium terrain format
 * Terrain formats can be one of the following:
 * <ul>
 * <li> {@link https://github.com/AnalyticalGraphicsInc/quantized-mesh Quantized Mesh} </li>
 * <li> {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/heightmap-1.0 Height Map} </li>
 * </ul>
 *
 * @param {number} assetId The Cesium ion asset id.
 * @param {CesiumTerrainProvider.ConstructorOptions} [options] An object describing initialization options.
 * @returns {Promise<CesiumTerrainProvider>}
 *
 * @example
 * // Create GTOPO30 with vertex normals
 * try {
 *   const viewer = new Cesium.Viewer("cesiumContainer", {
 *     terrainProvider: await Cesium.Cesium3DTilesTerrainProvider.fromIonAssetId(2732686, {
 *         requestVertexNormals: true
 *     })
 *   });
 * } catch (error) {
 *   console.log(error);
 * }
 *
 * @exception {RuntimeError} layer.json does not specify a format
 * @exception {RuntimeError} layer.json specifies an unknown format
 * @exception {RuntimeError} layer.json specifies an unsupported quantized-mesh version
 * @exception {RuntimeError} layer.json does not specify a tiles property, or specifies an empty array
 * @exception {RuntimeError} layer.json does not specify any tile URL templates
 */
Cesium3DTilesTerrainProvider.fromIonAssetId = async function (
  assetId,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("assetId", assetId);
  //>>includeEnd('debug');

  const resource = await IonResource.fromAssetId(assetId);
  return Cesium3DTilesTerrainProvider.fromUrl(resource, options);
};

const scratchPromises = new Array(3);

/**
 * Requests the geometry for a given tile. This function should not be called before
 * {@link Cesium3DTilesTerrainProvider#ready} returns true. The result must include terrain data and
 * may optionally include a water mask and an indication of which child tiles are available.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @param {Request} [request] The request object. Intended for internal use only.
 *
 * @returns {Promise.<Cesium3DTilesTerrainData>|undefined} A promise for the requested geometry. If this method
 *          returns undefined instead of a promise, it is an indication that too many requests are already
 *          pending and the request will be retried later.
 */
Cesium3DTilesTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request,
) {
  const rootId = getRootIdFromGeographic(level, x);
  const implicitTileset = rootId === 0 ? this._tileset0 : this._tileset1;

  const tileCoord = getImplicitTileCoordinatesFromGeographicCoordinates(
    implicitTileset,
    level,
    x,
    y,
  );

  // @ts-ignore
  const subtreeCoord = tileCoord.getSubtreeCoordinates();

  const cache = this._subtreeCache;
  let subtree = cache.find(rootId, subtreeCoord);

  const requestWaterMask = this._requestWaterMask;
  const that = this;

  /** @type {Promise<ImplicitSubtree>} */
  let subtreePromise;
  if (subtree === undefined) {
    // @ts-ignore
    const subtreeRelative =
      implicitTileset.subtreeUriTemplate.getDerivedResource({
        // @ts-ignore
        templateValues: subtreeCoord.getTemplateValues(),
      });
    // @ts-ignore
    const subtreeResource = implicitTileset.baseResource.getDerivedResource({
      // @ts-ignore
      url: subtreeRelative.url,
    });
    // @ts-ignore
    subtreePromise = subtreeResource
      .fetchArrayBuffer()
      .then(async function (arrayBuffer) {
        // Check if the subtree exists again in case multiple fetches for the same subtree went out at the same time. Don't want to double-add to the cache
        subtree = cache.find(rootId, subtreeCoord);
        if (subtree === undefined) {
          const bufferU8 = new Uint8Array(arrayBuffer);
          subtree = await ImplicitSubtree.fromSubtreeJson(
            that._resource,
            undefined,
            bufferU8,
            implicitTileset,
            subtreeCoord,
          );
          cache.addSubtree(rootId, subtree);
        }

        return subtree;
      });
  } else {
    subtreePromise = Promise.resolve(subtree);
  }

  // Note: only one content for terrain
  // @ts-ignore
  const glbRelative = implicitTileset.contentUriTemplates[0].getDerivedResource(
    {
      // @ts-ignore
      templateValues: tileCoord.getTemplateValues(),
    },
  );
  // @ts-ignore
  const glbResource = implicitTileset.baseResource.getDerivedResource({
    // @ts-ignore
    url: glbRelative.url,
  });

  // Start fetching the glb right away -- possibly even before the subtree is loaded in some cases
  /** @type {Promise.<ArrayBuffer>} */
  // @ts-ignore
  const glbPromise = glbResource.fetchArrayBuffer();
  if (glbPromise === undefined) {
    return undefined;
  }

  const gltfPromise = glbPromise.then((glbBuffer) =>
    parseGlb(new Uint8Array(glbBuffer)),
  );

  const promises = scratchPromises;
  promises[0] = subtreePromise;
  promises[1] = gltfPromise;
  promises[2] = requestWaterMask
    ? gltfPromise.then((gltf) => loadWaterMask(gltf, glbResource))
    : undefined;

  // @ts-ignore
  return Promise.all(promises)
    .then(function (results) {
      const subtree = results[0];
      const gltf = results[1];
      const waterMask = results[2];

      /** @type {ImplicitMetadataView} */
      const metadataView = subtree.getTileMetadataView(tileCoord);

      // @ts-ignore
      const minimumHeight = metadataView.getPropertyBySemantic(
        MetadataSemantic.TILE_MINIMUM_HEIGHT,
      );

      // @ts-ignore
      const maximumHeight = metadataView.getPropertyBySemantic(
        MetadataSemantic.TILE_MAXIMUM_HEIGHT,
      );

      // @ts-ignore
      const boundingSphereArray = metadataView.getPropertyBySemantic(
        MetadataSemantic.TILE_BOUNDING_SPHERE,
      );
      const boundingSphere = BoundingSphere.unpack(
        boundingSphereArray,
        0,
        new BoundingSphere(),
      );

      // @ts-ignore
      const horizonOcclusionPoint = metadataView.getPropertyBySemantic(
        MetadataSemantic.TILE_HORIZON_OCCLUSION_POINT,
      );

      const tilingScheme = that._tilingScheme;

      // The tiling scheme uses geographic coords, not implicit coords
      const rectangle = tilingScheme.tileXYToRectangle(
        x,
        y,
        level,
        new Rectangle(),
      );

      const ellipsoid = that._ellipsoid;

      const orientedBoundingBox = OrientedBoundingBox.fromRectangle(
        rectangle,
        minimumHeight,
        maximumHeight,
        ellipsoid,
        new OrientedBoundingBox(),
      );

      const skirtHeight = that.getLevelMaximumGeometricError(level) * 5.0;

      const hasSW = isChildAvailable(implicitTileset, subtree, tileCoord, 0, 0);
      const hasSE = isChildAvailable(implicitTileset, subtree, tileCoord, 1, 0);
      const hasNW = isChildAvailable(implicitTileset, subtree, tileCoord, 0, 1);
      const hasNE = isChildAvailable(implicitTileset, subtree, tileCoord, 1, 1);
      const childTileMask =
        (hasSW ? 1 : 0) | (hasSE ? 2 : 0) | (hasNW ? 4 : 0) | (hasNE ? 8 : 0);

      const terrainData = new Cesium3DTilesTerrainData({
        gltf: gltf,
        minimumHeight: minimumHeight,
        maximumHeight: maximumHeight,
        boundingSphere: boundingSphere,
        orientedBoundingBox: orientedBoundingBox,
        horizonOcclusionPoint: horizonOcclusionPoint,
        skirtHeight: skirtHeight,
        requestVertexNormals: that._requestVertexNormals,
        childTileMask: childTileMask,
        credits: that._tileCredits,
        waterMask: waterMask,
      });

      return Promise.resolve(terrainData);
    })
    .catch(function (err) {
      console.log(
        `Could not load subtree: ${rootId} ${subtreeCoord.level} ${subtreeCoord.x} ${subtreeCoord.y}: ${err}`,
      );

      console.log(
        `Could not load tile: ${rootId} ${tileCoord.level} ${tileCoord.x} ${tileCoord.y}: ${err}`,
      );
      return undefined;
    });
};

/**
 * Determines whether data for a tile is available to be loaded.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {Boolean|undefined} Undefined if not supported or availability is unknown, otherwise true or false.
 */
Cesium3DTilesTerrainProvider.prototype.getTileDataAvailable = function (
  x,
  y,
  level,
) {
  const cache = this._subtreeCache;

  const rootId = getRootIdFromGeographic(level, x);
  const implicitTileset = rootId === 0 ? this._tileset0 : this._tileset1;
  const tileCoord = getImplicitTileCoordinatesFromGeographicCoordinates(
    implicitTileset,
    level,
    x,
    y,
  );

  // @ts-ignore
  const subtreeCoord = tileCoord.getSubtreeCoordinates();
  const subtree = cache.find(rootId, subtreeCoord);

  // If the subtree is loaded, return the tile's availability
  if (subtree !== undefined) {
    // @ts-ignore
    const available = subtree.tileIsAvailableAtCoordinates(tileCoord);
    return available;
  }

  // If the root subtree...
  // @ts-ignore
  if (subtreeCoord.isImplicitTilesetRoot()) {
    // @ts-ignore
    if (tileCoord.isSubtreeRoot()) {
      // The subtree's root tile is always available
      return true;
    }
    // Don't know if the tile is available because its subtree hasn't been loaded yet
    return undefined;
  }

  // @ts-ignore
  const parentSubtreeCoord = subtreeCoord.getParentSubtreeCoordinates();

  // Check the parent subtree's child subtree availability to know if this subtree is available.
  const parentSubtree = cache.find(rootId, parentSubtreeCoord);
  if (parentSubtree !== undefined) {
    // @ts-ignore
    const isChildSubtreeAvailable =
      parentSubtree.childSubtreeIsAvailableAtCoordinates(subtreeCoord);

    return isChildSubtreeAvailable
      ? // @ts-ignore
        tileCoord.isSubtreeRoot()
        ? // The root tile of the subtree is always available
          true
        : // Don't know if available because the subtree hasn't been loaded yet
          undefined
      : // Child subtree not available, so this tile isn't either
        false;
  }

  // The parent subtree isn't loaded either, so we don't even know if the child subtree is available
  return undefined;
};

/**
 * Makes sure we load availability data for a tile
 *
 * @param {Number} _x The X coordinate of the tile for which to request geometry.
 * @param {Number} _y The Y coordinate of the tile for which to request geometry.
 * @param {Number} _level The level of the tile for which to request geometry.
 * @returns {Promise<void>|undefined} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
 */
Cesium3DTilesTerrainProvider.prototype.loadTileDataAvailability = function (
  _x,
  _y,
  _level,
) {
  return undefined;
};

/**
 * Gets the maximum geometric error allowed in a tile at a given level.
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error.
 */
Cesium3DTilesTerrainProvider.prototype.getLevelMaximumGeometricError =
  function (level) {
    const ellipsoid = this._ellipsoid;
    const rootError =
      TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        ellipsoid,
        64,
        2,
      );
    return rootError / (1 << level);
  };

Object.defineProperties(Cesium3DTilesTerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error. By subscribing
   * to the event, you will be notified of the error and can potentially recover from it. Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof Cesium3DTilesTerrainProvider.prototype
   * @type {Event}
   */
  // @ts-ignore
  errorEvent: {
    // @ts-ignore
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this terrain provider is active. Typically this is used to credit
   * the source of the terrain.
   * @memberof Cesium3DTilesTerrainProvider.prototype
   * @type {Credit}
   */
  // @ts-ignore
  credit: {
    // @ts-ignore
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets the tiling scheme used by the provider.
   * @memberof Cesium3DTilesTerrainProvider.prototype
   * @type {TilingScheme}
   */
  // @ts-ignore
  tilingScheme: {
    // @ts-ignore
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask. The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.
   * @memberof Cesium3DTilesTerrainProvider.prototype
   * @type {Boolean}
   */
  // @ts-ignore
  hasWaterMask: {
    get: function () {
      return this._requestWaterMask;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * @memberof Cesium3DTilesTerrainProvider.prototype
   * @type {Boolean}
   */
  // @ts-ignore
  hasVertexNormals: {
    get: function () {
      return this._requestVertexNormals;
    },
  },

  /**
   * Gets an object that can be used to determine availability of terrain from this provider, such as
   * at points and in rectangles.
   * @memberof Cesium3DTilesTerrainProvider.prototype
   * @type {TileAvailability|undefined}
   */
  // @ts-ignore
  availability: {
    // @ts-ignore
    get: function () {
      return this._subtreeCache;
    },
  },
});

/**
 * @private
 * @constructor
 * @param {Number} rootId
 * @param {ImplicitSubtree} subtree
 * @param {Number} stamp
 */
function ImplicitSubtreeCacheNode(rootId, subtree, stamp) {
  this.rootId = rootId;
  this.subtree = subtree;
  this.stamp = stamp;
}

/**
 * @private
 * @constructor
 * @param {Object} options Object with the following properties
 * @param {Cesium3DTilesTerrainProvider} options.provider
 * @param {Number} [options.maximumSubtreeCount=0] The total number of subtrees this cache can store. If adding a new subtree would exceed this limit, the lowest priority subtrees will be removed until there is room, unless the subtree that is going to be removed is the parent of the new subtree, in which case it will not be removed and the new subtree will still be added, exceeding the memory limit.
 */
function ImplicitSubtreeCache(options) {
  this._maximumSubtreeCount = options.maximumSubtreeCount ?? 0;
  this._subtreeRequestCounter = 0;

  this._queue = new DoubleEndedPriorityQueue({
    comparator: ImplicitSubtreeCache.comparator,
  });

  this._provider = options.provider;
}

/**
 * @param {ImplicitSubtreeCacheNode} a
 * @param {ImplicitSubtreeCacheNode} b
 * @returns {Number}
 */
ImplicitSubtreeCache.comparator = function (a, b) {
  // @ts-ignore
  const aCoord = a.subtree.implicitCoordinates;
  // @ts-ignore
  const bCoord = b.subtree.implicitCoordinates;
  // @ts-ignore
  if (aCoord.isAncestor(bCoord)) {
    // This shouldn't happen
    // The ancestor subtree should have been added first
    return +1.0;
    // @ts-ignore
  } else if (bCoord.isAncestor(aCoord)) {
    return -1.0;
  }
  return a.stamp - b.stamp;
};

/**
 * @param {Number} rootId
 * @param {ImplicitSubtree} subtree
 */
ImplicitSubtreeCache.prototype.addSubtree = function (rootId, subtree) {
  const cacheNode = new ImplicitSubtreeCacheNode(
    rootId,
    subtree,
    this._subtreeRequestCounter,
  );
  this._queue.insert(cacheNode);

  this._subtreeRequestCounter++;

  // @ts-ignore
  const subtreeCoord = subtree.implicitCoordinates;

  // Make sure the parent subtree exists in the cache
  // @ts-ignore
  if (subtreeCoord.level > 0) {
    // @ts-ignore
    const parentCoord = subtreeCoord.getParentSubtreeCoordinates();
    const parentNode = this.find(rootId, parentCoord);

    //>>includeStart('debug', pragmas.debug)
    if (parentNode === undefined) {
      throw new DeveloperError("parent node needs to exist");
    }
    //>>includeEnd('debug');
  }

  if (this._maximumSubtreeCount > 0) {
    // @ts-ignore
    while (this._queue.length > this._maximumSubtreeCount) {
      /** @type {ImplicitSubtreeCacheNode} */
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
 * @param {Number} rootId
 * @param {ImplicitTileCoordinates} subtreeCoord
 * @returns {ImplicitSubtree|undefined}
 */
ImplicitSubtreeCache.prototype.find = function (rootId, subtreeCoord) {
  const queue = this._queue;
  /** @type {ImplicitSubtreeCacheNode[]} */
  // @ts-ignore
  const array = queue.internalArray;
  // @ts-ignore
  const arrayLength = queue.length;

  for (let i = 0; i < arrayLength; i++) {
    const other = array[i];
    const otherRootId = other.rootId;
    const otherSubtree = other.subtree;
    // @ts-ignore
    const otherCoord = otherSubtree.implicitCoordinates;
    if (
      otherRootId === rootId &&
      // @ts-ignore
      otherCoord.level === subtreeCoord.level &&
      // @ts-ignore
      otherCoord.x === subtreeCoord.x &&
      // @ts-ignore
      otherCoord.y === subtreeCoord.y
    ) {
      return other.subtree;
    }
  }
  return undefined;
};

/**
 * Determines the {@link ImplicitTileCoordinates} of the most detailed tile covering the position.
 *
 * @param {Cartographic} position The position for which to determine the maximum coordinates. The height component is ignored.
 * @returns {ImplicitTileCoordinates|undefined} The coordinates of the most detailed tile covering the position.
 * @throws {DeveloperError} If position is outside any tile according to the tiling scheme.
 */

ImplicitSubtreeCache.prototype._computeMaximumImplicitTileCoordinatesAtPosition =
  function (position) {
    const provider = this._provider;
    const rootId = position.longitude < 0.0 ? 0 : 1;
    const implicitTileset =
      rootId === 0 ? provider._tileset0 : provider._tileset1;
    // @ts-ignore
    const subtreeLevels = implicitTileset.subtreeLevels;
    const rootSubtreeCoord = getImplicitTileCoordinates(
      implicitTileset,
      0,
      0,
      0,
    );

    let subtree = this.find(rootId, rootSubtreeCoord);
    if (subtree === undefined) {
      // Nothing has been loaded yet
      return undefined;
    }

    // @ts-ignore
    let subtreeCoord = subtree.implicitCoordinates;
    // @ts-ignore
    let subtreeX = subtreeCoord.x;
    // @ts-ignore
    let subtreeY = subtreeCoord.y;
    // @ts-ignore
    let subtreeLevel = subtreeCoord.level;

    const longitude = position.longitude;
    const latitude = position.latitude;

    const globalMinimumLongitude = -CesiumMath.PI;
    const globalMaximumLongitude = +CesiumMath.PI;
    const rootLongitudeStart = CesiumMath.lerp(
      globalMinimumLongitude,
      globalMaximumLongitude,
      rootId / 2.0,
    );
    const rootLongitudeEnd = CesiumMath.lerp(
      globalMinimumLongitude,
      globalMaximumLongitude,
      (rootId + 1) / 2,
    );
    const rootLatitudeStart = -CesiumMath.PI * 0.5;
    const rootLatitudeEnd = +CesiumMath.PI * 0.5;

    let u = 0.0;
    let v = 0.0;

    // Find the deepest available subtree
    let childSubtreeLoaded = true;
    while (childSubtreeLoaded) {
      const invDim = 1.0 / (1 << subtreeLevel);

      const lonLength = (rootLongitudeEnd - rootLongitudeStart) * invDim;
      const lonMin = rootLongitudeStart + subtreeX * lonLength;

      const latLength = (rootLatitudeEnd - rootLatitudeStart) * invDim;
      const latMin = rootLatitudeStart + subtreeY * latLength;

      u = (longitude - lonMin) / lonLength;
      v = (latitude - latMin) / latLength;

      const childSubtreeCoord = computeDescendantCoordinatesAtUv(
        implicitTileset,
        subtreeCoord,
        u,
        v,
        subtreeLevels,
      );

      // @ts-ignore
      if (subtree.childSubtreeIsAvailableAtCoordinates(childSubtreeCoord)) {
        const childSubtree = this.find(rootId, childSubtreeCoord);
        if (childSubtree !== undefined) {
          // Update all constiables and keep looping
          subtree = childSubtree;
          // @ts-ignore
          subtreeCoord = subtree.implicitCoordinates;
          // @ts-ignore
          subtreeX = subtreeCoord.x;
          // @ts-ignore
          subtreeY = subtreeCoord.y;
          // @ts-ignore
          subtreeLevel = subtreeCoord.level;
        } else {
          // Child subtree is available but has not been loaded yet
          // Since the root node of a subtree is always available, return the level of the child subtree
          // sampleTerrainMostDetailed will keep calling this function until all available subtrees in the chain have been loaded
          // @ts-ignore
          return childSubtreeCoord;
        }
      } else {
        // Child subtree is not available
        childSubtreeLoaded = false;
      }
    }

    // Find the deepest level in the subtree
    let deepestTileCoord;
    for (let localLevel = 0; localLevel < subtreeLevels; localLevel++) {
      const childCoord = computeDescendantCoordinatesAtUv(
        implicitTileset,
        subtreeCoord,
        u,
        v,
        localLevel,
      );

      // @ts-ignore
      if (subtree.tileIsAvailableAtCoordinates(childCoord)) {
        deepestTileCoord = childCoord;
      } else {
        break;
      }
    }

    return deepestTileCoord;
  };

// NOTE: ImplicitSubtreeCache implements just enough of the TileAvailability interface to support `sampleTerrain` and `sampleTerrainMostDetailed`. Right now this just means implementing `computeMaximumLevelAtPosition`. It's more difficult to implement the rest of the methods because doing everything in terms of ranges instead of bits is kind of awkward.

/**
 * Determines the level of the most detailed tile covering the position.
 *
 * @param {Cartographic} position The position for which to determine the maximum available level. The height component is ignored.
 * @returns {Number} The level of the most detailed tile covering the position.
 * @throws {DeveloperError} If position is outside any tile according to the tiling scheme.
 */
ImplicitSubtreeCache.prototype.computeMaximumLevelAtPosition = function (
  position,
) {
  const tileCoordinates =
    this._computeMaximumImplicitTileCoordinatesAtPosition(position);
  if (tileCoordinates === undefined) {
    return 0;
  }
  // @ts-ignore
  return tileCoordinates.level;
};

export default Cesium3DTilesTerrainProvider;
