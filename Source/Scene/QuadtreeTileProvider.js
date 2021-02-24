import DeveloperError from "../Core/DeveloperError.js";

/**
 * Provides general quadtree tiles to be displayed on or near the surface of an ellipsoid.  It is intended to be
 * used with the {@link QuadtreePrimitive}.  This type describes an interface and is not intended to be
 * instantiated directly.
 *
 * @alias QuadtreeTileProvider
 * @constructor
 * @private
 */
function QuadtreeTileProvider() {
  DeveloperError.throwInstantiationError();
}

/**
 * Computes the default geometric error for level zero of the quadtree.
 *
 * @memberof QuadtreeTileProvider
 *
 * @param {TilingScheme} tilingScheme The tiling scheme for which to compute the geometric error.
 * @returns {Number} The maximum geometric error at level zero, in meters.
 */
QuadtreeTileProvider.computeDefaultLevelZeroMaximumGeometricError = function (
  tilingScheme
) {
  return (
    (tilingScheme.ellipsoid.maximumRadius * 2 * Math.PI * 0.25) /
    (65 * tilingScheme.getNumberOfXTilesAtLevel(0))
  );
};

Object.defineProperties(QuadtreeTileProvider.prototype, {
  /**
   * Gets or sets the {@link QuadtreePrimitive} for which this provider is
   * providing tiles.
   * @memberof QuadtreeTileProvider.prototype
   * @type {QuadtreePrimitive}
   */
  quadtree: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof QuadtreeTileProvider.prototype
   * @type {Boolean}
   */
  ready: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the tiling scheme used by the provider.  This property should
   * not be accessed before {@link QuadtreeTileProvider#ready} returns true.
   * @memberof QuadtreeTileProvider.prototype
   * @type {TilingScheme}
   */
  tilingScheme: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets an event that is raised when the geometry provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof QuadtreeTileProvider.prototype
   * @type {Event}
   */
  errorEvent: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Called at the beginning of the update cycle, regardless of id a new frame is being rendered, before {@link QuadtreeTileProvider#beginUpdate}
 * @memberof QuadtreeTileProvider
 * @function
 *
 * @param {Context} context The rendering context.
 * @param {FrameState} frameState The frame state.
 */
QuadtreeTileProvider.prototype.update = DeveloperError.throwInstantiationError;

/**
 * Called at the beginning of the update cycle for each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
 * or any other functions.
 * @memberof QuadtreeTileProvider
 * @function
 *
 * @param {Context} context The rendering context.
 * @param {FrameState} frameState The frame state.
 * @param {DrawCommand[]} commandList An array of rendering commands.  This method may push
 *        commands into this array.
 */
QuadtreeTileProvider.prototype.beginUpdate =
  DeveloperError.throwInstantiationError;

/**
 * Called at the end of the update cycle for each render frame, after {@link QuadtreeTileProvider#showTileThisFrame}
 * and any other functions.
 * @memberof QuadtreeTileProvider
 * @function
 *
 * @param {Context} context The rendering context.
 * @param {FrameState} frameState The frame state.
 * @param {DrawCommand[]} commandList An array of rendering commands.  This method may push
 *        commands into this array.
 */
QuadtreeTileProvider.prototype.endUpdate =
  DeveloperError.throwInstantiationError;

/**
 * Gets the maximum geometric error allowed in a tile at a given level, in meters.  This function should not be
 * called before {@link QuadtreeTileProvider#ready} returns true.
 *
 * @see QuadtreeTileProvider#computeDefaultLevelZeroMaximumGeometricError
 *
 * @memberof QuadtreeTileProvider
 * @function
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error in meters.
 */
QuadtreeTileProvider.prototype.getLevelMaximumGeometricError =
  DeveloperError.throwInstantiationError;

/**
 * Loads, or continues loading, a given tile.  This function will continue to be called
 * until {@link QuadtreeTile#state} is no longer {@link QuadtreeTileLoadState#LOADING}.  This function should
 * not be called before {@link QuadtreeTileProvider#ready} returns true.
 *
 * @memberof QuadtreeTileProvider
 * @function
 *
 * @param {Context} context The rendering context.
 * @param {FrameState} frameState The frame state.
 * @param {QuadtreeTile} tile The tile to load.
 *
 * @exception {DeveloperError} <code>loadTile</code> must not be called before the tile provider is ready.
 */
QuadtreeTileProvider.prototype.loadTile =
  DeveloperError.throwInstantiationError;

/**
 * Determines the visibility of a given tile.  The tile may be fully visible, partially visible, or not
 * visible at all.  Tiles that are renderable and are at least partially visible will be shown by a call
 * to {@link QuadtreeTileProvider#showTileThisFrame}.
 *
 * @memberof QuadtreeTileProvider
 *
 * @param {QuadtreeTile} tile The tile instance.
 * @param {FrameState} frameState The state information about the current frame.
 * @param {QuadtreeOccluders} occluders The objects that may occlude this tile.
 *
 * @returns {Visibility} The visibility of the tile.
 */
QuadtreeTileProvider.prototype.computeTileVisibility =
  DeveloperError.throwInstantiationError;

/**
 * Shows a specified tile in this frame.  The provider can cause the tile to be shown by adding
 * render commands to the commandList, or use any other method as appropriate.  The tile is not
 * expected to be visible next frame as well, unless this method is call next frame, too.
 *
 * @memberof QuadtreeTileProvider
 * @function
 *
 * @param {QuadtreeTile} tile The tile instance.
 * @param {Context} context The rendering context.
 * @param {FrameState} frameState The state information of the current rendering frame.
 * @param {DrawCommand[]} commandList The list of rendering commands.  This method may add additional commands to this list.
 */
QuadtreeTileProvider.prototype.showTileThisFrame =
  DeveloperError.throwInstantiationError;

/**
 * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
 *
 * @memberof QuadtreeTileProvider
 * @function
 *
 * @param {QuadtreeTile} tile The tile instance.
 * @param {FrameState} frameState The state information of the current rendering frame.
 *
 * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
 */
QuadtreeTileProvider.prototype.computeDistanceToTile =
  DeveloperError.throwInstantiationError;

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @memberof QuadtreeTileProvider
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 *
 * @see QuadtreeTileProvider#destroy
 */
QuadtreeTileProvider.prototype.isDestroyed =
  DeveloperError.throwInstantiationError;

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @memberof QuadtreeTileProvider
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * provider = provider && provider();
 *
 * @see QuadtreeTileProvider#isDestroyed
 */
QuadtreeTileProvider.prototype.destroy = DeveloperError.throwInstantiationError;
export default QuadtreeTileProvider;
