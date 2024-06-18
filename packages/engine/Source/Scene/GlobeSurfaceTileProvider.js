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
import VerticalExaggeration from "../Core/VerticalExaggeration.js";
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
import ClippingPolygonCollection from "./ClippingPolygonCollection.js";
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
  this.vertexShadowDarkness = 0.3;

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

  this.lambertDiffuseMultiplier = 0.0;

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

  this._removeLayerAddedListener = this._imageryLayers.layerAdded.addEventListener(
    GlobeSurfaceTileProvider.prototype._onLayerAdded,
    this
  );
  this._removeLayerRemovedListener = this._imageryLayers.layerRemoved.addEventListener(
    GlobeSurfaceTileProvider.prototype._onLayerRemoved,
    this
  );
  this._removeLayerMovedListener = this._imageryLayers.layerMoved.addEventListener(
    GlobeSurfaceTileProvider.prototype._onLayerMoved,
    this
  );
  this._removeLayerShownListener = this._imageryLayers.layerShownOrHidden.addEventListener(
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
   * A property specifying a {@link ClippingPolygonCollection} used to selectively disable rendering inside or outside a list of polygons.
   * @type {ClippingPolygonCollection}
   * @private
   */
  this._clippingPolygons = undefined;

  /**
   * A property specifying a {@link Rectangle} used to selectively limit terrain and imagery rendering.
   * @type {Rectangle}
   */
  this.cartographicLimitRectangle = Rectangle.clone(Rectangle.MAX_VALUE);

  this._hasLoadedTilesThisFrame = false;
  this._hasFillTilesThisFrame = false;

  this._oldVerticalExaggeration = undefined;
  this._oldVerticalExaggerationRelativeHeight = undefined;
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
   * Gets the tiling scheme used by the provider.
   * @memberof GlobeSurfaceTileProvider.prototype
   * @type {TilingScheme}
   */
  tilingScheme: {
    get: function () {
      if (!defined(this._terrainProvider)) {
        return undefined;
      }

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

      this._terrainProvider = terrainProvider;

      if (defined(this._quadtree)) {
        this._quadtree.invalidateAllTiles();
      }
    },
  },
  /**
   * The {@link ClippingPlaneCollection} used to selectively disable rendering.
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

  /**
   * The {@link ClippingPolygonCollection} used to selectively disable rendering inside or outside a list of polygons.
   *
   * @type {ClippingPolygonCollection}
   *
   * @private
   */
  clippingPolygons: {
    get: function () {
      return this._clippingPolygons;
    },
    set: function (value) {
      ClippingPolygonCollection.setOwner(value, this, "_clippingPolygons");
    },
  },
});

function sortTileImageryByLayerIndex(a, b) {
  let aImagery = a.loadingImagery;
  if (!defined(aImagery)) {
    aImagery = a.readyImagery;
  }

  let bImagery = b.loadingImagery;
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
  const creditDisplay = frameState.creditDisplay;
  const terrainProvider = surface._terrainProvider;
  if (defined(terrainProvider) && defined(terrainProvider.credit)) {
    creditDisplay.addCreditToNextFrame(terrainProvider.credit);
  }

  const imageryLayers = surface._imageryLayers;
  for (let i = 0, len = imageryLayers.length; i < len; ++i) {
    const layer = imageryLayers.get(i);
    if (layer.ready && layer.show && defined(layer.imageryProvider.credit)) {
      creditDisplay.addCreditToNextFrame(layer.imageryProvider.credit);
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

  const vertexArraysToDestroy = this._vertexArraysToDestroy;
  const length = vertexArraysToDestroy.length;
  for (let j = 0; j < length; ++j) {
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
  const tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
  for (let i = 0, len = tilesToRenderByTextureCount.length; i < len; ++i) {
    const tiles = tilesToRenderByTextureCount[i];
    if (defined(tiles)) {
      tiles.length = 0;
    }
  }
  // update clipping planes
  const clippingPlanes = this._clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    clippingPlanes.update(frameState);
  }

  // update clipping polygons
  const clippingPolygons = this._clippingPolygons;
  if (defined(clippingPolygons) && clippingPolygons.enabled) {
    clippingPolygons.update(frameState);
    clippingPolygons.queueCommands(frameState);
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

    let rs = clone(this._renderState, true);
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

  // When vertical exaggeration changes, all of the loaded tiles need to generate
  // geodetic surface normals so they can scale properly when rendered.
  // When exaggeration is reset, geodetic surface normals are removed to decrease
  // memory usage. Some tiles might have been constructed with the correct
  // exaggeration already, so skip over them.

  // If the geodetic surface normals can't be created because the tile doesn't
  // have a mesh, keep checking until the tile does have a mesh. This can happen
  // if the tile's mesh starts construction in a worker thread right before the
  // exaggeration changes.

  const quadtree = this.quadtree;
  const exaggeration = frameState.verticalExaggeration;
  const exaggerationRelativeHeight =
    frameState.verticalExaggerationRelativeHeight;
  const exaggerationChanged =
    this._oldVerticalExaggeration !== exaggeration ||
    this._oldVerticalExaggerationRelativeHeight !== exaggerationRelativeHeight;

  // Keep track of the next time there is a change in exaggeration
  this._oldVerticalExaggeration = exaggeration;
  this._oldVerticalExaggerationRelativeHeight = exaggerationRelativeHeight;

  if (exaggerationChanged) {
    quadtree.forEachLoadedTile(function (tile) {
      const surfaceTile = tile.data;
      surfaceTile.updateExaggeration(tile, frameState, quadtree);
    });
  }

  // Add the tile render commands to the command list, sorted by texture count.
  const tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
  for (
    let textureCountIndex = 0,
      textureCountLength = tilesToRenderByTextureCount.length;
    textureCountIndex < textureCountLength;
    ++textureCountIndex
  ) {
    const tilesToRender = tilesToRenderByTextureCount[textureCountIndex];
    if (!defined(tilesToRender)) {
      continue;
    }

    for (
      let tileIndex = 0, tileLength = tilesToRender.length;
      tileIndex < tileLength;
      ++tileIndex
    ) {
      const tile = tilesToRender[tileIndex];
      const tileBoundingRegion = tile.data.tileBoundingRegion;
      addDrawCommandsForTile(this, tile, frameState);
      frameState.minimumTerrainHeight = Math.min(
        frameState.minimumTerrainHeight,
        tileBoundingRegion.minimumHeight
      );
    }
  }
};

function pushCommand(command, frameState) {
  const globeTranslucencyState = frameState.globeTranslucencyState;
  if (globeTranslucencyState.translucent) {
    const isBlendCommand = command.renderState.blending.enabled;
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
  const drawCommands = this._drawCommands;
  for (let i = 0, length = this._usedDrawCommands; i < length; ++i) {
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
 * Gets the maximum geometric error allowed in a tile at a given level, in meters.
 *
 * @param {number} level The tile level for which to get the maximum geometric error.
 * @returns {number} The maximum geometric error in meters.
 */
GlobeSurfaceTileProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  if (!defined(this._terrainProvider)) {
    return 0;
  }

  return this._terrainProvider.getLevelMaximumGeometricError(level);
};

/**
 * Loads, or continues loading, a given tile.  This function will continue to be called
 * until {@link QuadtreeTile#state} is no longer {@link QuadtreeTileLoadState#LOADING}.
 *
 * @param {FrameState} frameState The frame state.
 * @param {QuadtreeTile} tile The tile to load.
 */
GlobeSurfaceTileProvider.prototype.loadTile = function (frameState, tile) {
  // We don't want to load imagery until we're certain that the terrain tiles are actually visible.
  // So if our bounding volume isn't accurate because it came from another tile, load terrain only
  // initially. If we load some terrain and suddenly have a more accurate bounding volume and the
  // tile is _still_ visible, give the tile a chance to load imagery immediately rather than
  // waiting for next frame.

  let surfaceTile = tile.data;
  let terrainOnly = true;
  let terrainStateBefore;
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
    this.quadtree,
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
        this.quadtree,
        this._vertexArraysToDestroy,
        terrainOnly
      );
    }
  }
};

const boundingSphereScratch = new BoundingSphere();
const rectangleIntersectionScratch = new Rectangle();
const splitCartographicLimitRectangleScratch = new Rectangle();
const rectangleCenterScratch = new Cartographic();

// cartographicLimitRectangle may span the IDL, but tiles never will.
function clipRectangleAntimeridian(tileRectangle, cartographicLimitRectangle) {
  if (cartographicLimitRectangle.west < cartographicLimitRectangle.east) {
    return cartographicLimitRectangle;
  }
  const splitRectangle = Rectangle.clone(
    cartographicLimitRectangle,
    splitCartographicLimitRectangleScratch
  );
  const tileCenter = Rectangle.center(tileRectangle, rectangleCenterScratch);
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

  const clippingPlanes = tileProvider._clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    return true;
  }

  const clippingPolygons = tileProvider._clippingPolygons;
  if (defined(clippingPolygons) && clippingPolygons.enabled) {
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
  const distance = this.computeDistanceToTile(tile, frameState);
  tile._distance = distance;

  const undergroundVisible = isUndergroundVisible(this, frameState);

  if (frameState.fog.enabled && !undergroundVisible) {
    if (CesiumMath.fog(distance, frameState.fog.density) >= 1.0) {
      // Tile is completely in fog so return that it is not visible.
      return Visibility.NONE;
    }
  }

  const surfaceTile = tile.data;
  const tileBoundingRegion = surfaceTile.tileBoundingRegion;

  if (surfaceTile.boundingVolumeSourceTile === undefined) {
    // We have no idea where this tile is, so let's just call it partially visible.
    return Visibility.PARTIAL;
  }

  const cullingVolume = frameState.cullingVolume;
  let boundingVolume = tileBoundingRegion.boundingVolume;

  if (!defined(boundingVolume)) {
    boundingVolume = tileBoundingRegion.boundingSphere;
  }

  // Check if the tile is outside the limit area in cartographic space
  surfaceTile.clippedByBoundaries = false;
  const clippedCartographicLimitRectangle = clipRectangleAntimeridian(
    tile.rectangle,
    this.cartographicLimitRectangle
  );
  const areaLimitIntersection = Rectangle.simpleIntersection(
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

  const clippingPlanes = this._clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    const planeIntersection = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    tile.isClipped = planeIntersection !== Intersect.INSIDE;
    if (planeIntersection === Intersect.OUTSIDE) {
      return Visibility.NONE;
    }
  }

  const clippingPolygons = this._clippingPolygons;
  if (defined(clippingPolygons) && clippingPolygons.enabled) {
    const polygonIntersection = clippingPolygons.computeIntersectionWithBoundingVolume(
      tileBoundingRegion
    );
    tile.isClipped = polygonIntersection !== Intersect.OUTSIDE;
    // Polygon clipping intersections are determined by outer rectangles, therefore we cannot
    // preemptively determine if a tile is completely clipped or not here.
  }

  let visibility;
  const intersection = cullingVolume.computeVisibility(boundingVolume);

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

  const ortho3D =
    frameState.mode === SceneMode.SCENE3D &&
    frameState.camera.frustum instanceof OrthographicFrustum;
  if (
    frameState.mode === SceneMode.SCENE3D &&
    !ortho3D &&
    defined(occluders) &&
    !undergroundVisible
  ) {
    const occludeePointInScaledSpace = surfaceTile.occludeePointInScaledSpace;
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
  const childAvailable = this.terrainProvider.getTileDataAvailable(
    tile.x * 2,
    tile.y * 2,
    tile.level + 1
  );
  return childAvailable !== undefined;
};

const readyImageryScratch = [];
const canRenderTraversalStack = [];

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
  const surfaceTile = tile.data;

  const readyImagery = readyImageryScratch;
  readyImagery.length = this._imageryLayers.length;

  let terrainReady = false;
  let initialImageryState = false;
  let imagery;

  if (defined(surfaceTile)) {
    // We can render even with non-ready terrain as long as all our rendered descendants
    // are missing terrain geometry too. i.e. if we rendered fills for more detailed tiles
    // last frame, it's ok to render a fill for this tile this frame.
    terrainReady = surfaceTile.terrainState === TerrainState.READY;

    // Initially assume all imagery layers are ready, unless imagery hasn't been initialized at all.
    initialImageryState = true;

    imagery = surfaceTile.imagery;
  }

  let i;
  let len;

  for (i = 0, len = readyImagery.length; i < len; ++i) {
    readyImagery[i] = initialImageryState;
  }

  if (defined(imagery)) {
    for (i = 0, len = imagery.length; i < len; ++i) {
      const tileImagery = imagery[i];
      const loadingImagery = tileImagery.loadingImagery;
      const isReady =
        !defined(loadingImagery) ||
        loadingImagery.state === ImageryState.FAILED ||
        loadingImagery.state === ImageryState.INVALID;
      const layerIndex = (
        tileImagery.loadingImagery || tileImagery.readyImagery
      ).imageryLayer._layerIndex;

      // For a layer to be ready, all tiles belonging to that layer must be ready.
      readyImagery[layerIndex] = isReady && readyImagery[layerIndex];
    }
  }

  const lastFrame = this.quadtree._lastSelectionFrameNumber;

  // Traverse the descendants looking for one with terrain or imagery that is not loaded on this tile.
  const stack = canRenderTraversalStack;
  stack.length = 0;
  stack.push(
    tile.southwestChild,
    tile.southeastChild,
    tile.northwestChild,
    tile.northeastChild
  );

  while (stack.length > 0) {
    const descendant = stack.pop();
    const lastFrameSelectionResult =
      descendant._lastSelectionResultFrame === lastFrame
        ? descendant._lastSelectionResult
        : TileSelectionResult.NONE;

    if (lastFrameSelectionResult === TileSelectionResult.RENDERED) {
      const descendantSurface = descendant.data;

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

      const descendantImagery = descendant.data.imagery;
      for (i = 0, len = descendantImagery.length; i < len; ++i) {
        const descendantTileImagery = descendantImagery[i];
        const descendantLoadingImagery = descendantTileImagery.loadingImagery;
        const descendantIsReady =
          !defined(descendantLoadingImagery) ||
          descendantLoadingImagery.state === ImageryState.FAILED ||
          descendantLoadingImagery.state === ImageryState.INVALID;
        const descendantLayerIndex = (
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

const tileDirectionScratch = new Cartesian3();

/**
 * Determines the priority for loading this tile. Lower priority values load sooner.
 * @param {QuadtreeTile} tile The tile.
 * @param {FrameState} frameState The frame state.
 * @returns {number} The load priority value.
 */
GlobeSurfaceTileProvider.prototype.computeTileLoadPriority = function (
  tile,
  frameState
) {
  const surfaceTile = tile.data;
  if (surfaceTile === undefined) {
    return 0.0;
  }

  const obb = surfaceTile.tileBoundingRegion.boundingVolume;
  if (obb === undefined) {
    return 0.0;
  }

  const cameraPosition = frameState.camera.positionWC;
  const cameraDirection = frameState.camera.directionWC;
  const tileDirection = Cartesian3.subtract(
    obb.center,
    cameraPosition,
    tileDirectionScratch
  );
  const magnitude = Cartesian3.magnitude(tileDirection);
  if (magnitude < CesiumMath.EPSILON5) {
    return 0.0;
  }
  Cartesian3.divideByScalar(tileDirection, magnitude, tileDirection);
  return (
    (1.0 - Cartesian3.dot(tileDirection, cameraDirection)) * tile._distance
  );
};

const modifiedModelViewScratch = new Matrix4();
const modifiedModelViewProjectionScratch = new Matrix4();
const tileRectangleScratch = new Cartesian4();
const localizedCartographicLimitRectangleScratch = new Cartesian4();
const localizedTranslucencyRectangleScratch = new Cartesian4();
const rtcScratch = new Cartesian3();
const centerEyeScratch = new Cartesian3();
const southwestScratch = new Cartesian3();
const northeastScratch = new Cartesian3();

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
  let readyTextureCount = 0;
  const tileImageryCollection = tile.data.imagery;
  for (let i = 0, len = tileImageryCollection.length; i < len; ++i) {
    const tileImagery = tileImageryCollection[i];
    if (
      defined(tileImagery.readyImagery) &&
      tileImagery.readyImagery.imageryLayer.alpha !== 0.0
    ) {
      ++readyTextureCount;
    }
  }

  let tileSet = this._tilesToRenderByTextureCount[readyTextureCount];
  if (!defined(tileSet)) {
    tileSet = [];
    this._tilesToRenderByTextureCount[readyTextureCount] = tileSet;
  }

  tileSet.push(tile);

  const surfaceTile = tile.data;
  if (!defined(surfaceTile.vertexArray)) {
    this._hasFillTilesThisFrame = true;
  } else {
    this._hasLoadedTilesThisFrame = true;
  }

  const debug = this._debug;
  ++debug.tilesRendered;
  debug.texturesRendered += readyTextureCount;
};

const cornerPositionsScratch = [
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
  const ellipsoidalOccluder = tileProvider.quadtree._occluders.ellipsoid;
  const ellipsoid = ellipsoidalOccluder.ellipsoid;

  const cornerPositions = cornerPositionsScratch;
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
 * @returns {number} The distance from the camera to the closest point on the tile, in meters.
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

  const surfaceTile = tile.data;
  const boundingVolumeSourceTile = surfaceTile.boundingVolumeSourceTile;
  if (boundingVolumeSourceTile === undefined) {
    // Can't find any min/max heights anywhere? Ok, let's just say the
    // tile is really far away so we'll load and render it rather than
    // refining.
    return 9999999999.0;
  }

  const tileBoundingRegion = surfaceTile.tileBoundingRegion;
  const min = tileBoundingRegion.minimumHeight;
  const max = tileBoundingRegion.maximumHeight;

  if (surfaceTile.boundingVolumeSourceTile !== tile) {
    const cameraHeight = frameState.camera.positionCartographic.height;
    const distanceToMin = Math.abs(cameraHeight - min);
    const distanceToMax = Math.abs(cameraHeight - max);
    if (distanceToMin > distanceToMax) {
      tileBoundingRegion.minimumHeight = min;
      tileBoundingRegion.maximumHeight = min;
    } else {
      tileBoundingRegion.minimumHeight = max;
      tileBoundingRegion.maximumHeight = max;
    }
  }

  const result = tileBoundingRegion.distanceToCamera(frameState);

  tileBoundingRegion.minimumHeight = min;
  tileBoundingRegion.maximumHeight = max;

  return result;
};

function updateTileBoundingRegion(tile, tileProvider, frameState) {
  let surfaceTile = tile.data;
  if (surfaceTile === undefined) {
    surfaceTile = tile.data = new GlobeSurfaceTile();
  }

  const ellipsoid = tile.tilingScheme.ellipsoid;
  if (surfaceTile.tileBoundingRegion === undefined) {
    surfaceTile.tileBoundingRegion = new TileBoundingRegion({
      computeBoundingVolumes: false,
      rectangle: tile.rectangle,
      ellipsoid: ellipsoid,
      minimumHeight: 0.0,
      maximumHeight: 0.0,
    });
  }

  const tileBoundingRegion = surfaceTile.tileBoundingRegion;
  const oldMinimumHeight = tileBoundingRegion.minimumHeight;
  const oldMaximumHeight = tileBoundingRegion.maximumHeight;
  let hasBoundingVolumesFromMesh = false;
  let sourceTile = tile;

  // Get min and max heights from the mesh.
  // If the mesh is not available, get them from the terrain data.
  // If the terrain data is not available either, get them from an ancestor.
  // If none of the ancestors are available, then there are no min and max heights for this tile at this time.
  const mesh = surfaceTile.mesh;
  const terrainData = surfaceTile.terrainData;
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

    let ancestorTile = tile.parent;
    while (ancestorTile !== undefined) {
      const ancestorSurfaceTile = ancestorTile.data;
      if (ancestorSurfaceTile !== undefined) {
        const ancestorMesh = ancestorSurfaceTile.mesh;
        const ancestorTerrainData = ancestorSurfaceTile.terrainData;
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
    const exaggeration = frameState.verticalExaggeration;
    const exaggerationRelativeHeight =
      frameState.verticalExaggerationRelativeHeight;
    const hasExaggeration = exaggeration !== 1.0;
    if (hasExaggeration) {
      hasBoundingVolumesFromMesh = false;
      tileBoundingRegion.minimumHeight = VerticalExaggeration.getHeight(
        tileBoundingRegion.minimumHeight,
        exaggeration,
        exaggerationRelativeHeight
      );
      tileBoundingRegion.maximumHeight = VerticalExaggeration.getHeight(
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
      const needsBounds =
        tileBoundingRegion._orientedBoundingBox === undefined ||
        tileBoundingRegion._boundingSphere === undefined;
      const heightChanged =
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
 * @returns {boolean} True if this object was destroyed; otherwise, false.
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
  this._clippingPolygons =
    this._clippingPolygons && this._clippingPolygons.destroy();
  this._removeLayerAddedListener =
    this._removeLayerAddedListener && this._removeLayerAddedListener();
  this._removeLayerRemovedListener =
    this._removeLayerRemovedListener && this._removeLayerRemovedListener();
  this._removeLayerMovedListener =
    this._removeLayerMovedListener && this._removeLayerMovedListener();
  this._removeLayerShownListener =
    this._removeLayerShownListener && this._removeLayerShownListener();

  return destroyObject(this);
};

function getTileReadyCallback(tileImageriesToFree, layer, terrainProvider) {
  return function (tile) {
    let tileImagery;
    let imagery;
    let startIndex = -1;
    const tileImageryCollection = tile.data.imagery;
    const length = tileImageryCollection.length;
    let i;
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
      const endIndex = startIndex + tileImageriesToFree;
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
  if (this.isDestroyed()) {
    return;
  }

  if (layer.show) {
    const terrainProvider = this._terrainProvider;

    const that = this;
    const tileImageryUpdatedEvent = this._imageryLayersUpdatedEvent;
    const reloadFunction = function () {
      // Clear the layer's cache
      layer._imageryCache = {};

      that._quadtree.forEachLoadedTile(function (tile) {
        // If this layer is still waiting to for the loaded callback, just return
        if (defined(tile._loadedCallbacks[layer._layerIndex])) {
          return;
        }

        let i;

        // Figure out how many TileImageries we will need to remove and where to insert new ones
        const tileImageryCollection = tile.data.imagery;
        const length = tileImageryCollection.length;
        let startIndex = -1;
        let tileImageriesToFree = 0;
        for (i = 0; i < length; ++i) {
          const tileImagery = tileImageryCollection[i];
          const imagery = defaultValue(
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
        const insertionPoint = startIndex + tileImageriesToFree;

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

    if (layer.ready) {
      const imageryProvider = layer.imageryProvider;
      imageryProvider._reload = reloadFunction;
    }

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
    const tileImageryCollection = tile.data.imagery;

    let startIndex = -1;
    let numDestroyed = 0;
    for (let i = 0, len = tileImageryCollection.length; i < len; ++i) {
      const tileImagery = tileImageryCollection[i];
      let imagery = tileImagery.loadingImagery;
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

const scratchClippingPlanesMatrix = new Matrix4();
const scratchInverseTransposeClippingPlanesMatrix = new Matrix4();
function createTileUniformMap(frameState, globeSurfaceTileProvider) {
  const uniformMap = {
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
    u_atmosphereLightIntensity: function () {
      return this.properties.atmosphereLightIntensity;
    },
    u_atmosphereRayleighCoefficient: function () {
      return this.properties.atmosphereRayleighCoefficient;
    },
    u_atmosphereMieCoefficient: function () {
      return this.properties.atmosphereMieCoefficient;
    },
    u_atmosphereRayleighScaleHeight: function () {
      return this.properties.atmosphereRayleighScaleHeight;
    },
    u_atmosphereMieScaleHeight: function () {
      return this.properties.atmosphereMieScaleHeight;
    },
    u_atmosphereMieAnisotropy: function () {
      return this.properties.atmosphereMieAnisotropy;
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
    u_verticalExaggerationAndRelativeHeight: function () {
      return this.properties.verticalExaggerationAndRelativeHeight;
    },
    u_tileRectangle: function () {
      return this.properties.tileRectangle;
    },
    u_modifiedModelView: function () {
      const viewMatrix = frameState.context.uniformState.view;
      const centerEye = Matrix4.multiplyByPoint(
        viewMatrix,
        this.properties.rtc,
        centerEyeScratch
      );
      Matrix4.setTranslation(viewMatrix, centerEye, modifiedModelViewScratch);
      return modifiedModelViewScratch;
    },
    u_modifiedModelViewProjection: function () {
      const viewMatrix = frameState.context.uniformState.view;
      const projectionMatrix = frameState.context.uniformState.projection;
      const centerEye = Matrix4.multiplyByPoint(
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
      const clippingPlanes = globeSurfaceTileProvider._clippingPlanes;
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
      const clippingPlanes = globeSurfaceTileProvider._clippingPlanes;
      const transform = defined(clippingPlanes)
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
      const style = this.properties.clippingPlanesEdgeColor;
      style.alpha = this.properties.clippingPlanesEdgeWidth;
      return style;
    },
    u_clippingDistance: function () {
      const texture =
        globeSurfaceTileProvider._clippingPolygons.clippingTexture;
      if (defined(texture)) {
        return texture;
      }
      return frameState.context.defaultTexture;
    },
    u_clippingExtents: function () {
      const texture = globeSurfaceTileProvider._clippingPolygons.extentsTexture;
      if (defined(texture)) {
        return texture;
      }
      return frameState.context.defaultTexture;
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
    u_lambertDiffuseMultiplier: function () {
      return this.properties.lambertDiffuseMultiplier;
    },
    u_vertexShadowDarkness: function () {
      return this.properties.vertexShadowDarkness;
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
      atmosphereLightIntensity: 10.0,
      atmosphereRayleighCoefficient: new Cartesian3(5.5e-6, 13.0e-6, 28.4e-6),
      atmosphereMieCoefficient: new Cartesian3(21e-6, 21e-6, 21e-6),
      atmosphereRayleighScaleHeight: 10000.0,
      atmosphereMieScaleHeight: 3200.0,
      atmosphereMieAnisotropy: 0.9,
      hsbShift: new Cartesian3(),

      center3D: undefined,
      rtc: new Cartesian3(),
      modifiedModelView: new Matrix4(),
      tileRectangle: new Cartesian4(),

      verticalExaggerationAndRelativeHeight: new Cartesian2(1.0, 0.0),

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
      lambertDiffuseMultiplier: 0.0,
      vertexShadowDarkness: 0.0,
    },
  };

  if (defined(globeSurfaceTileProvider.materialUniformMap)) {
    return combine(uniformMap, globeSurfaceTileProvider.materialUniformMap);
  }

  return uniformMap;
}

function createWireframeVertexArrayIfNecessary(context, provider, tile) {
  const surfaceTile = tile.data;

  let mesh;
  let vertexArray;

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
  const indices = terrainMesh.indices;

  const geometry = {
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
  };

  GeometryPipeline.toWireframe(geometry);

  const wireframeIndices = geometry.indices;
  const wireframeIndexBuffer = Buffer.createIndexBuffer({
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

let getDebugOrientedBoundingBox;
let getDebugBoundingSphere;
let debugDestroyPrimitive;

(function () {
  const instanceOBB = new GeometryInstance({
    geometry: BoxOutlineGeometry.fromDimensions({
      dimensions: new Cartesian3(2.0, 2.0, 2.0),
    }),
  });
  const instanceSphere = new GeometryInstance({
    geometry: new SphereOutlineGeometry({ radius: 1.0 }),
  });
  let modelMatrix = new Matrix4();
  let previousVolume;
  let primitive;

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

const otherPassesInitialColor = new Cartesian4(0.0, 0.0, 0.0, 0.0);
const surfaceShaderSetOptionsScratch = {
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
  enableClippingPolygons: undefined,
  clippingPolygons: undefined,
  clippedByBoundaries: undefined,
  hasImageryLayerCutout: undefined,
  colorCorrect: undefined,
  colorToAlpha: undefined,
  hasGeodeticSurfaceNormals: undefined,
  hasExaggeration: undefined,
};

const defaultUndergroundColor = Color.TRANSPARENT;
const defaultUndergroundColorAlphaByDistance = new NearFarScalar();

function addDrawCommandsForTile(tileProvider, tile, frameState) {
  const surfaceTile = tile.data;

  if (!defined(surfaceTile.vertexArray)) {
    if (surfaceTile.fill === undefined) {
      // No fill was created for this tile, probably because this tile is not connected to
      // any renderable tiles. So create a simple tile in the middle of the tile's possible
      // height range.
      surfaceTile.fill = new TerrainFillMesh(tile);
    }
    surfaceTile.fill.update(tileProvider, frameState);
  }

  const creditDisplay = frameState.creditDisplay;

  const terrainData = surfaceTile.terrainData;
  if (defined(terrainData) && defined(terrainData.credits)) {
    const tileCredits = terrainData.credits;
    for (
      let tileCreditIndex = 0, tileCreditLength = tileCredits.length;
      tileCreditIndex < tileCreditLength;
      ++tileCreditIndex
    ) {
      creditDisplay.addCreditToNextFrame(tileCredits[tileCreditIndex]);
    }
  }

  let maxTextures = ContextLimits.maximumTextureImageUnits;

  let waterMaskTexture = surfaceTile.waterMaskTexture;
  let waterMaskTranslationAndScale = surfaceTile.waterMaskTranslationAndScale;
  if (!defined(waterMaskTexture) && defined(surfaceTile.fill)) {
    waterMaskTexture = surfaceTile.fill.waterMaskTexture;
    waterMaskTranslationAndScale =
      surfaceTile.fill.waterMaskTranslationAndScale;
  }

  const cameraUnderground = frameState.cameraUnderground;

  const globeTranslucencyState = frameState.globeTranslucencyState;
  const translucent = globeTranslucencyState.translucent;
  const frontFaceAlphaByDistance =
    globeTranslucencyState.frontFaceAlphaByDistance;
  const backFaceAlphaByDistance =
    globeTranslucencyState.backFaceAlphaByDistance;
  const translucencyRectangle = globeTranslucencyState.rectangle;

  const undergroundColor = defaultValue(
    tileProvider.undergroundColor,
    defaultUndergroundColor
  );
  const undergroundColorAlphaByDistance = defaultValue(
    tileProvider.undergroundColorAlphaByDistance,
    defaultUndergroundColorAlphaByDistance
  );
  const showUndergroundColor =
    isUndergroundVisible(tileProvider, frameState) &&
    frameState.mode === SceneMode.SCENE3D &&
    undergroundColor.alpha > 0.0 &&
    (undergroundColorAlphaByDistance.nearValue > 0.0 ||
      undergroundColorAlphaByDistance.farValue > 0.0);

  const lambertDiffuseMultiplier = tileProvider.lambertDiffuseMultiplier;
  const vertexShadowDarkness = tileProvider.vertexShadowDarkness;

  const showReflectiveOcean =
    tileProvider.hasWaterMask && defined(waterMaskTexture);
  const oceanNormalMap = tileProvider.oceanNormalMap;
  const showOceanWaves = showReflectiveOcean && defined(oceanNormalMap);
  const terrainProvider = tileProvider.terrainProvider;
  const hasVertexNormals =
    defined(terrainProvider) && tileProvider.terrainProvider.hasVertexNormals;
  const enableFog =
    frameState.fog.enabled && frameState.fog.renderable && !cameraUnderground;
  const showGroundAtmosphere =
    tileProvider.showGroundAtmosphere && frameState.mode === SceneMode.SCENE3D;
  const castShadows =
    ShadowMode.castShadows(tileProvider.shadows) && !translucent;
  const receiveShadows =
    ShadowMode.receiveShadows(tileProvider.shadows) && !translucent;

  const hueShift = tileProvider.hueShift;
  const saturationShift = tileProvider.saturationShift;
  const brightnessShift = tileProvider.brightnessShift;

  let colorCorrect = !(
    CesiumMath.equalsEpsilon(hueShift, 0.0, CesiumMath.EPSILON7) &&
    CesiumMath.equalsEpsilon(saturationShift, 0.0, CesiumMath.EPSILON7) &&
    CesiumMath.equalsEpsilon(brightnessShift, 0.0, CesiumMath.EPSILON7)
  );

  let perFragmentGroundAtmosphere = false;
  if (showGroundAtmosphere) {
    const cameraDistance = Cartesian3.magnitude(frameState.camera.positionWC);
    const fadeOutDistance = tileProvider.nightFadeOutDistance;
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
  if (
    defined(tileProvider.clippingPolygons) &&
    tileProvider.clippingPolygons.enabled
  ) {
    --maxTextures;
    --maxTextures;
  }

  maxTextures -= globeTranslucencyState.numberOfTextureUniforms;

  const mesh = surfaceTile.renderedMesh;
  let rtc = mesh.center;
  const encoding = mesh.encoding;
  const tileBoundingRegion = surfaceTile.tileBoundingRegion;

  const exaggeration = frameState.verticalExaggeration;
  const exaggerationRelativeHeight =
    frameState.verticalExaggerationRelativeHeight;
  const hasExaggeration = exaggeration !== 1.0;
  const hasGeodeticSurfaceNormals = encoding.hasGeodeticSurfaceNormals;

  // Not used in 3D.
  const tileRectangle = tileRectangleScratch;

  // Only used for Mercator projections.
  let southLatitude = 0.0;
  let northLatitude = 0.0;
  let southMercatorY = 0.0;
  let oneOverMercatorHeight = 0.0;

  let useWebMercatorProjection = false;

  if (frameState.mode !== SceneMode.SCENE3D) {
    const projection = frameState.mapProjection;
    const southwest = projection.project(
      Rectangle.southwest(tile.rectangle),
      southwestScratch
    );
    const northeast = projection.project(
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
      const epsilon = (1.0 / (Math.pow(2.0, 12.0) - 1.0)) * 0.5;
      const widthEpsilon = (tileRectangle.z - tileRectangle.x) * epsilon;
      const heightEpsilon = (tileRectangle.w - tileRectangle.y) * epsilon;
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

  const surfaceShaderSetOptions = surfaceShaderSetOptionsScratch;
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
  surfaceShaderSetOptions.atmosphereLightIntensity =
    tileProvider.atmosphereLightIntensity;
  surfaceShaderSetOptions.atmosphereRayleighCoefficient =
    tileProvider.atmosphereRayleighCoefficient;
  surfaceShaderSetOptions.atmosphereMieCoefficient =
    tileProvider.atmosphereMieCoefficient;
  surfaceShaderSetOptions.atmosphereRayleighScaleHeight =
    tileProvider.atmosphereRayleighScaleHeight;
  surfaceShaderSetOptions.atmosphereMieScaleHeight =
    tileProvider.atmosphereMieScaleHeight;
  surfaceShaderSetOptions.atmosphereMieAnisotropy =
    tileProvider.atmosphereMieAnisotropy;
  surfaceShaderSetOptions.perFragmentGroundAtmosphere = perFragmentGroundAtmosphere;
  surfaceShaderSetOptions.hasVertexNormals = hasVertexNormals;
  surfaceShaderSetOptions.useWebMercatorProjection = useWebMercatorProjection;
  surfaceShaderSetOptions.clippedByBoundaries = surfaceTile.clippedByBoundaries;
  surfaceShaderSetOptions.hasGeodeticSurfaceNormals = hasGeodeticSurfaceNormals;
  surfaceShaderSetOptions.hasExaggeration = hasExaggeration;

  const tileImageryCollection = surfaceTile.imagery;
  let imageryIndex = 0;
  const imageryLen = tileImageryCollection.length;

  const showSkirts =
    tileProvider.showSkirts && !cameraUnderground && !translucent;
  const backFaceCulling =
    tileProvider.backFaceCulling && !cameraUnderground && !translucent;
  const firstPassRenderState = backFaceCulling
    ? tileProvider._renderState
    : tileProvider._disableCullingRenderState;
  const otherPassesRenderState = backFaceCulling
    ? tileProvider._blendRenderState
    : tileProvider._disableCullingBlendRenderState;
  let renderState = firstPassRenderState;

  let initialColor = tileProvider._firstPassInitialColor;

  const context = frameState.context;

  if (!defined(tileProvider._debug.boundingSphereTile)) {
    debugDestroyPrimitive();
  }

  const materialUniformMapChanged =
    tileProvider._materialUniformMap !== tileProvider.materialUniformMap;
  if (materialUniformMapChanged) {
    tileProvider._materialUniformMap = tileProvider.materialUniformMap;
    const drawCommandsLength = tileProvider._drawCommands.length;
    for (let i = 0; i < drawCommandsLength; ++i) {
      tileProvider._uniformMaps[i] = createTileUniformMap(
        frameState,
        tileProvider
      );
    }
  }

  do {
    let numberOfDayTextures = 0;

    let command;
    let uniformMap;

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
      const obb = tileBoundingRegion.boundingVolume;
      const boundingSphere = tileBoundingRegion.boundingSphere;
      // If a debug primitive already exists for this tile, it will not be
      // re-created, to avoid allocation every frame. If it were possible
      // to have more than one selected tile, this would have to change.
      if (defined(obb)) {
        getDebugOrientedBoundingBox(obb, Color.RED).update(frameState);
      } else if (defined(boundingSphere)) {
        getDebugBoundingSphere(boundingSphere, Color.RED).update(frameState);
      }
    }

    const uniformMapProperties = uniformMap.properties;
    Cartesian4.clone(initialColor, uniformMapProperties.initialColor);
    uniformMapProperties.oceanNormalMap = oceanNormalMap;
    uniformMapProperties.lightingFadeDistance.x =
      tileProvider.lightingFadeOutDistance;
    uniformMapProperties.lightingFadeDistance.y =
      tileProvider.lightingFadeInDistance;
    uniformMapProperties.nightFadeDistance.x =
      tileProvider.nightFadeOutDistance;
    uniformMapProperties.nightFadeDistance.y = tileProvider.nightFadeInDistance;
    uniformMapProperties.atmosphereLightIntensity =
      tileProvider.atmosphereLightIntensity;
    uniformMapProperties.atmosphereRayleighCoefficient =
      tileProvider.atmosphereRayleighCoefficient;
    uniformMapProperties.atmosphereMieCoefficient =
      tileProvider.atmosphereMieCoefficient;
    uniformMapProperties.atmosphereRayleighScaleHeight =
      tileProvider.atmosphereRayleighScaleHeight;
    uniformMapProperties.atmosphereMieScaleHeight =
      tileProvider.atmosphereMieScaleHeight;
    uniformMapProperties.atmosphereMieAnisotropy =
      tileProvider.atmosphereMieAnisotropy;
    uniformMapProperties.zoomedOutOceanSpecularIntensity =
      tileProvider.zoomedOutOceanSpecularIntensity;

    const frontFaceAlphaByDistanceFinal = cameraUnderground
      ? backFaceAlphaByDistance
      : frontFaceAlphaByDistance;
    const backFaceAlphaByDistanceFinal = cameraUnderground
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

    uniformMapProperties.lambertDiffuseMultiplier = lambertDiffuseMultiplier;
    uniformMapProperties.vertexShadowDarkness = vertexShadowDarkness;

    const highlightFillTile =
      !defined(surfaceTile.vertexArray) &&
      defined(tileProvider.fillHighlightColor) &&
      tileProvider.fillHighlightColor.alpha > 0.0;
    if (highlightFillTile) {
      Color.clone(
        tileProvider.fillHighlightColor,
        uniformMapProperties.fillHighlightColor
      );
    }

    uniformMapProperties.verticalExaggerationAndRelativeHeight.x = exaggeration;
    uniformMapProperties.verticalExaggerationAndRelativeHeight.y = exaggerationRelativeHeight;

    uniformMapProperties.center3D = mesh.center;
    Cartesian3.clone(rtc, uniformMapProperties.rtc);

    Cartesian4.clone(tileRectangle, uniformMapProperties.tileRectangle);
    uniformMapProperties.southAndNorthLatitude.x = southLatitude;
    uniformMapProperties.southAndNorthLatitude.y = northLatitude;
    uniformMapProperties.southMercatorYAndOneOverHeight.x = southMercatorY;
    uniformMapProperties.southMercatorYAndOneOverHeight.y = oneOverMercatorHeight;

    // Convert tile limiter rectangle from cartographic to texture space using the tileRectangle.
    const localizedCartographicLimitRectangle = localizedCartographicLimitRectangleScratch;
    const cartographicLimitRectangle = clipRectangleAntimeridian(
      tile.rectangle,
      tileProvider.cartographicLimitRectangle
    );

    const localizedTranslucencyRectangle = localizedTranslucencyRectangleScratch;
    const clippedTranslucencyRectangle = clipRectangleAntimeridian(
      tile.rectangle,
      translucencyRectangle
    );

    Cartesian3.fromElements(
      hueShift,
      saturationShift,
      brightnessShift,
      uniformMapProperties.hsbShift
    );

    const cartographicTileRectangle = tile.rectangle;
    const inverseTileWidth = 1.0 / cartographicTileRectangle.width;
    const inverseTileHeight = 1.0 / cartographicTileRectangle.height;
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

    // For performance, render fog only when fog is enabled and the effect of
    // fog would be non-negligible. This prevents the shader from running when
    // the camera is in space, for example.
    const applyFog =
      enableFog &&
      CesiumMath.fog(tile._distance, frameState.fog.density) >
        CesiumMath.EPSILON3;
    colorCorrect = colorCorrect && (applyFog || showGroundAtmosphere);

    let applyBrightness = false;
    let applyContrast = false;
    let applyHue = false;
    let applySaturation = false;
    let applyGamma = false;
    let applyAlpha = false;
    let applyDayNightAlpha = false;
    let applySplit = false;
    let applyCutout = false;
    let applyColorToAlpha = false;

    while (numberOfDayTextures < maxTextures && imageryIndex < imageryLen) {
      const tileImagery = tileImageryCollection[imageryIndex];
      const imagery = tileImagery.readyImagery;
      ++imageryIndex;

      if (!defined(imagery) || imagery.imageryLayer.alpha === 0.0) {
        continue;
      }

      const texture = tileImagery.useWebMercatorT
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

      const imageryLayer = imagery.imageryLayer;

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
      let dayTextureCutoutRectangle =
        uniformMapProperties.dayTextureCutoutRectangles[numberOfDayTextures];
      if (!defined(dayTextureCutoutRectangle)) {
        dayTextureCutoutRectangle = uniformMapProperties.dayTextureCutoutRectangles[
          numberOfDayTextures
        ] = new Cartesian4();
      }

      Cartesian4.clone(Cartesian4.ZERO, dayTextureCutoutRectangle);
      if (defined(imageryLayer.cutoutRectangle)) {
        const cutoutRectangle = clipRectangleAntimeridian(
          cartographicTileRectangle,
          imageryLayer.cutoutRectangle
        );
        const intersection = Rectangle.simpleIntersection(
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
      let colorToAlpha =
        uniformMapProperties.colorsToAlpha[numberOfDayTextures];
      if (!defined(colorToAlpha)) {
        colorToAlpha = uniformMapProperties.colorsToAlpha[
          numberOfDayTextures
        ] = new Cartesian4();
      }

      const hasColorToAlpha =
        defined(imageryLayer.colorToAlpha) &&
        imageryLayer.colorToAlphaThreshold > 0.0;
      applyColorToAlpha = applyColorToAlpha || hasColorToAlpha;

      if (hasColorToAlpha) {
        const color = imageryLayer.colorToAlpha;
        colorToAlpha.x = color.red;
        colorToAlpha.y = color.green;
        colorToAlpha.z = color.blue;
        colorToAlpha.w = imageryLayer.colorToAlphaThreshold;
      } else {
        colorToAlpha.w = -1.0;
      }

      if (defined(imagery.credits)) {
        const credits = imagery.credits;
        for (
          let creditIndex = 0, creditLength = credits.length;
          creditIndex < creditLength;
          ++creditIndex
        ) {
          creditDisplay.addCreditToNextFrame(credits[creditIndex]);
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
    const clippingPlanes = tileProvider._clippingPlanes;
    const clippingPlanesEnabled =
      defined(clippingPlanes) && clippingPlanes.enabled && tile.isClipped;
    if (clippingPlanesEnabled) {
      uniformMapProperties.clippingPlanesEdgeColor = Color.clone(
        clippingPlanes.edgeColor,
        uniformMapProperties.clippingPlanesEdgeColor
      );
      uniformMapProperties.clippingPlanesEdgeWidth = clippingPlanes.edgeWidth;
    }

    // update clipping polygons
    const clippingPolygons = tileProvider._clippingPolygons;
    const clippingPolygonsEnabled =
      defined(clippingPolygons) && clippingPolygons.enabled && tile.isClipped;

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
    surfaceShaderSetOptions.enableClippingPolygons = clippingPolygonsEnabled;
    surfaceShaderSetOptions.clippingPolygons = clippingPolygons;
    surfaceShaderSetOptions.hasImageryLayerCutout = applyCutout;
    surfaceShaderSetOptions.colorCorrect = colorCorrect;
    surfaceShaderSetOptions.highlightFillTile = highlightFillTile;
    surfaceShaderSetOptions.colorToAlpha = applyColorToAlpha;
    surfaceShaderSetOptions.showUndergroundColor = showUndergroundColor;
    surfaceShaderSetOptions.translucent = translucent;

    let count = surfaceTile.renderedMesh.indices.length;
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

    let boundingVolume = command.boundingVolume;
    const orientedBoundingBox = command.orientedBoundingBox;

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
