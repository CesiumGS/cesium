/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Extent',
        '../Core/ExtentGeometry',
        '../Core/ExtentOutlineGeometry',
        '../Core/GeometryInstance',
        '../Core/Intersect',
        './GeographicTilingScheme',
        './PerInstanceColorAppearance',
        './Primitive',
        './TerrainProvider',
        './QuadtreeTileState'
    ], function(
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        Extent,
        ExtentGeometry,
        ExtentOutlineGeometry,
        GeometryInstance,
        Intersect,
        GeographicTilingScheme,
        PerInstanceColorAppearance,
        Primitive,
        TerrainProvider,
        QuadtreeTileState) {
    "use strict";

    /**
     * @alias ExtentTileProvider
     * @constructor
     */
    var ExtentTileProvider = function ExtentTileProvider() {
        this._tilingScheme = new GeographicTilingScheme();
        this._errorEvent = new Event();

        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this._tilingScheme.ellipsoid, 65, this._tilingScheme.getNumberOfXTilesAtLevel(0));
    };

    defineProperties(ExtentTileProvider.prototype, {
        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof ExtentTileProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() { return true; }
        },

        /**
         * Gets the extent, in radians, of the imagery provided by the instance.  This function should
         * not be called before {@link ExtentTileProvider#ready} returns true.
         * @memberof ExtentTileProvider.prototype
         * @type {Extent}
         */
        extent: {
            get : function() { return Extent.MAX_VALUE; }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link ExtentTileProvider#ready} returns true.
         * @memberof ExtentTileProvider.prototype
         * @type {Number}
         */
        maximumLevel : {
            get : function() { return undefined; }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link ExtentTileProvider#ready} returns true. Generally,
         * a minimum level should only be used when the extent of the geometry is small
         * enough that the number of tiles at the minimum level is small.  A geometry
         * provider with more than a few tiles at the minimum level will lead to
         * rendering problems.
         * @memberof ExtentTileProvider.prototype
         * @type {Number}
         */
        minimumLevel : {
            get : function() { return undefined; }
        },

        /**
         * Gets the tiling scheme used by the provider.  This function should
         * not be called before {@link ExtentTileProvider#ready} returns true.
         * @memberof ExtentTileProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : function() { return this._tilingScheme; }
        },

        /**
         * Gets an event that is raised when the geometry provider encounters an asynchronous error..  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof ExtentTileProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() { return this._errorEvent; }
        },

        /**
         * Gets the credit to display when this geometry provider is active.  Typically this is used to credit
         * the source of the geometry. This function should
         * not be called before {@link ExtentTileProvider#ready} returns true.
         * @memberof ExtentTileProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : function() { return undefined; }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof ExtentTileProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : function() { return undefined; }
        }
    });

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @memberof CesiumTerrainProvider
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    ExtentTileProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     * @memberof ExtentTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the geometry provider is ready.
     */
    ExtentTileProvider.prototype.getTileCredits = function(tile) {
        return undefined;
    };

    /**
     * Loads, or continues loading, a given tile.  This function will continue to be called
     * until {@link ExtentTileProvider#isTileDoneLoading} returns true.  This function should
     * not be called before {@link ExtentTileProvider#isReady} returns true.
     *
     * @memberof ExtentTileProvider
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
    ExtentTileProvider.prototype.loadTile = function(context, frameState, x, y, level, tile) {
        if (!defined(tile)) {
            var extent = this.tilingScheme.tileXYToExtent(x, y, level);
            var color = Color.fromBytes(255, 0, 0, 255);

            return new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : new ExtentOutlineGeometry({
                        extent : extent
                    }),
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(color)
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    renderState : {
                        depthTest : {
                            enabled : true
                        },
                        lineWidth : 1.0
                    }
                })
            });
        } else {
            tile.update(context, frameState, []);
            return tile;
        }
    };

    /**
     * Gets the current state of the given tile.
     *
     * @memberof ExtentTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {QuadtreeTileState} The current state of the tile.
     */
    ExtentTileProvider.prototype.getTileState = function(tile) {
        return defined(tile) && tile.isReady() ? QuadtreeTileState.READY : QuadtreeTileState.LOADING;
    };

    /**
     * Returns true if the tile is renderable.  Tiles that are both visible and renderable will be rendered by a call to
     * {@link ExtentTileProvider#renderTile}
     *
     * @memberof ExtentTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {Boolean} true if the tile is renderable; otherwise, false.
     */
    ExtentTileProvider.prototype.isTileRenderable = function(tile) {
        return defined(tile) && tile.isReady();
    };

    /**
     * Returns true if the tile is visible.  Tiles that are both visible and renderable will be rendered by a call to
     * {@link ExtentTileProvider#renderTile}
     *
     * @memberof ExtentTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {FrameState} frameState The state information about the current frame.
     *
     * @returns {Boolean} true if the tile is visible; otherwise, false.
     */
    ExtentTileProvider.prototype.isTileVisible = function(tile, frameState) {
        var boundingSphere = tile.getBoundingSphere(frameState);
        if (!defined(boundingSphere)) {
            return false;
        } else {
            return frameState.cullingVolume.getVisibility(boundingSphere) !== Intersect.OUTSIDE;
        }
    };

    /**
     * Renders a given tile.
     *
     * @memberof ExtentTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The state information of the current rendering frame.
     * @param {Command[]} commandList The list of rendering commands.  This method should add additional commands to this list.
     */
    ExtentTileProvider.prototype.renderTile = function(tile, context, frameState, commandList) {
        tile.update(context, frameState, commandList);
    };

    var cartesian3Scratch = new Cartesian3();

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
     *
     * @memberof ExtentTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     *
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    ExtentTileProvider.prototype.getDistanceToTile = function(tile, frameState) {
        return Math.max(0.0, Cartesian3.magnitude(Cartesian3.subtract(tile.getBoundingSphere(frameState).center, frameState.camera.position)) - tile._boundingSphere.radius);
    };

    ExtentTileProvider.prototype.divideTile = function() {
        return undefined;
    };

    /**
     * Releases the geometry for a given tile.
     *
     * @memberof ExtentTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     */
    ExtentTileProvider.prototype.releaseTile = function(tile) {
        tile.destroy();
    };

    return ExtentTileProvider;
});
