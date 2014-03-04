/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/loadImage',
        '../Core/loadImageViaBlob',
        '../Core/DeveloperError',
        '../Core/throttleRequestByServer'
    ], function(
        defined,
        defineProperties,
        loadImage,
        loadImageViaBlob,
        DeveloperError,
        throttleRequestByServer) {
    "use strict";

    /**
     * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias GeometryProvider
     * @constructor
     *
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers.html">Cesium Sandcastle Imagery Layers Demo</a>
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers%20Manipulation.html">Cesium Sandcastle Imagery Manipulation Demo</a>
     */
    var GeometryProvider = function GeometryProvider() {
        /**
         * The default alpha blending value of this provider, usually from 0.0 to 1.0.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, the layer, and the x, y, and level coordinates of the
         * imagery tile for which the alpha is required, and it is expected to return
         * the alpha value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultAlpha = undefined;

        /**
         * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
         * makes the imagery darker while greater than 1.0 makes it brighter.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, the layer, and the x, y, and level coordinates of the
         * imagery tile for which the brightness is required, and it is expected to return
         * the brightness value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultBrightness = undefined;

        /**
         * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
         * the contrast while greater than 1.0 increases it.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, the layer, and the x, y, and level coordinates of the
         * imagery tile for which the contrast is required, and it is expected to return
         * the contrast value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultContrast = undefined;

        /**
         * The default hue of this provider in radians. 0.0 uses the unmodified imagery color. This can either be a
         * simple number or a function with the signature <code>function(frameState, layer, x, y, level)</code>.
         * The function is passed the current {@link FrameState}, the layer, and the x, y, and level
         * coordinates of the imagery tile for which the hue is required, and it is expected to return
         * the hue value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultHue = undefined;

        /**
         * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
         * saturation while greater than 1.0 increases it. This can either be a simple number or a function
         * with the signature <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, the layer, and the x, y, and level coordinates of the
         * imagery tile for which the saturation is required, and it is expected to return
         * the saturation value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultSaturation = undefined;

        /**
         * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
         * This can either be a simple number or a function with the signature
         * <code>function(frameState, layer, x, y, level)</code>.  The function is passed the
         * current {@link FrameState}, the layer, and the x, y, and level coordinates of the
         * imagery tile for which the gamma is required, and it is expected to return
         * the gamma value to use for the tile.  The function is executed for every
         * frame and for every tile, so it must be fast.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultGamma = undefined;

        DeveloperError.throwInstantiationError();
    };

    defineProperties(GeometryProvider.prototype, {
        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof GeometryProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the extent, in radians, of the imagery provided by the instance.  This function should
         * not be called before {@link GeometryProvider#ready} returns true.
         * @memberof GeometryProvider.prototype
         * @type {Extent}
         */
        extent: {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link GeometryProvider#ready} returns true.
         * @memberof GeometryProvider.prototype
         * @type {Number}
         */
        maximumLevel : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link GeometryProvider#ready} returns true. Generally,
         * a minimum level should only be used when the extent of the geometry is small
         * enough that the number of tiles at the minimum level is small.  A geometry
         * provider with more than a few tiles at the minimum level will lead to
         * rendering problems.
         * @memberof GeometryProvider.prototype
         * @type {Number}
         */
        minimumLevel : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the tiling scheme used by the provider.  This function should
         * not be called before {@link GeometryProvider#ready} returns true.
         * @memberof GeometryProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets an event that is raised when the geometry provider encounters an asynchronous error..  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof GeometryProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the credit to display when this geometry provider is active.  Typically this is used to credit
         * the source of the geometry. This function should
         * not be called before {@link GeometryProvider#ready} returns true.
         * @memberof GeometryProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof GeometryProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     * @memberof GeometryProvider
     * @function
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the geometry provider is ready.
     */
    GeometryProvider.prototype.getTileCredits = DeveloperError.throwInstantiationError;

    /**
     * Requests the geometry for a given tile.  This function should
     * not be called before {@link GeometryProvider#isReady} returns true.
     * @memberof GeometryProvider
     * @function
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the geometry
     *          that will resolve when the geometry is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved geometry may be either a {@link Primitive}
     *          or an array of {@link Primitive} instances.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the geometry provider is ready.
     */
    GeometryProvider.prototype.requestGeometry = DeveloperError.throwInstantiationError;

    /**
     * Releases the geometry for a given tile.
     */
    GeometryProvider.prototype.releaseGeometry = DeveloperError.throwInstantiationError;

    return GeometryProvider;
});
