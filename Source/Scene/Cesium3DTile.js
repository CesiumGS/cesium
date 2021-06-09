import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import CullingVolume from "../Core/CullingVolume.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import destroyObject from "../Core/destroyObject.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Intersect from "../Core/Intersect.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import Rectangle from "../Core/Rectangle.js";
import Request from "../Core/Request.js";
import RequestScheduler from "../Core/RequestScheduler.js";
import RequestState from "../Core/RequestState.js";
import RequestType from "../Core/RequestType.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";
import Cesium3DTileContentFactory from "./Cesium3DTileContentFactory.js";
import Cesium3DTileContentState from "./Cesium3DTileContentState.js";
import Cesium3DTileContentType from "./Cesium3DTileContentType.js";
import Cesium3DTileOptimizationHint from "./Cesium3DTileOptimizationHint.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTileRefine from "./Cesium3DTileRefine.js";
import Empty3DTileContent from "./Empty3DTileContent.js";
import findGroupMetadata from "./findGroupMetadata.js";
import has3DTilesExtension from "./has3DTilesExtension.js";
import Multiple3DTileContent from "./Multiple3DTileContent.js";
import preprocess3DTileContent from "./preprocess3DTileContent.js";
import SceneMode from "./SceneMode.js";
import TileBoundingRegion from "./TileBoundingRegion.js";
import TileBoundingS2Cell from "./TileBoundingS2Cell.js";
import TileBoundingSphere from "./TileBoundingSphere.js";
import TileMetadata from "./TileMetadata.js";
import TileOrientedBoundingBox from "./TileOrientedBoundingBox.js";
import Pass from "../Renderer/Pass.js";

/**
 * A tile in a {@link Cesium3DTileset}.  When a tile is first created, its content is not loaded;
 * the content is loaded on-demand when needed based on the view.
 * <p>
 * Do not construct this directly, instead access tiles through {@link Cesium3DTileset#tileVisible}.
 * </p>
 *
 * @alias Cesium3DTile
 * @constructor
 */
function Cesium3DTile(tileset, baseResource, header, parent) {
  this._tileset = tileset;
  this._header = header;
  var contentHeader = header.content;

  /**
   * The local transform of this tile.
   * @type {Matrix4}
   */
  this.transform = defined(header.transform)
    ? Matrix4.unpack(header.transform)
    : Matrix4.clone(Matrix4.IDENTITY);

  var parentTransform = defined(parent)
    ? parent.computedTransform
    : tileset.modelMatrix;
  var computedTransform = Matrix4.multiply(
    parentTransform,
    this.transform,
    new Matrix4()
  );

  var parentInitialTransform = defined(parent)
    ? parent._initialTransform
    : Matrix4.IDENTITY;
  this._initialTransform = Matrix4.multiply(
    parentInitialTransform,
    this.transform,
    new Matrix4()
  );

  /**
   * The final computed transform of this tile.
   * @type {Matrix4}
   * @readonly
   */
  this.computedTransform = computedTransform;

  this._boundingVolume = this.createBoundingVolume(
    header.boundingVolume,
    computedTransform
  );
  this._boundingVolume2D = undefined;

  var contentBoundingVolume;

  if (defined(contentHeader) && defined(contentHeader.boundingVolume)) {
    // Non-leaf tiles may have a content bounding-volume, which is a tight-fit bounding volume
    // around only the features in the tile.  This box is useful for culling for rendering,
    // but not for culling for traversing the tree since it does not guarantee spatial coherence, i.e.,
    // since it only bounds features in the tile, not the entire tile, children may be
    // outside of this box.
    contentBoundingVolume = this.createBoundingVolume(
      contentHeader.boundingVolume,
      computedTransform
    );
  }
  this._contentBoundingVolume = contentBoundingVolume;
  this._contentBoundingVolume2D = undefined;

  var viewerRequestVolume;
  if (defined(header.viewerRequestVolume)) {
    viewerRequestVolume = this.createBoundingVolume(
      header.viewerRequestVolume,
      computedTransform
    );
  }
  this._viewerRequestVolume = viewerRequestVolume;

  /**
   * The error, in meters, introduced if this tile is rendered and its children are not.
   * This is used to compute screen space error, i.e., the error measured in pixels.
   *
   * @type {Number}
   * @readonly
   */
  this.geometricError = header.geometricError;
  this._geometricError = header.geometricError;

  if (!defined(this._geometricError)) {
    this._geometricError = defined(parent)
      ? parent.geometricError
      : tileset._geometricError;
    Cesium3DTile._deprecationWarning(
      "geometricErrorUndefined",
      "Required property geometricError is undefined for this tile. Using parent's geometric error instead."
    );
  }

  this.updateGeometricErrorScale();

  var refine;
  if (defined(header.refine)) {
    if (header.refine === "replace" || header.refine === "add") {
      Cesium3DTile._deprecationWarning(
        "lowercase-refine",
        'This tile uses a lowercase refine "' +
          header.refine +
          '". Instead use "' +
          header.refine.toUpperCase() +
          '".'
      );
    }
    refine =
      header.refine.toUpperCase() === "REPLACE"
        ? Cesium3DTileRefine.REPLACE
        : Cesium3DTileRefine.ADD;
  } else if (defined(parent)) {
    // Inherit from parent tile if omitted.
    refine = parent.refine;
  } else {
    refine = Cesium3DTileRefine.REPLACE;
  }

  /**
   * Specifies the type of refinement that is used when traversing this tile for rendering.
   *
   * @type {Cesium3DTileRefine}
   * @readonly
   * @private
   */
  this.refine = refine;

  /**
   * Gets the tile's children.
   *
   * @type {Cesium3DTile[]}
   * @readonly
   */
  this.children = [];

  /**
   * This tile's parent or <code>undefined</code> if this tile is the root.
   * <p>
   * When a tile's content points to an external tileset JSON file, the external tileset's
   * root tile's parent is not <code>undefined</code>; instead, the parent references
   * the tile (with its content pointing to an external tileset JSON file) as if the two tilesets were merged.
   * </p>
   *
   * @type {Cesium3DTile}
   * @readonly
   */
  this.parent = parent;

  var content;
  var hasEmptyContent = false;
  var hasMultipleContents = false;
  var contentState;
  var contentResource;
  var serverKey;

  baseResource = Resource.createIfNeeded(baseResource);

  if (has3DTilesExtension(header, "3DTILES_multiple_contents")) {
    hasMultipleContents = true;
    contentState = Cesium3DTileContentState.UNLOADED;
    // Each content may have its own URI, but they all need to be resolved
    // relative to the tileset, so the base resource is used.
    contentResource = baseResource.clone();
  } else if (defined(contentHeader)) {
    var contentHeaderUri = contentHeader.uri;
    if (defined(contentHeader.url)) {
      Cesium3DTile._deprecationWarning(
        "contentUrl",
        'This tileset JSON uses the "content.url" property which has been deprecated. Use "content.uri" instead.'
      );
      contentHeaderUri = contentHeader.url;
    }
    contentState = Cesium3DTileContentState.UNLOADED;
    contentResource = baseResource.getDerivedResource({
      url: contentHeaderUri,
    });
    serverKey = RequestScheduler.getServerKey(
      contentResource.getUrlComponent()
    );
  } else {
    content = new Empty3DTileContent(tileset, this);
    hasEmptyContent = true;
    contentState = Cesium3DTileContentState.READY;
  }

  this._content = content;
  this._contentResource = contentResource;
  this._contentState = contentState;
  this._contentReadyToProcessPromise = undefined;
  this._contentReadyPromise = undefined;
  this._expiredContent = undefined;

  this._serverKey = serverKey;

  /**
   * When <code>true</code>, the tile has no content.
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  this.hasEmptyContent = hasEmptyContent;

  /**
   * When <code>true</code>, the tile's content points to an external tileset.
   * <p>
   * This is <code>false</code> until the tile's content is loaded.
   * </p>
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  this.hasTilesetContent = false;

  /**
   * When <code>true</code>, the tile's content is an implicit tileset.
   * <p>
   * This is <code>false</code> until the tile's implicit content is loaded.
   * </p>
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  this.hasImplicitContent = false;

  /**
   * When <code>true</code>, the tile has multiple contents via the
   * <code>3DTILES_multiple_contents</code> extension.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_multiple_contents/0.0.0|3DTILES_multiple_contents extension}
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  this.hasMultipleContents = hasMultipleContents;

  var metadata;
  if (has3DTilesExtension(header, "3DTILES_metadata")) {
    // This assumes that tileset.metadata has been created before any
    // tiles are constructed.
    var extension = header.extensions["3DTILES_metadata"];
    var classes = tileset.metadata.schema.classes;
    var tileClass = classes[extension.class];
    metadata = new TileMetadata({
      tile: extension,
      class: tileClass,
    });
  }

  /**
   * When the <code>3DTILES_metadata</code> extension is used, this
   * stores a {@link TileMetadata} object for accessing tile metadata.
   *
   * @type {TileMetadata}
   * @readonly
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  this.metadata = metadata;

  /**
   * The node in the tileset's LRU cache, used to determine when to unload a tile's content.
   *
   * See {@link Cesium3DTilesetCache}
   *
   * @type {DoublyLinkedListNode}
   * @readonly
   *
   * @private
   */
  this.cacheNode = undefined;

  var expire = header.expire;
  var expireDuration;
  var expireDate;
  if (defined(expire)) {
    expireDuration = expire.duration;
    if (defined(expire.date)) {
      expireDate = JulianDate.fromIso8601(expire.date);
    }
  }

  /**
   * The time in seconds after the tile's content is ready when the content expires and new content is requested.
   *
   * @type {Number}
   */
  this.expireDuration = expireDuration;

  /**
   * The date when the content expires and new content is requested.
   *
   * @type {JulianDate}
   */
  this.expireDate = expireDate;

  /**
   * The time when a style was last applied to this tile.
   *
   * @type {Number}
   *
   * @private
   */
  this.lastStyleTime = 0.0;

  /**
   * Marks whether the tile's children bounds are fully contained within the tile's bounds
   *
   * @type {Cesium3DTileOptimizationHint}
   *
   * @private
   */
  this._optimChildrenWithinParent = Cesium3DTileOptimizationHint.NOT_COMPUTED;

  /**
   * Tracks if the tile's relationship with a ClippingPlaneCollection has changed with regards
   * to the ClippingPlaneCollection's state.
   *
   * @type {Boolean}
   *
   * @private
   */
  this.clippingPlanesDirty = false;

  /**
   * Tracks if the tile's request should be deferred until all non-deferred
   * tiles load.
   *
   * @type {Boolean}
   *
   * @private
   */
  this.priorityDeferred = false;

  /**
   * For implicit tiling, an ImplicitTileset object will be attached to a
   * placeholder tile with the <code>3DTILES_implicit_tiling</code> extension.
   * This way the {@link Implicit3DTileContent} can access the tile later once the content is fetched.
   *
   * @type {ImplicitTileset|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  this.implicitTileset = undefined;

  /**
   * For implicit tiling, the (level, x, y, [z]) coordinates within the
   * implicit tileset are stored in the tile.
   *
   * @type {ImplicitTileCoordinates|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  this.implicitCoordinates = undefined;

  /**
   * For implicit tiling, each transcoded tile will hold a weak reference to
   * the {@link ImplicitSubtree}.
   *
   * @type {ImplicitSubtree|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  this.implicitSubtree = undefined;

  // Members that are updated every frame for tree traversal and rendering optimizations:
  this._distanceToCamera = 0.0;
  this._centerZDepth = 0.0;
  this._screenSpaceError = 0.0;
  this._screenSpaceErrorProgressiveResolution = 0.0; // The screen space error at a given screen height of tileset.progressiveResolutionHeightFraction * screenHeight
  this._visibilityPlaneMask = 0;
  this._visible = false;
  this._inRequestVolume = false;

  this._finalResolution = true;
  this._depth = 0;
  this._stackLength = 0;
  this._selectionDepth = 0;

  this._updatedVisibilityFrame = 0;
  this._touchedFrame = 0;
  this._visitedFrame = 0;
  this._selectedFrame = 0;
  this._requestedFrame = 0;
  this._ancestorWithContent = undefined;
  this._ancestorWithContentAvailable = undefined;
  this._refines = false;
  this._shouldSelect = false;
  this._isClipped = true;
  this._clippingPlanesState = 0; // encapsulates (_isClipped, clippingPlanes.enabled) and number/function
  this._debugBoundingVolume = undefined;
  this._debugContentBoundingVolume = undefined;
  this._debugViewerRequestVolume = undefined;
  this._debugColor = Color.fromRandom({ alpha: 1.0 });
  this._debugColorizeTiles = false;

  this._priority = 0.0; // The priority used for request sorting
  this._priorityHolder = this; // Reference to the ancestor up the tree that holds the _foveatedFactor and _distanceToCamera for all tiles in the refinement chain.
  this._priorityProgressiveResolution = false;
  this._priorityProgressiveResolutionScreenSpaceErrorLeaf = false;
  this._priorityReverseScreenSpaceError = 0.0;
  this._foveatedFactor = 0.0;
  this._wasMinPriorityChild = false; // Needed for knowing when to continue a refinement chain. Gets reset in updateTile in traversal and gets set in updateAndPushChildren in traversal.

  this._loadTimestamp = new JulianDate();

  this._commandsLength = 0;

  this._color = undefined;
  this._colorDirty = false;

  this._request = undefined;
}

// This can be overridden for testing purposes
Cesium3DTile._deprecationWarning = deprecationWarning;

Object.defineProperties(Cesium3DTile.prototype, {
  /**
   * The tileset containing this tile.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Cesium3DTileset}
   * @readonly
   */
  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  /**
   * The tile's content.  This represents the actual tile's payload,
   * not the content's metadata in the tileset JSON file.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Cesium3DTileContent}
   * @readonly
   */
  content: {
    get: function () {
      return this._content;
    },
  },

  /**
   * Get the tile's bounding volume.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {TileBoundingVolume}
   * @readonly
   * @private
   */
  boundingVolume: {
    get: function () {
      return this._boundingVolume;
    },
  },

  /**
   * Get the bounding volume of the tile's contents.  This defaults to the
   * tile's bounding volume when the content's bounding volume is
   * <code>undefined</code>.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {TileBoundingVolume}
   * @readonly
   * @private
   */
  contentBoundingVolume: {
    get: function () {
      return defaultValue(this._contentBoundingVolume, this._boundingVolume);
    },
  },

  /**
   * Get the bounding sphere derived from the tile's bounding volume.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      return this._boundingVolume.boundingSphere;
    },
  },

  /**
   * Returns the <code>extras</code> property in the tileset JSON for this tile, which contains application specific metadata.
   * Returns <code>undefined</code> if <code>extras</code> does not exist.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {*}
   * @readonly
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification#specifying-extensions-and-application-specific-extras|Extras in the 3D Tiles specification.}
   */
  extras: {
    get: function () {
      return this._header.extras;
    },
  },

  /**
   * Gets or sets the tile's highlight color.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Color}
   *
   * @default {@link Color.WHITE}
   *
   * @private
   */
  color: {
    get: function () {
      if (!defined(this._color)) {
        this._color = new Color();
      }
      return Color.clone(this._color);
    },
    set: function (value) {
      this._color = Color.clone(value, this._color);
      this._colorDirty = true;
    },
  },

  /**
   * Determines if the tile has available content to render.  <code>true</code> if the tile's
   * content is ready or if it has expired content that renders while new content loads; otherwise,
   * <code>false</code>.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  contentAvailable: {
    get: function () {
      return (
        (this.contentReady &&
          !this.hasEmptyContent &&
          !this.hasTilesetContent &&
          !this.hasImplicitContent) ||
        (defined(this._expiredContent) && !this.contentFailed)
      );
    },
  },

  /**
   * Determines if the tile's content is ready. This is automatically <code>true</code> for
   * tile's with empty content.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  contentReady: {
    get: function () {
      return this._contentState === Cesium3DTileContentState.READY;
    },
  },

  /**
   * Determines if the tile's content has not be requested. <code>true</code> if tile's
   * content has not be requested; otherwise, <code>false</code>.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  contentUnloaded: {
    get: function () {
      return this._contentState === Cesium3DTileContentState.UNLOADED;
    },
  },

  /**
   * Determines if the tile's content is expired. <code>true</code> if tile's
   * content is expired; otherwise, <code>false</code>.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  contentExpired: {
    get: function () {
      return this._contentState === Cesium3DTileContentState.EXPIRED;
    },
  },

  /**
   * Determines if the tile's content failed to load.  <code>true</code> if the tile's
   * content failed to load; otherwise, <code>false</code>.
   *
   * @memberof Cesium3DTile.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  contentFailed: {
    get: function () {
      return this._contentState === Cesium3DTileContentState.FAILED;
    },
  },

  /**
   * Gets the promise that will be resolved when the tile's content is ready to process.
   * This happens after the content is downloaded but before the content is ready
   * to render.
   * <p>
   * The promise remains <code>undefined</code> until the tile's content is requested.
   * </p>
   *
   * @type {Promise.<Cesium3DTileContent>}
   * @readonly
   *
   * @private
   */
  contentReadyToProcessPromise: {
    get: function () {
      if (defined(this._contentReadyToProcessPromise)) {
        return this._contentReadyToProcessPromise.promise;
      }
      return undefined;
    },
  },

  /**
   * Gets the promise that will be resolved when the tile's content is ready to render.
   * <p>
   * The promise remains <code>undefined</code> until the tile's content is requested.
   * </p>
   *
   * @type {Promise.<Cesium3DTileContent>}
   * @readonly
   *
   * @private
   */
  contentReadyPromise: {
    get: function () {
      if (defined(this._contentReadyPromise)) {
        return this._contentReadyPromise.promise;
      }
      return undefined;
    },
  },

  /**
   * Returns the number of draw commands used by this tile.
   *
   * @readonly
   *
   * @private
   */
  commandsLength: {
    get: function () {
      return this._commandsLength;
    },
  },
});

var scratchCartesian = new Cartesian3();
function isPriorityDeferred(tile, frameState) {
  var tileset = tile._tileset;

  // If closest point on line is inside the sphere then set foveatedFactor to 0. Otherwise, the dot product is with the line from camera to the point on the sphere that is closest to the line.
  var camera = frameState.camera;
  var boundingSphere = tile.boundingSphere;
  var radius = boundingSphere.radius;
  var scaledCameraDirection = Cartesian3.multiplyByScalar(
    camera.directionWC,
    tile._centerZDepth,
    scratchCartesian
  );
  var closestPointOnLine = Cartesian3.add(
    camera.positionWC,
    scaledCameraDirection,
    scratchCartesian
  );
  // The distance from the camera's view direction to the tile.
  var toLine = Cartesian3.subtract(
    closestPointOnLine,
    boundingSphere.center,
    scratchCartesian
  );
  var distanceToCenterLine = Cartesian3.magnitude(toLine);
  var notTouchingSphere = distanceToCenterLine > radius;

  // If camera's direction vector is inside the bounding sphere then consider
  // this tile right along the line of sight and set _foveatedFactor to 0.
  // Otherwise,_foveatedFactor is one minus the dot product of the camera's direction
  // and the vector between the camera and the point on the bounding sphere closest to the view line.
  if (notTouchingSphere) {
    var toLineNormalized = Cartesian3.normalize(toLine, scratchCartesian);
    var scaledToLine = Cartesian3.multiplyByScalar(
      toLineNormalized,
      radius,
      scratchCartesian
    );
    var closestOnSphere = Cartesian3.add(
      boundingSphere.center,
      scaledToLine,
      scratchCartesian
    );
    var toClosestOnSphere = Cartesian3.subtract(
      closestOnSphere,
      camera.positionWC,
      scratchCartesian
    );
    var toClosestOnSphereNormalize = Cartesian3.normalize(
      toClosestOnSphere,
      scratchCartesian
    );
    tile._foveatedFactor =
      1.0 -
      Math.abs(Cartesian3.dot(camera.directionWC, toClosestOnSphereNormalize));
  } else {
    tile._foveatedFactor = 0.0;
  }

  // Skip this feature if: non-skipLevelOfDetail and replace refine, if the foveated settings are turned off, if tile is progressive resolution and replace refine and skipLevelOfDetail (will help get rid of ancestor artifacts faster)
  // Or if the tile is a preload of any kind
  var replace = tile.refine === Cesium3DTileRefine.REPLACE;
  var skipLevelOfDetail = tileset._skipLevelOfDetail;
  if (
    (replace && !skipLevelOfDetail) ||
    !tileset.foveatedScreenSpaceError ||
    tileset.foveatedConeSize === 1.0 ||
    (tile._priorityProgressiveResolution && replace && skipLevelOfDetail) ||
    tileset._pass === Cesium3DTilePass.PRELOAD_FLIGHT ||
    tileset._pass === Cesium3DTilePass.PRELOAD
  ) {
    return false;
  }

  var maximumFovatedFactor = 1.0 - Math.cos(camera.frustum.fov * 0.5); // 0.14 for fov = 60. NOTE very hard to defer vertically foveated tiles since max is based on fovy (which is fov). Lowering the 0.5 to a smaller fraction of the screen height will start to defer vertically foveated tiles.
  var foveatedConeFactor = tileset.foveatedConeSize * maximumFovatedFactor;

  // If it's inside the user-defined view cone, then it should not be deferred.
  if (tile._foveatedFactor <= foveatedConeFactor) {
    return false;
  }

  // Relax SSE based on how big the angle is between the tile and the edge of the foveated cone.
  var range = maximumFovatedFactor - foveatedConeFactor;
  var normalizedFoveatedFactor = CesiumMath.clamp(
    (tile._foveatedFactor - foveatedConeFactor) / range,
    0.0,
    1.0
  );
  var sseRelaxation = tileset.foveatedInterpolationCallback(
    tileset.foveatedMinimumScreenSpaceErrorRelaxation,
    tileset.maximumScreenSpaceError,
    normalizedFoveatedFactor
  );
  var sse =
    tile._screenSpaceError === 0.0 && defined(tile.parent)
      ? tile.parent._screenSpaceError * 0.5
      : tile._screenSpaceError;

  return tileset.maximumScreenSpaceError - sseRelaxation <= sse;
}

var scratchJulianDate = new JulianDate();

/**
 * Get the tile's screen space error.
 *
 * @private
 */
Cesium3DTile.prototype.getScreenSpaceError = function (
  frameState,
  useParentGeometricError,
  progressiveResolutionHeightFraction
) {
  var tileset = this._tileset;
  var heightFraction = defaultValue(progressiveResolutionHeightFraction, 1.0);
  var parentGeometricError = defined(this.parent)
    ? this.parent.geometricError
    : tileset._geometricError;
  var geometricError = useParentGeometricError
    ? parentGeometricError
    : this.geometricError;
  if (geometricError === 0.0) {
    // Leaf tiles do not have any error so save the computation
    return 0.0;
  }
  var camera = frameState.camera;
  var frustum = camera.frustum;
  var context = frameState.context;
  var width = context.drawingBufferWidth;
  var height = context.drawingBufferHeight * heightFraction;
  var error;
  if (
    frameState.mode === SceneMode.SCENE2D ||
    frustum instanceof OrthographicFrustum
  ) {
    if (defined(frustum._offCenterFrustum)) {
      frustum = frustum._offCenterFrustum;
    }
    var pixelSize =
      Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) /
      Math.max(width, height);
    error = geometricError / pixelSize;
  } else {
    // Avoid divide by zero when viewer is inside the tile
    var distance = Math.max(this._distanceToCamera, CesiumMath.EPSILON7);
    var sseDenominator = camera.frustum.sseDenominator;
    error = (geometricError * height) / (distance * sseDenominator);
    if (tileset.dynamicScreenSpaceError) {
      var density = tileset._dynamicScreenSpaceErrorComputedDensity;
      var factor = tileset.dynamicScreenSpaceErrorFactor;
      var dynamicError = CesiumMath.fog(distance, density) * factor;
      error -= dynamicError;
    }
  }

  error /= frameState.pixelRatio;

  return error;
};

function isPriorityProgressiveResolution(tileset, tile) {
  if (
    tileset.progressiveResolutionHeightFraction <= 0.0 ||
    tileset.progressiveResolutionHeightFraction > 0.5
  ) {
    return false;
  }

  var isProgressiveResolutionTile =
    tile._screenSpaceErrorProgressiveResolution >
    tileset._maximumScreenSpaceError; // Mark non-SSE leaves
  tile._priorityProgressiveResolutionScreenSpaceErrorLeaf = false; // Needed for skipLOD
  var parent = tile.parent;
  var maximumScreenSpaceError = tileset._maximumScreenSpaceError;
  var tilePasses =
    tile._screenSpaceErrorProgressiveResolution <= maximumScreenSpaceError;
  var parentFails =
    defined(parent) &&
    parent._screenSpaceErrorProgressiveResolution > maximumScreenSpaceError;
  if (tilePasses && parentFails) {
    // A progressive resolution SSE leaf, promote its priority as well
    tile._priorityProgressiveResolutionScreenSpaceErrorLeaf = true;
    isProgressiveResolutionTile = true;
  }
  return isProgressiveResolutionTile;
}

function getPriorityReverseScreenSpaceError(tileset, tile) {
  var parent = tile.parent;
  var useParentScreenSpaceError =
    defined(parent) &&
    (!tileset._skipLevelOfDetail ||
      tile._screenSpaceError === 0.0 ||
      parent.hasTilesetContent ||
      parent.hasImplicitContent);
  var screenSpaceError = useParentScreenSpaceError
    ? parent._screenSpaceError
    : tile._screenSpaceError;
  return tileset.root._screenSpaceError - screenSpaceError;
}

/**
 * Update the tile's visibility.
 *
 * @private
 */
Cesium3DTile.prototype.updateVisibility = function (frameState) {
  var parent = this.parent;
  var tileset = this._tileset;
  var parentTransform = defined(parent)
    ? parent.computedTransform
    : tileset.modelMatrix;
  var parentVisibilityPlaneMask = defined(parent)
    ? parent._visibilityPlaneMask
    : CullingVolume.MASK_INDETERMINATE;
  this.updateTransform(parentTransform);
  this._distanceToCamera = this.distanceToTile(frameState);
  this._centerZDepth = this.distanceToTileCenter(frameState);
  this._screenSpaceError = this.getScreenSpaceError(frameState, false);
  this._screenSpaceErrorProgressiveResolution = this.getScreenSpaceError(
    frameState,
    false,
    tileset.progressiveResolutionHeightFraction
  );
  this._visibilityPlaneMask = this.visibility(
    frameState,
    parentVisibilityPlaneMask
  ); // Use parent's plane mask to speed up visibility test
  this._visible = this._visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
  this._inRequestVolume = this.insideViewerRequestVolume(frameState);
  this._priorityReverseScreenSpaceError = getPriorityReverseScreenSpaceError(
    tileset,
    this
  );
  this._priorityProgressiveResolution = isPriorityProgressiveResolution(
    tileset,
    this
  );
  this.priorityDeferred = isPriorityDeferred(this, frameState);
};

/**
 * Update whether the tile has expired.
 *
 * @private
 */
Cesium3DTile.prototype.updateExpiration = function () {
  if (
    defined(this.expireDate) &&
    this.contentReady &&
    !this.hasEmptyContent &&
    !this.hasMultipleContents
  ) {
    var now = JulianDate.now(scratchJulianDate);
    if (JulianDate.lessThan(this.expireDate, now)) {
      this._contentState = Cesium3DTileContentState.EXPIRED;
      this._expiredContent = this._content;
    }
  }
};

function updateExpireDate(tile) {
  if (defined(tile.expireDuration)) {
    var expireDurationDate = JulianDate.now(scratchJulianDate);
    JulianDate.addSeconds(
      expireDurationDate,
      tile.expireDuration,
      expireDurationDate
    );

    if (defined(tile.expireDate)) {
      if (JulianDate.lessThan(tile.expireDate, expireDurationDate)) {
        JulianDate.clone(expireDurationDate, tile.expireDate);
      }
    } else {
      tile.expireDate = JulianDate.clone(expireDurationDate);
    }
  }
}

function createPriorityFunction(tile) {
  return function () {
    return tile._priority;
  };
}

/**
 * Requests the tile's content.
 * <p>
 * The request may not be made if the Cesium Request Scheduler can't prioritize it.
 * </p>
 *
 * @return {Number} The number of requests that were attempted but not scheduled.
 * @private
 */
Cesium3DTile.prototype.requestContent = function () {
  // empty contents don't require any HTTP requests
  if (this.hasEmptyContent) {
    return 0;
  }

  if (this.hasMultipleContents) {
    return requestMultipleContents(this);
  }

  return requestSingleContent(this);
};

/**
 * The <code>3DTILES_multiple_contents</code> extension allows multiple
 * {@link Cesium3DTileContent} within a single tile. Due to differences
 * in request scheduling, this is handled separately.
 * <p>
 * This implementation of <code>3DTILES_multiple_contents</code> does not
 * support tile expiry like requestSingleContent does. If this changes,
 * note that the resource.setQueryParameters() details must go inside {@link Multiple3DTileContent} since that is per-request.
 * </p>
 *
 * @private
 */
function requestMultipleContents(tile) {
  var multipleContents = tile._content;
  var tileset = tile._tileset;

  if (!defined(multipleContents)) {
    // Create the content object immediately, it will handle scheduling
    // requests for inner contents.
    var extensionHeader = tile._header.extensions["3DTILES_multiple_contents"];
    multipleContents = new Multiple3DTileContent(
      tileset,
      tile,
      tile._contentResource.clone(),
      extensionHeader
    );
    tile._content = multipleContents;
  }

  var backloggedRequestCount = multipleContents.requestInnerContents();
  if (backloggedRequestCount > 0) {
    return backloggedRequestCount;
  }

  tile._contentState = Cesium3DTileContentState.LOADING;
  tile._contentReadyToProcessPromise = when.defer();
  tile._contentReadyPromise = when.defer();

  multipleContents.contentsFetchedPromise
    .then(function () {
      if (tile._contentState !== Cesium3DTileContentState.LOADING) {
        // tile was canceled, short circuit.
        return;
      }

      if (tile.isDestroyed()) {
        multipleContentFailed(
          tile,
          tileset,
          "Tile was unloaded while content was loading"
        );
        return;
      }

      tile._contentState = Cesium3DTileContentState.PROCESSING;
      tile._contentReadyToProcessPromise.resolve(multipleContents);

      return multipleContents.readyPromise.then(function (content) {
        if (tile.isDestroyed()) {
          multipleContentFailed(
            tile,
            tileset,
            "Tile was unloaded while content was processing"
          );
          return;
        }

        // Refresh style for expired content
        tile._selectedFrame = 0;
        tile.lastStyleTime = 0.0;

        JulianDate.now(tile._loadTimestamp);
        tile._contentState = Cesium3DTileContentState.READY;
        tile._contentReadyPromise.resolve(content);
      });
    })
    .otherwise(function (error) {
      multipleContentFailed(tile, tileset, error);
    });

  return 0;
}

function multipleContentFailed(tile, tileset, error) {
  // note: The Multiple3DTileContent handles decrementing the number of pending
  // requests if the state is LOADING.
  if (tile._contentState === Cesium3DTileContentState.PROCESSING) {
    --tileset.statistics.numberOfTilesProcessing;
  }

  tile._contentState = Cesium3DTileContentState.FAILED;
  tile._contentReadyPromise.reject(error);
  tile._contentReadyToProcessPromise.reject(error);
}

function requestSingleContent(tile) {
  // it is important to clone here. The fetchArrayBuffer() below uses
  // throttling, but other uses of the resources do not.
  var resource = tile._contentResource.clone();
  var expired = tile.contentExpired;
  if (expired) {
    // Append a query parameter of the tile expiration date to prevent caching
    resource.setQueryParameters({
      expired: tile.expireDate.toString(),
    });
  }

  var request = new Request({
    throttle: true,
    throttleByServer: true,
    type: RequestType.TILES3D,
    priorityFunction: createPriorityFunction(tile),
    serverKey: tile._serverKey,
  });

  tile._request = request;
  resource.request = request;

  var promise = resource.fetchArrayBuffer();
  if (!defined(promise)) {
    return 1;
  }

  var previousState = tile._contentState;
  var tileset = tile._tileset;
  tile._contentState = Cesium3DTileContentState.LOADING;
  tile._contentReadyToProcessPromise = when.defer();
  tile._contentReadyPromise = when.defer();
  ++tileset.statistics.numberOfPendingRequests;

  promise
    .then(function (arrayBuffer) {
      if (tile.isDestroyed()) {
        // Tile is unloaded before the content finishes loading
        singleContentFailed(tile, tileset);
        return;
      }

      var content = makeContent(tile, arrayBuffer);

      if (expired) {
        tile.expireDate = undefined;
      }

      tile._content = content;
      tile._contentState = Cesium3DTileContentState.PROCESSING;
      tile._contentReadyToProcessPromise.resolve(content);
      --tileset.statistics.numberOfPendingRequests;

      return content.readyPromise.then(function (content) {
        if (tile.isDestroyed()) {
          // Tile is unloaded before the content finishes processing
          singleContentFailed(tile, tileset);
          return;
        }
        updateExpireDate(tile);

        // Refresh style for expired content
        tile._selectedFrame = 0;
        tile.lastStyleTime = 0.0;

        JulianDate.now(tile._loadTimestamp);
        tile._contentState = Cesium3DTileContentState.READY;
        tile._contentReadyPromise.resolve(content);
      });
    })
    .otherwise(function (error) {
      if (request.state === RequestState.CANCELLED) {
        // Cancelled due to low priority - try again later.
        tile._contentState = previousState;
        --tileset.statistics.numberOfPendingRequests;
        ++tileset.statistics.numberOfAttemptedRequests;
        return;
      }
      singleContentFailed(tile, tileset, error);
    });

  return 0;
}

function singleContentFailed(tile, tileset, error) {
  if (tile._contentState === Cesium3DTileContentState.PROCESSING) {
    --tileset.statistics.numberOfTilesProcessing;
  } else {
    --tileset.statistics.numberOfPendingRequests;
  }
  tile._contentState = Cesium3DTileContentState.FAILED;
  tile._contentReadyPromise.reject(error);
  tile._contentReadyToProcessPromise.reject(error);
}

/**
 * Given a downloaded content payload, construct a {@link Cesium3DTileContent}.
 * <p>
 * This is only used for single contents.
 * </p>
 *
 * @param {Cesium3DTile} tile The tile
 * @param {ArrayBuffer} arrayBuffer The downloaded payload containing data for the content
 * @return {Cesium3DTileContent} A content object
 * @private
 */
function makeContent(tile, arrayBuffer) {
  var preprocessed = preprocess3DTileContent(arrayBuffer);

  // Vector and Geometry tile rendering do not support the skip LOD optimization.
  var tileset = tile._tileset;
  tileset._disableSkipLevelOfDetail =
    tileset._disableSkipLevelOfDetail ||
    preprocessed.contentType === Cesium3DTileContentType.GEOMETRY ||
    preprocessed.contentType === Cesium3DTileContentType.VECTOR;

  if (preprocessed.contentType === Cesium3DTileContentType.IMPLICIT_SUBTREE) {
    tile.hasImplicitContent = true;
  }

  if (preprocessed.contentType === Cesium3DTileContentType.EXTERNAL_TILESET) {
    tile.hasTilesetContent = true;
  }

  var content;
  var contentFactory = Cesium3DTileContentFactory[preprocessed.contentType];
  if (defined(preprocessed.binaryPayload)) {
    content = contentFactory(
      tileset,
      tile,
      tile._contentResource,
      preprocessed.binaryPayload.buffer,
      0
    );
  } else {
    // JSON formats
    content = contentFactory(
      tileset,
      tile,
      tile._contentResource,
      preprocessed.jsonPayload
    );
  }

  var contentHeader = tile._header.content;
  content.groupMetadata = findGroupMetadata(tileset, contentHeader);
  return content;
}

/**
 * Cancel requests for the tile's contents. This is called when the tile
 * goes out of view.
 *
 * @private
 */
Cesium3DTile.prototype.cancelRequests = function () {
  if (this.hasMultipleContents) {
    this._content.cancelRequests();
  } else {
    this._request.cancel();
  }
};

/**
 * Unloads the tile's content.
 *
 * @private
 */
Cesium3DTile.prototype.unloadContent = function () {
  if (
    this.hasEmptyContent ||
    this.hasTilesetContent ||
    this.hasImplicitContent
  ) {
    return;
  }

  this._content = this._content && this._content.destroy();
  this._contentState = Cesium3DTileContentState.UNLOADED;
  this._contentReadyToProcessPromise = undefined;
  this._contentReadyPromise = undefined;

  this.lastStyleTime = 0.0;
  this.clippingPlanesDirty = this._clippingPlanesState === 0;
  this._clippingPlanesState = 0;

  this._debugColorizeTiles = false;

  this._debugBoundingVolume =
    this._debugBoundingVolume && this._debugBoundingVolume.destroy();
  this._debugContentBoundingVolume =
    this._debugContentBoundingVolume &&
    this._debugContentBoundingVolume.destroy();
  this._debugViewerRequestVolume =
    this._debugViewerRequestVolume && this._debugViewerRequestVolume.destroy();
};

var scratchProjectedBoundingSphere = new BoundingSphere();

function getBoundingVolume(tile, frameState) {
  if (
    frameState.mode !== SceneMode.SCENE3D &&
    !defined(tile._boundingVolume2D)
  ) {
    var boundingSphere = tile._boundingVolume.boundingSphere;
    var sphere = BoundingSphere.projectTo2D(
      boundingSphere,
      frameState.mapProjection,
      scratchProjectedBoundingSphere
    );
    tile._boundingVolume2D = new TileBoundingSphere(
      sphere.center,
      sphere.radius
    );
  }

  return frameState.mode !== SceneMode.SCENE3D
    ? tile._boundingVolume2D
    : tile._boundingVolume;
}

function getContentBoundingVolume(tile, frameState) {
  if (
    frameState.mode !== SceneMode.SCENE3D &&
    !defined(tile._contentBoundingVolume2D)
  ) {
    var boundingSphere = tile._contentBoundingVolume.boundingSphere;
    var sphere = BoundingSphere.projectTo2D(
      boundingSphere,
      frameState.mapProjection,
      scratchProjectedBoundingSphere
    );
    tile._contentBoundingVolume2D = new TileBoundingSphere(
      sphere.center,
      sphere.radius
    );
  }
  return frameState.mode !== SceneMode.SCENE3D
    ? tile._contentBoundingVolume2D
    : tile._contentBoundingVolume;
}

/**
 * Determines whether the tile's bounding volume intersects the culling volume.
 *
 * @param {FrameState} frameState The frame state.
 * @param {Number} parentVisibilityPlaneMask The parent's plane mask to speed up the visibility check.
 * @returns {Number} A plane mask as described above in {@link CullingVolume#computeVisibilityWithPlaneMask}.
 *
 * @private
 */
Cesium3DTile.prototype.visibility = function (
  frameState,
  parentVisibilityPlaneMask
) {
  var cullingVolume = frameState.cullingVolume;
  var boundingVolume = getBoundingVolume(this, frameState);

  var tileset = this._tileset;
  var clippingPlanes = tileset.clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    var intersection = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume,
      tileset.clippingPlanesOriginMatrix
    );
    this._isClipped = intersection !== Intersect.INSIDE;
    if (intersection === Intersect.OUTSIDE) {
      return CullingVolume.MASK_OUTSIDE;
    }
  }

  return cullingVolume.computeVisibilityWithPlaneMask(
    boundingVolume,
    parentVisibilityPlaneMask
  );
};

/**
 * Assuming the tile's bounding volume intersects the culling volume, determines
 * whether the tile's content's bounding volume intersects the culling volume.
 *
 * @param {FrameState} frameState The frame state.
 * @returns {Intersect} The result of the intersection: the tile's content is completely outside, completely inside, or intersecting the culling volume.
 *
 * @private
 */
Cesium3DTile.prototype.contentVisibility = function (frameState) {
  // Assumes the tile's bounding volume intersects the culling volume already, so
  // just return Intersect.INSIDE if there is no content bounding volume.
  if (!defined(this._contentBoundingVolume)) {
    return Intersect.INSIDE;
  }

  if (this._visibilityPlaneMask === CullingVolume.MASK_INSIDE) {
    // The tile's bounding volume is completely inside the culling volume so
    // the content bounding volume must also be inside.
    return Intersect.INSIDE;
  }

  // PERFORMANCE_IDEA: is it possible to burn less CPU on this test since we know the
  // tile's (not the content's) bounding volume intersects the culling volume?
  var cullingVolume = frameState.cullingVolume;
  var boundingVolume = getContentBoundingVolume(this, frameState);

  var tileset = this._tileset;
  var clippingPlanes = tileset.clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.enabled) {
    var intersection = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume,
      tileset.clippingPlanesOriginMatrix
    );
    this._isClipped = intersection !== Intersect.INSIDE;
    if (intersection === Intersect.OUTSIDE) {
      return Intersect.OUTSIDE;
    }
  }

  return cullingVolume.computeVisibility(boundingVolume);
};

/**
 * Computes the (potentially approximate) distance from the closest point of the tile's bounding volume to the camera.
 *
 * @param {FrameState} frameState The frame state.
 * @returns {Number} The distance, in meters, or zero if the camera is inside the bounding volume.
 *
 * @private
 */
Cesium3DTile.prototype.distanceToTile = function (frameState) {
  var boundingVolume = getBoundingVolume(this, frameState);
  return boundingVolume.distanceToCamera(frameState);
};

var scratchToTileCenter = new Cartesian3();

/**
 * Computes the distance from the center of the tile's bounding volume to the camera's plane defined by its position and view direction.
 *
 * @param {FrameState} frameState The frame state.
 * @returns {Number} The distance, in meters.
 *
 * @private
 */
Cesium3DTile.prototype.distanceToTileCenter = function (frameState) {
  var tileBoundingVolume = getBoundingVolume(this, frameState);
  var boundingVolume = tileBoundingVolume.boundingVolume; // Gets the underlying OrientedBoundingBox or BoundingSphere
  var toCenter = Cartesian3.subtract(
    boundingVolume.center,
    frameState.camera.positionWC,
    scratchToTileCenter
  );
  return Cartesian3.dot(frameState.camera.directionWC, toCenter);
};

/**
 * Checks if the camera is inside the viewer request volume.
 *
 * @param {FrameState} frameState The frame state.
 * @returns {Boolean} Whether the camera is inside the volume.
 *
 * @private
 */
Cesium3DTile.prototype.insideViewerRequestVolume = function (frameState) {
  var viewerRequestVolume = this._viewerRequestVolume;
  return (
    !defined(viewerRequestVolume) ||
    viewerRequestVolume.distanceToCamera(frameState) === 0.0
  );
};

var scratchMatrix = new Matrix3();
var scratchScale = new Cartesian3();
var scratchHalfAxes = new Matrix3();
var scratchCenter = new Cartesian3();
var scratchRectangle = new Rectangle();
var scratchOrientedBoundingBox = new OrientedBoundingBox();
var scratchTransform = new Matrix4();

function createBox(box, transform, result) {
  var center = Cartesian3.fromElements(box[0], box[1], box[2], scratchCenter);
  var halfAxes = Matrix3.fromArray(box, 3, scratchHalfAxes);

  // Find the transformed center and halfAxes
  center = Matrix4.multiplyByPoint(transform, center, center);
  var rotationScale = Matrix4.getMatrix3(transform, scratchMatrix);
  halfAxes = Matrix3.multiply(rotationScale, halfAxes, halfAxes);

  if (defined(result)) {
    result.update(center, halfAxes);
    return result;
  }
  return new TileOrientedBoundingBox(center, halfAxes);
}

function createBoxFromTransformedRegion(
  region,
  transform,
  initialTransform,
  result
) {
  var rectangle = Rectangle.unpack(region, 0, scratchRectangle);
  var minimumHeight = region[4];
  var maximumHeight = region[5];

  var orientedBoundingBox = OrientedBoundingBox.fromRectangle(
    rectangle,
    minimumHeight,
    maximumHeight,
    Ellipsoid.WGS84,
    scratchOrientedBoundingBox
  );
  var center = orientedBoundingBox.center;
  var halfAxes = orientedBoundingBox.halfAxes;

  // A region bounding volume is not transformed by the transform in the tileset JSON,
  // but may be transformed by additional transforms applied in Cesium.
  // This is why the transform is calculated as the difference between the initial transform and the current transform.
  transform = Matrix4.multiplyTransformation(
    transform,
    Matrix4.inverseTransformation(initialTransform, scratchTransform),
    scratchTransform
  );
  center = Matrix4.multiplyByPoint(transform, center, center);
  var rotationScale = Matrix4.getMatrix3(transform, scratchMatrix);
  halfAxes = Matrix3.multiply(rotationScale, halfAxes, halfAxes);

  if (defined(result) && result instanceof TileOrientedBoundingBox) {
    result.update(center, halfAxes);
    return result;
  }

  return new TileOrientedBoundingBox(center, halfAxes);
}

function createRegion(region, transform, initialTransform, result) {
  if (
    !Matrix4.equalsEpsilon(transform, initialTransform, CesiumMath.EPSILON8)
  ) {
    return createBoxFromTransformedRegion(
      region,
      transform,
      initialTransform,
      result
    );
  }

  if (defined(result)) {
    return result;
  }

  var rectangleRegion = Rectangle.unpack(region, 0, scratchRectangle);

  return new TileBoundingRegion({
    rectangle: rectangleRegion,
    minimumHeight: region[4],
    maximumHeight: region[5],
  });
}

function createSphere(sphere, transform, result) {
  var center = Cartesian3.fromElements(
    sphere[0],
    sphere[1],
    sphere[2],
    scratchCenter
  );
  var radius = sphere[3];

  // Find the transformed center and radius
  center = Matrix4.multiplyByPoint(transform, center, center);
  var scale = Matrix4.getScale(transform, scratchScale);
  var uniformScale = Cartesian3.maximumComponent(scale);
  radius *= uniformScale;

  if (defined(result)) {
    result.update(center, radius);
    return result;
  }
  return new TileBoundingSphere(center, radius);
}

/**
 * Create a bounding volume from the tile's bounding volume header.
 *
 * @param {Object} boundingVolumeHeader The tile's bounding volume header.
 * @param {Matrix4} transform The transform to apply to the bounding volume.
 * @param {TileBoundingVolume} [result] The object onto which to store the result.
 *
 * @returns {TileBoundingVolume} The modified result parameter or a new TileBoundingVolume instance if none was provided.
 *
 * @private
 */
Cesium3DTile.prototype.createBoundingVolume = function (
  boundingVolumeHeader,
  transform,
  result
) {
  if (!defined(boundingVolumeHeader)) {
    throw new RuntimeError("boundingVolume must be defined");
  }
  if (has3DTilesExtension(boundingVolumeHeader, "3DTILES_bounding_volume_S2")) {
    return new TileBoundingS2Cell(
      boundingVolumeHeader.extensions["3DTILES_bounding_volume_S2"]
    );
  }

  if (defined(boundingVolumeHeader.box)) {
    return createBox(boundingVolumeHeader.box, transform, result);
  }
  if (defined(boundingVolumeHeader.region)) {
    return createRegion(
      boundingVolumeHeader.region,
      transform,
      this._initialTransform,
      result
    );
  }
  if (defined(boundingVolumeHeader.sphere)) {
    return createSphere(boundingVolumeHeader.sphere, transform, result);
  }
  throw new RuntimeError(
    "boundingVolume must contain a sphere, region, or box"
  );
};

/**
 * Update the tile's transform. The transform is applied to the tile's bounding volumes.
 *
 * @private
 */
Cesium3DTile.prototype.updateTransform = function (parentTransform) {
  parentTransform = defaultValue(parentTransform, Matrix4.IDENTITY);
  var computedTransform = Matrix4.multiply(
    parentTransform,
    this.transform,
    scratchTransform
  );
  var transformChanged = !Matrix4.equals(
    computedTransform,
    this.computedTransform
  );

  if (!transformChanged) {
    return;
  }

  Matrix4.clone(computedTransform, this.computedTransform);

  // Update the bounding volumes
  var header = this._header;
  var content = this._header.content;
  this._boundingVolume = this.createBoundingVolume(
    header.boundingVolume,
    this.computedTransform,
    this._boundingVolume
  );
  if (defined(this._contentBoundingVolume)) {
    this._contentBoundingVolume = this.createBoundingVolume(
      content.boundingVolume,
      this.computedTransform,
      this._contentBoundingVolume
    );
  }
  if (defined(this._viewerRequestVolume)) {
    this._viewerRequestVolume = this.createBoundingVolume(
      header.viewerRequestVolume,
      this.computedTransform,
      this._viewerRequestVolume
    );
  }

  this.updateGeometricErrorScale();

  // Destroy the debug bounding volumes. They will be generated fresh.
  this._debugBoundingVolume =
    this._debugBoundingVolume && this._debugBoundingVolume.destroy();
  this._debugContentBoundingVolume =
    this._debugContentBoundingVolume &&
    this._debugContentBoundingVolume.destroy();
  this._debugViewerRequestVolume =
    this._debugViewerRequestVolume && this._debugViewerRequestVolume.destroy();
};

Cesium3DTile.prototype.updateGeometricErrorScale = function () {
  var scale = Matrix4.getScale(this.computedTransform, scratchScale);
  var uniformScale = Cartesian3.maximumComponent(scale);
  this.geometricError = this._geometricError * uniformScale;
};

function applyDebugSettings(tile, tileset, frameState, passOptions) {
  if (!passOptions.isRender) {
    return;
  }

  var hasContentBoundingVolume =
    defined(tile._header.content) &&
    defined(tile._header.content.boundingVolume);
  var empty =
    tile.hasEmptyContent || tile.hasTilesetContent || tile.hasImplicitContent;

  var showVolume =
    tileset.debugShowBoundingVolume ||
    (tileset.debugShowContentBoundingVolume && !hasContentBoundingVolume);
  if (showVolume) {
    var color;
    if (!tile._finalResolution) {
      color = Color.YELLOW;
    } else if (empty) {
      color = Color.DARKGRAY;
    } else {
      color = Color.WHITE;
    }
    if (!defined(tile._debugBoundingVolume)) {
      tile._debugBoundingVolume = tile._boundingVolume.createDebugVolume(color);
    }
    tile._debugBoundingVolume.update(frameState);
    var attributes = tile._debugBoundingVolume.getGeometryInstanceAttributes(
      "outline"
    );
    attributes.color = ColorGeometryInstanceAttribute.toValue(
      color,
      attributes.color
    );
  } else if (!showVolume && defined(tile._debugBoundingVolume)) {
    tile._debugBoundingVolume = tile._debugBoundingVolume.destroy();
  }

  if (tileset.debugShowContentBoundingVolume && hasContentBoundingVolume) {
    if (!defined(tile._debugContentBoundingVolume)) {
      tile._debugContentBoundingVolume = tile._contentBoundingVolume.createDebugVolume(
        Color.BLUE
      );
    }
    tile._debugContentBoundingVolume.update(frameState);
  } else if (
    !tileset.debugShowContentBoundingVolume &&
    defined(tile._debugContentBoundingVolume)
  ) {
    tile._debugContentBoundingVolume = tile._debugContentBoundingVolume.destroy();
  }

  if (
    tileset.debugShowViewerRequestVolume &&
    defined(tile._viewerRequestVolume)
  ) {
    if (!defined(tile._debugViewerRequestVolume)) {
      tile._debugViewerRequestVolume = tile._viewerRequestVolume.createDebugVolume(
        Color.YELLOW
      );
    }
    tile._debugViewerRequestVolume.update(frameState);
  } else if (
    !tileset.debugShowViewerRequestVolume &&
    defined(tile._debugViewerRequestVolume)
  ) {
    tile._debugViewerRequestVolume = tile._debugViewerRequestVolume.destroy();
  }

  var debugColorizeTilesOn =
    (tileset.debugColorizeTiles && !tile._debugColorizeTiles) ||
    defined(tileset._heatmap.tilePropertyName);
  var debugColorizeTilesOff =
    !tileset.debugColorizeTiles && tile._debugColorizeTiles;

  if (debugColorizeTilesOn) {
    tileset._heatmap.colorize(tile, frameState); // Skipped if tileset._heatmap.tilePropertyName is undefined
    tile._debugColorizeTiles = true;
    tile.color = tile._debugColor;
  } else if (debugColorizeTilesOff) {
    tile._debugColorizeTiles = false;
    tile.color = Color.WHITE;
  }

  if (tile._colorDirty) {
    tile._colorDirty = false;
    tile._content.applyDebugSettings(true, tile._color);
  }

  if (debugColorizeTilesOff) {
    tileset.makeStyleDirty(); // Re-apply style now that colorize is switched off
  }
}

function updateContent(tile, tileset, frameState) {
  var content = tile._content;
  var expiredContent = tile._expiredContent;

  // expired content is not supported for 3DTILES_multiple_contents
  if (!tile.hasMultipleContents && defined(expiredContent)) {
    if (!tile.contentReady) {
      // Render the expired content while the content loads
      expiredContent.update(tileset, frameState);
      return;
    }

    // New content is ready, destroy expired content
    tile._expiredContent.destroy();
    tile._expiredContent = undefined;
  }

  content.update(tileset, frameState);
}

function updateClippingPlanes(tile, tileset) {
  // Compute and compare ClippingPlanes state:
  // - enabled-ness - are clipping planes enabled? is this tile clipped?
  // - clipping plane count
  // - clipping function (union v. intersection)
  var clippingPlanes = tileset.clippingPlanes;
  var currentClippingPlanesState = 0;
  if (defined(clippingPlanes) && tile._isClipped && clippingPlanes.enabled) {
    currentClippingPlanesState = clippingPlanes.clippingPlanesState;
  }
  // If clippingPlaneState for tile changed, mark clippingPlanesDirty so content can update
  if (currentClippingPlanesState !== tile._clippingPlanesState) {
    tile._clippingPlanesState = currentClippingPlanesState;
    tile.clippingPlanesDirty = true;
  }
}

/**
 * Get the draw commands needed to render this tile.
 *
 * @private
 */
Cesium3DTile.prototype.update = function (tileset, frameState, passOptions) {
  var commandStart = frameState.commandList.length;

  updateClippingPlanes(this, tileset);
  applyDebugSettings(this, tileset, frameState, passOptions);
  updateContent(this, tileset, frameState);

  var commandEnd = frameState.commandList.length;
  var commandsLength = commandEnd - commandStart;
  this._commandsLength = commandsLength;

  for (var i = 0; i < commandsLength; ++i) {
    var command = frameState.commandList[commandStart + i];
    var translucent = command.pass === Pass.TRANSLUCENT;
    command.depthForTranslucentClassification = translucent;
  }

  this.clippingPlanesDirty = false; // reset after content update
};

var scratchCommandList = [];

/**
 * Processes the tile's content, e.g., create WebGL resources, to move from the PROCESSING to READY state.
 *
 * @param {Cesium3DTileset} tileset The tileset containing this tile.
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
Cesium3DTile.prototype.process = function (tileset, frameState) {
  var savedCommandList = frameState.commandList;
  frameState.commandList = scratchCommandList;

  this._content.update(tileset, frameState);

  scratchCommandList.length = 0;
  frameState.commandList = savedCommandList;
};

function isolateDigits(normalizedValue, numberOfDigits, leftShift) {
  var scaled = normalizedValue * Math.pow(10, numberOfDigits);
  var integer = parseInt(scaled);
  return integer * Math.pow(10, leftShift);
}

function priorityNormalizeAndClamp(value, minimum, maximum) {
  return Math.max(
    CesiumMath.normalize(value, minimum, maximum) - CesiumMath.EPSILON7,
    0.0
  ); // Subtract epsilon since we only want decimal digits present in the output.
}

/**
 * Sets the priority of the tile based on distance and depth
 * @private
 */
Cesium3DTile.prototype.updatePriority = function () {
  var tileset = this.tileset;
  var preferLeaves = tileset.preferLeaves;
  var minimumPriority = tileset._minimumPriority;
  var maximumPriority = tileset._maximumPriority;

  // Combine priority systems together by mapping them into a base 10 number where each priority controls a specific set of digits in the number.
  // For number priorities, map them to a 0.xxxxx number then left shift it up into a set number of digits before the decimal point. Chop of the fractional part then left shift again into the position it needs to go.
  // For blending number priorities, normalize them to 0-1 and interpolate to get a combined 0-1 number, then proceed as normal.
  // Booleans can just be 0 or 10^leftshift.
  // Think of digits as penalties since smaller numbers are higher priority. If a tile has some large quantity or has a flag raised it's (usually) penalized for it, expressed as a higher number for the digit.
  // Priority number format: preloadFlightDigits(1) | foveatedDeferDigits(1) | foveatedDigits(4) | preloadProgressiveResolutionDigits(1) | preferredSortingDigits(4) . depthDigits(the decimal digits)
  // Certain flags like preferLeaves will flip / turn off certain digits to get desired load order.

  // Setup leftShifts, digit counts, and scales (for booleans)
  var digitsForANumber = 4;
  var digitsForABoolean = 1;

  var preferredSortingLeftShift = 0;
  var preferredSortingDigitsCount = digitsForANumber;

  var foveatedLeftShift =
    preferredSortingLeftShift + preferredSortingDigitsCount;
  var foveatedDigitsCount = digitsForANumber;

  var preloadProgressiveResolutionLeftShift =
    foveatedLeftShift + foveatedDigitsCount;
  var preloadProgressiveResolutionDigitsCount = digitsForABoolean;
  var preloadProgressiveResolutionScale = Math.pow(
    10,
    preloadProgressiveResolutionLeftShift
  );

  var foveatedDeferLeftShift =
    preloadProgressiveResolutionLeftShift +
    preloadProgressiveResolutionDigitsCount;
  var foveatedDeferDigitsCount = digitsForABoolean;
  var foveatedDeferScale = Math.pow(10, foveatedDeferLeftShift);

  var preloadFlightLeftShift =
    foveatedDeferLeftShift + foveatedDeferDigitsCount;
  var preloadFlightScale = Math.pow(10, preloadFlightLeftShift);

  // Compute the digits for each priority
  var depthDigits = priorityNormalizeAndClamp(
    this._depth,
    minimumPriority.depth,
    maximumPriority.depth
  );
  depthDigits = preferLeaves ? 1.0 - depthDigits : depthDigits;

  // Map 0-1 then convert to digit. Include a distance sort when doing non-skipLOD and replacement refinement, helps things like non-skipLOD photogrammetry
  var useDistance =
    !tileset._skipLevelOfDetail && this.refine === Cesium3DTileRefine.REPLACE;
  var normalizedPreferredSorting = useDistance
    ? priorityNormalizeAndClamp(
        this._priorityHolder._distanceToCamera,
        minimumPriority.distance,
        maximumPriority.distance
      )
    : priorityNormalizeAndClamp(
        this._priorityReverseScreenSpaceError,
        minimumPriority.reverseScreenSpaceError,
        maximumPriority.reverseScreenSpaceError
      );
  var preferredSortingDigits = isolateDigits(
    normalizedPreferredSorting,
    preferredSortingDigitsCount,
    preferredSortingLeftShift
  );

  var preloadProgressiveResolutionDigits = this._priorityProgressiveResolution
    ? 0
    : preloadProgressiveResolutionScale;

  var normalizedFoveatedFactor = priorityNormalizeAndClamp(
    this._priorityHolder._foveatedFactor,
    minimumPriority.foveatedFactor,
    maximumPriority.foveatedFactor
  );
  var foveatedDigits = isolateDigits(
    normalizedFoveatedFactor,
    foveatedDigitsCount,
    foveatedLeftShift
  );

  var foveatedDeferDigits = this.priorityDeferred ? foveatedDeferScale : 0;

  var preloadFlightDigits =
    tileset._pass === Cesium3DTilePass.PRELOAD_FLIGHT ? 0 : preloadFlightScale;

  // Get the final base 10 number
  this._priority =
    depthDigits +
    preferredSortingDigits +
    preloadProgressiveResolutionDigits +
    foveatedDigits +
    foveatedDeferDigits +
    preloadFlightDigits;
};

/**
 * @private
 */
Cesium3DTile.prototype.isDestroyed = function () {
  return false;
};

/**
 * @private
 */
Cesium3DTile.prototype.destroy = function () {
  // For the interval between new content being requested and downloaded, expiredContent === content, so don't destroy twice
  this._content = this._content && this._content.destroy();
  this._expiredContent =
    this._expiredContent &&
    !this._expiredContent.isDestroyed() &&
    this._expiredContent.destroy();
  this._debugBoundingVolume =
    this._debugBoundingVolume && this._debugBoundingVolume.destroy();
  this._debugContentBoundingVolume =
    this._debugContentBoundingVolume &&
    this._debugContentBoundingVolume.destroy();
  this._debugViewerRequestVolume =
    this._debugViewerRequestVolume && this._debugViewerRequestVolume.destroy();
  return destroyObject(this);
};
export default Cesium3DTile;
