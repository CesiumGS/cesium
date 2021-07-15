import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import defined from "../Core/defined.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import IntersectionTests from "../Core/IntersectionTests.js";
import PixelFormat from "../Core/PixelFormat.js";
import Ray from "../Core/Ray.js";
import Request from "../Core/Request.js";
import RequestState from "../Core/RequestState.js";
import RequestType from "../Core/RequestType.js";
import TerrainEncoding from "../Core/TerrainEncoding.js";
import TileProviderError from "../Core/TileProviderError.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import VertexArray from "../Renderer/VertexArray.js";
import when from "../ThirdPartyNpm/when.js";
import ImageryState from "./ImageryState.js";
import QuadtreeTileLoadState from "./QuadtreeTileLoadState.js";
import SceneMode from "./SceneMode.js";
import TerrainState from "./TerrainState.js";

/**
 * Contains additional information about a {@link QuadtreeTile} of the globe's surface, and
 * encapsulates state transition logic for loading tiles.
 *
 * @constructor
 * @alias GlobeSurfaceTile
 * @private
 */
function GlobeSurfaceTile() {
  /**
   * The {@link TileImagery} attached to this tile.
   * @type {TileImagery[]}
   * @default []
   */
  this.imagery = [];

  this.waterMaskTexture = undefined;
  this.waterMaskTranslationAndScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

  this.terrainData = undefined;
  this.vertexArray = undefined;

  /**
   * A bounding region used to estimate distance to the tile. The horizontal bounds are always tight-fitting,
   * but the `minimumHeight` and `maximumHeight` properties may be derived from the min/max of an ancestor tile
   * and be quite loose-fitting and thus very poor for estimating distance.
   * @type {TileBoundingRegion}
   */
  this.tileBoundingRegion = undefined;
  this.occludeePointInScaledSpace = new Cartesian3();
  this.boundingVolumeSourceTile = undefined;
  this.boundingVolumeIsFromMesh = false;

  this.terrainState = TerrainState.UNLOADED;
  this.mesh = undefined;
  this.fill = undefined;

  this.pickBoundingSphere = new BoundingSphere();

  this.surfaceShader = undefined;
  this.isClipped = true;

  this.clippedByBoundaries = false;
}

Object.defineProperties(GlobeSurfaceTile.prototype, {
  /**
   * Gets a value indicating whether or not this tile is eligible to be unloaded.
   * Typically, a tile is ineligible to be unloaded while an asynchronous operation,
   * such as a request for data, is in progress on it.  A tile will never be
   * unloaded while it is needed for rendering, regardless of the value of this
   * property.
   * @memberof GlobeSurfaceTile.prototype
   * @type {Boolean}
   */
  eligibleForUnloading: {
    get: function () {
      // Do not remove tiles that are transitioning or that have
      // imagery that is transitioning.
      var terrainState = this.terrainState;
      var loadingIsTransitioning =
        terrainState === TerrainState.RECEIVING ||
        terrainState === TerrainState.TRANSFORMING;

      var shouldRemoveTile = !loadingIsTransitioning;

      var imagery = this.imagery;
      for (var i = 0, len = imagery.length; shouldRemoveTile && i < len; ++i) {
        var tileImagery = imagery[i];
        shouldRemoveTile =
          !defined(tileImagery.loadingImagery) ||
          tileImagery.loadingImagery.state !== ImageryState.TRANSITIONING;
      }

      return shouldRemoveTile;
    },
  },

  /**
   * Gets the {@link TerrainMesh} that is used for rendering this tile, if any.
   * Returns the value of the {@link GlobeSurfaceTile#mesh} property if
   * {@link GlobeSurfaceTile#vertexArray} is defined. Otherwise, It returns the
   * {@link TerrainFillMesh#mesh} property of the {@link GlobeSurfaceTile#fill}.
   * If there is no fill, it returns undefined.
   *
   * @memberof GlobeSurfaceTile.prototype
   * @type {TerrainMesh}
   */
  renderedMesh: {
    get: function () {
      if (defined(this.vertexArray)) {
        return this.mesh;
      } else if (defined(this.fill)) {
        return this.fill.mesh;
      }
      return undefined;
    },
  },
});

var scratchCartographic = new Cartographic();

function getPosition(encoding, mode, projection, vertices, index, result) {
  var position = encoding.getExaggeratedPosition(vertices, index, result);

  if (defined(mode) && mode !== SceneMode.SCENE3D) {
    var ellipsoid = projection.ellipsoid;
    var positionCartographic = ellipsoid.cartesianToCartographic(
      position,
      scratchCartographic
    );
    position = projection.project(positionCartographic, result);
    position = Cartesian3.fromElements(
      position.z,
      position.x,
      position.y,
      result
    );
  }

  return position;
}

var scratchV0 = new Cartesian3();
var scratchV1 = new Cartesian3();
var scratchV2 = new Cartesian3();

GlobeSurfaceTile.prototype.pick = function (
  ray,
  mode,
  projection,
  cullBackFaces,
  result
) {
  var mesh = this.renderedMesh;
  if (!defined(mesh)) {
    return undefined;
  }

  var vertices = mesh.vertices;
  var indices = mesh.indices;
  var encoding = mesh.encoding;
  var indicesLength = indices.length;

  var minT = Number.MAX_VALUE;

  for (var i = 0; i < indicesLength; i += 3) {
    var i0 = indices[i];
    var i1 = indices[i + 1];
    var i2 = indices[i + 2];

    var v0 = getPosition(encoding, mode, projection, vertices, i0, scratchV0);
    var v1 = getPosition(encoding, mode, projection, vertices, i1, scratchV1);
    var v2 = getPosition(encoding, mode, projection, vertices, i2, scratchV2);

    var t = IntersectionTests.rayTriangleParametric(
      ray,
      v0,
      v1,
      v2,
      cullBackFaces
    );
    if (defined(t) && t < minT && t >= 0.0) {
      minT = t;
    }
  }

  return minT !== Number.MAX_VALUE
    ? Ray.getPoint(ray, minT, result)
    : undefined;
};

GlobeSurfaceTile.prototype.freeResources = function () {
  if (defined(this.waterMaskTexture)) {
    --this.waterMaskTexture.referenceCount;
    if (this.waterMaskTexture.referenceCount === 0) {
      this.waterMaskTexture.destroy();
    }
    this.waterMaskTexture = undefined;
  }

  this.terrainData = undefined;

  this.terrainState = TerrainState.UNLOADED;
  this.mesh = undefined;
  this.fill = this.fill && this.fill.destroy();

  var imageryList = this.imagery;
  for (var i = 0, len = imageryList.length; i < len; ++i) {
    imageryList[i].freeResources();
  }
  this.imagery.length = 0;

  this.freeVertexArray();
};

GlobeSurfaceTile.prototype.freeVertexArray = function () {
  GlobeSurfaceTile._freeVertexArray(this.vertexArray);
  this.vertexArray = undefined;
  GlobeSurfaceTile._freeVertexArray(this.wireframeVertexArray);
  this.wireframeVertexArray = undefined;
};

GlobeSurfaceTile.initialize = function (
  tile,
  terrainProvider,
  imageryLayerCollection
) {
  var surfaceTile = tile.data;
  if (!defined(surfaceTile)) {
    surfaceTile = tile.data = new GlobeSurfaceTile();
  }

  if (tile.state === QuadtreeTileLoadState.START) {
    prepareNewTile(tile, terrainProvider, imageryLayerCollection);
    tile.state = QuadtreeTileLoadState.LOADING;
  }
};

GlobeSurfaceTile.processStateMachine = function (
  tile,
  frameState,
  terrainProvider,
  imageryLayerCollection,
  vertexArraysToDestroy,
  terrainOnly
) {
  GlobeSurfaceTile.initialize(tile, terrainProvider, imageryLayerCollection);

  var surfaceTile = tile.data;

  if (tile.state === QuadtreeTileLoadState.LOADING) {
    processTerrainStateMachine(
      tile,
      frameState,
      terrainProvider,
      imageryLayerCollection,
      vertexArraysToDestroy
    );
  }

  // From here down we're loading imagery, not terrain. We don't want to load imagery until
  // we're certain that the terrain tiles are actually visible, though. We'll load terrainOnly
  // in these scenarios:
  //   * our bounding volume isn't accurate so we're not certain this tile is really visible (see GlobeSurfaceTileProvider#loadTile).
  //   * we want to upsample from this tile but don't plan to render it (see processTerrainStateMachine).
  if (terrainOnly) {
    return;
  }

  var wasAlreadyRenderable = tile.renderable;

  // The terrain is renderable as soon as we have a valid vertex array.
  tile.renderable = defined(surfaceTile.vertexArray);

  // But it's not done loading until it's in the READY state.
  var isTerrainDoneLoading = surfaceTile.terrainState === TerrainState.READY;

  // If this tile's terrain and imagery are just upsampled from its parent, mark the tile as
  // upsampled only.  We won't refine a tile if its four children are upsampled only.
  tile.upsampledFromParent =
    defined(surfaceTile.terrainData) &&
    surfaceTile.terrainData.wasCreatedByUpsampling();

  var isImageryDoneLoading = surfaceTile.processImagery(
    tile,
    terrainProvider,
    frameState
  );

  if (isTerrainDoneLoading && isImageryDoneLoading) {
    var callbacks = tile._loadedCallbacks;
    var newCallbacks = {};
    for (var layerId in callbacks) {
      if (callbacks.hasOwnProperty(layerId)) {
        if (!callbacks[layerId](tile)) {
          newCallbacks[layerId] = callbacks[layerId];
        }
      }
    }
    tile._loadedCallbacks = newCallbacks;

    tile.state = QuadtreeTileLoadState.DONE;
  }

  // Once a tile is renderable, it stays renderable, because doing otherwise would
  // cause detail (or maybe even the entire globe) to vanish when adding a new
  // imagery layer. `GlobeSurfaceTileProvider._onLayerAdded` sets renderable to
  // false for all affected tiles that are not currently being rendered.
  if (wasAlreadyRenderable) {
    tile.renderable = true;
  }
};

GlobeSurfaceTile.prototype.processImagery = function (
  tile,
  terrainProvider,
  frameState,
  skipLoading
) {
  var surfaceTile = tile.data;
  var isUpsampledOnly = tile.upsampledFromParent;
  var isAnyTileLoaded = false;
  var isDoneLoading = true;

  // Transition imagery states
  var tileImageryCollection = surfaceTile.imagery;
  var i, len;
  for (i = 0, len = tileImageryCollection.length; i < len; ++i) {
    var tileImagery = tileImageryCollection[i];
    if (!defined(tileImagery.loadingImagery)) {
      isUpsampledOnly = false;
      continue;
    }

    if (tileImagery.loadingImagery.state === ImageryState.PLACEHOLDER) {
      var imageryLayer = tileImagery.loadingImagery.imageryLayer;
      if (imageryLayer.imageryProvider.ready) {
        // Remove the placeholder and add the actual skeletons (if any)
        // at the same position.  Then continue the loop at the same index.
        tileImagery.freeResources();
        tileImageryCollection.splice(i, 1);
        imageryLayer._createTileImagerySkeletons(tile, terrainProvider, i);
        --i;
        len = tileImageryCollection.length;
        continue;
      } else {
        isUpsampledOnly = false;
      }
    }

    var thisTileDoneLoading = tileImagery.processStateMachine(
      tile,
      frameState,
      skipLoading
    );
    isDoneLoading = isDoneLoading && thisTileDoneLoading;

    // The imagery is renderable as soon as we have any renderable imagery for this region.
    isAnyTileLoaded =
      isAnyTileLoaded ||
      thisTileDoneLoading ||
      defined(tileImagery.readyImagery);

    isUpsampledOnly =
      isUpsampledOnly &&
      defined(tileImagery.loadingImagery) &&
      (tileImagery.loadingImagery.state === ImageryState.FAILED ||
        tileImagery.loadingImagery.state === ImageryState.INVALID);
  }

  tile.upsampledFromParent = isUpsampledOnly;

  // Allow rendering if any available layers are loaded
  tile.renderable = tile.renderable && (isAnyTileLoaded || isDoneLoading);

  return isDoneLoading;
};

function toggleGeodeticSurfaceNormals(
  surfaceTile,
  enabled,
  ellipsoid,
  frameState
) {
  var renderedMesh = surfaceTile.renderedMesh;
  var vertexBuffer = renderedMesh.vertices;
  var encoding = renderedMesh.encoding;
  var vertexCount = vertexBuffer.length / encoding.stride;

  // Calculate the new stride and generate a new buffer
  // Clone the other encoding, toggle geodetic surface normals, then clone again to get updated stride
  var newEncoding = TerrainEncoding.clone(encoding);
  newEncoding.hasGeodeticSurfaceNormals = enabled;
  newEncoding = TerrainEncoding.clone(newEncoding);
  var newStride = newEncoding.stride;
  var newVertexBuffer = new Float32Array(vertexCount * newStride);

  if (enabled) {
    encoding.addGeodeticSurfaceNormals(
      vertexBuffer,
      newVertexBuffer,
      ellipsoid
    );
  } else {
    encoding.removeGeodeticSurfaceNormals(vertexBuffer, newVertexBuffer);
  }

  renderedMesh.vertices = newVertexBuffer;
  renderedMesh.stride = newStride;

  // delete the old vertex array (which deletes the vertex buffer attached to it), and create a new vertex array with the new vertex buffer
  var isFill = renderedMesh !== surfaceTile.mesh;
  if (isFill) {
    GlobeSurfaceTile._freeVertexArray(surfaceTile.fill.vertexArray);
    surfaceTile.fill.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(
      frameState.context,
      renderedMesh
    );
  } else {
    GlobeSurfaceTile._freeVertexArray(surfaceTile.vertexArray);
    surfaceTile.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(
      frameState.context,
      renderedMesh
    );
  }
  GlobeSurfaceTile._freeVertexArray(surfaceTile.wireframeVertexArray);
  surfaceTile.wireframeVertexArray = undefined;
}

GlobeSurfaceTile.prototype.addGeodeticSurfaceNormals = function (
  ellipsoid,
  frameState
) {
  toggleGeodeticSurfaceNormals(this, true, ellipsoid, frameState);
};

GlobeSurfaceTile.prototype.removeGeodeticSurfaceNormals = function (
  frameState
) {
  toggleGeodeticSurfaceNormals(this, false, undefined, frameState);
};

function prepareNewTile(tile, terrainProvider, imageryLayerCollection) {
  var available = terrainProvider.getTileDataAvailable(
    tile.x,
    tile.y,
    tile.level
  );

  if (!defined(available) && defined(tile.parent)) {
    // Provider doesn't know if this tile is available. Does the parent tile know?
    var parent = tile.parent;
    var parentSurfaceTile = parent.data;
    if (defined(parentSurfaceTile) && defined(parentSurfaceTile.terrainData)) {
      available = parentSurfaceTile.terrainData.isChildAvailable(
        parent.x,
        parent.y,
        tile.x,
        tile.y
      );
    }
  }

  if (available === false) {
    // This tile is not available, so mark it failed so we start upsampling right away.
    tile.data.terrainState = TerrainState.FAILED;
  }

  // Map imagery tiles to this terrain tile
  for (var i = 0, len = imageryLayerCollection.length; i < len; ++i) {
    var layer = imageryLayerCollection.get(i);
    if (layer.show) {
      layer._createTileImagerySkeletons(tile, terrainProvider);
    }
  }
}

function processTerrainStateMachine(
  tile,
  frameState,
  terrainProvider,
  imageryLayerCollection,
  vertexArraysToDestroy
) {
  var surfaceTile = tile.data;

  // If this tile is FAILED, we'll need to upsample from the parent. If the parent isn't
  // ready for that, let's push it along.
  var parent = tile.parent;
  if (
    surfaceTile.terrainState === TerrainState.FAILED &&
    parent !== undefined
  ) {
    var parentReady =
      parent.data !== undefined &&
      parent.data.terrainData !== undefined &&
      parent.data.terrainData.canUpsample !== false;
    if (!parentReady) {
      GlobeSurfaceTile.processStateMachine(
        parent,
        frameState,
        terrainProvider,
        imageryLayerCollection,
        vertexArraysToDestroy,
        true
      );
    }
  }

  if (surfaceTile.terrainState === TerrainState.FAILED) {
    upsample(
      surfaceTile,
      tile,
      frameState,
      terrainProvider,
      tile.x,
      tile.y,
      tile.level
    );
  }

  if (surfaceTile.terrainState === TerrainState.UNLOADED) {
    requestTileGeometry(
      surfaceTile,
      terrainProvider,
      tile.x,
      tile.y,
      tile.level
    );
  }

  if (surfaceTile.terrainState === TerrainState.RECEIVED) {
    transform(
      surfaceTile,
      frameState,
      terrainProvider,
      tile.x,
      tile.y,
      tile.level
    );
  }

  if (surfaceTile.terrainState === TerrainState.TRANSFORMED) {
    createResources(
      surfaceTile,
      frameState.context,
      terrainProvider,
      tile.x,
      tile.y,
      tile.level,
      vertexArraysToDestroy
    );
  }

  if (
    surfaceTile.terrainState >= TerrainState.RECEIVED &&
    surfaceTile.waterMaskTexture === undefined &&
    terrainProvider.hasWaterMask
  ) {
    var terrainData = surfaceTile.terrainData;
    if (terrainData.waterMask !== undefined) {
      createWaterMaskTextureIfNeeded(frameState.context, surfaceTile);
    } else {
      var sourceTile = surfaceTile._findAncestorTileWithTerrainData(tile);
      if (defined(sourceTile) && defined(sourceTile.data.waterMaskTexture)) {
        surfaceTile.waterMaskTexture = sourceTile.data.waterMaskTexture;
        ++surfaceTile.waterMaskTexture.referenceCount;
        surfaceTile._computeWaterMaskTranslationAndScale(
          tile,
          sourceTile,
          surfaceTile.waterMaskTranslationAndScale
        );
      }
    }
  }
}

function upsample(surfaceTile, tile, frameState, terrainProvider, x, y, level) {
  var parent = tile.parent;
  if (!parent) {
    // Trying to upsample from a root tile. No can do. This tile is a failure.
    tile.state = QuadtreeTileLoadState.FAILED;
    return;
  }

  var sourceData = parent.data.terrainData;
  var sourceX = parent.x;
  var sourceY = parent.y;
  var sourceLevel = parent.level;

  if (!defined(sourceData)) {
    // Parent is not available, so we can't upsample this tile yet.
    return;
  }

  var terrainDataPromise = sourceData.upsample(
    terrainProvider.tilingScheme,
    sourceX,
    sourceY,
    sourceLevel,
    x,
    y,
    level
  );
  if (!defined(terrainDataPromise)) {
    // The upsample request has been deferred - try again later.
    return;
  }

  surfaceTile.terrainState = TerrainState.RECEIVING;

  when(
    terrainDataPromise,
    function (terrainData) {
      surfaceTile.terrainData = terrainData;
      surfaceTile.terrainState = TerrainState.RECEIVED;
    },
    function () {
      surfaceTile.terrainState = TerrainState.FAILED;
    }
  );
}

function requestTileGeometry(surfaceTile, terrainProvider, x, y, level) {
  function success(terrainData) {
    surfaceTile.terrainData = terrainData;
    surfaceTile.terrainState = TerrainState.RECEIVED;
    surfaceTile.request = undefined;
  }

  function failure(error) {
    if (surfaceTile.request.state === RequestState.CANCELLED) {
      // Cancelled due to low priority - try again later.
      surfaceTile.terrainData = undefined;
      surfaceTile.terrainState = TerrainState.UNLOADED;
      surfaceTile.request = undefined;
      return;
    }

    // Initially assume failure.  handleError may retry, in which case the state will
    // change to RECEIVING or UNLOADED.
    surfaceTile.terrainState = TerrainState.FAILED;
    surfaceTile.request = undefined;

    var message =
      "Failed to obtain terrain tile X: " +
      x +
      " Y: " +
      y +
      " Level: " +
      level +
      '. Error message: "' +
      error +
      '"';
    terrainProvider._requestError = TileProviderError.handleError(
      terrainProvider._requestError,
      terrainProvider,
      terrainProvider.errorEvent,
      message,
      x,
      y,
      level,
      doRequest
    );
  }

  function doRequest() {
    // Request the terrain from the terrain provider.
    var request = new Request({
      throttle: false,
      throttleByServer: true,
      type: RequestType.TERRAIN,
    });
    surfaceTile.request = request;

    var requestPromise = terrainProvider.requestTileGeometry(
      x,
      y,
      level,
      request
    );

    // If the request method returns undefined (instead of a promise), the request
    // has been deferred.
    if (defined(requestPromise)) {
      surfaceTile.terrainState = TerrainState.RECEIVING;
      when(requestPromise, success, failure);
    } else {
      // Deferred - try again later.
      surfaceTile.terrainState = TerrainState.UNLOADED;
      surfaceTile.request = undefined;
    }
  }

  doRequest();
}

var scratchCreateMeshOptions = {
  tilingScheme: undefined,
  x: 0,
  y: 0,
  level: 0,
  exaggeration: 1.0,
  exaggerationRelativeHeight: 0.0,
  throttle: true,
};

function transform(surfaceTile, frameState, terrainProvider, x, y, level) {
  var tilingScheme = terrainProvider.tilingScheme;

  var createMeshOptions = scratchCreateMeshOptions;
  createMeshOptions.tilingScheme = tilingScheme;
  createMeshOptions.x = x;
  createMeshOptions.y = y;
  createMeshOptions.level = level;
  createMeshOptions.exaggeration = frameState.terrainExaggeration;
  createMeshOptions.exaggerationRelativeHeight =
    frameState.terrainExaggerationRelativeHeight;
  createMeshOptions.throttle = true;

  var terrainData = surfaceTile.terrainData;
  var meshPromise = terrainData.createMesh(createMeshOptions);

  if (!defined(meshPromise)) {
    // Postponed.
    return;
  }

  surfaceTile.terrainState = TerrainState.TRANSFORMING;

  when(
    meshPromise,
    function (mesh) {
      surfaceTile.mesh = mesh;
      surfaceTile.terrainState = TerrainState.TRANSFORMED;
    },
    function () {
      surfaceTile.terrainState = TerrainState.FAILED;
    }
  );
}

GlobeSurfaceTile._createVertexArrayForMesh = function (context, mesh) {
  var typedArray = mesh.vertices;
  var buffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: typedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  var attributes = mesh.encoding.getAttributes(buffer);

  var indexBuffers = mesh.indices.indexBuffers || {};
  var indexBuffer = indexBuffers[context.id];
  if (!defined(indexBuffer) || indexBuffer.isDestroyed()) {
    var indices = mesh.indices;
    indexBuffer = Buffer.createIndexBuffer({
      context: context,
      typedArray: indices,
      usage: BufferUsage.STATIC_DRAW,
      indexDatatype: IndexDatatype.fromSizeInBytes(indices.BYTES_PER_ELEMENT),
    });
    indexBuffer.vertexArrayDestroyable = false;
    indexBuffer.referenceCount = 1;
    indexBuffers[context.id] = indexBuffer;
    mesh.indices.indexBuffers = indexBuffers;
  } else {
    ++indexBuffer.referenceCount;
  }

  return new VertexArray({
    context: context,
    attributes: attributes,
    indexBuffer: indexBuffer,
  });
};

GlobeSurfaceTile._freeVertexArray = function (vertexArray) {
  if (defined(vertexArray)) {
    var indexBuffer = vertexArray.indexBuffer;

    if (!vertexArray.isDestroyed()) {
      vertexArray.destroy();
    }

    if (
      defined(indexBuffer) &&
      !indexBuffer.isDestroyed() &&
      defined(indexBuffer.referenceCount)
    ) {
      --indexBuffer.referenceCount;
      if (indexBuffer.referenceCount === 0) {
        indexBuffer.destroy();
      }
    }
  }
};

function createResources(
  surfaceTile,
  context,
  terrainProvider,
  x,
  y,
  level,
  vertexArraysToDestroy
) {
  surfaceTile.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(
    context,
    surfaceTile.mesh
  );
  surfaceTile.terrainState = TerrainState.READY;
  surfaceTile.fill =
    surfaceTile.fill && surfaceTile.fill.destroy(vertexArraysToDestroy);
}

function getContextWaterMaskData(context) {
  var data = context.cache.tile_waterMaskData;

  if (!defined(data)) {
    var allWaterTexture = Texture.create({
      context: context,
      pixelFormat: PixelFormat.LUMINANCE,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        arrayBufferView: new Uint8Array([255]),
        width: 1,
        height: 1,
      },
    });
    allWaterTexture.referenceCount = 1;

    var sampler = new Sampler({
      wrapS: TextureWrap.CLAMP_TO_EDGE,
      wrapT: TextureWrap.CLAMP_TO_EDGE,
      minificationFilter: TextureMinificationFilter.LINEAR,
      magnificationFilter: TextureMagnificationFilter.LINEAR,
    });

    data = {
      allWaterTexture: allWaterTexture,
      sampler: sampler,
      destroy: function () {
        this.allWaterTexture.destroy();
      },
    };

    context.cache.tile_waterMaskData = data;
  }

  return data;
}

function createWaterMaskTextureIfNeeded(context, surfaceTile) {
  var waterMask = surfaceTile.terrainData.waterMask;
  var waterMaskData = getContextWaterMaskData(context);
  var texture;

  var waterMaskLength = waterMask.length;
  if (waterMaskLength === 1) {
    // Length 1 means the tile is entirely land or entirely water.
    // A value of 0 indicates entirely land, a value of 1 indicates entirely water.
    if (waterMask[0] !== 0) {
      texture = waterMaskData.allWaterTexture;
    } else {
      // Leave the texture undefined if the tile is entirely land.
      return;
    }
  } else {
    var textureSize = Math.sqrt(waterMaskLength);
    texture = Texture.create({
      context: context,
      pixelFormat: PixelFormat.LUMINANCE,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        width: textureSize,
        height: textureSize,
        arrayBufferView: waterMask,
      },
      sampler: waterMaskData.sampler,
      flipY: false,
    });

    texture.referenceCount = 0;
  }

  ++texture.referenceCount;
  surfaceTile.waterMaskTexture = texture;

  Cartesian4.fromElements(
    0.0,
    0.0,
    1.0,
    1.0,
    surfaceTile.waterMaskTranslationAndScale
  );
}

GlobeSurfaceTile.prototype._findAncestorTileWithTerrainData = function (tile) {
  var sourceTile = tile.parent;

  while (
    defined(sourceTile) &&
    (!defined(sourceTile.data) ||
      !defined(sourceTile.data.terrainData) ||
      sourceTile.data.terrainData.wasCreatedByUpsampling())
  ) {
    sourceTile = sourceTile.parent;
  }

  return sourceTile;
};

GlobeSurfaceTile.prototype._computeWaterMaskTranslationAndScale = function (
  tile,
  sourceTile,
  result
) {
  var sourceTileRectangle = sourceTile.rectangle;
  var tileRectangle = tile.rectangle;
  var tileWidth = tileRectangle.width;
  var tileHeight = tileRectangle.height;

  var scaleX = tileWidth / sourceTileRectangle.width;
  var scaleY = tileHeight / sourceTileRectangle.height;
  result.x =
    (scaleX * (tileRectangle.west - sourceTileRectangle.west)) / tileWidth;
  result.y =
    (scaleY * (tileRectangle.south - sourceTileRectangle.south)) / tileHeight;
  result.z = scaleX;
  result.w = scaleY;

  return result;
};
export default GlobeSurfaceTile;
