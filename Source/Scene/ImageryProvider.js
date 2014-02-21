/*global define*/
define([
        '../Core/defined',
        '../Core/loadImage',
        '../Core/loadImageViaBlob',
        '../Core/DeveloperError',
        '../Core/throttleRequestByServer'
    ], function(
        defined,
        loadImage,
        loadImageViaBlob,
        DeveloperError,
        throttleRequestByServer) {
    "use strict";

    /**
     * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias ImageryProvider
     * @constructor
     *
     * @see ArcGisMapServerImageryProvider
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers.html">Cesium Sandcastle Imagery Layers Demo</a>
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers%20Manipulation.html">Cesium Sandcastle Imagery Manipulation Demo</a>
     */
    var ImageryProvider = function ImageryProvider() {
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

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     * @memberof ImageryProvider
     * @function
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getTileCredits = DeveloperError.throwInstantiationError;

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     * @memberof ImageryProvider
     * @function
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.requestImage = DeveloperError.throwInstantiationError;

    /**
     * Loads an image from a given URL.  If the server referenced by the URL already has
     * too many requests pending, this function will instead return undefined, indicating
     * that the request should be retried later.
     * @memberof ImageryProvider
     *
     * @param url {String} The URL of the image.
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    ImageryProvider.loadImage = function(imageryProvider, url) {
        if (defined(imageryProvider.tileDiscardPolicy)) {
            return throttleRequestByServer(url, loadImageViaBlob);
        }
        return throttleRequestByServer(url, loadImage);
    };

    return ImageryProvider;
});
