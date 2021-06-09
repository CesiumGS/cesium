import BoundingSphere from "../Core/BoundingSphere.js";
import BoxOutlineGeometry from "../Core/BoxOutlineGeometry.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import GeometryPipeline from "../Core/GeometryPipeline.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Intersect from "../Core/Intersect.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Rectangle from "../Core/Rectangle.js";
import SphereOutlineGeometry from "../Core/SphereOutlineGeometry.js";
import TerrainExaggeration from "../Core/TerrainExaggeration.js";
import TerrainQuantization from "../Core/TerrainQuantization.js";
import Visibility from "../Core/Visibility.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import VertexArray from "../Renderer/VertexArray.js";
import BlendingState from "./BlendingState.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import DepthFunction from "./DepthFunction.js";
import GlobeSurfaceTile from "./GlobeSurfaceTile.js";
import ImageryLayer from "./ImageryLayer.js";
import ImageryState from "./ImageryState.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Primitive from "./Primitive.js";
import QuadtreeTileLoadState from "./QuadtreeTileLoadState.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";
import TerrainFillMesh from "./TerrainFillMesh.js";
import TerrainState from "./TerrainState.js";
import TileBoundingRegion from "./TileBoundingRegion.js";
import TileSelectionResult from "./TileSelectionResult.js";

/**
 * Provides quadtree tiles representing the surface of the globe.  This type is intended to be used
 * with {@link QuadtreePrimitive}.
 *
 * @alias GlobeSurfaceTileProvider
 * @constructor
 *
 * @param {TerrainProvider} options.terrainProvider The terrain provider that describes the surface geometry.
 * @param {ImageryLayerCollection} option.imageryLayers The collection of imagery layers describing the shading of the surface.
 * @param {GlobeSurfaceShaderSet} options.surfaceShaderSet The set of shaders used to render the surface.
 *
 * @private
 */
function GlobeSurfaceTileProvider(options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options)) {
    throw new DeveloperError("options is required.");
  }
  if (!defined(options.terrainProvider)) {
    throw new DeveloperError("options.terrainProvider is required.");
  } else if (!defined(options.imageryLayers)) {
    throw new DeveloperError("options.imageryLayers is required.");
  } else if (!defined(options.surfaceShaderSet)) {
    throw new DeveloperError("options.surfaceShaderSet is required.");
  }
  //>>includeEnd('debug');

  this.lightingFadeOutDistance = 6500000.0;
  this.lightingFadeInDistance = 9000000.0;
  this.hasWaterMask = false;
  this.oceanNormalMap = undefined;
  this.zoomedOutOceanSpecularIntensity = 0.5;
  this.enableLighting = false;
  this.dynamicAtmosphereLighting = false;
  this.dynamicAtmosphereLightingFromSun = false;
  this.showGroundAtmosphere = false;
  this.shadows = ShadowMode.RECEIVE_ONLY;

  /**
   * The color to use to highlight terrain fill tiles. If undefined, fill tiles are not
   * highlighted at all. The alpha value is used to alpha blend with the tile's
   * actual color. Because terrain fill tiles do not represent the actual terrain surface,
   * it may be useful in some applications to indicate visually that they are not to be trusted.
   * @type {Color}
   * @default undefined
   */
  this.fillHighlightColor = undefined;

  this.hueShift = 0.0;
  this.saturationShift = 0.0;
  this.brightnessShift = 0.0;

  this.showSkirts = true;
  this.backFaceCulling = true;
  this.undergroundColor = undefined;
  this.undergroundColorAlphaByDistance = undefined;

  this.materialUniformMap = undefined;
  this._materialUniformMap = undefined;

  this._quadtree = undefined;
  this._terrainProvider = options.terrainProvider;
  this._imageryLayers = options.imageryLayers;
  this._surfaceShaderSet = options.surfaceShaderSet;

  this._renderState = undefined;
  this._blendRenderState = undefined;
  this._disableCullingRenderState = undefined;
  this._disableCullingBlendRenderState = undefined;

  this._errorEvent = new Event();

  this._imageryLayers.layerAdded.addEventListener(
    GlobeSurfaceTileProvider.prototype._onLayerAdded,
    this
  );
  this._imageryLayers.layerRemoved.addEventListener(
    GlobeSurfaceTileProvider.prototype._onLayerRemoved,
    this
  );
  this._imageryLayers.layerMoved.addEventListener(
    GlobeSurfaceTileProvider.prototype._onLayerMoved,
    this
  );
  this._imageryLayers.layerShownOrHidden.addEventListener(
    GlobeSurfaceTileProvider.prototype._onLayerShownOrHidden,
    this
  );
  this._imageryLayersUpdatedEvent = new Event();

  this._layerOrderChanged = false;

  this._tilesToRenderByTextureCount = [];
  this._drawCommands = [];
  this._uniformMaps = [];
  this._usedDrawCommands = 0;

  this._vertexArraysToDestroy = [];

  this._debug = {
    wireframe: false,
    boundingSphereTile: undefined,
  };

  this._baseColor = undefined;
  this._firstPassInitialColor = undefined;
  this.baseColor = new Color(0.0, 0.0, 0.5, 1.0);

  /**
   * A property specifying a {@link ClippingPlaneCollection} used to selectively disable rendering on the outside of each plane.
   * @type {ClippingPlaneCollection}
   * @private
   */
  this._clippingPlanes = undefined;

  /**
   * A property specifying a {@link Rectangle} used to selectively limit terrain and imagery rendering.
   * @type {Rectangle}
   */
  this.cartographicLimitRectangle = Rectangle.clone(Rectangle.MAX_VALUE);

  this._hasLoadedTilesThisFrame = false;
  this._hasFillTilesThisFrame = false;

  this._oldTerrainExaggeration = undefined;
  this._oldTerrainExaggerationRelativeHeight = undefined;
  this._processingTerrainExaggerationChange = false;
}

Object.defineProperties(GlobeSurfaceTileProvider.prototype, {
  /**
   * Gets or sets the color of the globe when no imagery is available.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {Color}
   */
  baseColor: {
    get: function () {
      return this._baseColor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      this._baseColor = value;
      this._firstPassInitialColor = Cartesian4.fromColor(
        value,
        this._firstPassInitialColor
      );
    },
  },
  /**
   * Gets or sets the {@link QuadtreePrimitive} for which this provider is
   * providing tiles.  This property may be undefined if the provider is not yet associated
   * with a {@link QuadtreePrimitive}.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {QuadtreePrimitive}
   */
  quadtree: {
    get: function () {
      return this._quadtree;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      this._quadtree = value;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {Boolean}
   */
  ready: {
    get: function () {
      return (
        this._terrainProvider.ready &&
        (this._imageryLayers.length === 0 ||
          this._imageryLayers.get(0).imageryProvider.ready)
      );
    },
  },

  /**
   * Gets the tiling scheme used by the provider.  This property should
   * not be accessed before {@link GlobeSurfaceTileProvider#ready} returns true.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {TilingScheme}
   */
  tilingScheme: {
    get: function () {
      return this._terrainProvider.tilingScheme;
    },
  },

  /**
   * Gets an event that is raised when the geometry provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {Event}
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets an event that is raised when an imagery layer is added, shown, hidden, moved, or removed.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {Event}
   */
  imageryLayersUpdatedEvent: {
    get: function () {
      return this._imageryLayersUpdatedEvent;
    },
  },

  /**
   * Gets or sets the terrain provider that describes the surface geometry.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {TerrainProvider}
   */
  terrainProvider: {
    get: function () {
      return this._terrainProvider;
    },
    set: function (terrainProvider) {
      if (this._terrainProvider === terrainProvider) {
        return;
      }

      //>>includeStart('debug', pragmas.debug);
      if (!defined(terrainProvider)) {
        throw new DeveloperError("terrainProvider is required.");
      }
      //>>includeEnd('debug');

      this._terrainProvider = terrainProvider;

      if (defined(this._quadtree)) {
        this._quadtree.invalidateAllTiles();
      }
    },
  },
  /**
   * The {@link ClippingPlaneCollection} used to selectively disable rendering the tileset.
   *
   * @type {ClippingPlaneCollection}
   *
   * @private
   */
  clippingPlanes: {
    get: function () {
      return this._clippingPlanes;
    },
    set: function (value) {
      ClippingPlaneCollection.setOwner(value, this, "_clippingPlanes");
    },
  },
});

function sortTileImageryByLayerIndex(a, b) {
  var aImagery = a.loadingImagery;
  if (!defined(aImagery)) {
    aImagery = a.readyImagery;
  }

  var bImagery = b.loadingImagery;
  if (!defined(bImagery)) {
    bImagery = b.readyImagery;
  }

  return aImagery.imageryLayer._layerIndex - bImagery.imageryLayer._layerIndex;
}

/**
 * Make updates to the tile provider that are not involved in rendering. Called before the render update cycle.
 */
GlobeSurfaceTileProvider.prototype.update = function (frameState) {
  // update collection: imagery indices, base layers, raise layer show/hide event
  this._imageryLayers._update();
};

function updateCredits(surface, frameState) {
  var creditDisplay = frameState.creditDisplay;
  if (
    surface._terrainProvider.ready &&
    defined(surface._terrainProvider.credit)
  ) {
    creditDisplay.addCredit(surface._terrainProvider.credit);
  }

  var imageryLayers = surface._imageryLayers;
  for (var i = 0, len = imageryLayers.length; i < len; ++i) {
    var imageryProvider = imageryLayers.get(i).imageryProvider;
    if (imageryProvider.ready && defined(imageryProvider.credit)) {
      creditDisplay.addCredit(imageryProvider.credit);
    }
  }
}

/**
 * Called at the beginning of each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
 * @param {FrameState} frameState The frame state.
 */
GlobeSurfaceTileProvider.prototype.initialize = function (frameState) {
  // update each layer for texture reprojection.
  this._imageryLayers.queueReprojectionCommands(frameState);

  if (this._layerOrderChanged) {
    this._layerOrderChanged = false;

    // Sort the TileImagery instances in each tile by the layer index.
    this._quadtree.forEachLoadedTile(function (tile) {
      tile.data.imagery.sort(sortTileImageryByLayerIndex);
    });
  }

  // Add credits for terrain and imagery providers.
  updateCredits(this, frameState);

  var vertexArraysToDestroy = this._vertexArraysToDestroy;
  var length = vertexArraysToDestroy.length;
  for (var j = 0; j < length; ++j) {
    GlobeSurfaceTile._freeVertexArray(vertexArraysToDestroy[j]);
  }
  vertexArraysToDestroy.length = 0;
};

/**
 * Called at the beginning of the update cycle for each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
 * or any other functions.
 *
 * @param {FrameState} frameState The frame state.
 */
GlobeSurfaceTileProvider.prototype.beginUpdate = function (frameState) {
  var tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
  for (var i = 0, len = tilesToRenderByTextureCount.length; i < len; ++i) {
    var tiles = tilesToRenderByTextureCount[i];
    if (defined(tiles)) {
      tiles.length = 0;
    }
  }
  // update clipping planes
  var clippingPlanes = this._clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    clippingPlanes.update(frameState);
  }
  this._usedDrawCommands = 0;

  this._hasLoadedTilesThisFrame = false;
  this._hasFillTilesThisFrame = false;
};

/**
 * Called at the end of the update cycle for each render frame, after {@link QuadtreeTileProvider#showTileThisFrame}
 * and any other functions.
 *
 * @param {FrameState} frameState The frame state.
 */
GlobeSurfaceTileProvider.prototype.endUpdate = function (frameState) {
  if (!defined(this._renderState)) {
    this._renderState = RenderState.fromCache({
      // Write color and depth
      cull: {
        enabled: true,
      },
      depthTest: {
        enabled: true,
        func: DepthFunction.LESS,
      },
    });

    this._blendRenderState = RenderState.fromCache({
      // Write color and depth
      cull: {
        enabled: true,
      },
      depthTest: {
        enabled: true,
        func: DepthFunction.LESS_OR_EQUAL,
      },
      blending: BlendingState.ALPHA_BLEND,
    });

    var rs = clone(this._renderState, true);
    rs.cull.enabled = false;
    this._disableCullingRenderState = RenderState.fromCache(rs);

    rs = clone(this._blendRenderState, true);
    rs.cull.enabled = false;
    this._disableCullingBlendRenderState = RenderState.fromCache(rs);
  }

  // If this frame has a mix of loaded and fill tiles, we need to propagate
  // loaded heights to the fill tiles.
  if (this._hasFillTilesThisFrame && this._hasLoadedTilesThisFrame) {
    TerrainFillMesh.updateFillTiles(
      this,
      this._quadtree._tilesToRender,
      frameState,
      this._vertexArraysToDestroy
    );
  }

  // When terrain exaggeration changes, all of the loaded tiles need to generate
  // geodetic surface normals so they can scale properly when rendered.
  // When exaggeration is reset, geodetic surface normals are removed to decrease
  // memory usage. Some tiles might have been constructed with the correct
  // exaggeration already, so skip over them.

  // If the geodetic surface normals can't be created because the tile doesn't
  // have a mesh, keep checking until the tile does have a mesh. This can happen
  // if the tile's mesh starts construction in a worker thread right before the
  // exaggeration changes.

  var quadtree = this.quadtree;
  var exaggeration = frameState.terrainExaggeration;
  var exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
  var hasExaggerationScale = exaggeration !== 1.0;
  var exaggerationChanged =
    this._oldTerrainExaggeration !== exaggeration ||
    this._oldTerrainExaggerationRelativeHeight !== exaggerationRelativeHeight;

  // Keep track of the next time there is a change in exaggeration
  this._oldTerrainExaggeration = exaggeration;
  this._oldTerrainExaggerationRelativeHeight = exaggerationRelativeHeight;

  var processingChange =
    exaggerationChanged || this._processingTerrainExaggerationChange;
  var continueProcessing = false;

  if (processingChange) {
    quadtree.forEachLoadedTile(function (tile) {
      var surfaceTile = tile.data;
      var mesh = surfaceTile.renderedMesh;
      if (mesh !== undefined) {
        // Check the tile's terrain encoding to see if it has been exaggerated yet
        var encoding = mesh.encoding;
        var encodingExaggerationScaleChanged =
          encoding.exaggeration !== exaggeration;
        var encodingRelativeHeightChanged =
          encoding.exaggerationRelativeHeight !== exaggerationRelativeHeight;

        if (encodingExaggerationScaleChanged || encodingRelativeHeightChanged) {
          // Turning exaggeration scale on/off requires adding or removing geodetic surface normals
          // Relative height only translates, so it has no effect on normals
          if (encodingExaggerationScaleChanged) {
            if (hasExaggerationScale && !encoding.hasGeodeticSurfaceNormals) {
              var ellipsoid = tile.tilingScheme.ellipsoid;
              surfaceTile.addGeodeticSurfaceNormals(ellipsoid, frameState);
            } else if (
              !hasExaggerationScale &&
              encoding.hasGeodeticSurfaceNormals
            ) {
              surfaceTile.removeGeodeticSurfaceNormals(frameState);
            }
          }

          encoding.exaggeration = exaggeration;
          encoding.exaggerationRelativeHeight = exaggerationRelativeHeight;

          // Notify the quadtree that this tile's height has changed
          quadtree._tileToUpdateHeights.push(tile);
          var customData = tile.customData;
          var customDataLength = customData.length;
          for (var i = 0; i < customDataLength; i++) {
            // Restart the level so that a height update is triggered
            var data = customData[i];
            data.level = -1;
          }
        }
      } else {
        // this tile may come into view at a later time so keep the loop active
        continueProcessing = true;
      }
    });
  }

  this._processingTerrainExaggerationChange = continueProcessing;

  // Add the tile render commands to the command list, sorted by texture count.
  var tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
  for (
    var textureCountIndex = 0,
      textureCountLength = tilesToRenderByTextureCount.length;
    textureCountIndex < textureCountLength;
    ++textureCountIndex
  ) {
    var tilesToRender = tilesToRenderByTextureCount[textureCountIndex];
    if (!defined(tilesToRender)) {
      continue;
    }

    for (
      var tileIndex = 0, tileLength = tilesToRender.length;
      tileIndex < tileLength;
      ++tileIndex
    ) {
      var tile = tilesToRender[tileIndex];
      var tileBoundingRegion = tile.data.tileBoundingRegion;
      addDrawCommandsForTile(this, tile, frameState);
      frameState.minimumTerrainHeight = Math.min(
        frameState.minimumTerrainHeight,
        tileBoundingRegion.minimumHeight
      );
    }
  }
};

function pushCommand(command, frameState) {
  var globeTranslucencyState = frameState.globeTranslucencyState;
  if (globeTranslucencyState.translucent) {
    var isBlendCommand = command.renderState.blending.enabled;
    globeTranslucencyState.pushDerivedCommands(
      command,
      isBlendCommand,
      frameState
    );
  } else {
    frameState.commandList.push(command);
  }
}

/**
 * Adds draw commands for tiles rendered in the previous frame for a pick pass.
 *
 * @param {FrameState} frameState The frame state.
 */
GlobeSurfaceTileProvider.prototype.updateForPick = function (frameState) {
  // Add the tile pick commands from the tiles drawn last frame.
  var drawCommands = this._drawCommands;
  for (var i = 0, length = this._usedDrawCommands; i < length; ++i) {
    pushCommand(drawCommands[i], frameState);
  }
};

/**
 * Cancels any imagery re-projections in the queue.
 */
GlobeSurfaceTileProvider.prototype.cancelReprojections = function () {
  this._imageryLayers.cancelReprojections();
};

/**
 * Gets the maximum geometric error allowed in a tile at a given level, in meters.  This function should not be
 * called before {@link GlobeSurfaceTileProvider#ready} returns true.
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error in meters.
 */
GlobeSurfaceTileProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  return this._terrainProvider.getLevelMaximumGeometricError(level);
};

/**
 * Loads, or continues loading, a given tile.  This function will continue to be called
 * until {@link QuadtreeTile#state} is no longer {@link QuadtreeTileLoadState#LOADING}.  This function should
 * not be called before {@link GlobeSurfaceTileProvider#ready} returns true.
 *
 * @param {FrameState} frameState The frame state.
 * @param {QuadtreeTile} tile The tile to load.
 *
 * @exception {DeveloperError} <code>loadTile</code> must not be called before the tile provider is ready.
 */
GlobeSurfaceTileProvider.prototype.loadTile = function (frameState, tile) {
  // We don't want to load imagery until we're certain that the terrain tiles are actually visible.
  // So if our bounding volume isn't accurate because it came from another tile, load terrain only
  // initially. If we load some terrain and suddenly have a more accurate bounding volume and the
  // tile is _still_ visible, give the tile a chance to load imagery immediately rather than
  // waiting for next frame.

  var surfaceTile = tile.data;
  var terrainOnly = true;
  var terrainStateBefore;
  if (defined(surfaceTile)) {
    terrainOnly =
      surfaceTile.boundingVolumeSourceTile !== tile ||
      tile._lastSelectionResult === TileSelectionResult.CULLED_BUT_NEEDED;
    terrainStateBefore = surfaceTile.terrainState;
  }

  GlobeSurfaceTile.processStateMachine(
    tile,
    frameState,
    this.terrainProvider,
    this._imageryLayers,
    this._vertexArraysToDestroy,
    terrainOnly
  );

  surfaceTile = tile.data;
  if (terrainOnly && terrainStateBefore !== tile.data.terrainState) {
    // Terrain state changed. If:
    // a) The tile is visible, and
    // b) The bounding volume is accurate (updated as a side effect of computing visibility)
    // Then we'll load imagery, too.
    if (
      this.computeTileVisibility(tile, frameState, this.quadtree.occluders) !==
        Visibility.NONE &&
      surfaceTile.boundingVolumeSourceTile === tile
    ) {
      terrainOnly = false;
      GlobeSurfaceTile.processStateMachine(
        tile,
        frameState,
        this.terrainProvider,
        this._imageryLayers,
        this._vertexArraysToDestroy,
        terrainOnly
      );
    }
  }
};

var boundingSphereScratch = new BoundingSphere();
var rectangleIntersectionScratch = new Rectangle();
var splitCartographicLimitRectangleScratch = new Rectangle();
var rectangleCenterScratch = new Cartographic();

// cartographicLimitRectangle may span the IDL, but tiles never will.
function clipRectangleAntimeridian(tileRectangle, cartographicLimitRectangle) {
  if (cartographicLimitRectangle.west < cartographicLimitRectangle.east) {
    return cartographicLimitRectangle;
  }
  var splitRectangle = Rectangle.clone(
    cartographicLimitRectangle,
    splitCartographicLimitRectangleScratch
  );
  var tileCenter = Rectangle.center(tileRectangle, rectangleCenterScratch);
  if (tileCenter.longitude > 0.0) {
    splitRectangle.east = CesiumMath.PI;
  } else {
    splitRectangle.west = -CesiumMath.PI;
  }
  return splitRectangle;
}

function isUndergroundVisible(tileProvider, frameState) {
  if (frameState.cameraUnderground) {
    return true;
  }

  if (frameState.globeTranslucencyState.translucent) {
    return true;
  }

  if (tileProvider.backFaceCulling) {
    return false;
  }

  var clippingPlanes = tileProvider._clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    return true;
  }

  if (
    !Rectangle.equals(
      tileProvider.cartographicLimitRectangle,
      Rectangle.MAX_VALUE
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Determines the visibility of a given tile.  The tile may be fully visible, partially visible, or not
 * visible at all.  Tiles that are renderable and are at least partially visible will be shown by a call
 * to {@link GlobeSurfaceTileProvider#showTileThisFrame}.
 *
 * @param {QuadtreeTile} tile The tile instance.
 * @param {FrameState} frameState The state information about the current frame.
 * @param {QuadtreeOccluders} occluders The objects that may occlude this tile.
 *
 * @returns {Visibility} Visibility.NONE if the tile is not visible,
 *                       Visibility.PARTIAL if the tile is partially visible, or
 *                       Visibility.FULL if the tile is fully visible.
 */
GlobeSurfaceTileProvider.prototype.computeTileVisibility = function (
  tile,
  frameState,
  occluders
) {
  var distance = this.computeDistanceToTile(tile, frameState);
  tile._distance = distance;

  var undergroundVisible = isUndergroundVisible(this, frameState);

  if (frameState.fog.enabled && !undergroundVisible) {
    if (CesiumMath.fog(distance, frameState.fog.density) >= 1.0) {
      // Tile is completely in fog so return that it is not visible.
      return Visibility.NONE;
    }
  }

  var surfaceTile = tile.data;
  var tileBoundingRegion = surfaceTile.tileBoundingRegion;

  if (surfaceTile.boundingVolumeSourceTile === undefined) {
    // We have no idea where this tile is, so let's just call it partially visible.
    return Visibility.PARTIAL;
  }

  var cullingVolume = frameState.cullingVolume;
  var boundingVolume = tileBoundingRegion.boundingVolume;

  if (!defined(boundingVolume)) {
    boundingVolume = tileBoundingRegion.boundingSphere;
  }

  // Check if the tile is outside the limit area in cartographic space
  surfaceTile.clippedByBoundaries = false;
  var clippedCartographicLimitRectangle = clipRectangleAntimeridian(
    tile.rectangle,
    this.cartographicLimitRectangle
  );
  var areaLimitIntersection = Rectangle.simpleIntersection(
    clippedCartographicLimitRectangle,
    tile.rectangle,
    rectangleIntersectionScratch
  );
  if (!defined(areaLimitIntersection)) {
    return Visibility.NONE;
  }
  if (!Rectangle.equals(areaLimitIntersection, tile.rectangle)) {
    surfaceTile.clippedByBoundaries = true;
  }

  if (frameState.mode !== SceneMode.SCENE3D) {
    boundingVolume = boundingSphereScratch;
    BoundingSphere.fromRectangleWithHeights2D(
      tile.rectangle,
      frameState.mapProjection,
      tileBoundingRegion.minimumHeight,
      tileBoundingRegion.maximumHeight,
      boundingVolume
    );
    Cartesian3.fromElements(
      boundingVolume.center.z,
      boundingVolume.center.x,
      boundingVolume.center.y,
      boundingVolume.center
    );

    if (
      frameState.mode === SceneMode.MORPHING &&
      defined(surfaceTile.renderedMesh)
    ) {
      boundingVolume = BoundingSphere.union(
        tileBoundingRegion.boundingSphere,
        boundingVolume,
        boundingVolume
      );
    }
  }

  if (!defined(boundingVolume)) {
    return Visibility.PARTIAL;
  }

  var clippingPlanes = this._clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    var planeIntersection = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    tile.isClipped = planeIntersection !== Intersect.INSIDE;
    if (planeIntersection === Intersect.OUTSIDE) {
      return Visibility.NONE;
    }
  }

  var visibility;
  var intersection = cullingVolume.computeVisibility(boundingVolume);

  if (intersection === Intersect.OUTSIDE) {
    visibility = Visibility.NONE;
  } else if (intersection === Intersect.INTERSECTING) {
    visibility = Visibility.PARTIAL;
  } else if (intersection === Intersect.INSIDE) {
    visibility = Visibility.FULL;
  }

  if (visibility === Visibility.NONE) {
    return visibility;
  }

  var ortho3D =
    frameState.mode === SceneMode.SCENE3D &&
    frameState.camera.frustum instanceof OrthographicFrustum;
  if (
    frameState.mode === SceneMode.SCENE3D &&
    !ortho3D &&
    defined(occluders) &&
    !undergroundVisible
  ) {
    var occludeePointInScaledSpace = surfaceTile.occludeePointInScaledSpace;
    if (!defined(occludeePointInScaledSpace)) {
      return visibility;
    }

    if (
      occluders.ellipsoid.isScaledSpacePointVisiblePossiblyUnderEllipsoid(
        occludeePointInScaledSpace,
        tileBoundingRegion.minimumHeight
      )
    ) {
      return visibility;
    }

    return Visibility.NONE;
  }

  return visibility;
};

/**
 * Determines if the given tile can be refined
 * @param {QuadtreeTile} tile The tile to check.
 * @returns {boolean} True if the tile can be refined, false if it cannot.
 */
GlobeSurfaceTileProvider.prototype.canRefine = function (tile) {
  // Only allow refinement it we know whether or not the children of this tile exist.
  // For a tileset with `availability`, we'll always be able to refine.
  // We can ask for availability of _any_ child tile because we only need to confirm
  // that we get a yes or no answer, it doesn't matter what the answer is.
  if (defined(tile.data.terrainData)) {
    return true;
  }
  var childAvailable = this.terrainProvider.getTileDataAvailable(
    tile.x * 2,
    tile.y * 2,
    tile.level + 1
  );
  return childAvailable !== undefined;
};

var readyImageryScratch = [];
var canRenderTraversalStack = [];

/**
 * Determines if the given not-fully-loaded tile can be rendered without losing detail that
 * was present last frame as a result of rendering descendant tiles. This method will only be
 * called if this tile's descendants were rendered last frame. If the tile is fully loaded,
 * it is assumed that this method will return true and it will not be called.
 * @param {QuadtreeTile} tile The tile to check.
 * @returns {boolean} True if the tile can be rendered without losing detail.
 */
GlobeSurfaceTileProvider.prototype.canRenderWithoutLosingDetail = function (
  tile,
  frameState
) {
  var surfaceTile = tile.data;

  var readyImagery = readyImageryScratch;
  readyImagery.length = this._imageryLayers.length;

  var terrainReady = false;
  var initialImageryState = false;
  var imagery;

  if (defined(surfaceTile)) {
    // We can render even with non-ready terrain as long as all our rendered descendants
    // are missing terrain geometry too. i.e. if we rendered fills for more detailed tiles
    // last frame, it's ok to render a fill for this tile this frame.
    terrainReady = surfaceTile.terrainState === TerrainState.READY;

    // Initially assume all imagery layers are ready, unless imagery hasn't been initialized at all.
    initialImageryState = true;

    imagery = surfaceTile.imagery;
  }

  var i;
  var len;

  for (i = 0, len = readyImagery.length; i < len; ++i) {
    readyImagery[i] = initialImageryState;
  }

  if (defined(imagery)) {
    for (i = 0, len = imagery.length; i < len; ++i) {
      var tileImagery = imagery[i];
      var loadingImagery = tileImagery.loadingImagery;
      var isReady =
        !defined(loadingImagery) ||
        loadingImagery.state === ImageryState.FAILED ||
        loadingImagery.state === ImageryState.INVALID;
      var layerIndex = (tileImagery.loadingImagery || tileImagery.readyImagery)
        .imageryLayer._layerIndex;

      // For a layer to be ready, all tiles belonging to that layer must be ready.
      readyImagery[layerIndex] = isReady && readyImagery[layerIndex];
    }
  }

  var lastFrame = this.quadtree._lastSelectionFrameNumber;

  // Traverse the descendants looking for one with terrain or imagery that is not loaded on this tile.
  var stack = canRenderTraversalStack;
  stack.length = 0;
  stack.push(
    tile.southwestChild,
    tile.southeastChild,
    tile.northwestChild,
    tile.northeastChild
  );

  while (stack.length > 0) {
    var descendant = stack.pop();
    var lastFrameSelectionResult =
      descendant._lastSelectionResultFrame === lastFrame
        ? descendant._lastSelectionResult
        : TileSelectionResult.NONE;

    if (lastFrameSelectionResult === TileSelectionResult.RENDERED) {
      var descendantSurface = descendant.data;

      if (!defined(descendantSurface)) {
        // Descendant has no data, so it can't block rendering.
        continue;
      }

      if (
        !terrainReady &&
        descendant.data.terrainState === TerrainState.READY
      ) {
        // Rendered descendant has real terrain, but we don't. Rendering is blocked.
        return false;
      }

      var descendantImagery = descendant.data.imagery;
      for (i = 0, len = descendantImagery.length; i < len; ++i) {
        var descendantTileImagery = descendantImagery[i];
        var descendantLoadingImagery = descendantTileImagery.loadingImagery;
        var descendantIsReady =
          !defined(descendantLoadingImagery) ||
          descendantLoadingImagery.state === ImageryState.FAILED ||
          descendantLoadingImagery.state === ImageryState.INVALID;
        var descendantLayerIndex = (
          descendantTileImagery.loadingImagery ||
          descendantTileImagery.readyImagery
        ).imageryLayer._layerIndex;

        // If this imagery tile of a descendant is ready but the layer isn't ready in this tile,
        // then rendering is blocked.
        if (descendantIsReady && !readyImagery[descendantLayerIndex]) {
          return false;
        }
      }
    } else if (lastFrameSelectionResult === TileSelectionResult.REFINED) {
      stack.push(
        descendant.southwestChild,
        descendant.southeastChild,
        descendant.northwestChild,
        descendant.northeastChild
      );
    }
  }

  return true;
};

var tileDirectionScratch = new Cartesian3();

/**
 * Determines the priority for loading this tile. Lower priority values load sooner.
 * @param {QuadtreeTile} tile The tile.
 * @param {FrameState} frameState The frame state.
 * @returns {Number} The load priority value.
 */
GlobeSurfaceTileProvider.prototype.computeTileLoadPriority = function (
  tile,
  frameState
) {
  var surfaceTile = tile.data;
  if (surfaceTile === undefined) {
    return 0.0;
  }

  var obb = surfaceTile.tileBoundingRegion.boundingVolume;
  if (obb === undefined) {
    return 0.0;
  }

  var cameraPosition = frameState.camera.positionWC;
  var cameraDirection = frameState.camera.directionWC;
  var tileDirection = Cartesian3.subtract(
    obb.center,
    cameraPosition,
    tileDirectionScratch
  );
  var magnitude = Cartesian3.magnitude(tileDirection);
  if (magnitude < CesiumMath.EPSILON5) {
    return 0.0;
  }
  Cartesian3.divideByScalar(tileDirection, magnitude, tileDirection);
  return (
    (1.0 - Cartesian3.dot(tileDirection, cameraDirection)) * tile._distance
  );
};

var modifiedModelViewScratch = new Matrix4();
var modifiedModelViewProjectionScratch = new Matrix4();
var tileRectangleScratch = new Cartesian4();
var localizedCartographicLimitRectangleScratch = new Cartesian4();
var localizedTranslucencyRectangleScratch = new Cartesian4();
var rtcScratch = new Cartesian3();
var centerEyeScratch = new Cartesian3();
var southwestScratch = new Cartesian3();
var northeastScratch = new Cartesian3();

/**
 * Shows a specified tile in this frame.  The provider can cause the tile to be shown by adding
 * render commands to the commandList, or use any other method as appropriate.  The tile is not
 * expected to be visible next frame as well, unless this method is called next frame, too.
 *
 * @param {QuadtreeTile} tile The tile instance.
 * @param {FrameState} frameState The state information of the current rendering frame.
 */
GlobeSurfaceTileProvider.prototype.showTileThisFrame = function (
  tile,
  frameState
) {
  var readyTextureCount = 0;
  var tileImageryCollection = tile.data.imagery;
  for (var i = 0, len = tileImageryCollection.length; i < len; ++i) {
    var tileImagery = tileImageryCollection[i];
    if (
      defined(tileImagery.readyImagery) &&
      tileImagery.readyImagery.imageryLayer.alpha !== 0.0
    ) {
      ++readyTextureCount;
    }
  }

  var tileSet = this._tilesToRenderByTextureCount[readyTextureCount];
  if (!defined(tileSet)) {
    tileSet = [];
    this._tilesToRenderByTextureCount[readyTextureCount] = tileSet;
  }

  tileSet.push(tile);

  var surfaceTile = tile.data;
  if (!defined(surfaceTile.vertexArray)) {
    this._hasFillTilesThisFrame = true;
  } else {
    this._hasLoadedTilesThisFrame = true;
  }

  var debug = this._debug;
  ++debug.tilesRendered;
  debug.texturesRendered += readyTextureCount;
};

var cornerPositionsScratch = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];

function computeOccludeePoint(
  tileProvider,
  center,
  rectangle,
  minimumHeight,
  maximumHeight,
  result
) {
  var ellipsoidalOccluder = tileProvider.quadtree._occluders.ellipsoid;
  var ellipsoid = ellipsoidalOccluder.ellipsoid;

  var cornerPositions = cornerPositionsScratch;
  Cartesian3.fromRadians(
    rectangle.west,
    rectangle.south,
    maximumHeight,
    ellipsoid,
    cornerPositions[0]
  );
  Cartesian3.fromRadians(
    rectangle.east,
    rectangle.south,
    maximumHeight,
    ellipsoid,
    cornerPositions[1]
  );
  Cartesian3.fromRadians(
    rectangle.west,
    rectangle.north,
    maximumHeight,
    ellipsoid,
    cornerPositions[2]
  );
  Cartesian3.fromRadians(
    rectangle.east,
    rectangle.north,
    maximumHeight,
    ellipsoid,
    cornerPositions[3]
  );

  return ellipsoidalOccluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
    center,
    cornerPositions,
    minimumHeight,
    result
  );
}

/**
 * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
 *
 * @param {QuadtreeTile} tile The tile instance.
 * @param {FrameState} frameState The state information of the current rendering frame.
 *
 * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
 */
GlobeSurfaceTileProvider.prototype.computeDistanceToTile = function (
  tile,
  frameState
) {
  // The distance should be:
  // 1. the actual distance to the tight-fitting bounding volume, or
  // 2. a distance that is equal to or greater than the actual distance to the tight-fitting bounding volume.
  //
  // When we don't know the min/max heights for a tile, but we do know the min/max of an ancestor tile, we can
  // build a tight-fitting bounding volume horizontally, but not vertically. The min/max heights from the
  // ancestor will likely form a volume that is much bigger than it needs to be. This means that the volume may
  // be deemed to be much closer to the camera than it really is, causing us to select tiles that are too detailed.
  // Loading too-detailed tiles is super expensive, so we don't want to do that. We don't know where the child
  // tile really lies within the parent range of heights, but we _do_ know the child tile can't be any closer than
  // the ancestor height surface (min or max) that is _farthest away_ from the camera. So if we compute distance
  // based on that conservative metric, we may end up loading tiles that are not detailed enough, but that's much
  // better (faster) than loading tiles that are too detailed.

  updateTileBoundingRegion(tile, this, frameState);

  var surfaceTile = tile.data;
  var boundingVolumeSourceTile = surfaceTile.boundingVolumeSourceTile;
  if (boundingVolumeSourceTile === undefined) {
    // Can't find any min/max heights anywhere? Ok, let's just say the
    // tile is really far away so we'll load and render it rather than
    // refining.
    return 9999999999.0;
  }

  var tileBoundingRegion = surfaceTile.tileBoundingRegion;
  var min = tileBoundingRegion.minimumHeight;
  var max = tileBoundingRegion.maximumHeight;

  if (surfaceTile.boundingVolumeSourceTile !== tile) {
    var cameraHeight = frameState.camera.positionCartographic.height;
    var distanceToMin = Math.abs(cameraHeight - min);
    var distanceToMax = Math.abs(cameraHeight - max);
    if (distanceToMin > distanceToMax) {
      tileBoundingRegion.minimumHeight = min;
      tileBoundingRegion.maximumHeight = min;
    } else {
      tileBoundingRegion.minimumHeight = max;
      tileBoundingRegion.maximumHeight = max;
    }
  }

  var result = tileBoundingRegion.distanceToCamera(frameState);

  tileBoundingRegion.minimumHeight = min;
  tileBoundingRegion.maximumHeight = max;

  return result;
};

function updateTileBoundingRegion(tile, tileProvider, frameState) {
  var surfaceTile = tile.data;
  if (surfaceTile === undefined) {
    surfaceTile = tile.data = new GlobeSurfaceTile();
  }

  var ellipsoid = tile.tilingScheme.ellipsoid;
  if (surfaceTile.tileBoundingRegion === undefined) {
    surfaceTile.tileBoundingRegion = new TileBoundingRegion({
      computeBoundingVolumes: false,
      rectangle: tile.rectangle,
      ellipsoid: ellipsoid,
      minimumHeight: 0.0,
      maximumHeight: 0.0,
    });
  }

  var tileBoundingRegion = surfaceTile.tileBoundingRegion;
  var oldMinimumHeight = tileBoundingRegion.minimumHeight;
  var oldMaximumHeight = tileBoundingRegion.maximumHeight;
  var hasBoundingVolumesFromMesh = false;
  var sourceTile = tile;

  // Get min and max heights from the mesh.
  // If the mesh is not available, get them from the terrain data.
  // If the terrain data is not available either, get them from an ancestor.
  // If none of the ancestors are available, then there are no min and max heights for this tile at this time.
  var mesh = surfaceTile.mesh;
  var terrainData = surfaceTile.terrainData;
  if (
    mesh !== undefined &&
    mesh.minimumHeight !== undefined &&
    mesh.maximumHeight !== undefined
  ) {
    tileBoundingRegion.minimumHeight = mesh.minimumHeight;
    tileBoundingRegion.maximumHeight = mesh.maximumHeight;
    hasBoundingVolumesFromMesh = true;
  } else if (
    terrainData !== undefined &&
    terrainData._minimumHeight !== undefined &&
    terrainData._maximumHeight !== undefined
  ) {
    tileBoundingRegion.minimumHeight = terrainData._minimumHeight;
    tileBoundingRegion.maximumHeight = terrainData._maximumHeight;
  } else {
    // No accurate min/max heights available, so we're stuck with min/max heights from an ancestor tile.
    tileBoundingRegion.minimumHeight = Number.NaN;
    tileBoundingRegion.maximumHeight = Number.NaN;

    var ancestorTile = tile.parent;
    while (ancestorTile !== undefined) {
      var ancestorSurfaceTile = ancestorTile.data;
      if (ancestorSurfaceTile !== undefined) {
        var ancestorMesh = ancestorSurfaceTile.mesh;
        var ancestorTerrainData = ancestorSurfaceTile.terrainData;
        if (
          ancestorMesh !== undefined &&
          ancestorMesh.minimumHeight !== undefined &&
          ancestorMesh.maximumHeight !== undefined
        ) {
          tileBoundingRegion.minimumHeight = ancestorMesh.minimumHeight;
          tileBoundingRegion.maximumHeight = ancestorMesh.maximumHeight;
          break;
        } else if (
          ancestorTerrainData !== undefined &&
          ancestorTerrainData._minimumHeight !== undefined &&
          ancestorTerrainData._maximumHeight !== undefined
        ) {
          tileBoundingRegion.minimumHeight = ancestorTerrainData._minimumHeight;
          tileBoundingRegion.maximumHeight = ancestorTerrainData._maximumHeight;
          break;
        }
      }
      ancestorTile = ancestorTile.parent;
    }
    sourceTile = ancestorTile;
  }

  // Update bounding regions from the min and max heights
  if (sourceTile !== undefined) {
    var exaggeration = frameState.terrainExaggeration;
    var exaggerationRelativeHeight =
      frameState.terrainExaggerationRelativeHeight;
    var hasExaggeration = exaggeration !== 1.0;
    if (hasExaggeration) {
      hasBoundingVolumesFromMesh = false;
      tileBoundingRegion.minimumHeight = TerrainExaggeration.getHeight(
        tileBoundingRegion.minimumHeight,
        exaggeration,
        exaggerationRelativeHeight
      );
      tileBoundingRegion.maximumHeight = TerrainExaggeration.getHeight(
        tileBoundingRegion.maximumHeight,
        exaggeration,
        exaggerationRelativeHeight
      );
    }

    if (hasBoundingVolumesFromMesh) {
      if (!surfaceTile.boundingVolumeIsFromMesh) {
        tileBoundingRegion._orientedBoundingBox = OrientedBoundingBox.clone(
          mesh.orientedBoundingBox,
          tileBoundingRegion._orientedBoundingBox
        );
        tileBoundingRegion._boundingSphere = BoundingSphere.clone(
          mesh.boundingSphere3D,
          tileBoundingRegion._boundingSphere
        );
        surfaceTile.occludeePointInScaledSpace = Cartesian3.clone(
          mesh.occludeePointInScaledSpace,
          surfaceTile.occludeePointInScaledSpace
        );

        // If the occludee point is not defined, fallback to calculating it from the OBB
        if (!defined(surfaceTile.occludeePointInScaledSpace)) {
          surfaceTile.occludeePointInScaledSpace = computeOccludeePoint(
            tileProvider,
            tileBoundingRegion._orientedBoundingBox.center,
            tile.rectangle,
            tileBoundingRegion.minimumHeight,
            tileBoundingRegion.maximumHeight,
            surfaceTile.occludeePointInScaledSpace
          );
        }
      }
    } else {
      var needsBounds =
        tileBoundingRegion._orientedBoundingBox === undefined ||
        tileBoundingRegion._boundingSphere === undefined;
      var heightChanged =
        tileBoundingRegion.minimumHeight !== oldMinimumHeight ||
        tileBoundingRegion.maximumHeight !== oldMaximumHeight;
      if (heightChanged || needsBounds) {
        // Bounding volumes need to be recomputed in some circumstances
        tileBoundingRegion.computeBoundingVolumes(ellipsoid);
        surfaceTile.occludeePointInScaledSpace = computeOccludeePoint(
          tileProvider,
          tileBoundingRegion._orientedBoundingBox.center,
          tile.rectangle,
          tileBoundingRegion.minimumHeight,
          tileBoundingRegion.maximumHeight,
          surfaceTile.occludeePointInScaledSpace
        );
      }
    }
    surfaceTile.boundingVolumeSourceTile = sourceTile;
    surfaceTile.boundingVolumeIsFromMesh = hasBoundingVolumesFromMesh;
  } else {
    surfaceTile.boundingVolumeSourceTile = undefined;
    surfaceTile.boundingVolumeIsFromMesh = false;
  }
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 *
 * @see GlobeSurfaceTileProvider#destroy
 */
GlobeSurfaceTileProvider.prototype.isDestroyed = function () {
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
 *
 * @example
 * provider = provider && provider();
 *
 * @see GlobeSurfaceTileProvider#isDestroyed
 */
GlobeSurfaceTileProvider.prototype.destroy = function () {
  this._tileProvider = this._tileProvider && this._tileProvider.destroy();
  this._clippingPlanes = this._clippingPlanes && this._clippingPlanes.destroy();

  return destroyObject(this);
};

function getTileReadyCallback(tileImageriesToFree, layer, terrainProvider) {
  return function (tile) {
    var tileImagery;
    var imagery;
    var startIndex = -1;
    var tileImageryCollection = tile.data.imagery;
    var length = tileImageryCollection.length;
    var i;
    for (i = 0; i < length; ++i) {
      tileImagery = tileImageryCollection[i];
      imagery = defaultValue(
        tileImagery.readyImagery,
        tileImagery.loadingImagery
      );
      if (imagery.imageryLayer === layer) {
        startIndex = i;
        break;
      }
    }

    if (startIndex !== -1) {
      var endIndex = startIndex + tileImageriesToFree;
      tileImagery = tileImageryCollection[endIndex];
      imagery = defined(tileImagery)
        ? defaultValue(tileImagery.readyImagery, tileImagery.loadingImagery)
        : undefined;
      if (!defined(imagery) || imagery.imageryLayer !== layer) {
        // Return false to keep the callback if we have to wait on the skeletons
        // Return true to remove the callback if something went wrong
        return !layer._createTileImagerySkeletons(
          tile,
          terrainProvider,
          endIndex
        );
      }

      for (i = startIndex; i < endIndex; ++i) {
        tileImageryCollection[i].freeResources();
      }

      tileImageryCollection.splice(startIndex, tileImageriesToFree);
    }

    return true; // Everything is done, so remove the callback
  };
}

GlobeSurfaceTileProvider.prototype._onLayerAdded = function (layer, index) {
  if (layer.show) {
    var terrainProvider = this._terrainProvider;

    var that = this;
    var imageryProvider = layer.imageryProvider;
    var tileImageryUpdatedEvent = this._imageryLayersUpdatedEvent;
    imageryProvider._reload = function () {
      // Clear the layer's cache
      layer._imageryCache = {};

      that._quadtree.forEachLoadedTile(function (tile) {
        // If this layer is still waiting to for the loaded callback, just return
        if (defined(tile._loadedCallbacks[layer._layerIndex])) {
          return;
        }

        var i;

        // Figure out how many TileImageries we will need to remove and where to insert new ones
        var tileImageryCollection = tile.data.imagery;
        var length = tileImageryCollection.length;
        var startIndex = -1;
        var tileImageriesToFree = 0;
        for (i = 0; i < length; ++i) {
          var tileImagery = tileImageryCollection[i];
          var imagery = defaultValue(
            tileImagery.readyImagery,
            tileImagery.loadingImagery
          );
          if (imagery.imageryLayer === layer) {
            if (startIndex === -1) {
              startIndex = i;
            }

            ++tileImageriesToFree;
          } else if (startIndex !== -1) {
            // iterated past the section of TileImageries belonging to this layer, no need to continue.
            break;
          }
        }

        if (startIndex === -1) {
          return;
        }

        // Insert immediately after existing TileImageries
        var insertionPoint = startIndex + tileImageriesToFree;

        // Create new TileImageries for all loaded tiles
        if (
          layer._createTileImagerySkeletons(
            tile,
            terrainProvider,
            insertionPoint
          )
        ) {
          // Add callback to remove old TileImageries when the new TileImageries are ready
          tile._loadedCallbacks[layer._layerIndex] = getTileReadyCallback(
            tileImageriesToFree,
            layer,
            terrainProvider
          );

          tile.state = QuadtreeTileLoadState.LOADING;
        }
      });
    };

    // create TileImageries for this layer for all previously loaded tiles
    this._quadtree.forEachLoadedTile(function (tile) {
      if (layer._createTileImagerySkeletons(tile, terrainProvider)) {
        tile.state = QuadtreeTileLoadState.LOADING;

        // Tiles that are not currently being rendered need to load the new layer before they're renderable.
        // We don't mark the rendered tiles non-renderable, though, because that would make the globe disappear.
        if (
          tile.level !== 0 &&
          (tile._lastSelectionResultFrame !==
            that.quadtree._lastSelectionFrameNumber ||
            tile._lastSelectionResult !== TileSelectionResult.RENDERED)
        ) {
          tile.renderable = false;
        }
      }
    });

    this._layerOrderChanged = true;
    tileImageryUpdatedEvent.raiseEvent();
  }
};

GlobeSurfaceTileProvider.prototype._onLayerRemoved = function (layer, index) {
  // destroy TileImagerys for this layer for all previously loaded tiles
  this._quadtree.forEachLoadedTile(function (tile) {
    var tileImageryCollection = tile.data.imagery;

    var startIndex = -1;
    var numDestroyed = 0;
    for (var i = 0, len = tileImageryCollection.length; i < len; ++i) {
      var tileImagery = tileImageryCollection[i];
      var imagery = tileImagery.loadingImagery;
      if (!defined(imagery)) {
        imagery = tileImagery.readyImagery;
      }
      if (imagery.imageryLayer === layer) {
        if (startIndex === -1) {
          startIndex = i;
        }

        tileImagery.freeResources();
        ++numDestroyed;
      } else if (startIndex !== -1) {
        // iterated past the section of TileImagerys belonging to this layer, no need to continue.
        break;
      }
    }

    if (startIndex !== -1) {
      tileImageryCollection.splice(startIndex, numDestroyed);
    }
  });

  if (defined(layer.imageryProvider)) {
    layer.imageryProvider._reload = undefined;
  }

  this._imageryLayersUpdatedEvent.raiseEvent();
};

GlobeSurfaceTileProvider.prototype._onLayerMoved = function (
  layer,
  newIndex,
  oldIndex
) {
  this._layerOrderChanged = true;
  this._imageryLayersUpdatedEvent.raiseEvent();
};

GlobeSurfaceTileProvider.prototype._onLayerShownOrHidden = function (
  layer,
  index,
  show
) {
  if (show) {
    this._onLayerAdded(layer, index);
  } else {
    this._onLayerRemoved(layer, index);
  }
};

var scratchClippingPlanesMatrix = new Matrix4();
var scratchInverseTransposeClippingPlanesMatrix = new Matrix4();
function createTileUniformMap(frameState, globeSurfaceTileProvider) {
  var uniformMap = {
    u_initialColor: function () {
      return this.properties.initialColor;
    },
    u_fillHighlightColor: function () {
      return this.properties.fillHighlightColor;
    },
    u_zoomedOutOceanSpecularIntensity: function () {
      return this.properties.zoomedOutOceanSpecularIntensity;
    },
    u_oceanNormalMap: function () {
      return this.properties.oceanNormalMap;
    },
    u_lightingFadeDistance: function () {
      return this.properties.lightingFadeDistance;
    },
    u_nightFadeDistance: function () {
      return this.properties.nightFadeDistance;
    },
    u_center3D: function () {
      return this.properties.center3D;
    },
    u_terrainExaggerationAndRelativeHeight: function () {
      return this.properties.terrainExaggerationAndRelativeHeight;
    },
    u_tileRectangle: function () {
      return this.properties.tileRectangle;
    },
    u_modifiedModelView: function () {
      var viewMatrix = frameState.context.uniformState.view;
      var centerEye = Matrix4.multiplyByPoint(
        viewMatrix,
        this.properties.rtc,
        centerEyeScratch
      );
      Matrix4.setTranslation(viewMatrix, centerEye, modifiedModelViewScratch);
      return modifiedModelViewScratch;
    },
    u_modifiedModelViewProjection: function () {
      var viewMatrix = frameState.context.uniformState.view;
      var projectionMatrix = frameState.context.uniformState.projection;
      var centerEye = Matrix4.multiplyByPoint(
        viewMatrix,
        this.properties.rtc,
        centerEyeScratch
      );
      Matrix4.setTranslation(
        viewMatrix,
        centerEye,
        modifiedModelViewProjectionScratch
      );
      Matrix4.multiply(
        projectionMatrix,
        modifiedModelViewProjectionScratch,
        modifiedModelViewProjectionScratch
      );
      return modifiedModelViewProjectionScratch;
    },
    u_dayTextures: function () {
      return this.properties.dayTextures;
    },
    u_dayTextureTranslationAndScale: function () {
      return this.properties.dayTextureTranslationAndScale;
    },
    u_dayTextureTexCoordsRectangle: function () {
      return this.properties.dayTextureTexCoordsRectangle;
    },
    u_dayTextureUseWebMercatorT: function () {
      return this.properties.dayTextureUseWebMercatorT;
    },
    u_dayTextureAlpha: function () {
      return this.properties.dayTextureAlpha;
    },
    u_dayTextureNightAlpha: function () {
      return this.properties.dayTextureNightAlpha;
    },
    u_dayTextureDayAlpha: function () {
      return this.properties.dayTextureDayAlpha;
    },
    u_dayTextureBrightness: function () {
      return this.properties.dayTextureBrightness;
    },
    u_dayTextureContrast: function () {
      return this.properties.dayTextureContrast;
    },
    u_dayTextureHue: function () {
      return this.properties.dayTextureHue;
    },
    u_dayTextureSaturation: function () {
      return this.properties.dayTextureSaturation;
    },
    u_dayTextureOneOverGamma: function () {
      return this.properties.dayTextureOneOverGamma;
    },
    u_dayIntensity: function () {
      return this.properties.dayIntensity;
    },
    u_southAndNorthLatitude: function () {
      return this.properties.southAndNorthLatitude;
    },
    u_southMercatorYAndOneOverHeight: function () {
      return this.properties.southMercatorYAndOneOverHeight;
    },
    u_waterMask: function () {
      return this.properties.waterMask;
    },
    u_waterMaskTranslationAndScale: function () {
      return this.properties.waterMaskTranslationAndScale;
    },
    u_minMaxHeight: function () {
      return this.properties.minMaxHeight;
    },
    u_scaleAndBias: function () {
      return this.properties.scaleAndBias;
    },
    u_dayTextureSplit: function () {
      return this.properties.dayTextureSplit;
    },
    u_dayTextureCutoutRectangles: function () {
      return this.properties.dayTextureCutoutRectangles;
    },
    u_clippingPlanes: function () {
      var clippingPlanes = globeSurfaceTileProvider._clippingPlanes;
      if (defined(clippingPlanes) && defined(clippingPlanes.texture)) {
        // Check in case clippingPlanes hasn't been updated yet.
        return clippingPlanes.texture;
      }
      return frameState.context.defaultTexture;
    },
    u_cartographicLimitRectangle: function () {
      return this.properties.localizedCartographicLimitRectangle;
    },
    u_clippingPlanesMatrix: function () {
      var clippingPlanes = globeSurfaceTileProvider._clippingPlanes;
      var transform = defined(clippingPlanes)
        ? Matrix4.multiply(
            frameState.context.uniformState.view,
            clippingPlanes.modelMatrix,
            scratchClippingPlanesMatrix
          )
        : Matrix4.IDENTITY;

      return Matrix4.inverseTranspose(
        transform,
        scratchInverseTransposeClippingPlanesMatrix
      );
    },
    u_clippingPlanesEdgeStyle: function () {
      var style = this.properties.clippingPlanesEdgeColor;
      style.alpha = this.properties.clippingPlanesEdgeWidth;
      return style;
    },
    u_minimumBrightness: function () {
      return frameState.fog.minimumBrightness;
    },
    u_hsbShift: function () {
      return this.properties.hsbShift;
    },
    u_colorsToAlpha: function () {
      return this.properties.colorsToAlpha;
    },
    u_frontFaceAlphaByDistance: function () {
      return this.properties.frontFaceAlphaByDistance;
    },
    u_backFaceAlphaByDistance: function () {
      return this.properties.backFaceAlphaByDistance;
    },
    u_translucencyRectangle: function () {
      return this.properties.localizedTranslucencyRectangle;
    },
    u_undergroundColor: function () {
      return this.properties.undergroundColor;
    },
    u_undergroundColorAlphaByDistance: function () {
      return this.properties.undergroundColorAlphaByDistance;
    },

    // make a separate object so that changes to the properties are seen on
    // derived commands that combine another uniform map with this one.
    properties: {
      initialColor: new Cartesian4(0.0, 0.0, 0.5, 1.0),
      fillHighlightColor: new Color(0.0, 0.0, 0.0, 0.0),
      zoomedOutOceanSpecularIntensity: 0.5,
      oceanNormalMap: undefined,
      lightingFadeDistance: new Cartesian2(6500000.0, 9000000.0),
      nightFadeDistance: new Cartesian2(10000000.0, 40000000.0),
      hsbShift: new Cartesian3(),

      center3D: undefined,
      rtc: new Cartesian3(),
      modifiedModelView: new Matrix4(),
      tileRectangle: new Cartesian4(),

      terrainExaggerationAndRelativeHeight: new Cartesian2(1.0, 0.0),

      dayTextures: [],
      dayTextureTranslationAndScale: [],
      dayTextureTexCoordsRectangle: [],
      dayTextureUseWebMercatorT: [],
      dayTextureAlpha: [],
      dayTextureNightAlpha: [],
      dayTextureDayAlpha: [],
      dayTextureBrightness: [],
      dayTextureContrast: [],
      dayTextureHue: [],
      dayTextureSaturation: [],
      dayTextureOneOverGamma: [],
      dayTextureSplit: [],
      dayTextureCutoutRectangles: [],
      dayIntensity: 0.0,
      colorsToAlpha: [],

      southAndNorthLatitude: new Cartesian2(),
      southMercatorYAndOneOverHeight: new Cartesian2(),

      waterMask: undefined,
      waterMaskTranslationAndScale: new Cartesian4(),

      minMaxHeight: new Cartesian2(),
      scaleAndBias: new Matrix4(),
      clippingPlanesEdgeColor: Color.clone(Color.WHITE),
      clippingPlanesEdgeWidth: 0.0,

      localizedCartographicLimitRectangle: new Cartesian4(),

      frontFaceAlphaByDistance: new Cartesian4(),
      backFaceAlphaByDistance: new Cartesian4(),
      localizedTranslucencyRectangle: new Cartesian4(),
      undergroundColor: Color.clone(Color.TRANSPARENT),
      undergroundColorAlphaByDistance: new Cartesian4(),
    },
  };

  if (defined(globeSurfaceTileProvider.materialUniformMap)) {
    return combine(uniformMap, globeSurfaceTileProvider.materialUniformMap);
  }

  return uniformMap;
}

function createWireframeVertexArrayIfNecessary(context, provider, tile) {
  var surfaceTile = tile.data;

  var mesh;
  var vertexArray;

  if (defined(surfaceTile.vertexArray)) {
    mesh = surfaceTile.mesh;
    vertexArray = surfaceTile.vertexArray;
  } else if (
    defined(surfaceTile.fill) &&
    defined(surfaceTile.fill.vertexArray)
  ) {
    mesh = surfaceTile.fill.mesh;
    vertexArray = surfaceTile.fill.vertexArray;
  }

  if (!defined(mesh) || !defined(vertexArray)) {
    return;
  }

  if (defined(surfaceTile.wireframeVertexArray)) {
    if (surfaceTile.wireframeVertexArray.mesh === mesh) {
      return;
    }

    surfaceTile.wireframeVertexArray.destroy();
    surfaceTile.wireframeVertexArray = undefined;
  }

  surfaceTile.wireframeVertexArray = createWireframeVertexArray(
    context,
    vertexArray,
    mesh
  );
  surfaceTile.wireframeVertexArray.mesh = mesh;
}

/**
 * Creates a vertex array for wireframe rendering of a terrain tile.
 *
 * @private
 *
 * @param {Context} context The context in which to create the vertex array.
 * @param {VertexArray} vertexArray The existing, non-wireframe vertex array.  The new vertex array
 *                      will share vertex buffers with this existing one.
 * @param {TerrainMesh} terrainMesh The terrain mesh containing non-wireframe indices.
 * @returns {VertexArray} The vertex array for wireframe rendering.
 */
function createWireframeVertexArray(context, vertexArray, terrainMesh) {
  var indices = terrainMesh.indices;

  var geometry = {
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
  };

  GeometryPipeline.toWireframe(geometry);

  var wireframeIndices = geometry.indices;
  var wireframeIndexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: wireframeIndices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.fromSizeInBytes(
      wireframeIndices.BYTES_PER_ELEMENT
    ),
  });
  return new VertexArray({
    context: context,
    attributes: vertexArray._attributes,
    indexBuffer: wireframeIndexBuffer,
  });
}

var getDebugOrientedBoundingBox;
var getDebugBoundingSphere;
var debugDestroyPrimitive;

(function () {
  var instanceOBB = new GeometryInstance({
    geometry: BoxOutlineGeometry.fromDimensions({
      dimensions: new Cartesian3(2.0, 2.0, 2.0),
    }),
  });
  var instanceSphere = new GeometryInstance({
    geometry: new SphereOutlineGeometry({ radius: 1.0 }),
  });
  var modelMatrix = new Matrix4();
  var previousVolume;
  var primitive;

  function createDebugPrimitive(instance) {
    return new Primitive({
      geometryInstances: instance,
      appearance: new PerInstanceColorAppearance({
        translucent: false,
        flat: true,
      }),
      asynchronous: false,
    });
  }

  getDebugOrientedBoundingBox = function (obb, color) {
    if (obb === previousVolume) {
      return primitive;
    }
    debugDestroyPrimitive();

    previousVolume = obb;
    modelMatrix = Matrix4.fromRotationTranslation(
      obb.halfAxes,
      obb.center,
      modelMatrix
    );

    instanceOBB.modelMatrix = modelMatrix;
    instanceOBB.attributes.color = ColorGeometryInstanceAttribute.fromColor(
      color
    );

    primitive = createDebugPrimitive(instanceOBB);
    return primitive;
  };

  getDebugBoundingSphere = function (sphere, color) {
    if (sphere === previousVolume) {
      return primitive;
    }
    debugDestroyPrimitive();

    previousVolume = sphere;
    modelMatrix = Matrix4.fromTranslation(sphere.center, modelMatrix);
    modelMatrix = Matrix4.multiplyByUniformScale(
      modelMatrix,
      sphere.radius,
      modelMatrix
    );

    instanceSphere.modelMatrix = modelMatrix;
    instanceSphere.attributes.color = ColorGeometryInstanceAttribute.fromColor(
      color
    );

    primitive = createDebugPrimitive(instanceSphere);
    return primitive;
  };

  debugDestroyPrimitive = function () {
    if (defined(primitive)) {
      primitive.destroy();
      primitive = undefined;
      previousVolume = undefined;
    }
  };
})();

var otherPassesInitialColor = new Cartesian4(0.0, 0.0, 0.0, 0.0);
var surfaceShaderSetOptionsScratch = {
  frameState: undefined,
  surfaceTile: undefined,
  numberOfDayTextures: undefined,
  applyBrightness: undefined,
  applyContrast: undefined,
  applyHue: undefined,
  applySaturation: undefined,
  applyGamma: undefined,
  applyAlpha: undefined,
  applyDayNightAlpha: undefined,
  applySplit: undefined,
  showReflectiveOcean: undefined,
  showOceanWaves: undefined,
  enableLighting: undefined,
  dynamicAtmosphereLighting: undefined,
  dynamicAtmosphereLightingFromSun: undefined,
  showGroundAtmosphere: undefined,
  perFragmentGroundAtmosphere: undefined,
  hasVertexNormals: undefined,
  useWebMercatorProjection: undefined,
  enableFog: undefined,
  enableClippingPlanes: undefined,
  clippingPlanes: undefined,
  clippedByBoundaries: undefined,
  hasImageryLayerCutout: undefined,
  colorCorrect: undefined,
  colorToAlpha: undefined,
  hasGeodeticSurfaceNormals: undefined,
  hasExaggeration: undefined,
};

var defaultUndergroundColor = Color.TRANSPARENT;
var defaultundergroundColorAlphaByDistance = new NearFarScalar();

function addDrawCommandsForTile(tileProvider, tile, frameState) {
  var surfaceTile = tile.data;

  if (!defined(surfaceTile.vertexArray)) {
    if (surfaceTile.fill === undefined) {
      // No fill was created for this tile, probably because this tile is not connected to
      // any renderable tiles. So create a simple tile in the middle of the tile's possible
      // height range.
      surfaceTile.fill = new TerrainFillMesh(tile);
    }
    surfaceTile.fill.update(tileProvider, frameState);
  }

  var creditDisplay = frameState.creditDisplay;

  var terrainData = surfaceTile.terrainData;
  if (defined(terrainData) && defined(terrainData.credits)) {
    var tileCredits = terrainData.credits;
    for (
      var tileCreditIndex = 0, tileCreditLength = tileCredits.length;
      tileCreditIndex < tileCreditLength;
      ++tileCreditIndex
    ) {
      creditDisplay.addCredit(tileCredits[tileCreditIndex]);
    }
  }

  var maxTextures = ContextLimits.maximumTextureImageUnits;

  var waterMaskTexture = surfaceTile.waterMaskTexture;
  var waterMaskTranslationAndScale = surfaceTile.waterMaskTranslationAndScale;
  if (!defined(waterMaskTexture) && defined(surfaceTile.fill)) {
    waterMaskTexture = surfaceTile.fill.waterMaskTexture;
    waterMaskTranslationAndScale =
      surfaceTile.fill.waterMaskTranslationAndScale;
  }

  var cameraUnderground = frameState.cameraUnderground;

  var globeTranslucencyState = frameState.globeTranslucencyState;
  var translucent = globeTranslucencyState.translucent;
  var frontFaceAlphaByDistance =
    globeTranslucencyState.frontFaceAlphaByDistance;
  var backFaceAlphaByDistance = globeTranslucencyState.backFaceAlphaByDistance;
  var translucencyRectangle = globeTranslucencyState.rectangle;

  var undergroundColor = defaultValue(
    tileProvider.undergroundColor,
    defaultUndergroundColor
  );
  var undergroundColorAlphaByDistance = defaultValue(
    tileProvider.undergroundColorAlphaByDistance,
    defaultundergroundColorAlphaByDistance
  );
  var showUndergroundColor =
    isUndergroundVisible(tileProvider, frameState) &&
    frameState.mode === SceneMode.SCENE3D &&
    undergroundColor.alpha > 0.0 &&
    (undergroundColorAlphaByDistance.nearValue > 0.0 ||
      undergroundColorAlphaByDistance.farValue > 0.0);

  var showReflectiveOcean =
    tileProvider.hasWaterMask && defined(waterMaskTexture);
  var oceanNormalMap = tileProvider.oceanNormalMap;
  var showOceanWaves = showReflectiveOcean && defined(oceanNormalMap);
  var hasVertexNormals =
    tileProvider.terrainProvider.ready &&
    tileProvider.terrainProvider.hasVertexNormals;
  var enableFog = frameState.fog.enabled && !cameraUnderground;
  var showGroundAtmosphere =
    tileProvider.showGroundAtmosphere && frameState.mode === SceneMode.SCENE3D;
  var castShadows =
    ShadowMode.castShadows(tileProvider.shadows) && !translucent;
  var receiveShadows =
    ShadowMode.receiveShadows(tileProvider.shadows) && !translucent;

  var hueShift = tileProvider.hueShift;
  var saturationShift = tileProvider.saturationShift;
  var brightnessShift = tileProvider.brightnessShift;

  var colorCorrect = !(
    CesiumMath.equalsEpsilon(hueShift, 0.0, CesiumMath.EPSILON7) &&
    CesiumMath.equalsEpsilon(saturationShift, 0.0, CesiumMath.EPSILON7) &&
    CesiumMath.equalsEpsilon(brightnessShift, 0.0, CesiumMath.EPSILON7)
  );

  var perFragmentGroundAtmosphere = false;
  if (showGroundAtmosphere) {
    var cameraDistance = Cartesian3.magnitude(frameState.camera.positionWC);
    var fadeOutDistance = tileProvider.nightFadeOutDistance;
    perFragmentGroundAtmosphere = cameraDistance > fadeOutDistance;
  }

  if (showReflectiveOcean) {
    --maxTextures;
  }
  if (showOceanWaves) {
    --maxTextures;
  }
  if (
    defined(frameState.shadowState) &&
    frameState.shadowState.shadowsEnabled
  ) {
    --maxTextures;
  }
  if (
    defined(tileProvider.clippingPlanes) &&
    tileProvider.clippingPlanes.enabled
  ) {
    --maxTextures;
  }

  maxTextures -= globeTranslucencyState.numberOfTextureUniforms;

  var mesh = surfaceTile.renderedMesh;
  var rtc = mesh.center;
  var encoding = mesh.encoding;
  var tileBoundingRegion = surfaceTile.tileBoundingRegion;

  var exaggeration = frameState.terrainExaggeration;
  var exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
  var hasExaggeration = exaggeration !== 1.0;
  var hasGeodeticSurfaceNormals = encoding.hasGeodeticSurfaceNormals;

  // Not used in 3D.
  var tileRectangle = tileRectangleScratch;

  // Only used for Mercator projections.
  var southLatitude = 0.0;
  var northLatitude = 0.0;
  var southMercatorY = 0.0;
  var oneOverMercatorHeight = 0.0;

  var useWebMercatorProjection = false;

  if (frameState.mode !== SceneMode.SCENE3D) {
    var projection = frameState.mapProjection;
    var southwest = projection.project(
      Rectangle.southwest(tile.rectangle),
      southwestScratch
    );
    var northeast = projection.project(
      Rectangle.northeast(tile.rectangle),
      northeastScratch
    );

    tileRectangle.x = southwest.x;
    tileRectangle.y = southwest.y;
    tileRectangle.z = northeast.x;
    tileRectangle.w = northeast.y;

    // In 2D and Columbus View, use the center of the tile for RTC rendering.
    if (frameState.mode !== SceneMode.MORPHING) {
      rtc = rtcScratch;
      rtc.x = 0.0;
      rtc.y = (tileRectangle.z + tileRectangle.x) * 0.5;
      rtc.z = (tileRectangle.w + tileRectangle.y) * 0.5;
      tileRectangle.x -= rtc.y;
      tileRectangle.y -= rtc.z;
      tileRectangle.z -= rtc.y;
      tileRectangle.w -= rtc.z;
    }

    if (
      frameState.mode === SceneMode.SCENE2D &&
      encoding.quantization === TerrainQuantization.BITS12
    ) {
      // In 2D, the texture coordinates of the tile are interpolated over the rectangle to get the position in the vertex shader.
      // When the texture coordinates are quantized, error is introduced. This can be seen through the 1px wide cracking
      // between the quantized tiles in 2D. To compensate for the error, move the expand the rectangle in each direction by
      // half the error amount.
      var epsilon = (1.0 / (Math.pow(2.0, 12.0) - 1.0)) * 0.5;
      var widthEpsilon = (tileRectangle.z - tileRectangle.x) * epsilon;
      var heightEpsilon = (tileRectangle.w - tileRectangle.y) * epsilon;
      tileRectangle.x -= widthEpsilon;
      tileRectangle.y -= heightEpsilon;
      tileRectangle.z += widthEpsilon;
      tileRectangle.w += heightEpsilon;
    }

    if (projection instanceof WebMercatorProjection) {
      southLatitude = tile.rectangle.south;
      northLatitude = tile.rectangle.north;

      southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
        southLatitude
      );

      oneOverMercatorHeight =
        1.0 /
        (WebMercatorProjection.geodeticLatitudeToMercatorAngle(northLatitude) -
          southMercatorY);

      useWebMercatorProjection = true;
    }
  }

  var surfaceShaderSetOptions = surfaceShaderSetOptionsScratch;
  surfaceShaderSetOptions.frameState = frameState;
  surfaceShaderSetOptions.surfaceTile = surfaceTile;
  surfaceShaderSetOptions.showReflectiveOcean = showReflectiveOcean;
  surfaceShaderSetOptions.showOceanWaves = showOceanWaves;
  surfaceShaderSetOptions.enableLighting = tileProvider.enableLighting;
  surfaceShaderSetOptions.dynamicAtmosphereLighting =
    tileProvider.dynamicAtmosphereLighting;
  surfaceShaderSetOptions.dynamicAtmosphereLightingFromSun =
    tileProvider.dynamicAtmosphereLightingFromSun;
  surfaceShaderSetOptions.showGroundAtmosphere = showGroundAtmosphere;
  surfaceShaderSetOptions.perFragmentGroundAtmosphere = perFragmentGroundAtmosphere;
  surfaceShaderSetOptions.hasVertexNormals = hasVertexNormals;
  surfaceShaderSetOptions.useWebMercatorProjection = useWebMercatorProjection;
  surfaceShaderSetOptions.clippedByBoundaries = surfaceTile.clippedByBoundaries;
  surfaceShaderSetOptions.hasGeodeticSurfaceNormals = hasGeodeticSurfaceNormals;
  surfaceShaderSetOptions.hasExaggeration = hasExaggeration;

  var tileImageryCollection = surfaceTile.imagery;
  var imageryIndex = 0;
  var imageryLen = tileImageryCollection.length;

  var showSkirts =
    tileProvider.showSkirts && !cameraUnderground && !translucent;
  var backFaceCulling =
    tileProvider.backFaceCulling && !cameraUnderground && !translucent;
  var firstPassRenderState = backFaceCulling
    ? tileProvider._renderState
    : tileProvider._disableCullingRenderState;
  var otherPassesRenderState = backFaceCulling
    ? tileProvider._blendRenderState
    : tileProvider._disableCullingBlendRenderState;
  var renderState = firstPassRenderState;

  var initialColor = tileProvider._firstPassInitialColor;

  var context = frameState.context;

  if (!defined(tileProvider._debug.boundingSphereTile)) {
    debugDestroyPrimitive();
  }

  var materialUniformMapChanged =
    tileProvider._materialUniformMap !== tileProvider.materialUniformMap;
  if (materialUniformMapChanged) {
    tileProvider._materialUniformMap = tileProvider.materialUniformMap;
    var drawCommandsLength = tileProvider._drawCommands.length;
    for (var i = 0; i < drawCommandsLength; ++i) {
      tileProvider._uniformMaps[i] = createTileUniformMap(
        frameState,
        tileProvider
      );
    }
  }

  do {
    var numberOfDayTextures = 0;

    var command;
    var uniformMap;

    if (tileProvider._drawCommands.length <= tileProvider._usedDrawCommands) {
      command = new DrawCommand();
      command.owner = tile;
      command.cull = false;
      command.boundingVolume = new BoundingSphere();
      command.orientedBoundingBox = undefined;

      uniformMap = createTileUniformMap(frameState, tileProvider);

      tileProvider._drawCommands.push(command);
      tileProvider._uniformMaps.push(uniformMap);
    } else {
      command = tileProvider._drawCommands[tileProvider._usedDrawCommands];
      uniformMap = tileProvider._uniformMaps[tileProvider._usedDrawCommands];
    }

    command.owner = tile;

    ++tileProvider._usedDrawCommands;

    if (tile === tileProvider._debug.boundingSphereTile) {
      var obb = tileBoundingRegion.boundingVolume;
      var boundingSphere = tileBoundingRegion.boundingSphere;
      // If a debug primitive already exists for this tile, it will not be
      // re-created, to avoid allocation every frame. If it were possible
      // to have more than one selected tile, this would have to change.
      if (defined(obb)) {
        getDebugOrientedBoundingBox(obb, Color.RED).update(frameState);
      } else if (defined(boundingSphere)) {
        getDebugBoundingSphere(boundingSphere, Color.RED).update(frameState);
      }
    }

    var uniformMapProperties = uniformMap.properties;
    Cartesian4.clone(initialColor, uniformMapProperties.initialColor);
    uniformMapProperties.oceanNormalMap = oceanNormalMap;
    uniformMapProperties.lightingFadeDistance.x =
      tileProvider.lightingFadeOutDistance;
    uniformMapProperties.lightingFadeDistance.y =
      tileProvider.lightingFadeInDistance;
    uniformMapProperties.nightFadeDistance.x =
      tileProvider.nightFadeOutDistance;
    uniformMapProperties.nightFadeDistance.y = tileProvider.nightFadeInDistance;
    uniformMapProperties.zoomedOutOceanSpecularIntensity =
      tileProvider.zoomedOutOceanSpecularIntensity;

    var frontFaceAlphaByDistanceFinal = cameraUnderground
      ? backFaceAlphaByDistance
      : frontFaceAlphaByDistance;
    var backFaceAlphaByDistanceFinal = cameraUnderground
      ? frontFaceAlphaByDistance
      : backFaceAlphaByDistance;

    if (defined(frontFaceAlphaByDistanceFinal)) {
      Cartesian4.fromElements(
        frontFaceAlphaByDistanceFinal.near,
        frontFaceAlphaByDistanceFinal.nearValue,
        frontFaceAlphaByDistanceFinal.far,
        frontFaceAlphaByDistanceFinal.farValue,
        uniformMapProperties.frontFaceAlphaByDistance
      );
      Cartesian4.fromElements(
        backFaceAlphaByDistanceFinal.near,
        backFaceAlphaByDistanceFinal.nearValue,
        backFaceAlphaByDistanceFinal.far,
        backFaceAlphaByDistanceFinal.farValue,
        uniformMapProperties.backFaceAlphaByDistance
      );
    }

    Cartesian4.fromElements(
      undergroundColorAlphaByDistance.near,
      undergroundColorAlphaByDistance.nearValue,
      undergroundColorAlphaByDistance.far,
      undergroundColorAlphaByDistance.farValue,
      uniformMapProperties.undergroundColorAlphaByDistance
    );
    Color.clone(undergroundColor, uniformMapProperties.undergroundColor);

    var highlightFillTile =
      !defined(surfaceTile.vertexArray) &&
      defined(tileProvider.fillHighlightColor) &&
      tileProvider.fillHighlightColor.alpha > 0.0;
    if (highlightFillTile) {
      Color.clone(
        tileProvider.fillHighlightColor,
        uniformMapProperties.fillHighlightColor
      );
    }

    uniformMapProperties.terrainExaggerationAndRelativeHeight.x = exaggeration;
    uniformMapProperties.terrainExaggerationAndRelativeHeight.y = exaggerationRelativeHeight;

    uniformMapProperties.center3D = mesh.center;
    Cartesian3.clone(rtc, uniformMapProperties.rtc);

    Cartesian4.clone(tileRectangle, uniformMapProperties.tileRectangle);
    uniformMapProperties.southAndNorthLatitude.x = southLatitude;
    uniformMapProperties.southAndNorthLatitude.y = northLatitude;
    uniformMapProperties.southMercatorYAndOneOverHeight.x = southMercatorY;
    uniformMapProperties.southMercatorYAndOneOverHeight.y = oneOverMercatorHeight;

    // Convert tile limiter rectangle from cartographic to texture space using the tileRectangle.
    var localizedCartographicLimitRectangle = localizedCartographicLimitRectangleScratch;
    var cartographicLimitRectangle = clipRectangleAntimeridian(
      tile.rectangle,
      tileProvider.cartographicLimitRectangle
    );

    var localizedTranslucencyRectangle = localizedTranslucencyRectangleScratch;
    var clippedTranslucencyRectangle = clipRectangleAntimeridian(
      tile.rectangle,
      translucencyRectangle
    );

    Cartesian3.fromElements(
      hueShift,
      saturationShift,
      brightnessShift,
      uniformMapProperties.hsbShift
    );

    var cartographicTileRectangle = tile.rectangle;
    var inverseTileWidth = 1.0 / cartographicTileRectangle.width;
    var inverseTileHeight = 1.0 / cartographicTileRectangle.height;
    localizedCartographicLimitRectangle.x =
      (cartographicLimitRectangle.west - cartographicTileRectangle.west) *
      inverseTileWidth;
    localizedCartographicLimitRectangle.y =
      (cartographicLimitRectangle.south - cartographicTileRectangle.south) *
      inverseTileHeight;
    localizedCartographicLimitRectangle.z =
      (cartographicLimitRectangle.east - cartographicTileRectangle.west) *
      inverseTileWidth;
    localizedCartographicLimitRectangle.w =
      (cartographicLimitRectangle.north - cartographicTileRectangle.south) *
      inverseTileHeight;

    Cartesian4.clone(
      localizedCartographicLimitRectangle,
      uniformMapProperties.localizedCartographicLimitRectangle
    );

    localizedTranslucencyRectangle.x =
      (clippedTranslucencyRectangle.west - cartographicTileRectangle.west) *
      inverseTileWidth;
    localizedTranslucencyRectangle.y =
      (clippedTranslucencyRectangle.south - cartographicTileRectangle.south) *
      inverseTileHeight;
    localizedTranslucencyRectangle.z =
      (clippedTranslucencyRectangle.east - cartographicTileRectangle.west) *
      inverseTileWidth;
    localizedTranslucencyRectangle.w =
      (clippedTranslucencyRectangle.north - cartographicTileRectangle.south) *
      inverseTileHeight;

    Cartesian4.clone(
      localizedTranslucencyRectangle,
      uniformMapProperties.localizedTranslucencyRectangle
    );

    // For performance, use fog in the shader only when the tile is in fog.
    var applyFog =
      enableFog &&
      CesiumMath.fog(tile._distance, frameState.fog.density) >
        CesiumMath.EPSILON3;
    colorCorrect = colorCorrect && (applyFog || showGroundAtmosphere);

    var applyBrightness = false;
    var applyContrast = false;
    var applyHue = false;
    var applySaturation = false;
    var applyGamma = false;
    var applyAlpha = false;
    var applyDayNightAlpha = false;
    var applySplit = false;
    var applyCutout = false;
    var applyColorToAlpha = false;

    while (numberOfDayTextures < maxTextures && imageryIndex < imageryLen) {
      var tileImagery = tileImageryCollection[imageryIndex];
      var imagery = tileImagery.readyImagery;
      ++imageryIndex;

      if (!defined(imagery) || imagery.imageryLayer.alpha === 0.0) {
        continue;
      }

      var texture = tileImagery.useWebMercatorT
        ? imagery.textureWebMercator
        : imagery.texture;

      //>>includeStart('debug', pragmas.debug);
      if (!defined(texture)) {
        // Our "ready" texture isn't actually ready.  This should never happen.
        //
        // Side note: It IS possible for it to not be in the READY ImageryState, though.
        // This can happen when a single imagery tile is shared by two terrain tiles (common)
        // and one of them (A) needs a geographic version of the tile because it is near the poles,
        // and the other (B) does not.  B can and will transition the imagery tile to the READY state
        // without reprojecting to geographic.  Then, later, A will deem that same tile not-ready-yet
        // because it only has the Web Mercator texture, and flip it back to the TRANSITIONING state.
        // The imagery tile won't be in the READY state anymore, but it's still READY enough for B's
        // purposes.
        throw new DeveloperError("readyImagery is not actually ready!");
      }
      //>>includeEnd('debug');

      var imageryLayer = imagery.imageryLayer;

      if (!defined(tileImagery.textureTranslationAndScale)) {
        tileImagery.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(
          tile,
          tileImagery
        );
      }

      uniformMapProperties.dayTextures[numberOfDayTextures] = texture;
      uniformMapProperties.dayTextureTranslationAndScale[numberOfDayTextures] =
        tileImagery.textureTranslationAndScale;
      uniformMapProperties.dayTextureTexCoordsRectangle[numberOfDayTextures] =
        tileImagery.textureCoordinateRectangle;
      uniformMapProperties.dayTextureUseWebMercatorT[numberOfDayTextures] =
        tileImagery.useWebMercatorT;

      uniformMapProperties.dayTextureAlpha[numberOfDayTextures] =
        imageryLayer.alpha;
      applyAlpha =
        applyAlpha ||
        uniformMapProperties.dayTextureAlpha[numberOfDayTextures] !== 1.0;

      uniformMapProperties.dayTextureNightAlpha[numberOfDayTextures] =
        imageryLayer.nightAlpha;
      applyDayNightAlpha =
        applyDayNightAlpha ||
        uniformMapProperties.dayTextureNightAlpha[numberOfDayTextures] !== 1.0;

      uniformMapProperties.dayTextureDayAlpha[numberOfDayTextures] =
        imageryLayer.dayAlpha;
      applyDayNightAlpha =
        applyDayNightAlpha ||
        uniformMapProperties.dayTextureDayAlpha[numberOfDayTextures] !== 1.0;

      uniformMapProperties.dayTextureBrightness[numberOfDayTextures] =
        imageryLayer.brightness;
      applyBrightness =
        applyBrightness ||
        uniformMapProperties.dayTextureBrightness[numberOfDayTextures] !==
          ImageryLayer.DEFAULT_BRIGHTNESS;

      uniformMapProperties.dayTextureContrast[numberOfDayTextures] =
        imageryLayer.contrast;
      applyContrast =
        applyContrast ||
        uniformMapProperties.dayTextureContrast[numberOfDayTextures] !==
          ImageryLayer.DEFAULT_CONTRAST;

      uniformMapProperties.dayTextureHue[numberOfDayTextures] =
        imageryLayer.hue;
      applyHue =
        applyHue ||
        uniformMapProperties.dayTextureHue[numberOfDayTextures] !==
          ImageryLayer.DEFAULT_HUE;

      uniformMapProperties.dayTextureSaturation[numberOfDayTextures] =
        imageryLayer.saturation;
      applySaturation =
        applySaturation ||
        uniformMapProperties.dayTextureSaturation[numberOfDayTextures] !==
          ImageryLayer.DEFAULT_SATURATION;

      uniformMapProperties.dayTextureOneOverGamma[numberOfDayTextures] =
        1.0 / imageryLayer.gamma;
      applyGamma =
        applyGamma ||
        uniformMapProperties.dayTextureOneOverGamma[numberOfDayTextures] !==
          1.0 / ImageryLayer.DEFAULT_GAMMA;

      uniformMapProperties.dayTextureSplit[numberOfDayTextures] =
        imageryLayer.splitDirection;
      applySplit =
        applySplit ||
        uniformMapProperties.dayTextureSplit[numberOfDayTextures] !== 0.0;

      // Update cutout rectangle
      var dayTextureCutoutRectangle =
        uniformMapProperties.dayTextureCutoutRectangles[numberOfDayTextures];
      if (!defined(dayTextureCutoutRectangle)) {
        dayTextureCutoutRectangle = uniformMapProperties.dayTextureCutoutRectangles[
          numberOfDayTextures
        ] = new Cartesian4();
      }

      Cartesian4.clone(Cartesian4.ZERO, dayTextureCutoutRectangle);
      if (defined(imageryLayer.cutoutRectangle)) {
        var cutoutRectangle = clipRectangleAntimeridian(
          cartographicTileRectangle,
          imageryLayer.cutoutRectangle
        );
        var intersection = Rectangle.simpleIntersection(
          cutoutRectangle,
          cartographicTileRectangle,
          rectangleIntersectionScratch
        );
        applyCutout = defined(intersection) || applyCutout;

        dayTextureCutoutRectangle.x =
          (cutoutRectangle.west - cartographicTileRectangle.west) *
          inverseTileWidth;
        dayTextureCutoutRectangle.y =
          (cutoutRectangle.south - cartographicTileRectangle.south) *
          inverseTileHeight;
        dayTextureCutoutRectangle.z =
          (cutoutRectangle.east - cartographicTileRectangle.west) *
          inverseTileWidth;
        dayTextureCutoutRectangle.w =
          (cutoutRectangle.north - cartographicTileRectangle.south) *
          inverseTileHeight;
      }

      // Update color to alpha
      var colorToAlpha =
        uniformMapProperties.colorsToAlpha[numberOfDayTextures];
      if (!defined(colorToAlpha)) {
        colorToAlpha = uniformMapProperties.colorsToAlpha[
          numberOfDayTextures
        ] = new Cartesian4();
      }

      var hasColorToAlpha =
        defined(imageryLayer.colorToAlpha) &&
        imageryLayer.colorToAlphaThreshold > 0.0;
      applyColorToAlpha = applyColorToAlpha || hasColorToAlpha;

      if (hasColorToAlpha) {
        var color = imageryLayer.colorToAlpha;
        colorToAlpha.x = color.red;
        colorToAlpha.y = color.green;
        colorToAlpha.z = color.blue;
        colorToAlpha.w = imageryLayer.colorToAlphaThreshold;
      } else {
        colorToAlpha.w = -1.0;
      }

      if (defined(imagery.credits)) {
        var credits = imagery.credits;
        for (
          var creditIndex = 0, creditLength = credits.length;
          creditIndex < creditLength;
          ++creditIndex
        ) {
          creditDisplay.addCredit(credits[creditIndex]);
        }
      }

      ++numberOfDayTextures;
    }

    // trim texture array to the used length so we don't end up using old textures
    // which might get destroyed eventually
    uniformMapProperties.dayTextures.length = numberOfDayTextures;
    uniformMapProperties.waterMask = waterMaskTexture;
    Cartesian4.clone(
      waterMaskTranslationAndScale,
      uniformMapProperties.waterMaskTranslationAndScale
    );

    uniformMapProperties.minMaxHeight.x = encoding.minimumHeight;
    uniformMapProperties.minMaxHeight.y = encoding.maximumHeight;
    Matrix4.clone(encoding.matrix, uniformMapProperties.scaleAndBias);

    // update clipping planes
    var clippingPlanes = tileProvider._clippingPlanes;
    var clippingPlanesEnabled =
      defined(clippingPlanes) && clippingPlanes.enabled && tile.isClipped;
    if (clippingPlanesEnabled) {
      uniformMapProperties.clippingPlanesEdgeColor = Color.clone(
        clippingPlanes.edgeColor,
        uniformMapProperties.clippingPlanesEdgeColor
      );
      uniformMapProperties.clippingPlanesEdgeWidth = clippingPlanes.edgeWidth;
    }

    surfaceShaderSetOptions.numberOfDayTextures = numberOfDayTextures;
    surfaceShaderSetOptions.applyBrightness = applyBrightness;
    surfaceShaderSetOptions.applyContrast = applyContrast;
    surfaceShaderSetOptions.applyHue = applyHue;
    surfaceShaderSetOptions.applySaturation = applySaturation;
    surfaceShaderSetOptions.applyGamma = applyGamma;
    surfaceShaderSetOptions.applyAlpha = applyAlpha;
    surfaceShaderSetOptions.applyDayNightAlpha = applyDayNightAlpha;
    surfaceShaderSetOptions.applySplit = applySplit;
    surfaceShaderSetOptions.enableFog = applyFog;
    surfaceShaderSetOptions.enableClippingPlanes = clippingPlanesEnabled;
    surfaceShaderSetOptions.clippingPlanes = clippingPlanes;
    surfaceShaderSetOptions.hasImageryLayerCutout = applyCutout;
    surfaceShaderSetOptions.colorCorrect = colorCorrect;
    surfaceShaderSetOptions.highlightFillTile = highlightFillTile;
    surfaceShaderSetOptions.colorToAlpha = applyColorToAlpha;
    surfaceShaderSetOptions.showUndergroundColor = showUndergroundColor;
    surfaceShaderSetOptions.translucent = translucent;

    var count = surfaceTile.renderedMesh.indices.length;
    if (!showSkirts) {
      count = surfaceTile.renderedMesh.indexCountWithoutSkirts;
    }

    command.shaderProgram = tileProvider._surfaceShaderSet.getShaderProgram(
      surfaceShaderSetOptions
    );
    command.castShadows = castShadows;
    command.receiveShadows = receiveShadows;
    command.renderState = renderState;
    command.primitiveType = PrimitiveType.TRIANGLES;
    command.vertexArray =
      surfaceTile.vertexArray || surfaceTile.fill.vertexArray;
    command.count = count;
    command.uniformMap = uniformMap;
    command.pass = Pass.GLOBE;

    if (tileProvider._debug.wireframe) {
      createWireframeVertexArrayIfNecessary(context, tileProvider, tile);
      if (defined(surfaceTile.wireframeVertexArray)) {
        command.vertexArray = surfaceTile.wireframeVertexArray;
        command.primitiveType = PrimitiveType.LINES;
        command.count = count * 2;
      }
    }

    var boundingVolume = command.boundingVolume;
    var orientedBoundingBox = command.orientedBoundingBox;

    if (frameState.mode !== SceneMode.SCENE3D) {
      BoundingSphere.fromRectangleWithHeights2D(
        tile.rectangle,
        frameState.mapProjection,
        tileBoundingRegion.minimumHeight,
        tileBoundingRegion.maximumHeight,
        boundingVolume
      );
      Cartesian3.fromElements(
        boundingVolume.center.z,
        boundingVolume.center.x,
        boundingVolume.center.y,
        boundingVolume.center
      );

      if (frameState.mode === SceneMode.MORPHING) {
        boundingVolume = BoundingSphere.union(
          tileBoundingRegion.boundingSphere,
          boundingVolume,
          boundingVolume
        );
      }
    } else {
      command.boundingVolume = BoundingSphere.clone(
        tileBoundingRegion.boundingSphere,
        boundingVolume
      );
      command.orientedBoundingBox = OrientedBoundingBox.clone(
        tileBoundingRegion.boundingVolume,
        orientedBoundingBox
      );
    }

    command.dirty = true;

    if (translucent) {
      globeTranslucencyState.updateDerivedCommands(command, frameState);
    }

    pushCommand(command, frameState);

    renderState = otherPassesRenderState;
    initialColor = otherPassesInitialColor;
  } while (imageryIndex < imageryLen);
}
export default GlobeSurfaceTileProvider;
