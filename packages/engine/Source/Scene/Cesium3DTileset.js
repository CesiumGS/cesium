import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import destroyObject from "../Core/destroyObject.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Event from "../Core/Event.js";
import ImageBasedLighting from "./ImageBasedLighting.js";
import IonResource from "../Core/IonResource.js";
import JulianDate from "../Core/JulianDate.js";
import ManagedArray from "../Core/ManagedArray.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import Transforms from "../Core/Transforms.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import Axis from "./Axis.js";
import Cesium3DTile from "./Cesium3DTile.js";
import Cesium3DTileColorBlendMode from "./Cesium3DTileColorBlendMode.js";
import Cesium3DTileContentState from "./Cesium3DTileContentState.js";
import Cesium3DTilesetMetadata from "./Cesium3DTilesetMetadata.js";
import Cesium3DTileOptimizations from "./Cesium3DTileOptimizations.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";
import Cesium3DTilesetCache from "./Cesium3DTilesetCache.js";
import Cesium3DTilesetHeatmap from "./Cesium3DTilesetHeatmap.js";
import Cesium3DTilesetStatistics from "./Cesium3DTilesetStatistics.js";
import Cesium3DTileStyleEngine from "./Cesium3DTileStyleEngine.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import hasExtension from "./hasExtension.js";
import ImplicitTileset from "./ImplicitTileset.js";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates.js";
import LabelCollection from "./LabelCollection.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import PointCloudEyeDomeLighting from "./PointCloudEyeDomeLighting.js";
import PointCloudShading from "./PointCloudShading.js";
import ResourceCache from "./ResourceCache.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";
import SplitDirection from "./SplitDirection.js";
import StencilConstants from "./StencilConstants.js";
import TileBoundingRegion from "./TileBoundingRegion.js";
import TileBoundingSphere from "./TileBoundingSphere.js";
import TileOrientedBoundingBox from "./TileOrientedBoundingBox.js";
import Cesium3DTilesetMostDetailedTraversal from "./Cesium3DTilesetMostDetailedTraversal.js";
import Cesium3DTilesetBaseTraversal from "./Cesium3DTilesetBaseTraversal.js";
import Cesium3DTilesetSkipTraversal from "./Cesium3DTilesetSkipTraversal.js";

/**
 * @typedef {Object} Cesium3DTileset.ConstructorOptions
 *
 * Initialization options for the Cesium3DTileset constructor
 *
 * @property {boolean} [show=true] Determines if the tileset will be shown.
 * @property {Matrix4} [modelMatrix=Matrix4.IDENTITY] A 4x4 transformation matrix that transforms the tileset's root tile.
 * @property {Axis} [modelUpAxis=Axis.Y] Which axis is considered up when loading models for tile contents.
 * @property {Axis} [modelForwardAxis=Axis.X] Which axis is considered forward when loading models for tile contents.
 * @property {ShadowMode} [shadows=ShadowMode.ENABLED] Determines whether the tileset casts or receives shadows from light sources.
 * @property {number} [maximumScreenSpaceError=16] The maximum screen space error used to drive level of detail refinement.
 * @property {number} [maximumMemoryUsage=512] The maximum amount of memory in MB that can be used by the tileset. Deprecated.
 * @property {number} [cacheBytes=536870912] The size (in bytes) to which the tile cache will be trimmed, if the cache contains tiles not needed for the current view.
 * @property {number} [maximumCacheOverflowBytes=536870912] The maximum additional memory (in bytes) to allow for cache headroom, if more than {@link Cesium3DTileset#cacheBytes} are needed for the current view.
 * @property {boolean} [cullWithChildrenBounds=true] Optimization option. Whether to cull tiles using the union of their children bounding volumes.
 * @property {boolean} [cullRequestsWhileMoving=true] Optimization option. Don't request tiles that will likely be unused when they come back because of the camera's movement. This optimization only applies to stationary tilesets.
 * @property {number} [cullRequestsWhileMovingMultiplier=60.0] Optimization option. Multiplier used in culling requests while moving. Larger is more aggressive culling, smaller less aggressive culling.
 * @property {boolean} [preloadWhenHidden=false] Preload tiles when <code>tileset.show</code> is <code>false</code>. Loads tiles as if the tileset is visible but does not render them.
 * @property {boolean} [preloadFlightDestinations=true] Optimization option. Preload tiles at the camera's flight destination while the camera is in flight.
 * @property {boolean} [preferLeaves=false] Optimization option. Prefer loading of leaves first.
 * @property {boolean} [dynamicScreenSpaceError=false] Optimization option. Reduce the screen space error for tiles that are further away from the camera.
 * @property {number} [dynamicScreenSpaceErrorDensity=0.00278] Density used to adjust the dynamic screen space error, similar to fog density.
 * @property {number} [dynamicScreenSpaceErrorFactor=4.0] A factor used to increase the computed dynamic screen space error.
 * @property {number} [dynamicScreenSpaceErrorHeightFalloff=0.25] A ratio of the tileset's height at which the density starts to falloff.
 * @property {number} [progressiveResolutionHeightFraction=0.3] Optimization option. If between (0.0, 0.5], tiles at or above the screen space error for the reduced screen resolution of <code>progressiveResolutionHeightFraction*screenHeight</code> will be prioritized first. This can help get a quick layer of tiles down while full resolution tiles continue to load.
 * @property {boolean} [foveatedScreenSpaceError=true] Optimization option. Prioritize loading tiles in the center of the screen by temporarily raising the screen space error for tiles around the edge of the screen. Screen space error returns to normal once all the tiles in the center of the screen as determined by the {@link Cesium3DTileset#foveatedConeSize} are loaded.
 * @property {number} [foveatedConeSize=0.1] Optimization option. Used when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control the cone size that determines which tiles are deferred. Tiles that are inside this cone are loaded immediately. Tiles outside the cone are potentially deferred based on how far outside the cone they are and their screen space error. This is controlled by {@link Cesium3DTileset#foveatedInterpolationCallback} and {@link Cesium3DTileset#foveatedMinimumScreenSpaceErrorRelaxation}. Setting this to 0.0 means the cone will be the line formed by the camera position and its view direction. Setting this to 1.0 means the cone encompasses the entire field of view of the camera, disabling the effect.
 * @property {number} [foveatedMinimumScreenSpaceErrorRelaxation=0.0] Optimization option. Used when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control the starting screen space error relaxation for tiles outside the foveated cone. The screen space error will be raised starting with tileset value up to {@link Cesium3DTileset#maximumScreenSpaceError} based on the provided {@link Cesium3DTileset#foveatedInterpolationCallback}.
 * @property {Cesium3DTileset.foveatedInterpolationCallback} [foveatedInterpolationCallback=Math.lerp] Optimization option. Used when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control how much to raise the screen space error for tiles outside the foveated cone, interpolating between {@link Cesium3DTileset#foveatedMinimumScreenSpaceErrorRelaxation} and {@link Cesium3DTileset#maximumScreenSpaceError}
 * @property {number} [foveatedTimeDelay=0.2] Optimization option. Used when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control how long in seconds to wait after the camera stops moving before deferred tiles start loading in. This time delay prevents requesting tiles around the edges of the screen when the camera is moving. Setting this to 0.0 will immediately request all tiles in any given view.
 * @property {boolean} [skipLevelOfDetail=false] Optimization option. Determines if level of detail skipping should be applied during the traversal.
 * @property {number} [baseScreenSpaceError=1024] When <code>skipLevelOfDetail</code> is <code>true</code>, the screen space error that must be reached before skipping levels of detail.
 * @property {number} [skipScreenSpaceErrorFactor=16] When <code>skipLevelOfDetail</code> is <code>true</code>, a multiplier defining the minimum screen space error to skip. Used in conjunction with <code>skipLevels</code> to determine which tiles to load.
 * @property {number} [skipLevels=1] When <code>skipLevelOfDetail</code> is <code>true</code>, a constant defining the minimum number of levels to skip when loading tiles. When it is 0, no levels are skipped. Used in conjunction with <code>skipScreenSpaceErrorFactor</code> to determine which tiles to load.
 * @property {boolean} [immediatelyLoadDesiredLevelOfDetail=false] When <code>skipLevelOfDetail</code> is <code>true</code>, only tiles that meet the maximum screen space error will ever be downloaded. Skipping factors are ignored and just the desired tiles are loaded.
 * @property {boolean} [loadSiblings=false] When <code>skipLevelOfDetail</code> is <code>true</code>, determines whether siblings of visible tiles are always downloaded during traversal.
 * @property {ClippingPlaneCollection} [clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the tileset.
 * @property {ClassificationType} [classificationType] Determines whether terrain, 3D Tiles or both will be classified by this tileset. See {@link Cesium3DTileset#classificationType} for details about restrictions and limitations.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid determining the size and shape of the globe.
 * @property {object} [pointCloudShading] Options for constructing a {@link PointCloudShading} object to control point attenuation based on geometric error and lighting.
 * @property {Cartesian3} [lightColor] The light color when shading models. When <code>undefined</code> the scene's light color is used instead.
 * @property {ImageBasedLighting} [imageBasedLighting] The properties for managing image-based lighting for this tileset.
 * @property {boolean} [backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the glTF material's doubleSided property; when false, back face culling is disabled.
 * @property {boolean} [enableShowOutline=true] Whether to enable outlines for models using the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. This can be set to false to avoid the additional processing of geometry at load time. When false, the showOutlines and outlineColor options are ignored.
 * @property {boolean} [showOutline=true] Whether to display the outline for models using the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. When true, outlines are displayed. When false, outlines are not displayed.
 * @property {Color} [outlineColor=Color.BLACK] The color to use when rendering outlines.
 * @property {boolean} [vectorClassificationOnly=false] Indicates that only the tileset's vector tiles should be used for classification.
 * @property {boolean} [vectorKeepDecodedPositions=false] Whether vector tiles should keep decoded positions in memory. This is used with {@link Cesium3DTileFeature.getPolylinePositions}.
 * @property {string|number} [featureIdLabel="featureId_0"] Label of the feature ID set to use for picking and styling. For EXT_mesh_features, this is the feature ID's label property, or "featureId_N" (where N is the index in the featureIds array) when not specified. EXT_feature_metadata did not have a label field, so such feature ID sets are always labeled "featureId_N" where N is the index in the list of all feature Ids, where feature ID attributes are listed before feature ID textures. If featureIdLabel is an integer N, it is converted to the string "featureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @property {string|number} [instanceFeatureIdLabel="instanceFeatureId_0"] Label of the instance feature ID set used for picking and styling. If instanceFeatureIdLabel is set to an integer N, it is converted to the string "instanceFeatureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @property {boolean} [showCreditsOnScreen=false] Whether to display the credits of this tileset on screen.
 * @property {SplitDirection} [splitDirection=SplitDirection.NONE] The {@link SplitDirection} split to apply to this tileset.
 * @property {boolean} [projectTo2D=false] Whether to accurately project the tileset to 2D. If this is true, the tileset will be projected accurately to 2D, but it will use more memory to do so. If this is false, the tileset will use less memory and will still render in 2D / CV mode, but its projected positions may be inaccurate. This cannot be set after the tileset has loaded.
 * @property {string} [debugHeatmapTilePropertyName] The tile variable to colorize as a heatmap. All rendered tiles will be colorized relative to each other's specified variable value.
 * @property {boolean} [debugFreezeFrame=false] For debugging only. Determines if only the tiles from last frame should be used for rendering.
 * @property {boolean} [debugColorizeTiles=false] For debugging only. When true, assigns a random color to each tile.
 * @property {boolean} [enableDebugWireframe] For debugging only. This must be true for debugWireframe to work in WebGL1. This cannot be set after the tileset has loaded.
 * @property {boolean} [debugWireframe=false] For debugging only. When true, render's each tile's content as a wireframe.
 * @property {boolean} [debugShowBoundingVolume=false] For debugging only. When true, renders the bounding volume for each tile.
 * @property {boolean} [debugShowContentBoundingVolume=false] For debugging only. When true, renders the bounding volume for each tile's content.
 * @property {boolean} [debugShowViewerRequestVolume=false] For debugging only. When true, renders the viewer request volume for each tile.
 * @property {boolean} [debugShowGeometricError=false] For debugging only. When true, draws labels to indicate the geometric error of each tile.
 * @property {boolean} [debugShowRenderingStatistics=false] For debugging only. When true, draws labels to indicate the number of commands, points, triangles and features for each tile.
 * @property {boolean} [debugShowMemoryUsage=false] For debugging only. When true, draws labels to indicate the texture and geometry memory in megabytes used by each tile.
 * @property {boolean} [debugShowUrl=false] For debugging only. When true, draws labels to indicate the url of each tile.
 */

/**
 * A {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles tileset},
 * used for streaming massive heterogeneous 3D geospatial datasets.
 *
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link Cesium3DTileset.fromUrl}.
 * </div>
 *
 * @alias Cesium3DTileset
 * @constructor
 *
 * @param {Cesium3DTileset.ConstructorOptions} options An object describing initialization options
 *
 * @exception {DeveloperError} The tileset must be 3D Tiles version 0.0 or 1.0.
 *
 * @example
 * try {
 *   const tileset = await Cesium.Cesium3DTileset.fromUrl(
 *      "http://localhost:8002/tilesets/Seattle/tileset.json"
 *   );
 *   scene.primitives.add(tileset);
 * } catch (error) {
 *   console.error(`Error creating tileset: ${error}`);
 * }
 *
 * @example
 * // Common setting for the skipLevelOfDetail optimization
 * const tileset = await Cesium.Cesium3DTileset.fromUrl(
 *   "http://localhost:8002/tilesets/Seattle/tileset.json", {
 *      skipLevelOfDetail: true,
 *      baseScreenSpaceError: 1024,
 *      skipScreenSpaceErrorFactor: 16,
 *      skipLevels: 1,
 *      immediatelyLoadDesiredLevelOfDetail: false,
 *      loadSiblings: false,
 *      cullWithChildrenBounds: true
 * });
 * scene.primitives.add(tileset);
 *
 * @example
 * // Common settings for the dynamicScreenSpaceError optimization
 * const tileset = await Cesium.Cesium3DTileset.fromUrl(
 *   "http://localhost:8002/tilesets/Seattle/tileset.json", {
 *      dynamicScreenSpaceError: true,
 *      dynamicScreenSpaceErrorDensity: 0.00278,
 *      dynamicScreenSpaceErrorFactor: 4.0,
 *      dynamicScreenSpaceErrorHeightFalloff: 0.25
 * });
 * scene.primitives.add(tileset);
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles specification}
 */
function Cesium3DTileset(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._url = undefined;
  this._basePath = undefined;
  this._root = undefined;
  this._resource = undefined;
  this._asset = undefined; // Metadata for the entire tileset
  this._properties = undefined; // Metadata for per-model/point/etc properties
  this._geometricError = undefined; // Geometric error when the tree is not rendered at all
  this._scaledGeometricError = undefined; // Geometric error scaled by root tile scale
  this._extensionsUsed = undefined;
  this._extensions = undefined;
  this._modelUpAxis = undefined;
  this._modelForwardAxis = undefined;
  this._cache = new Cesium3DTilesetCache();
  this._processingQueue = [];
  this._selectedTiles = [];
  this._emptyTiles = [];
  this._requestedTiles = [];
  this._selectedTilesToStyle = [];
  this._loadTimestamp = undefined;
  this._timeSinceLoad = 0.0;
  this._updatedVisibilityFrame = 0;
  this._updatedModelMatrixFrame = 0;
  this._modelMatrixChanged = false;
  this._previousModelMatrix = undefined;
  this._extras = undefined;
  this._credits = undefined;

  this._showCreditsOnScreen = defaultValue(options.showCreditsOnScreen, false);

  this._cullWithChildrenBounds = defaultValue(
    options.cullWithChildrenBounds,
    true
  );
  this._allTilesAdditive = true;

  this._hasMixedContent = false;

  this._stencilClearCommand = undefined;
  this._backfaceCommands = new ManagedArray();

  this._maximumScreenSpaceError = defaultValue(
    options.maximumScreenSpaceError,
    16
  );
  this._memoryAdjustedScreenSpaceError = this._maximumScreenSpaceError;

  let defaultCacheBytes = 512 * 1024 * 1024;
  if (defined(options.maximumMemoryUsage)) {
    deprecationWarning(
      "Cesium3DTileset.maximumMemoryUsage",
      "Cesium3DTileset.maximumMemoryUsage was deprecated in CesiumJS 1.107.  It will be removed in CesiumJS 1.110. Use Cesium3DTileset.cacheBytes instead."
    );
    defaultCacheBytes = options.maximumMemoryUsage * 1024 * 1024;
  }
  this._cacheBytes = defaultValue(options.cacheBytes, defaultCacheBytes);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("cacheBytes", this._cacheBytes, 0);
  //>>includeEnd('debug');

  const maximumCacheOverflowBytes = defaultValue(
    options.maximumCacheOverflowBytes,
    512 * 1024 * 1024
  );
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals(
    "maximumCacheOverflowBytes",
    maximumCacheOverflowBytes,
    0
  );
  //>>includeEnd('debug');
  this._maximumCacheOverflowBytes = maximumCacheOverflowBytes;

  this._styleEngine = new Cesium3DTileStyleEngine();
  this._styleApplied = false;

  this._modelMatrix = defined(options.modelMatrix)
    ? Matrix4.clone(options.modelMatrix)
    : Matrix4.clone(Matrix4.IDENTITY);

  this._statistics = new Cesium3DTilesetStatistics();
  this._statisticsLast = new Cesium3DTilesetStatistics();
  this._statisticsPerPass = new Array(Cesium3DTilePass.NUMBER_OF_PASSES);

  for (let i = 0; i < Cesium3DTilePass.NUMBER_OF_PASSES; ++i) {
    this._statisticsPerPass[i] = new Cesium3DTilesetStatistics();
  }

  this._requestedTilesInFlight = [];

  this._maximumPriority = {
    foveatedFactor: -Number.MAX_VALUE,
    depth: -Number.MAX_VALUE,
    distance: -Number.MAX_VALUE,
    reverseScreenSpaceError: -Number.MAX_VALUE,
  };
  this._minimumPriority = {
    foveatedFactor: Number.MAX_VALUE,
    depth: Number.MAX_VALUE,
    distance: Number.MAX_VALUE,
    reverseScreenSpaceError: Number.MAX_VALUE,
  };
  this._heatmap = new Cesium3DTilesetHeatmap(
    options.debugHeatmapTilePropertyName
  );

  /**
   * Optimization option. Don't request tiles that will likely be unused when they come back because of the camera's movement. This optimization only applies to stationary tilesets.
   *
   * @type {boolean}
   * @default true
   */
  this.cullRequestsWhileMoving = defaultValue(
    options.cullRequestsWhileMoving,
    true
  );
  this._cullRequestsWhileMoving = false;

  /**
   * Optimization option. Multiplier used in culling requests while moving. Larger is more aggressive culling, smaller less aggressive culling.
   *
   * @type {number}
   * @default 60.0
   */
  this.cullRequestsWhileMovingMultiplier = defaultValue(
    options.cullRequestsWhileMovingMultiplier,
    60.0
  );

  /**
   * Optimization option. If between (0.0, 0.5], tiles at or above the screen space error for the reduced screen resolution of <code>progressiveResolutionHeightFraction*screenHeight</code> will be prioritized first. This can help get a quick layer of tiles down while full resolution tiles continue to load.
   *
   * @type {number}
   * @default 0.3
   */
  this.progressiveResolutionHeightFraction = CesiumMath.clamp(
    defaultValue(options.progressiveResolutionHeightFraction, 0.3),
    0.0,
    0.5
  );

  /**
   * Optimization option. Prefer loading of leaves first.
   *
   * @type {boolean}
   * @default false
   */
  this.preferLeaves = defaultValue(options.preferLeaves, false);

  this._tilesLoaded = false;
  this._initialTilesLoaded = false;

  this._tileDebugLabels = undefined;

  this._classificationType = options.classificationType;

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  this._initialClippingPlanesOriginMatrix = Matrix4.IDENTITY; // Computed from the tileset JSON.
  this._clippingPlanesOriginMatrix = undefined; // Combines the above with any run-time transforms.
  this._clippingPlanesOriginMatrixDirty = true;

  this._vectorClassificationOnly = defaultValue(
    options.vectorClassificationOnly,
    false
  );

  this._vectorKeepDecodedPositions = defaultValue(
    options.vectorKeepDecodedPositions,
    false
  );

  /**
   * Preload tiles when <code>tileset.show</code> is <code>false</code>. Loads tiles as if the tileset is visible but does not render them.
   *
   * @type {boolean}
   * @default false
   */
  this.preloadWhenHidden = defaultValue(options.preloadWhenHidden, false);

  /**
   * Optimization option. Fetch tiles at the camera's flight destination while the camera is in flight.
   *
   * @type {boolean}
   * @default true
   */
  this.preloadFlightDestinations = defaultValue(
    options.preloadFlightDestinations,
    true
  );
  this._pass = undefined; // Cesium3DTilePass

  /**
   * Optimization option. Whether the tileset should refine based on a dynamic screen space error. Tiles that are further
   * away will be rendered with lower detail than closer tiles. This improves performance by rendering fewer
   * tiles and making less requests, but may result in a slight drop in visual quality for tiles in the distance.
   * The algorithm is biased towards "street views" where the camera is close to the ground plane of the tileset and looking
   * at the horizon. In addition results are more accurate for tightly fitting bounding volumes like box and region.
   *
   * @type {boolean}
   * @default false
   */
  this.dynamicScreenSpaceError = defaultValue(
    options.dynamicScreenSpaceError,
    false
  );

  /**
   * Optimization option. Prioritize loading tiles in the center of the screen by temporarily raising the
   * screen space error for tiles around the edge of the screen. Screen space error returns to normal once all
   * the tiles in the center of the screen as determined by the {@link Cesium3DTileset#foveatedConeSize} are loaded.
   *
   * @type {boolean}
   * @default true
   */
  this.foveatedScreenSpaceError = defaultValue(
    options.foveatedScreenSpaceError,
    true
  );
  this._foveatedConeSize = defaultValue(options.foveatedConeSize, 0.1);
  this._foveatedMinimumScreenSpaceErrorRelaxation = defaultValue(
    options.foveatedMinimumScreenSpaceErrorRelaxation,
    0.0
  );

  /**
   * Gets or sets a callback to control how much to raise the screen space error for tiles outside the foveated cone,
   * interpolating between {@link Cesium3DTileset#foveatedMinimumScreenSpaceErrorRelaxation} and {@link Cesium3DTileset#maximumScreenSpaceError}.
   *
   * @type {Cesium3DTileset.foveatedInterpolationCallback}
   */
  this.foveatedInterpolationCallback = defaultValue(
    options.foveatedInterpolationCallback,
    CesiumMath.lerp
  );

  /**
   * Optimization option. Used when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control
   * how long in seconds to wait after the camera stops moving before deferred tiles start loading in.
   * This time delay prevents requesting tiles around the edges of the screen when the camera is moving.
   * Setting this to 0.0 will immediately request all tiles in any given view.
   *
   * @type {number}
   * @default 0.2
   */
  this.foveatedTimeDelay = defaultValue(options.foveatedTimeDelay, 0.2);

  /**
   * A scalar that determines the density used to adjust the dynamic screen space error, similar to {@link Fog}. Increasing this
   * value has the effect of increasing the maximum screen space error for all tiles, but in a non-linear fashion.
   * The error starts at 0.0 and increases exponentially until a midpoint is reached, and then approaches 1.0 asymptotically.
   * This has the effect of keeping high detail in the closer tiles and lower detail in the further tiles, with all tiles
   * beyond a certain distance all roughly having an error of 1.0.
   * <p>
   * The dynamic error is in the range [0.0, 1.0) and is multiplied by <code>dynamicScreenSpaceErrorFactor</code> to produce the
   * final dynamic error. This dynamic error is then subtracted from the tile's actual screen space error.
   * </p>
   * <p>
   * Increasing <code>dynamicScreenSpaceErrorDensity</code> has the effect of moving the error midpoint closer to the camera.
   * It is analogous to moving fog closer to the camera.
   * </p>
   *
   * @type {number}
   * @default 0.00278
   */
  this.dynamicScreenSpaceErrorDensity = 0.00278;

  /**
   * A factor used to increase the screen space error of tiles for dynamic screen space error. As this value increases less tiles
   * are requested for rendering and tiles in the distance will have lower detail. If set to zero, the feature will be disabled.
   *
   * @type {number}
   * @default 4.0
   */
  this.dynamicScreenSpaceErrorFactor = 4.0;

  /**
   * A ratio of the tileset's height at which the density starts to falloff. If the camera is below this height the
   * full computed density is applied, otherwise the density falls off. This has the effect of higher density at
   * street level views.
   * <p>
   * Valid values are between 0.0 and 1.0.
   * </p>
   *
   * @type {number}
   * @default 0.25
   */
  this.dynamicScreenSpaceErrorHeightFalloff = 0.25;

  this._dynamicScreenSpaceErrorComputedDensity = 0.0; // Updated based on the camera position and direction

  /**
   * Determines whether the tileset casts or receives shadows from light sources.
   * <p>
   * Enabling shadows has a performance impact. A tileset that casts shadows must be rendered twice, once from the camera and again from the light's point of view.
   * </p>
   * <p>
   * Shadows are rendered only when {@link Viewer#shadows} is <code>true</code>.
   * </p>
   *
   * @type {ShadowMode}
   * @default ShadowMode.ENABLED
   */
  this.shadows = defaultValue(options.shadows, ShadowMode.ENABLED);

  /**
   * Determines if the tileset will be shown.
   *
   * @type {boolean}
   * @default true
   */
  this.show = defaultValue(options.show, true);

  /**
   * Defines how per-feature colors set from the Cesium API or declarative styling blend with the source colors from
   * the original feature, e.g. glTF material or per-point color in the tile.
   *
   * @type {Cesium3DTileColorBlendMode}
   * @default Cesium3DTileColorBlendMode.HIGHLIGHT
   */
  this.colorBlendMode = Cesium3DTileColorBlendMode.HIGHLIGHT;

  /**
   * Defines the value used to linearly interpolate between the source color and feature color when the {@link Cesium3DTileset#colorBlendMode} is <code>MIX</code>.
   * A value of 0.0 results in the source color while a value of 1.0 results in the feature color, with any value in-between
   * resulting in a mix of the source color and feature color.
   *
   * @type {number}
   * @default 0.5
   */
  this.colorBlendAmount = 0.5;

  this._pointCloudShading = new PointCloudShading(options.pointCloudShading);
  this._pointCloudEyeDomeLighting = new PointCloudEyeDomeLighting();

  /**
   * The event fired to indicate progress of loading new tiles.  This event is fired when a new tile
   * is requested, when a requested tile is finished downloading, and when a downloaded tile has been
   * processed and is ready to render.
   * <p>
   * The number of pending tile requests, <code>numberOfPendingRequests</code>, and number of tiles
   * processing, <code>numberOfTilesProcessing</code> are passed to the event listener.
   * </p>
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * tileset.loadProgress.addEventListener(function(numberOfPendingRequests, numberOfTilesProcessing) {
   *     if ((numberOfPendingRequests === 0) && (numberOfTilesProcessing === 0)) {
   *         console.log('Stopped loading');
   *         return;
   *     }
   *
   *     console.log(`Loading: requests: ${numberOfPendingRequests}, processing: ${numberOfTilesProcessing}`);
   * });
   */
  this.loadProgress = new Event();

  /**
   * The event fired to indicate that all tiles that meet the screen space error this frame are loaded. The tileset
   * is completely loaded for this view.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * tileset.allTilesLoaded.addEventListener(function() {
   *     console.log('All tiles are loaded');
   * });
   *
   * @see Cesium3DTileset#tilesLoaded
   */
  this.allTilesLoaded = new Event();

  /**
   * The event fired to indicate that all tiles that meet the screen space error this frame are loaded. This event
   * is fired once when all tiles in the initial view are loaded.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * tileset.initialTilesLoaded.addEventListener(function() {
   *     console.log('Initial tiles are loaded');
   * });
   *
   * @see Cesium3DTileset#allTilesLoaded
   */
  this.initialTilesLoaded = new Event();

  /**
   * The event fired to indicate that a tile's content was loaded.
   * <p>
   * The loaded {@link Cesium3DTile} is passed to the event listener.
   * </p>
   * <p>
   * This event is fired during the tileset traversal while the frame is being rendered
   * so that updates to the tile take effect in the same frame.  Do not create or modify
   * Cesium entities or primitives during the event listener.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * tileset.tileLoad.addEventListener(function(tile) {
   *     console.log('A tile was loaded.');
   * });
   */
  this.tileLoad = new Event();

  /**
   * The event fired to indicate that a tile's content was unloaded.
   * <p>
   * The unloaded {@link Cesium3DTile} is passed to the event listener.
   * </p>
   * <p>
   * This event is fired immediately before the tile's content is unloaded while the frame is being
   * rendered so that the event listener has access to the tile's content.  Do not create
   * or modify Cesium entities or primitives during the event listener.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * tileset.tileUnload.addEventListener(function(tile) {
   *     console.log('A tile was unloaded from the cache.');
   * });
   *
   * @see Cesium3DTileset#cacheBytes
   * @see Cesium3DTileset#trimLoadedTiles
   */
  this.tileUnload = new Event();

  /**
   * The event fired to indicate that a tile's content failed to load.
   * <p>
   * If there are no event listeners, error messages will be logged to the console.
   * </p>
   * <p>
   * The error object passed to the listener contains two properties:
   * <ul>
   * <li><code>url</code>: the url of the failed tile.</li>
   * <li><code>message</code>: the error message.</li>
   * </ul>
   * <p>
   * If multiple contents are present, this event is raised once per inner content with errors.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * tileset.tileFailed.addEventListener(function(error) {
   *     console.log(`An error occurred loading tile: ${error.url}`);
   *     console.log(`Error: ${error.message}`);
   * });
   */
  this.tileFailed = new Event();

  /**
   * This event fires once for each visible tile in a frame.  This can be used to manually
   * style a tileset.
   * <p>
   * The visible {@link Cesium3DTile} is passed to the event listener.
   * </p>
   * <p>
   * This event is fired during the tileset traversal while the frame is being rendered
   * so that updates to the tile take effect in the same frame.  Do not create or modify
   * Cesium entities or primitives during the event listener.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * tileset.tileVisible.addEventListener(function(tile) {
   *     if (tile.content instanceof Cesium.Model3DTileContent) {
   *         console.log('A 3D model tile is visible.');
   *     }
   * });
   *
   * @example
   * // Apply a red style and then manually set random colors for every other feature when the tile becomes visible.
   * tileset.style = new Cesium.Cesium3DTileStyle({
   *     color : 'color("red")'
   * });
   * tileset.tileVisible.addEventListener(function(tile) {
   *     const content = tile.content;
   *     const featuresLength = content.featuresLength;
   *     for (let i = 0; i < featuresLength; i+=2) {
   *         content.getFeature(i).color = Cesium.Color.fromRandom();
   *     }
   * });
   */
  this.tileVisible = new Event();

  /**
   * Optimization option. Determines if level of detail skipping should be applied during the traversal.
   * <p>
   * The common strategy for replacement-refinement traversal is to store all levels of the tree in memory and require
   * all children to be loaded before the parent can refine. With this optimization levels of the tree can be skipped
   * entirely and children can be rendered alongside their parents. The tileset requires significantly less memory when
   * using this optimization.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.skipLevelOfDetail = defaultValue(options.skipLevelOfDetail, false);

  this._disableSkipLevelOfDetail = false;

  /**
   * The screen space error that must be reached before skipping levels of detail.
   * <p>
   * Only used when {@link Cesium3DTileset#skipLevelOfDetail} is <code>true</code>.
   * </p>
   *
   * @type {number}
   * @default 1024
   */
  this.baseScreenSpaceError = defaultValue(options.baseScreenSpaceError, 1024);

  /**
   * Multiplier defining the minimum screen space error to skip.
   * For example, if a tile has screen space error of 100, no tiles will be loaded unless they
   * are leaves or have a screen space error <code><= 100 / skipScreenSpaceErrorFactor</code>.
   * <p>
   * Only used when {@link Cesium3DTileset#skipLevelOfDetail} is <code>true</code>.
   * </p>
   *
   * @type {number}
   * @default 16
   */
  this.skipScreenSpaceErrorFactor = defaultValue(
    options.skipScreenSpaceErrorFactor,
    16
  );

  /**
   * Constant defining the minimum number of levels to skip when loading tiles. When it is 0, no levels are skipped.
   * For example, if a tile is level 1, no tiles will be loaded unless they are at level greater than 2.
   * <p>
   * Only used when {@link Cesium3DTileset#skipLevelOfDetail} is <code>true</code>.
   * </p>
   *
   * @type {number}
   * @default 1
   */
  this.skipLevels = defaultValue(options.skipLevels, 1);

  /**
   * When true, only tiles that meet the maximum screen space error will ever be downloaded.
   * Skipping factors are ignored and just the desired tiles are loaded.
   * <p>
   * Only used when {@link Cesium3DTileset#skipLevelOfDetail} is <code>true</code>.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.immediatelyLoadDesiredLevelOfDetail = defaultValue(
    options.immediatelyLoadDesiredLevelOfDetail,
    false
  );

  /**
   * Determines whether siblings of visible tiles are always downloaded during traversal.
   * This may be useful for ensuring that tiles are already available when the viewer turns left/right.
   * <p>
   * Only used when {@link Cesium3DTileset#skipLevelOfDetail} is <code>true</code>.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.loadSiblings = defaultValue(options.loadSiblings, false);

  this._clippingPlanes = undefined;
  this.clippingPlanes = options.clippingPlanes;

  if (defined(options.imageBasedLighting)) {
    this._imageBasedLighting = options.imageBasedLighting;
    this._shouldDestroyImageBasedLighting = false;
  } else {
    this._imageBasedLighting = new ImageBasedLighting();
    this._shouldDestroyImageBasedLighting = true;
  }

  /**
   * The light color when shading models. When <code>undefined</code> the scene's light color is used instead.
   * <p>
   * For example, disabling additional light sources by setting
   * <code>tileset.imageBasedLighting.imageBasedLightingFactor = new Cartesian2(0.0, 0.0)</code>
   * will make the tileset much darker. Here, increasing the intensity of the light source will make the tileset brighter.
   * </p>
   *
   * @type {Cartesian3}
   * @default undefined
   */
  this.lightColor = options.lightColor;

  /**
   * Whether to cull back-facing geometry. When true, back face culling is determined
   * by the glTF material's doubleSided property; when false, back face culling is disabled.
   *
   * @type {boolean}
   * @default true
   */
  this.backFaceCulling = defaultValue(options.backFaceCulling, true);

  this._enableShowOutline = defaultValue(options.enableShowOutline, true);

  /**
   * Whether to display the outline for models using the
   * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension.
   * When true, outlines are displayed. When false, outlines are not displayed.
   *
   * @type {boolean}
   * @default true
   */
  this.showOutline = defaultValue(options.showOutline, true);

  /**
   * The color to use when rendering outlines.
   *
   * @type {Color}
   * @default Color.BLACK
   */
  this.outlineColor = defaultValue(options.outlineColor, Color.BLACK);

  /**
   * The {@link SplitDirection} to apply to this tileset.
   *
   * @type {SplitDirection}
   * @default {@link SplitDirection.NONE}
   */
  this.splitDirection = defaultValue(
    options.splitDirection,
    SplitDirection.NONE
  );

  this._projectTo2D = defaultValue(options.projectTo2D, false);

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * Determines if only the tiles from last frame should be used for rendering.  This
   * effectively "freezes" the tileset to the previous frame so it is possible to zoom
   * out and see what was rendered.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugFreezeFrame = defaultValue(options.debugFreezeFrame, false);

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, assigns a random color to each tile.  This is useful for visualizing
   * what features belong to what tiles, especially with additive refinement where features
   * from parent tiles may be interleaved with features from child tiles.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugColorizeTiles = defaultValue(options.debugColorizeTiles, false);

  this._enableDebugWireframe = defaultValue(
    options.enableDebugWireframe,
    false
  );

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, renders each tile's content as a wireframe.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugWireframe = defaultValue(options.debugWireframe, false);

  // Warning for improper setup of debug wireframe
  if (this.debugWireframe === true && this._enableDebugWireframe === false) {
    oneTimeWarning(
      "tileset-debug-wireframe-ignored",
      "enableDebugWireframe must be set to true in the Cesium3DTileset constructor, otherwise debugWireframe will be ignored."
    );
  }

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, renders the bounding volume for each visible tile.  The bounding volume is
   * white if the tile has a content bounding volume or is empty; otherwise, it is red.  Tiles that don't meet the
   * screen space error and are still refining to their descendants are yellow.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, renders the bounding volume for each visible tile's content. The bounding volume is
   * blue if the tile has a content bounding volume; otherwise it is red.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugShowContentBoundingVolume = defaultValue(
    options.debugShowContentBoundingVolume,
    false
  );

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, renders the viewer request volume for each tile.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugShowViewerRequestVolume = defaultValue(
    options.debugShowViewerRequestVolume,
    false
  );

  /**
   * @private
   * @type {LabelCollection|undefined}
   */
  this._tileDebugLabels = undefined;
  this.debugPickedTileLabelOnly = false;
  this.debugPickedTile = undefined;
  this.debugPickPosition = undefined;

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, draws labels to indicate the geometric error of each tile.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugShowGeometricError = defaultValue(
    options.debugShowGeometricError,
    false
  );

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, draws labels to indicate the number of commands, points, triangles and features of each tile.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugShowRenderingStatistics = defaultValue(
    options.debugShowRenderingStatistics,
    false
  );

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, draws labels to indicate the geometry and texture memory usage of each tile.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugShowMemoryUsage = defaultValue(options.debugShowMemoryUsage, false);

  /**
   * This property is for debugging only; it is not optimized for production use.
   * <p>
   * When true, draws labels to indicate the url of each tile.
   * </p>
   *
   * @type {boolean}
   * @default false
   */
  this.debugShowUrl = defaultValue(options.debugShowUrl, false);

  /**
   * Function for examining vector lines as they are being streamed.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @type {Function}
   */
  this.examineVectorLinesFunction = undefined;

  // this is the underlying Cesium3DTileMetadata object, whether it came from
  // the 3DTILES_metadata extension or a 3D Tiles 1.1 tileset JSON. Getters
  // like tileset.metadata and tileset.schema will delegate to this object.
  this._metadataExtension = undefined;

  this._customShader = options.customShader;

  let featureIdLabel = defaultValue(options.featureIdLabel, "featureId_0");
  if (typeof featureIdLabel === "number") {
    featureIdLabel = `featureId_${featureIdLabel}`;
  }
  this._featureIdLabel = featureIdLabel;

  let instanceFeatureIdLabel = defaultValue(
    options.instanceFeatureIdLabel,
    "instanceFeatureId_0"
  );
  if (typeof instanceFeatureIdLabel === "number") {
    instanceFeatureIdLabel = `instanceFeatureId_${instanceFeatureIdLabel}`;
  }
  this._instanceFeatureIdLabel = instanceFeatureIdLabel;
}

Object.defineProperties(Cesium3DTileset.prototype, {
  /**
   * NOTE: This getter exists so that `Picking.js` can differentiate between
   *       PrimitiveCollection and Cesium3DTileset objects without inflating
   *       the size of the module via `instanceof Cesium3DTileset`
   * @private
   */
  isCesium3DTileset: {
    get: function () {
      return true;
    },
  },

  /**
   * Gets the tileset's asset object property, which contains metadata about the tileset.
   * <p>
   * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification#reference-asset|asset schema reference}
   * in the 3D Tiles spec for the full set of properties.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {object}
   * @readonly
   */
  asset: {
    get: function () {
      return this._asset;
    },
  },

  /**
   * Gets the tileset's extensions object property.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {object}
   * @readonly
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },

  /**
   * The {@link ClippingPlaneCollection} used to selectively disable rendering the tileset.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {ClippingPlaneCollection}
   */
  clippingPlanes: {
    get: function () {
      return this._clippingPlanes;
    },
    set: function (value) {
      ClippingPlaneCollection.setOwner(value, this, "_clippingPlanes");
    },
  },

  /**
   * Gets the tileset's properties dictionary object, which contains metadata about per-feature properties.
   * <p>
   * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification#reference-properties|properties schema reference}
   * in the 3D Tiles spec for the full set of properties.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {object}
   * @readonly
   *
   * @example
   * console.log(`Maximum building height: ${tileset.properties.height.maximum}`);
   * console.log(`Minimum building height: ${tileset.properties.height.minimum}`);
   *
   * @see Cesium3DTileFeature#getProperty
   * @see Cesium3DTileFeature#setProperty
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * When <code>true</code>, all tiles that meet the screen space error this frame are loaded. The tileset is
   * completely loaded for this view.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default false
   *
   * @see Cesium3DTileset#allTilesLoaded
   */
  tilesLoaded: {
    get: function () {
      return this._tilesLoaded;
    },
  },

  /**
   * The resource used to fetch the tileset JSON file
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._resource;
    },
  },

  /**
   * The base path that non-absolute paths in tileset JSON file are relative to.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {string}
   * @readonly
   * @deprecated
   */
  basePath: {
    get: function () {
      deprecationWarning(
        "Cesium3DTileset.basePath",
        "Cesium3DTileset.basePath has been deprecated. All tiles are relative to the url of the tileset JSON file that contains them. Use the url property instead."
      );
      return this._basePath;
    },
  },

  /**
   * The style, defined using the
   * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language},
   * applied to each feature in the tileset.
   * <p>
   * Assign <code>undefined</code> to remove the style, which will restore the visual
   * appearance of the tileset to its default when no style was applied.
   * </p>
   * <p>
   * The style is applied to a tile before the {@link Cesium3DTileset#tileVisible}
   * event is raised, so code in <code>tileVisible</code> can manually set a feature's
   * properties (e.g. color and show) after the style is applied. When
   * a new style is assigned any manually set properties are overwritten.
   * </p>
   * <p>
   * Use an always "true" condition to specify the Color for all objects that are not
   * overridden by pre-existing conditions. Otherwise, the default color Cesium.Color.White
   * will be used. Similarly, use an always "true" condition to specify the show property
   * for all objects that are not overridden by pre-existing conditions. Otherwise, the
   * default show value true will be used.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {Cesium3DTileStyle|undefined}
   *
   * @default undefined
   *
   * @example
   * tileset.style = new Cesium.Cesium3DTileStyle({
   *    color : {
   *        conditions : [
   *            ['${Height} >= 100', 'color("purple", 0.5)'],
   *            ['${Height} >= 50', 'color("red")'],
   *            ['true', 'color("blue")']
   *        ]
   *    },
   *    show : '${Height} > 0',
   *    meta : {
   *        description : '"Building id ${id} has height ${Height}."'
   *    }
   * });
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language}
   */
  style: {
    get: function () {
      return this._styleEngine.style;
    },
    set: function (value) {
      this._styleEngine.style = value;
    },
  },

  /**
   * A custom shader to apply to all tiles in the tileset. Only used for
   * contents that use {@link Model}. Using custom shaders with a
   * {@link Cesium3DTileStyle} may lead to undefined behavior.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {CustomShader|undefined}
   *
   * @default undefined
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  customShader: {
    get: function () {
      return this._customShader;
    },
    set: function (value) {
      this._customShader = value;
    },
  },

  /**
   * Whether the tileset is rendering different levels of detail in the same view.
   * Only relevant if {@link Cesium3DTileset.isSkippingLevelOfDetail} is true.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {boolean}
   * @private
   */
  hasMixedContent: {
    get: function () {
      return this._hasMixedContent;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("value", value);
      //>>includeEnd('debug');

      this._hasMixedContent = value;
    },
  },

  /**
   * Whether this tileset is actually skipping levels of detail.
   * The user option may have been disabled if all tiles are using additive refinement,
   * or if some tiles have a content type for which rendering does not support skipping
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {boolean}
   * @private
   * @readonly
   */
  isSkippingLevelOfDetail: {
    get: function () {
      return (
        this.skipLevelOfDetail &&
        !defined(this._classificationType) &&
        !this._disableSkipLevelOfDetail &&
        !this._allTilesAdditive
      );
    },
  },

  /**
   * The tileset's schema, groups, tileset metadata and other details from the
   * 3DTILES_metadata extension or a 3D Tiles 1.1 tileset JSON. This getter is
   * for internal use by other classes.
   *
   * @memberof Cesium3DTileset.prototype
   * @type {Cesium3DTilesetMetadata}
   * @private
   * @readonly
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  metadataExtension: {
    get: function () {
      return this._metadataExtension;
    },
  },

  /**
   * The metadata properties attached to the tileset as a whole.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {TilesetMetadata}
   * @private
   * @readonly
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  metadata: {
    get: function () {
      if (defined(this._metadataExtension)) {
        return this._metadataExtension.tileset;
      }

      return undefined;
    },
  },

  /**
   * The metadata schema used in this tileset. Shorthand for
   * <code>tileset.metadataExtension.schema</code>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {MetadataSchema}
   * @private
   * @readonly
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  schema: {
    get: function () {
      if (defined(this._metadataExtension)) {
        return this._metadataExtension.schema;
      }

      return undefined;
    },
  },

  /**
   * The maximum screen space error used to drive level of detail refinement.  This value helps determine when a tile
   * refines to its descendants, and therefore plays a major role in balancing performance with visual quality.
   * <p>
   * A tile's screen space error is roughly equivalent to the number of pixels wide that would be drawn if a sphere with a
   * radius equal to the tile's <b>geometric error</b> were rendered at the tile's position. If this value exceeds
   * <code>maximumScreenSpaceError</code> the tile refines to its descendants.
   * </p>
   * <p>
   * Depending on the tileset, <code>maximumScreenSpaceError</code> may need to be tweaked to achieve the right balance.
   * Higher values provide better performance but lower visual quality.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @default 16
   *
   * @exception {DeveloperError} <code>maximumScreenSpaceError</code> must be greater than or equal to zero.
   */
  maximumScreenSpaceError: {
    get: function () {
      return this._maximumScreenSpaceError;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals(
        "maximumScreenSpaceError",
        value,
        0
      );
      //>>includeEnd('debug');

      this._maximumScreenSpaceError = value;
      this._memoryAdjustedScreenSpaceError = value;
    },
  },

  /**
   * The maximum amount of GPU memory (in MB) that may be used to cache tiles. This value is estimated from
   * geometry, textures, and batch table textures of loaded tiles. For point clouds, this value also
   * includes per-point metadata.
   * <p>
   * Tiles not in view are unloaded to enforce this.
   * </p>
   * <p>
   * If decreasing this value results in unloading tiles, the tiles are unloaded the next frame.
   * </p>
   * <p>
   * If tiles sized more than <code>maximumMemoryUsage</code> are needed
   * to meet the desired screen space error, determined by {@link Cesium3DTileset#maximumScreenSpaceError},
   * for the current view, then the memory usage of the tiles loaded will exceed
   * <code>maximumMemoryUsage</code>.  For example, if the maximum is 256 MB, but
   * 300 MB of tiles are needed to meet the screen space error, then 300 MB of tiles may be loaded.  When
   * these tiles go out of view, they will be unloaded.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @default 512
   *
   * @exception {DeveloperError} <code>maximumMemoryUsage</code> must be greater than or equal to zero.
   * @see Cesium3DTileset#totalMemoryUsageInBytes
   *
   * @deprecated
   */
  maximumMemoryUsage: {
    get: function () {
      deprecationWarning(
        "Cesium3DTileset.maximumMemoryUsage",
        "Cesium3DTileset.maximumMemoryUsage was deprecated in CesiumJS 1.107.  It will be removed in CesiumJS 1.110. Use Cesium3DTileset.cacheBytes instead."
      );
      return this._maximumMemoryUsage;
    },
    set: function (value) {
      deprecationWarning(
        "Cesium3DTileset.maximumMemoryUsage",
        "Cesium3DTileset.maximumMemoryUsage was deprecated in CesiumJS 1.107.  It will be removed in CesiumJS 1.110. Use Cesium3DTileset.cacheBytes instead."
      );
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("value", value, 0);
      //>>includeEnd('debug');

      this._maximumMemoryUsage = value;
      this._cacheBytes = value * 1024 * 1024;
    },
  },

  /**
   * The amount of GPU memory (in bytes) used to cache tiles. This memory usage is estimated from
   * geometry, textures, and batch table textures of loaded tiles. For point clouds, this value also
   * includes per-point metadata.
   * <p>
   * Tiles not in view are unloaded to enforce this.
   * </p>
   * <p>
   * If decreasing this value results in unloading tiles, the tiles are unloaded the next frame.
   * </p>
   * <p>
   * If tiles sized more than <code>cacheBytes</code> are needed to meet the
   * desired screen space error, determined by {@link Cesium3DTileset#maximumScreenSpaceError},
   * for the current view, then the memory usage of the tiles loaded will exceed
   * <code>cacheBytes</code> by up to <code>maximumCacheOverflowBytes</code>.
   * For example, if <code>cacheBytes</code> is 500000, but 600000 bytes
   * of tiles are needed to meet the screen space error, then 600000 bytes of tiles
   * may be loaded (if <code>maximumCacheOverflowBytes</code> is at least 100000).
   * When these tiles go out of view, they will be unloaded.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @default 536870912
   *
   * @exception {DeveloperError} <code>cacheBytes</code> must be typeof 'number' and greater than or equal to 0
   * @see Cesium3DTileset#totalMemoryUsageInBytes
   */
  cacheBytes: {
    get: function () {
      return this._cacheBytes;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("value", value, 0);
      //>>includeEnd('debug');

      this._cacheBytes = value;
    },
  },

  /**
   * The maximum additional amount of GPU memory (in bytes) that will be used to cache tiles.
   * <p>
   * If tiles sized more than <code>cacheBytes</code> plus <code>maximumCacheOverflowBytes</code>
   * are needed to meet the desired screen space error, determined by
   * {@link Cesium3DTileset#maximumScreenSpaceError} for the current view, then
   * {@link Cesium3DTileset#memoryAdjustedScreenSpaceError} will be adjusted
   * until the tiles required to meet the adjusted screen space error use less
   * than <code>cacheBytes</code> plus <code>maximumCacheOverflowBytes</code>.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @default 536870912
   *
   * @exception {DeveloperError} <code>maximumCacheOverflowBytes</code> must be typeof 'number' and greater than or equal to 0
   * @see Cesium3DTileset#totalMemoryUsageInBytes
   */
  maximumCacheOverflowBytes: {
    get: function () {
      return this._maximumCacheOverflowBytes;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("value", value, 0);
      //>>includeEnd('debug');

      this._maximumCacheOverflowBytes = value;
    },
  },

  /**
   * If loading the level of detail required by @{link Cesium3DTileset#maximumScreenSpaceError}
   * results in the memory usage exceeding @{link Cesium3DTileset#cacheBytes}
   * plus @{link Cesium3DTileset#maximumCacheOverflowBytes}, level of detail refinement
   * will instead use this (larger) adjusted screen space error to achieve the
   * best possible visual quality within the available memory
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @readonly
   *
   * @private
   */
  memoryAdjustedScreenSpaceError: {
    get: function () {
      return this._memoryAdjustedScreenSpaceError;
    },
  },

  /**
   * Options for controlling point size based on geometric error and eye dome lighting.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {PointCloudShading}
   */
  pointCloudShading: {
    get: function () {
      return this._pointCloudShading;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("pointCloudShading", value);
      //>>includeEnd('debug');
      this._pointCloudShading = value;
    },
  },

  /**
   * The root tile.
   *
   * @memberOf Cesium3DTileset.prototype
   *
   * @type {Cesium3DTile}
   * @readonly
   */
  root: {
    get: function () {
      return this._root;
    },
  },

  /**
   * The tileset's bounding sphere.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @example
   * const tileset = await Cesium.Cesium3DTileset.fromUrl("http://localhost:8002/tilesets/Seattle/tileset.json");
   *
   * viewer.scene.primitives.add(tileset);
   *
   * // Set the camera to view the newly added tileset
   * viewer.camera.viewBoundingSphere(tileset.boundingSphere, new Cesium.HeadingPitchRange(0, -0.5, 0));
   */
  boundingSphere: {
    get: function () {
      this._root.updateTransform(this._modelMatrix);
      return this._root.boundingSphere;
    },
  },

  /**
   * A 4x4 transformation matrix that transforms the entire tileset.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   *
   * @example
   * // Adjust a tileset's height from the globe's surface.
   * const heightOffset = 20.0;
   * const boundingSphere = tileset.boundingSphere;
   * const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
   * const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
   * const offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
   * const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
   * tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (value) {
      this._modelMatrix = Matrix4.clone(value, this._modelMatrix);
    },
  },

  /**
   * Returns the time, in milliseconds, since the tileset was loaded and first updated.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @readonly
   */
  timeSinceLoad: {
    get: function () {
      return this._timeSinceLoad;
    },
  },

  /**
   * The total amount of GPU memory in bytes used by the tileset. This value is estimated from
   * geometry, texture, batch table textures, and binary metadata of loaded tiles.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @readonly
   *
   * @see Cesium3DTileset#cacheBytes
   */
  totalMemoryUsageInBytes: {
    get: function () {
      const statistics = this._statistics;
      return (
        statistics.texturesByteLength +
        statistics.geometryByteLength +
        statistics.batchTableByteLength
      );
    },
  },

  /**
   * @private
   */
  clippingPlanesOriginMatrix: {
    get: function () {
      if (!defined(this._clippingPlanesOriginMatrix)) {
        return Matrix4.IDENTITY;
      }

      if (this._clippingPlanesOriginMatrixDirty) {
        Matrix4.multiply(
          this.root.computedTransform,
          this._initialClippingPlanesOriginMatrix,
          this._clippingPlanesOriginMatrix
        );
        this._clippingPlanesOriginMatrixDirty = false;
      }

      return this._clippingPlanesOriginMatrix;
    },
  },

  /**
   * @private
   */
  styleEngine: {
    get: function () {
      return this._styleEngine;
    },
  },

  /**
   * @private
   */
  statistics: {
    get: function () {
      return this._statistics;
    },
  },

  /**
   * Determines whether terrain, 3D Tiles, or both will be classified by this tileset.
   * <p>
   * This option is only applied to tilesets containing batched 3D models,
   * glTF content, geometry data, or vector data. Even when undefined, vector
   * and geometry data must render as classifications and will default to
   * rendering on both terrain and other 3D Tiles tilesets.
   * </p>
   * <p>
   * When enabled for batched 3D model and glTF tilesets, there are a few
   * requirements/limitations on the glTF:
   * <ul>
   *     <li>The glTF cannot contain morph targets, skins, or animations.</li>
   *     <li>The glTF cannot contain the <code>EXT_mesh_gpu_instancing</code> extension.</li>
   *     <li>Only meshes with TRIANGLES can be used to classify other assets.</li>
   *     <li>The <code>POSITION</code> semantic is required.</li>
   *     <li>If <code>_BATCHID</code>s and an index buffer are both present, all indices with the same batch id must occupy contiguous sections of the index buffer.</li>
   *     <li>If <code>_BATCHID</code>s are present with no index buffer, all positions with the same batch id must occupy contiguous sections of the position buffer.</li>
   * </ul>
   * </p>
   * <p>
   * Additionally, classification is not supported for points or instanced 3D
   * models.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {ClassificationType}
   * @default undefined
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   * @readonly
   */
  classificationType: {
    get: function () {
      return this._classificationType;
    },
  },

  /**
   * Gets an ellipsoid describing the shape of the globe.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },

  /**
   * Optimization option. Used when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control the cone size that determines which tiles are deferred.
   * Tiles that are inside this cone are loaded immediately. Tiles outside the cone are potentially deferred based on how far outside the cone they are and {@link Cesium3DTileset#foveatedInterpolationCallback} and {@link Cesium3DTileset#foveatedMinimumScreenSpaceErrorRelaxation}.
   * Setting this to 0.0 means the cone will be the line formed by the camera position and its view direction. Setting this to 1.0 means the cone encompasses the entire field of view of the camera, essentially disabling the effect.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @default 0.3
   */
  foveatedConeSize: {
    get: function () {
      return this._foveatedConeSize;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("foveatedConeSize", value, 0.0);
      Check.typeOf.number.lessThanOrEquals("foveatedConeSize", value, 1.0);
      //>>includeEnd('debug');

      this._foveatedConeSize = value;
    },
  },

  /**
   * Optimization option. Used when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control the starting screen space error relaxation for tiles outside the foveated cone.
   * The screen space error will be raised starting with this value up to {@link Cesium3DTileset#maximumScreenSpaceError} based on the provided {@link Cesium3DTileset#foveatedInterpolationCallback}.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {number}
   * @default 0.0
   */
  foveatedMinimumScreenSpaceErrorRelaxation: {
    get: function () {
      return this._foveatedMinimumScreenSpaceErrorRelaxation;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals(
        "foveatedMinimumScreenSpaceErrorRelaxation",
        value,
        0.0
      );
      Check.typeOf.number.lessThanOrEquals(
        "foveatedMinimumScreenSpaceErrorRelaxation",
        value,
        this.maximumScreenSpaceError
      );
      //>>includeEnd('debug');

      this._foveatedMinimumScreenSpaceErrorRelaxation = value;
    },
  },

  /**
   * Returns the <code>extras</code> property at the top-level of the tileset JSON, which contains application specific metadata.
   * Returns <code>undefined</code> if <code>extras</code> does not exist.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {*}
   * @readonly
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification#specifying-extensions-and-application-specific-extras|Extras in the 3D Tiles specification.}
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * The properties for managing image-based lighting on this tileset.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {ImageBasedLighting}
   */
  imageBasedLighting: {
    get: function () {
      return this._imageBasedLighting;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("imageBasedLighting", this._imageBasedLighting);
      //>>includeEnd('debug');
      if (value !== this._imageBasedLighting) {
        if (
          this._shouldDestroyImageBasedLighting &&
          !this._imageBasedLighting.isDestroyed()
        ) {
          this._imageBasedLighting.destroy();
        }
        this._imageBasedLighting = value;
        this._shouldDestroyImageBasedLighting = false;
      }
    },
  },

  /**
   * Indicates that only the tileset's vector tiles should be used for classification.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @type {boolean}
   * @default false
   */
  vectorClassificationOnly: {
    get: function () {
      return this._vectorClassificationOnly;
    },
  },

  /**
   * Whether vector tiles should keep decoded positions in memory.
   * This is used with {@link Cesium3DTileFeature.getPolylinePositions}.
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @type {boolean}
   * @default false
   */
  vectorKeepDecodedPositions: {
    get: function () {
      return this._vectorKeepDecodedPositions;
    },
  },

  /**
   * Determines whether the credits of the tileset will be displayed on the screen
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {boolean}
   * @default false
   */
  showCreditsOnScreen: {
    get: function () {
      return this._showCreditsOnScreen;
    },
    set: function (value) {
      this._showCreditsOnScreen = value;
    },
  },

  /**
   * Label of the feature ID set to use for picking and styling.
   * <p>
   * For EXT_mesh_features, this is the feature ID's label property, or
   * "featureId_N" (where N is the index in the featureIds array) when not
   * specified. EXT_feature_metadata did not have a label field, so such
   * feature ID sets are always labeled "featureId_N" where N is the index in
   * the list of all feature Ids, where feature ID attributes are listed before
   * feature ID textures.
   * </p>
   * <p>
   * If featureIdLabel is set to an integer N, it is converted to
   * the string "featureId_N" automatically. If both per-primitive and
   * per-instance feature IDs are present, the instance feature IDs take
   * priority.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {string}
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  featureIdLabel: {
    get: function () {
      return this._featureIdLabel;
    },
    set: function (value) {
      // indices get converted into featureId_N
      if (typeof value === "number") {
        value = `featureId_${value}`;
      }

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.string("value", value);
      //>>includeEnd('debug');

      this._featureIdLabel = value;
    },
  },

  /**
   * Label of the instance feature ID set used for picking and styling.
   * <p>
   * If instanceFeatureIdLabel is set to an integer N, it is converted to
   * the string "instanceFeatureId_N" automatically.
   * If both per-primitive and per-instance feature IDs are present, the
   * instance feature IDs take priority.
   * </p>
   *
   * @memberof Cesium3DTileset.prototype
   *
   * @type {string}
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  instanceFeatureIdLabel: {
    get: function () {
      return this._instanceFeatureIdLabel;
    },
    set: function (value) {
      // indices get converted into instanceFeatureId_N
      if (typeof value === "number") {
        value = `instanceFeatureId_${value}`;
      }

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.string("value", value);
      //>>includeEnd('debug');

      this._instanceFeatureIdLabel = value;
    },
  },
});

/**
 * Creates a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles tileset},
 * used for streaming massive heterogeneous 3D geospatial datasets, from a Cesium ion asset ID.
 *
 * @param {number} assetId The Cesium ion asset id.
 * @param {Cesium3DTileset.ConstructorOptions} options An object describing initialization options
 * @returns {Promise<Cesium3DTileset>}
 *
 * @exception {DeveloperError} The tileset must be 3D Tiles version 0.0 or 1.0.
 *
 * @see Cesium3DTileset#fromUrl
 *
 * @example
 * // Load a Cesium3DTileset with a Cesium ion asset ID of 124624234
 * try {
 *   const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(124624234);
 *   scene.primitives.add(tileset);
 * } catch (error) {
 *   console.error(`Error creating tileset: ${error}`);
 * }
 */
Cesium3DTileset.fromIonAssetId = async function (assetId, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("assetId", assetId);
  //>>includeEnd('debug');

  const resource = await IonResource.fromAssetId(assetId);
  return Cesium3DTileset.fromUrl(resource, options);
};

/**
 * Creates a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles tileset},
 * used for streaming massive heterogeneous 3D geospatial datasets.
 *
 * @param {Resource|string} url The url to a tileset JSON file.
 * @param {Cesium3DTileset.ConstructorOptions} [options] An object describing initialization options
 * @returns {Promise<Cesium3DTileset>}
 *
 * @exception {DeveloperError} The tileset must be 3D Tiles version 0.0 or 1.0.
 *
 * @see Cesium3DTileset#fromIonAssetId
 *
 * @example
 * try {
 *   const tileset = await Cesium.Cesium3DTileset.fromUrl(
 *      "http://localhost:8002/tilesets/Seattle/tileset.json"
 *   );
 *   scene.primitives.add(tileset);
 * } catch (error) {
 *   console.error(`Error creating tileset: ${error}`);
 * }
 *
 * @example
 * // Common setting for the skipLevelOfDetail optimization
 * const tileset = await Cesium.Cesium3DTileset.fromUrl(
 *   "http://localhost:8002/tilesets/Seattle/tileset.json", {
 *      skipLevelOfDetail: true,
 *      baseScreenSpaceError: 1024,
 *      skipScreenSpaceErrorFactor: 16,
 *      skipLevels: 1,
 *      immediatelyLoadDesiredLevelOfDetail: false,
 *      loadSiblings: false,
 *      cullWithChildrenBounds: true
 * });
 * scene.primitives.add(tileset);
 *
 * @example
 * // Common settings for the dynamicScreenSpaceError optimization
 * const tileset = await Cesium.Cesium3DTileset.fromUrl(
 *   "http://localhost:8002/tilesets/Seattle/tileset.json", {
 *      dynamicScreenSpaceError: true,
 *      dynamicScreenSpaceErrorDensity: 0.00278,
 *      dynamicScreenSpaceErrorFactor: 4.0,
 *      dynamicScreenSpaceErrorHeightFalloff: 0.25
 * });
 * scene.primitives.add(tileset);
 */
Cesium3DTileset.fromUrl = async function (url, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const resource = Resource.createIfNeeded(url);
  let basePath;
  if (resource.extension === "json") {
    basePath = resource.getBaseUri(true);
  } else if (resource.isDataUri) {
    basePath = "";
  }

  const tilesetJson = await Cesium3DTileset.loadJson(resource);
  const metadataExtension = await processMetadataExtension(
    resource,
    tilesetJson
  );

  const tileset = new Cesium3DTileset(options);
  tileset._resource = resource;
  tileset._url = resource.url;
  tileset._basePath = basePath;
  tileset._metadataExtension = metadataExtension;
  // Set these before loading the tileset since _geometricError
  // and _scaledGeometricError get accessed during tile creation
  tileset._geometricError = tilesetJson.geometricError;
  tileset._scaledGeometricError = tilesetJson.geometricError;

  const asset = tilesetJson.asset;
  tileset._asset = asset;
  tileset._extras = tilesetJson.extras;

  let credits = resource.credits;
  if (!defined(credits)) {
    credits = [];
  }

  const assetExtras = asset.extras;
  if (
    defined(assetExtras) &&
    defined(assetExtras.cesium) &&
    defined(assetExtras.cesium.credits)
  ) {
    const extraCredits = assetExtras.cesium.credits;
    for (let i = 0; i < extraCredits.length; ++i) {
      const credit = extraCredits[i];
      credits.push(new Credit(credit.html, tileset._showCreditsOnScreen));
    }
  }
  tileset._credits = credits;

  // Handle legacy gltfUpAxis option
  const gltfUpAxis = defined(tilesetJson.asset.gltfUpAxis)
    ? Axis.fromName(tilesetJson.asset.gltfUpAxis)
    : Axis.Y;
  const modelUpAxis = defaultValue(options.modelUpAxis, gltfUpAxis);
  const modelForwardAxis = defaultValue(options.modelForwardAxis, Axis.X);

  tileset._properties = tilesetJson.properties;
  tileset._extensionsUsed = tilesetJson.extensionsUsed;
  tileset._extensions = tilesetJson.extensions;
  tileset._modelUpAxis = modelUpAxis;
  tileset._modelForwardAxis = modelForwardAxis;

  tileset._root = tileset.loadTileset(resource, tilesetJson);

  // Save the original, untransformed bounding volume position so we can apply
  // the tile transform and model matrix at run time
  const boundingVolume = tileset._root.createBoundingVolume(
    tilesetJson.root.boundingVolume,
    Matrix4.IDENTITY
  );
  const clippingPlanesOrigin = boundingVolume.boundingSphere.center;
  // If this origin is above the surface of the earth
  // we want to apply an ENU orientation as our best guess of orientation.
  // Otherwise, we assume it gets its position/orientation completely from the
  // root tile transform and the tileset's model matrix
  const originCartographic = tileset._ellipsoid.cartesianToCartographic(
    clippingPlanesOrigin
  );
  if (
    defined(originCartographic) &&
    originCartographic.height >
      ApproximateTerrainHeights._defaultMinTerrainHeight
  ) {
    tileset._initialClippingPlanesOriginMatrix = Transforms.eastNorthUpToFixedFrame(
      clippingPlanesOrigin
    );
  }
  tileset._clippingPlanesOriginMatrix = Matrix4.clone(
    tileset._initialClippingPlanesOriginMatrix
  );

  return tileset;
};

/**
 * Provides a hook to override the method used to request the tileset json
 * useful when fetching tilesets from remote servers
 * @param {Resource|string} tilesetUrl The url of the json file to be fetched
 * @returns {Promise<object>} A promise that resolves with the fetched json data
 */
Cesium3DTileset.loadJson = function (tilesetUrl) {
  const resource = Resource.createIfNeeded(tilesetUrl);
  return resource.fetchJson();
};

/**
 * Marks the tileset's {@link Cesium3DTileset#style} as dirty, which forces all
 * features to re-evaluate the style in the next frame each is visible.
 */
Cesium3DTileset.prototype.makeStyleDirty = function () {
  this._styleEngine.makeDirty();
};

/**
 * Loads the main tileset JSON file or a tileset JSON file referenced from a tile.
 *
 * @private
 */
Cesium3DTileset.prototype.loadTileset = function (
  resource,
  tilesetJson,
  parentTile
) {
  const asset = tilesetJson.asset;
  if (!defined(asset)) {
    throw new RuntimeError("Tileset must have an asset property.");
  }
  if (
    asset.version !== "0.0" &&
    asset.version !== "1.0" &&
    asset.version !== "1.1"
  ) {
    throw new RuntimeError(
      "The tileset must be 3D Tiles version 0.0, 1.0, or 1.1"
    );
  }

  if (defined(tilesetJson.extensionsRequired)) {
    Cesium3DTileset.checkSupportedExtensions(tilesetJson.extensionsRequired);
  }

  const statistics = this._statistics;

  const tilesetVersion = asset.tilesetVersion;
  if (defined(tilesetVersion)) {
    // Append the tileset version to the resource
    this._basePath += `?v=${tilesetVersion}`;
    resource = resource.clone();
    resource.setQueryParameters({ v: tilesetVersion });
  }

  // A tileset JSON file referenced from a tile may exist in a different directory than the root tileset.
  // Get the basePath relative to the external tileset.
  const rootTile = makeTile(this, resource, tilesetJson.root, parentTile);

  // If there is a parentTile, add the root of the currently loading tileset
  // to parentTile's children, and update its _depth.
  if (defined(parentTile)) {
    parentTile.children.push(rootTile);
    rootTile._depth = parentTile._depth + 1;
  }

  const stack = [];
  stack.push(rootTile);

  while (stack.length > 0) {
    const tile = stack.pop();
    ++statistics.numberOfTilesTotal;
    this._allTilesAdditive =
      this._allTilesAdditive && tile.refine === Cesium3DTileRefine.ADD;
    const children = tile._header.children;
    if (defined(children)) {
      for (let i = 0; i < children.length; ++i) {
        const childHeader = children[i];
        const childTile = makeTile(this, resource, childHeader, tile);
        tile.children.push(childTile);
        childTile._depth = tile._depth + 1;
        stack.push(childTile);
      }
    }

    if (this._cullWithChildrenBounds) {
      Cesium3DTileOptimizations.checkChildrenWithinParent(tile);
    }
  }

  return rootTile;
};

/**
 * Make a {@link Cesium3DTile} for a specific tile. If the tile's header has implicit
 * tiling (3D Tiles 1.1) or uses the <code>3DTILES_implicit_tiling</code> extension,
 * it creates a placeholder tile instead for lazy evaluation of the implicit tileset.
 *
 * @param {Cesium3DTileset} tileset The tileset
 * @param {Resource} baseResource The base resource for the tileset
 * @param {object} tileHeader The JSON header for the tile
 * @param {Cesium3DTile} [parentTile] The parent tile of the new tile
 * @returns {Cesium3DTile} The newly created tile
 *
 * @private
 */
function makeTile(tileset, baseResource, tileHeader, parentTile) {
  const hasImplicitTiling =
    defined(tileHeader.implicitTiling) ||
    hasExtension(tileHeader, "3DTILES_implicit_tiling");

  if (!hasImplicitTiling) {
    return new Cesium3DTile(tileset, baseResource, tileHeader, parentTile);
  }

  const metadataSchema = tileset.schema;

  const implicitTileset = new ImplicitTileset(
    baseResource,
    tileHeader,
    metadataSchema
  );
  const rootCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitTileset.subdivisionScheme,
    subtreeLevels: implicitTileset.subtreeLevels,
    level: 0,
    x: 0,
    y: 0,
    // The constructor will only use this for octrees.
    z: 0,
  });

  // Create a placeholder Cesium3DTile that has an ImplicitTileset
  // object and whose content will resolve to an Implicit3DTileContent
  const contentUri = implicitTileset.subtreeUriTemplate.getDerivedResource({
    templateValues: rootCoordinates.getTemplateValues(),
  }).url;

  const deepCopy = true;
  const tileJson = clone(tileHeader, deepCopy);
  // Replace contents with the subtree
  tileJson.contents = [
    {
      uri: contentUri,
    },
  ];

  delete tileJson.content;

  // The placeholder tile does not have any extensions. If there are any
  // extensions beyond 3DTILES_implicit_tiling, Implicit3DTileContent will
  // copy them to the transcoded tiles.
  delete tileJson.extensions;

  const tile = new Cesium3DTile(tileset, baseResource, tileJson, parentTile);
  tile.implicitTileset = implicitTileset;
  tile.implicitCoordinates = rootCoordinates;
  return tile;
}

/**
 * If tileset metadata is present, initialize the {@link Cesium3DTilesetMetadata}
 * instance. This is asynchronous since metadata schemas may be external.
 *
 * @param {Cesium3DTileset} tileset The tileset
 * @param {object} tilesetJson The tileset JSON
 * @return {Promise<Cesium3DTilesetMetadata>} The loaded Cesium3DTilesetMetadata
 * @private
 */
async function processMetadataExtension(resource, tilesetJson) {
  const metadataJson = hasExtension(tilesetJson, "3DTILES_metadata")
    ? tilesetJson.extensions["3DTILES_metadata"]
    : tilesetJson;

  let schemaLoader;
  if (defined(metadataJson.schemaUri)) {
    resource = resource.getDerivedResource({
      url: metadataJson.schemaUri,
    });
    schemaLoader = ResourceCache.getSchemaLoader({
      resource: resource,
    });
  } else if (defined(metadataJson.schema)) {
    schemaLoader = ResourceCache.getSchemaLoader({
      schema: metadataJson.schema,
    });
  } else {
    return;
  }

  await schemaLoader.load();

  const metadataExtension = new Cesium3DTilesetMetadata({
    schema: schemaLoader.schema,
    metadataJson: metadataJson,
  });

  ResourceCache.unload(schemaLoader);

  return metadataExtension;
}

const scratchPositionNormal = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchMatrix = new Matrix4();
const scratchCenter = new Cartesian3();
const scratchPosition = new Cartesian3();
const scratchDirection = new Cartesian3();

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
function updateDynamicScreenSpaceError(tileset, frameState) {
  let up;
  let direction;
  let height;
  let minimumHeight;
  let maximumHeight;

  const camera = frameState.camera;
  const root = tileset._root;
  const tileBoundingVolume = root.contentBoundingVolume;

  if (tileBoundingVolume instanceof TileBoundingRegion) {
    up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
    direction = camera.directionWC;
    height = camera.positionCartographic.height;
    minimumHeight = tileBoundingVolume.minimumHeight;
    maximumHeight = tileBoundingVolume.maximumHeight;
  } else {
    // Transform camera position and direction into the local coordinate system of the tileset
    const transformLocal = Matrix4.inverseTransformation(
      root.computedTransform,
      scratchMatrix
    );
    const ellipsoid = frameState.mapProjection.ellipsoid;
    const boundingVolume = tileBoundingVolume.boundingVolume;
    const centerLocal = Matrix4.multiplyByPoint(
      transformLocal,
      boundingVolume.center,
      scratchCenter
    );
    if (Cartesian3.magnitude(centerLocal) > ellipsoid.minimumRadius) {
      // The tileset is defined in WGS84. Approximate the minimum and maximum height.
      const centerCartographic = Cartographic.fromCartesian(
        centerLocal,
        ellipsoid,
        scratchCartographic
      );
      up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
      direction = camera.directionWC;
      height = camera.positionCartographic.height;
      minimumHeight = 0.0;
      maximumHeight = centerCartographic.height * 2.0;
    } else {
      // The tileset is defined in local coordinates (z-up)
      const positionLocal = Matrix4.multiplyByPoint(
        transformLocal,
        camera.positionWC,
        scratchPosition
      );
      up = Cartesian3.UNIT_Z;
      direction = Matrix4.multiplyByPointAsVector(
        transformLocal,
        camera.directionWC,
        scratchDirection
      );
      direction = Cartesian3.normalize(direction, direction);
      height = positionLocal.z;
      if (tileBoundingVolume instanceof TileOrientedBoundingBox) {
        // Assuming z-up, the last component stores the half-height of the box
        const boxHeight = root._header.boundingVolume.box[11];
        minimumHeight = centerLocal.z - boxHeight;
        maximumHeight = centerLocal.z + boxHeight;
      } else if (tileBoundingVolume instanceof TileBoundingSphere) {
        const radius = boundingVolume.radius;
        minimumHeight = centerLocal.z - radius;
        maximumHeight = centerLocal.z + radius;
      }
    }
  }

  // The range where the density starts to lessen. Start at the quarter height of the tileset.
  const heightFalloff = tileset.dynamicScreenSpaceErrorHeightFalloff;
  const heightClose =
    minimumHeight + (maximumHeight - minimumHeight) * heightFalloff;
  const heightFar = maximumHeight;

  const t = CesiumMath.clamp(
    (height - heightClose) / (heightFar - heightClose),
    0.0,
    1.0
  );

  // Increase density as the camera tilts towards the horizon
  let horizonFactor = 1.0 - Math.abs(Cartesian3.dot(direction, up));

  // Weaken the horizon factor as the camera height increases, implying the camera is further away from the tileset.
  // The goal is to increase density for the "street view", not when viewing the tileset from a distance.
  horizonFactor = horizonFactor * (1.0 - t);

  tileset._dynamicScreenSpaceErrorComputedDensity =
    tileset.dynamicScreenSpaceErrorDensity * horizonFactor;
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 */
function requestContent(tileset, tile) {
  if (tile.hasEmptyContent) {
    return;
  }

  const { statistics } = tileset;
  const contentExpired = tile.contentExpired;

  const promise = tile.requestContent();
  if (!defined(promise)) {
    return;
  }

  promise
    .then((content) => {
      if (!defined(content) || tile.isDestroyed() || tileset.isDestroyed()) {
        return;
      }

      tileset._processingQueue.push(tile);
      ++statistics.numberOfTilesProcessing;
    })
    .catch((error) => {
      handleTileFailure(error, tileset, tile);
    });

  if (contentExpired) {
    if (tile.hasTilesetContent || tile.hasImplicitContent) {
      destroySubtree(tileset, tile);
    } else {
      statistics.decrementLoadCounts(tile.content);
      --statistics.numberOfTilesWithContentReady;
    }
  }

  tileset._requestedTilesInFlight.push(tile);
}

function sortTilesByPriority(a, b) {
  return a._priority - b._priority;
}

/**
 * Perform any pass invariant tasks here. Called after the render pass.
 * @private
 * @param {FrameState} frameState
 */
Cesium3DTileset.prototype.postPassesUpdate = function (frameState) {
  if (!defined(this._root)) {
    return;
  }

  cancelOutOfViewRequests(this, frameState);
  raiseLoadProgressEvent(this, frameState);
  this._cache.unloadTiles(this, unloadTile);

  // If the style wasn't able to be applied this frame (for example,
  // the tileset was hidden), keep it dirty so the engine can try
  // to apply the style next frame.
  if (this._styleApplied) {
    this._styleEngine.resetDirty();
  }
  this._styleApplied = false;
};

/**
 * Perform any pass invariant tasks here. Called before any passes are executed.
 * @private
 * @param {FrameState} frameState
 */
Cesium3DTileset.prototype.prePassesUpdate = function (frameState) {
  if (!defined(this._root)) {
    return;
  }

  processTiles(this, frameState);

  // Update clipping planes
  const clippingPlanes = this._clippingPlanes;
  this._clippingPlanesOriginMatrixDirty = true;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    clippingPlanes.update(frameState);
  }

  if (!defined(this._loadTimestamp)) {
    this._loadTimestamp = JulianDate.clone(frameState.time);
  }
  this._timeSinceLoad = Math.max(
    JulianDate.secondsDifference(frameState.time, this._loadTimestamp) * 1000,
    0.0
  );

  if (this.dynamicScreenSpaceError) {
    updateDynamicScreenSpaceError(this, frameState);
  }

  if (frameState.newFrame) {
    this._cache.reset();
  }
};

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
function cancelOutOfViewRequests(tileset, frameState) {
  const requestedTilesInFlight = tileset._requestedTilesInFlight;
  let removeCount = 0;
  for (let i = 0; i < requestedTilesInFlight.length; ++i) {
    const tile = requestedTilesInFlight[i];

    // NOTE: This is framerate dependant so make sure the threshold check is small
    const outOfView = frameState.frameNumber - tile._touchedFrame >= 1;
    if (tile._contentState !== Cesium3DTileContentState.LOADING) {
      // No longer fetching from host, don't need to track it anymore. Gets marked as LOADING in Cesium3DTile::requestContent().
      ++removeCount;
      continue;
    } else if (outOfView) {
      // RequestScheduler will take care of cancelling it
      tile.cancelRequests();
      ++removeCount;
      continue;
    }

    if (removeCount > 0) {
      requestedTilesInFlight[i - removeCount] = tile;
    }
  }

  requestedTilesInFlight.length -= removeCount;
}

/**
 * Sort requests by priority before making any requests.
 * This makes it less likely that requests will be cancelled after being issued.
 * @private
 * @param {Cesium3DTileset} tileset
 */
function requestTiles(tileset) {
  const requestedTiles = tileset._requestedTiles;
  requestedTiles.sort(sortTilesByPriority);
  for (let i = 0; i < requestedTiles.length; ++i) {
    requestContent(tileset, requestedTiles[i]);
  }
}

/**
 * @private
 * @param {Error} error
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 */
function handleTileFailure(error, tileset, tile) {
  if (tileset.isDestroyed()) {
    return;
  }

  let url;
  if (!tile.isDestroyed()) {
    url = tile._contentResource.url;
  }

  const message = defined(error.message) ? error.message : error.toString();
  if (tileset.tileFailed.numberOfListeners > 0) {
    tileset.tileFailed.raiseEvent({
      url: url,
      message: message,
    });
  } else {
    console.log(`A 3D tile failed to load: ${url}`);
    console.log(`Error: ${message}`);
  }
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 */
function filterProcessingQueue(tileset) {
  const tiles = tileset._processingQueue;

  let removeCount = 0;
  for (let i = 0; i < tiles.length; ++i) {
    const tile = tiles[i];
    if (
      tile.isDestroyed() ||
      tile._contentState !== Cesium3DTileContentState.PROCESSING
    ) {
      ++removeCount;
      continue;
    }
    if (removeCount > 0) {
      tiles[i - removeCount] = tile;
    }
  }
  tiles.length -= removeCount;
}

/**
 * Process tiles in the PROCESSING state so they will eventually move to the READY state.
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 */
function processTiles(tileset, frameState) {
  filterProcessingQueue(tileset);
  const tiles = tileset._processingQueue;

  const { cacheBytes, maximumCacheOverflowBytes, statistics } = tileset;
  const cacheByteLimit = cacheBytes + maximumCacheOverflowBytes;

  let memoryExceeded = false;
  for (let i = 0; i < tiles.length; ++i) {
    if (tileset.totalMemoryUsageInBytes > cacheByteLimit) {
      memoryExceeded = true;
      break;
    }

    const tile = tiles[i];
    try {
      tile.process(tileset, frameState);

      if (tile.contentReady) {
        --statistics.numberOfTilesProcessing;
        tileset.tileLoad.raiseEvent(tile);
      }
    } catch (error) {
      --statistics.numberOfTilesProcessing;
      handleTileFailure(error, tileset, tile);
    }
  }

  if (tileset.totalMemoryUsageInBytes < cacheBytes) {
    decreaseScreenSpaceError(tileset);
  } else if (memoryExceeded && tiles.length > 0) {
    increaseScreenSpaceError(tileset);
  }
}

function increaseScreenSpaceError(tileset) {
  //>>includeStart('debug', pragmas.debug);
  oneTimeWarning(
    "increase-screenSpaceError",
    `The tiles needed to meet maximumScreenSpaceError would use more memory than allocated for this tileset.
    The tileset will be rendered with a larger screen space error (see memoryAdjustedScreenSpaceError).
    Consider using larger values for cacheBytes and maximumCacheOverflowBytes.`
  );
  //>>includeEnd('debug');

  tileset._memoryAdjustedScreenSpaceError *= 1.02;
  const tiles = tileset._processingQueue;
  for (let i = 0; i < tiles.length; ++i) {
    tiles[i].updatePriority();
  }
  tiles.sort(sortTilesByPriority);
}

function decreaseScreenSpaceError(tileset) {
  tileset._memoryAdjustedScreenSpaceError = Math.max(
    tileset.memoryAdjustedScreenSpaceError / 1.02,
    tileset.maximumScreenSpaceError
  );
}

const scratchCartesian = new Cartesian3();

const stringOptions = {
  maximumFractionDigits: 3,
};

/**
 * @private
 * @param {number} memorySizeInBytes
 * @returns {string}
 */
function formatMemoryString(memorySizeInBytes) {
  const memoryInMegabytes = memorySizeInBytes / 1048576;
  if (memoryInMegabytes < 1.0) {
    return memoryInMegabytes.toLocaleString(undefined, stringOptions);
  }
  return Math.round(memoryInMegabytes).toLocaleString();
}

/**
 * @private
 * @param {Cesium3DTile} tile
 * @returns {Cartesian3}
 */
function computeTileLabelPosition(tile) {
  const { halfAxes, radius, center } = tile.boundingVolume.boundingVolume;

  let position = Cartesian3.clone(center, scratchCartesian);
  if (defined(halfAxes)) {
    position.x += 0.75 * (halfAxes[0] + halfAxes[3] + halfAxes[6]);
    position.y += 0.75 * (halfAxes[1] + halfAxes[4] + halfAxes[7]);
    position.z += 0.75 * (halfAxes[2] + halfAxes[5] + halfAxes[8]);
  } else if (defined(radius)) {
    let normal = Cartesian3.normalize(center, scratchCartesian);
    normal = Cartesian3.multiplyByScalar(
      normal,
      0.75 * radius,
      scratchCartesian
    );
    position = Cartesian3.add(normal, center, scratchCartesian);
  }
  return position;
}

/**
 * @private
 * @param {Cesium3DTile} tile
 * @param {Cesium3DTileset} tileset
 * @param {Cartesian3} position
 * @returns {Label}
 */
function addTileDebugLabel(tile, tileset, position) {
  let labelString = "";
  let attributes = 0;

  if (tileset.debugShowGeometricError) {
    labelString += `\nGeometric error: ${tile.geometricError}`;
    attributes++;
  }

  if (tileset.debugShowRenderingStatistics) {
    labelString += `\nCommands: ${tile.commandsLength}`;
    attributes++;

    // Don't display number of points or triangles if 0.
    const numberOfPoints = tile.content.pointsLength;
    if (numberOfPoints > 0) {
      labelString += `\nPoints: ${tile.content.pointsLength}`;
      attributes++;
    }

    const numberOfTriangles = tile.content.trianglesLength;
    if (numberOfTriangles > 0) {
      labelString += `\nTriangles: ${tile.content.trianglesLength}`;
      attributes++;
    }

    labelString += `\nFeatures: ${tile.content.featuresLength}`;
    attributes++;
  }

  if (tileset.debugShowMemoryUsage) {
    labelString += `\nTexture Memory: ${formatMemoryString(
      tile.content.texturesByteLength
    )}`;
    labelString += `\nGeometry Memory: ${formatMemoryString(
      tile.content.geometryByteLength
    )}`;
    attributes += 2;
  }

  if (tileset.debugShowUrl) {
    if (tile.hasMultipleContents) {
      labelString += "\nUrls:";
      const urls = tile.content.innerContentUrls;
      for (let i = 0; i < urls.length; i++) {
        labelString += `\n- ${urls[i]}`;
      }
      attributes += urls.length;
    } else {
      labelString += `\nUrl: ${tile._contentHeader.uri}`;
      attributes++;
    }
  }

  const newLabel = {
    text: labelString.substring(1),
    position: position,
    font: `${19 - attributes}px sans-serif`,
    showBackground: true,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };

  return tileset._tileDebugLabels.add(newLabel);
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
function updateTileDebugLabels(tileset, frameState) {
  const selectedTiles = tileset._selectedTiles;
  const selectedLength = selectedTiles.length;
  const emptyTiles = tileset._emptyTiles;
  const emptyLength = emptyTiles.length;
  tileset._tileDebugLabels.removeAll();

  if (tileset.debugPickedTileLabelOnly) {
    if (defined(tileset.debugPickedTile)) {
      const position = defined(tileset.debugPickPosition)
        ? tileset.debugPickPosition
        : computeTileLabelPosition(tileset.debugPickedTile);
      const label = addTileDebugLabel(
        tileset.debugPickedTile,
        tileset,
        position
      );
      label.pixelOffset = new Cartesian2(15, -15); // Offset to avoid picking the label.
    }
  } else {
    for (let i = 0; i < selectedLength; ++i) {
      const tile = selectedTiles[i];
      addTileDebugLabel(tile, tileset, computeTileLabelPosition(tile));
    }
    for (let i = 0; i < emptyLength; ++i) {
      const tile = emptyTiles[i];
      if (tile.hasTilesetContent || tile.hasImplicitContent) {
        addTileDebugLabel(tile, tileset, computeTileLabelPosition(tile));
      }
    }
  }
  tileset._tileDebugLabels.update(frameState);
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 * @param {object} passOptions
 */
function updateTiles(tileset, frameState, passOptions) {
  tileset._styleEngine.applyStyle(tileset);
  tileset._styleApplied = true;

  const { commandList, context } = frameState;
  const numberOfInitialCommands = commandList.length;
  const selectedTiles = tileset._selectedTiles;

  const bivariateVisibilityTest =
    tileset.isSkippingLevelOfDetail &&
    tileset._hasMixedContent &&
    context.stencilBuffer &&
    selectedTiles.length > 0;

  tileset._backfaceCommands.length = 0;

  if (bivariateVisibilityTest) {
    if (!defined(tileset._stencilClearCommand)) {
      tileset._stencilClearCommand = new ClearCommand({
        stencil: 0,
        pass: Pass.CESIUM_3D_TILE,
        renderState: RenderState.fromCache({
          stencilMask: StencilConstants.SKIP_LOD_MASK,
        }),
      });
    }
    commandList.push(tileset._stencilClearCommand);
  }

  const { statistics, tileVisible } = tileset;
  const isRender = passOptions.isRender;
  const lengthBeforeUpdate = commandList.length;

  for (let i = 0; i < selectedTiles.length; ++i) {
    const tile = selectedTiles[i];
    // Raise the tileVisible event before update in case the tileVisible event
    // handler makes changes that update needs to apply to WebGL resources
    if (isRender) {
      tileVisible.raiseEvent(tile);
    }
    tile.update(tileset, frameState, passOptions);
    statistics.incrementSelectionCounts(tile.content);
    ++statistics.selected;
  }
  const emptyTiles = tileset._emptyTiles;
  for (let i = 0; i < emptyTiles.length; ++i) {
    const tile = emptyTiles[i];
    tile.update(tileset, frameState, passOptions);
  }

  let addedCommandsLength = commandList.length - lengthBeforeUpdate;

  tileset._backfaceCommands.trim();

  if (bivariateVisibilityTest) {
    /*
     * Consider 'effective leaf' tiles as selected tiles that have no selected descendants. They may have children,
     * but they are currently our effective leaves because they do not have selected descendants. These tiles
     * are those where with tile._finalResolution === true.
     * Let 'unresolved' tiles be those with tile._finalResolution === false.
     *
     * 1. Render just the backfaces of unresolved tiles in order to lay down z
     * 2. Render all frontfaces wherever tile._selectionDepth > stencilBuffer.
     *    Replace stencilBuffer with tile._selectionDepth, when passing the z test.
     *    Because children are always drawn before ancestors {@link Cesium3DTilesetTraversal#traverseAndSelect},
     *    this effectively draws children first and does not draw ancestors if a descendant has already
     *    been drawn at that pixel.
     *    Step 1 prevents child tiles from appearing on top when they are truly behind ancestor content.
     *    If they are behind the backfaces of the ancestor, then they will not be drawn.
     *
     * NOTE: Step 2 sometimes causes visual artifacts when backfacing child content has some faces that
     * partially face the camera and are inside of the ancestor content. Because they are inside, they will
     * not be culled by the depth writes in Step 1, and because they partially face the camera, the stencil tests
     * will draw them on top of the ancestor content.
     *
     * NOTE: Because we always render backfaces of unresolved tiles, if the camera is looking at the backfaces
     * of an object, they will always be drawn while loading, even if backface culling is enabled.
     */

    const backfaceCommands = tileset._backfaceCommands.values;
    const backfaceCommandsLength = backfaceCommands.length;

    commandList.length += backfaceCommandsLength;

    // copy commands to the back of the commandList
    for (let i = addedCommandsLength - 1; i >= 0; --i) {
      commandList[lengthBeforeUpdate + backfaceCommandsLength + i] =
        commandList[lengthBeforeUpdate + i];
    }

    // move backface commands to the front of the commandList
    for (let i = 0; i < backfaceCommandsLength; ++i) {
      commandList[lengthBeforeUpdate + i] = backfaceCommands[i];
    }
  }

  // Number of commands added by each update above
  addedCommandsLength = commandList.length - numberOfInitialCommands;
  statistics.numberOfCommands = addedCommandsLength;

  if (!isRender) {
    return;
  }

  // Only run EDL if simple attenuation is on
  if (
    tileset.pointCloudShading.attenuation &&
    tileset.pointCloudShading.eyeDomeLighting &&
    addedCommandsLength > 0
  ) {
    tileset._pointCloudEyeDomeLighting.update(
      frameState,
      numberOfInitialCommands,
      tileset.pointCloudShading,
      tileset.boundingSphere
    );
  }

  if (
    tileset.debugShowGeometricError ||
    tileset.debugShowRenderingStatistics ||
    tileset.debugShowMemoryUsage ||
    tileset.debugShowUrl
  ) {
    if (!defined(tileset._tileDebugLabels)) {
      tileset._tileDebugLabels = new LabelCollection();
    }
    updateTileDebugLabels(tileset, frameState);
  } else {
    tileset._tileDebugLabels =
      tileset._tileDebugLabels && tileset._tileDebugLabels.destroy();
  }
}

const scratchStack = [];

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 */
function destroySubtree(tileset, tile) {
  const root = tile;
  const stack = scratchStack;
  stack.push(tile);
  while (stack.length > 0) {
    tile = stack.pop();
    const children = tile.children;
    for (let i = 0; i < children.length; ++i) {
      stack.push(children[i]);
    }
    if (tile !== root) {
      destroyTile(tileset, tile);
      --tileset._statistics.numberOfTilesTotal;
    }
  }
  root.children = [];
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 */
function unloadTile(tileset, tile) {
  tileset.tileUnload.raiseEvent(tile);
  tileset._statistics.decrementLoadCounts(tile.content);
  --tileset._statistics.numberOfTilesWithContentReady;
  tile.unloadContent();
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 */
function destroyTile(tileset, tile) {
  tileset._cache.unloadTile(tileset, tile, unloadTile);
  tile.destroy();
}

/**
 * Unloads all tiles that weren't selected the previous frame.  This can be used to
 * explicitly manage the tile cache and reduce the total number of tiles loaded below
 * {@link Cesium3DTileset#cacheBytes}.
 * <p>
 * Tile unloads occur at the next frame to keep all the WebGL delete calls
 * within the render loop.
 * </p>
 */
Cesium3DTileset.prototype.trimLoadedTiles = function () {
  this._cache.trim();
};

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
function raiseLoadProgressEvent(tileset, frameState) {
  const statistics = tileset._statistics;
  const statisticsLast = tileset._statisticsLast;

  const numberOfPendingRequests = statistics.numberOfPendingRequests;
  const numberOfTilesProcessing = statistics.numberOfTilesProcessing;
  const lastNumberOfPendingRequest = statisticsLast.numberOfPendingRequests;
  const lastNumberOfTilesProcessing = statisticsLast.numberOfTilesProcessing;

  Cesium3DTilesetStatistics.clone(statistics, statisticsLast);

  const progressChanged =
    numberOfPendingRequests !== lastNumberOfPendingRequest ||
    numberOfTilesProcessing !== lastNumberOfTilesProcessing;

  if (progressChanged) {
    frameState.afterRender.push(function () {
      tileset.loadProgress.raiseEvent(
        numberOfPendingRequests,
        numberOfTilesProcessing
      );

      return true;
    });
  }

  tileset._tilesLoaded =
    statistics.numberOfPendingRequests === 0 &&
    statistics.numberOfTilesProcessing === 0 &&
    statistics.numberOfAttemptedRequests === 0;

  // Events are raised (added to the afterRender queue) here since promises
  // may resolve outside of the update loop that then raise events, e.g.,
  // model's readyEvent
  if (progressChanged && tileset._tilesLoaded) {
    frameState.afterRender.push(function () {
      tileset.allTilesLoaded.raiseEvent();
      return true;
    });
    if (!tileset._initialTilesLoaded) {
      tileset._initialTilesLoaded = true;
      frameState.afterRender.push(function () {
        tileset.initialTilesLoaded.raiseEvent();
        return true;
      });
    }
  }
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 */
function resetMinimumMaximum(tileset) {
  tileset._heatmap.resetMinimumMaximum();
  tileset._minimumPriority.depth = Number.MAX_VALUE;
  tileset._maximumPriority.depth = -Number.MAX_VALUE;
  tileset._minimumPriority.foveatedFactor = Number.MAX_VALUE;
  tileset._maximumPriority.foveatedFactor = -Number.MAX_VALUE;
  tileset._minimumPriority.distance = Number.MAX_VALUE;
  tileset._maximumPriority.distance = -Number.MAX_VALUE;
  tileset._minimumPriority.reverseScreenSpaceError = Number.MAX_VALUE;
  tileset._maximumPriority.reverseScreenSpaceError = -Number.MAX_VALUE;
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 */
function detectModelMatrixChanged(tileset, frameState) {
  if (
    frameState.frameNumber === tileset._updatedModelMatrixFrame &&
    defined(tileset._previousModelMatrix)
  ) {
    return;
  }

  tileset._updatedModelMatrixFrame = frameState.frameNumber;
  tileset._modelMatrixChanged = !Matrix4.equals(
    tileset.modelMatrix,
    tileset._previousModelMatrix
  );
  if (tileset._modelMatrixChanged) {
    tileset._previousModelMatrix = Matrix4.clone(
      tileset.modelMatrix,
      tileset._previousModelMatrix
    );
  }
}

/**
 * @private
 * @param {Cesium3DTileset} tileset
 * @param {FrameState} frameState
 * @param {Cesium3DTilesetStatistics} passStatistics
 * @param {object} passOptions
 * @returns {boolean}
 */
function update(tileset, frameState, passStatistics, passOptions) {
  if (frameState.mode === SceneMode.MORPHING) {
    return false;
  }

  if (!defined(tileset._root)) {
    return false;
  }

  const statistics = tileset._statistics;
  statistics.clear();

  // Resets the visibility check for each pass
  ++tileset._updatedVisibilityFrame;

  // Update any tracked min max values
  resetMinimumMaximum(tileset);

  detectModelMatrixChanged(tileset, frameState);
  tileset._cullRequestsWhileMoving =
    tileset.cullRequestsWhileMoving && !tileset._modelMatrixChanged;

  const ready = tileset
    .getTraversal(passOptions)
    .selectTiles(tileset, frameState);

  if (passOptions.requestTiles) {
    requestTiles(tileset);
  }

  updateTiles(tileset, frameState, passOptions);

  // Update pass statistics
  Cesium3DTilesetStatistics.clone(statistics, passStatistics);

  if (passOptions.isRender) {
    const credits = tileset._credits;
    if (defined(credits) && statistics.selected !== 0) {
      for (let i = 0; i < credits.length; ++i) {
        const credit = credits[i];
        credit.showOnScreen =
          tileset._showCreditsOnScreen || credit._isDefaultToken;
        frameState.creditDisplay.addCreditToNextFrame(credit);
      }
    }
  }

  return ready;
}

/**
 * @private
 * @param {object} passOptions
 * @returns {Cesium3DTilesetTraversal}
 */
Cesium3DTileset.prototype.getTraversal = function (passOptions) {
  const { pass } = passOptions;
  if (
    pass === Cesium3DTilePass.MOST_DETAILED_PRELOAD ||
    pass === Cesium3DTilePass.MOST_DETAILED_PICK
  ) {
    return Cesium3DTilesetMostDetailedTraversal;
  }
  return this.isSkippingLevelOfDetail
    ? Cesium3DTilesetSkipTraversal
    : Cesium3DTilesetBaseTraversal;
};

/**
 * @private
 * @param {FrameState} frameState
 */
Cesium3DTileset.prototype.update = function (frameState) {
  this.updateForPass(frameState, frameState.tilesetPassState);
};

/**
 * @private
 * @param {FrameState} frameState
 * @param {object} tilesetPassState
 */
Cesium3DTileset.prototype.updateForPass = function (
  frameState,
  tilesetPassState
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  Check.typeOf.object("tilesetPassState", tilesetPassState);
  //>>includeEnd('debug');

  const pass = tilesetPassState.pass;
  if (
    (pass === Cesium3DTilePass.PRELOAD &&
      (!this.preloadWhenHidden || this.show)) ||
    (pass === Cesium3DTilePass.PRELOAD_FLIGHT &&
      (!this.preloadFlightDestinations ||
        (!this.show && !this.preloadWhenHidden))) ||
    (pass === Cesium3DTilePass.REQUEST_RENDER_MODE_DEFER_CHECK &&
      ((!this._cullRequestsWhileMoving && this.foveatedTimeDelay <= 0) ||
        !this.show))
  ) {
    return;
  }

  const originalCommandList = frameState.commandList;
  const originalCamera = frameState.camera;
  const originalCullingVolume = frameState.cullingVolume;

  tilesetPassState.ready = false;

  const passOptions = Cesium3DTilePass.getPassOptions(pass);
  const ignoreCommands = passOptions.ignoreCommands;

  const commandList = defaultValue(
    tilesetPassState.commandList,
    originalCommandList
  );
  const commandStart = commandList.length;

  frameState.commandList = commandList;
  frameState.camera = defaultValue(tilesetPassState.camera, originalCamera);
  frameState.cullingVolume = defaultValue(
    tilesetPassState.cullingVolume,
    originalCullingVolume
  );

  const passStatistics = this._statisticsPerPass[pass];

  if (this.show || ignoreCommands) {
    this._pass = pass;
    tilesetPassState.ready = update(
      this,
      frameState,
      passStatistics,
      passOptions
    );
  }

  if (ignoreCommands) {
    commandList.length = commandStart;
  }

  frameState.commandList = originalCommandList;
  frameState.camera = originalCamera;
  frameState.cullingVolume = originalCullingVolume;
};

/**
 * <code>true</code> if the tileset JSON file lists the extension in extensionsUsed; otherwise, <code>false</code>.
 * @param {string} extensionName The name of the extension to check.
 *
 * @returns {boolean} <code>true</code> if the tileset JSON file lists the extension in extensionsUsed; otherwise, <code>false</code>.
 */
Cesium3DTileset.prototype.hasExtension = function (extensionName) {
  if (!defined(this._extensionsUsed)) {
    return false;
  }

  return this._extensionsUsed.indexOf(extensionName) > -1;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Cesium3DTileset#destroy
 */
Cesium3DTileset.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * tileset = tileset && tileset.destroy();
 *
 * @see Cesium3DTileset#isDestroyed
 */
Cesium3DTileset.prototype.destroy = function () {
  this._tileDebugLabels =
    this._tileDebugLabels && this._tileDebugLabels.destroy();
  this._clippingPlanes = this._clippingPlanes && this._clippingPlanes.destroy();

  // Traverse the tree and destroy all tiles
  if (defined(this._root)) {
    const stack = scratchStack;
    stack.push(this._root);

    while (stack.length > 0) {
      const tile = stack.pop();
      tile.destroy();

      const children = tile.children;
      for (let i = 0; i < children.length; ++i) {
        stack.push(children[i]);
      }
    }
  }
  this._root = undefined;

  if (
    this._shouldDestroyImageBasedLighting &&
    !this._imageBasedLighting.isDestroyed()
  ) {
    this._imageBasedLighting.destroy();
  }
  this._imageBasedLighting = undefined;

  return destroyObject(this);
};

Cesium3DTileset.supportedExtensions = {
  "3DTILES_metadata": true,
  "3DTILES_implicit_tiling": true,
  "3DTILES_content_gltf": true,
  "3DTILES_multiple_contents": true,
  "3DTILES_bounding_volume_S2": true,
  "3DTILES_batch_table_hierarchy": true,
  "3DTILES_draco_point_compression": true,
  MAXAR_content_geojson: true,
};

/**
 * Checks to see if a given extension is supported by Cesium3DTileset. If
 * the extension is not supported by Cesium3DTileset, it throws a RuntimeError.
 *
 * @param {object} extensionsRequired The extensions we wish to check
 *
 * @private
 */
Cesium3DTileset.checkSupportedExtensions = function (extensionsRequired) {
  for (let i = 0; i < extensionsRequired.length; i++) {
    if (!Cesium3DTileset.supportedExtensions[extensionsRequired[i]]) {
      throw new RuntimeError(
        `Unsupported 3D Tiles Extension: ${extensionsRequired[i]}`
      );
    }
  }
};

/**
 * Optimization option. Used as a callback when {@link Cesium3DTileset#foveatedScreenSpaceError} is true to control how much to raise the screen space error for tiles outside the foveated cone,
 * interpolating between {@link Cesium3DTileset#foveatedMinimumScreenSpaceErrorRelaxation} and {@link Cesium3DTileset#maximumScreenSpaceError}.
 *
 * @callback Cesium3DTileset.foveatedInterpolationCallback
 * @default Math.lerp
 *
 * @param {number} p The start value to interpolate.
 * @param {number} q The end value to interpolate.
 * @param {number} time The time of interpolation generally in the range <code>[0.0, 1.0]</code>.
 * @returns {number} The interpolated value.
 */
export default Cesium3DTileset;
