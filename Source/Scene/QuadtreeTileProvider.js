/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
        defined,
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * Provides general quadtree tiles to be displayed on or near the surface of an ellipsoid.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias QuadtreeTileProvider
     * @constructor
     */
    var QuadtreeTileProvider = function QuadtreeTileProvider() {
        DeveloperError.throwInstantiationError();
    };

    QuadtreeTileProvider.computeDefaultLevelZeroMaximumGeometricError = function(tilingScheme) {
        return tilingScheme.ellipsoid.maximumRadius * 2 * Math.PI * 0.25 / (65 * tilingScheme.getNumberOfXTilesAtLevel(0));
    };

    QuadtreeTileProvider.defaultGetLevelMaximumGeometricError = function() {

    };

    defineProperties(QuadtreeTileProvider.prototype, {
        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof QuadtreeTileProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by the instance.  This function should
         * not be called before {@link QuadtreeTileProvider#ready} returns true.
         * @memberof QuadtreeTileProvider.prototype
         * @type {Rectangle}
         */
        rectangle : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link QuadtreeTileProvider#ready} returns true.
         * @memberof QuadtreeTileProvider.prototype
         * @type {Number}
         */
        maximumLevel : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link QuadtreeTileProvider#ready} returns true. Generally,
         * a minimum level should only be used when the rectangle of the geometry is small
         * enough that the number of tiles at the minimum level is small.  A geometry
         * provider with more than a few tiles at the minimum level will lead to
         * rendering problems.
         * @memberof QuadtreeTileProvider.prototype
         * @type {Number}
         */
        minimumLevel : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the tiling scheme used by the provider.  This function should
         * not be called before {@link QuadtreeTileProvider#ready} returns true.
         * @memberof QuadtreeTileProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets an event that is raised when the geometry provider encounters an asynchronous error..  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof QuadtreeTileProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the credit to display when this geometry provider is active.  Typically this is used to credit
         * the source of the geometry. This function should
         * not be called before {@link QuadtreeTileProvider#ready} returns true.
         * @memberof QuadtreeTileProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof QuadtreeTileProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.  This function should not be
     * called before {@link QuadtreeTileProvider#ready} returns true.
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    QuadtreeTileProvider.prototype.getLevelMaximumGeometricError = DeveloperError.throwInstantiationError;

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the geometry provider is ready.
     */
    QuadtreeTileProvider.prototype.getTileCredits = DeveloperError.throwInstantiationError;

    /**
     * Loads, or continues loading, a given tile.  This function will continue to be called
     * until {@link QuadtreeTileProvider#isTileDoneLoading} returns true.  This function should
     * not be called before {@link QuadtreeTileProvider#isReady} returns true.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Context} context The rendering context.
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Object} tile The tile instance returned from a previous invocation, if any.
     *
     * @returns {Object} The tile instance, which may be undefined if the tile cannot begin
     *                   loading yet, perhaps because too many requests to the same server
     *                   are already in flight.
     *
     * @exception {DeveloperError} <code>loadTile</code> must not be called before the tile provider is ready.
     */
    QuadtreeTileProvider.prototype.loadTile = DeveloperError.throwInstantiationError;

    /**
     * Gets the current state of the given tile.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {QuadtreeTileState} The current state of the tile.
     */
    QuadtreeTileProvider.prototype.getTileState = DeveloperError.throwInstantiationError;

    /**
     * Returns true if the tile is renderable.  Tiles that are both visible and renderable will be rendered by a call to
     * {@link QuadtreeTileProvider#renderTile}
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {Boolean} true if the tile is renderable; otherwise, false.
     */
    QuadtreeTileProvider.prototype.isTileRenderable = DeveloperError.throwInstantiationError;

    /**
     * Returns true if the tile is visible.  Tiles that are both visible and renderable will be rendered by a call to
     * {@link QuadtreeTileProvider#renderTile}
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {FrameState} frameState The state information about the current frame.
     *
     * @returns {Boolean} true if the tile is visible; otherwise, false.
     */
    QuadtreeTileProvider.prototype.isTileVisible = DeveloperError.throwInstantiationError;

    /**
     * Renders a given tile.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The state information of the current rendering frame.
     * @param {Command[]} commandList The list of rendering commands.  This method should add additional commands to this list.
     */
    QuadtreeTileProvider.prototype.renderTile = DeveloperError.throwInstantiationError;

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     *
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    QuadtreeTileProvider.prototype.getDistanceToTile = DeveloperError.throwInstantiationError;

    /**
     * Releases the geometry for a given tile.
     *
     * @memberof QuadtreeTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     */
    QuadtreeTileProvider.prototype.releaseTile = DeveloperError.throwInstantiationError;

    return QuadtreeTileProvider;
});
