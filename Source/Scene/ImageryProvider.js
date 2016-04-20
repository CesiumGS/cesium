/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/loadImage',
        '../Core/loadImageViaBlob',
        '../Core/throttleRequestByServer'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        loadImage,
        loadImageViaBlob,
        throttleRequestByServer) {
    'use strict';

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
     * @see MapboxImageryProvider
     * @see createOpenStreetMapImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers.html|Cesium Sandcastle Imagery Layers Demo}
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers%20Manipulation.html|Cesium Sandcastle Imagery Manipulation Demo}
     */
    function ImageryProvider() {
        /**
         * The default alpha blending value of this provider, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultAlpha = undefined;

        /**
         * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
         * makes the imagery darker while greater than 1.0 makes it brighter.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultBrightness = undefined;

        /**
         * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
         * the contrast while greater than 1.0 increases it.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultContrast = undefined;

        /**
         * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultHue = undefined;

        /**
         * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
         * saturation while greater than 1.0 increases it.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultSaturation = undefined;

        /**
         * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
         *
         * @type {Number}
         * @default undefined
         */
        this.defaultGamma = undefined;

        DeveloperError.throwInstantiationError();
    }

    defineProperties(ImageryProvider.prototype, {
        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof ImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof ImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by the instance.  This function should
         * not be called before {@link ImageryProvider#ready} returns true.
         * @memberof ImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle: {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the width of each tile, in pixels.  This function should
         * not be called before {@link ImageryProvider#ready} returns true.
         * @memberof ImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link ImageryProvider#ready} returns true.
         * @memberof ImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link ImageryProvider#ready} returns true.
         * @memberof ImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link ImageryProvider#ready} returns true. Generally,
         * a minimum level should only be used when the rectangle of the imagery is small
         * enough that the number of tiles at the minimum level is small.  An imagery
         * provider with more than a few tiles at the minimum level will lead to
         * rendering problems.
         * @memberof ImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the tiling scheme used by the provider.  This function should
         * not be called before {@link ImageryProvider#ready} returns true.
         * @memberof ImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link ImageryProvider#ready} returns true.
         * @memberof ImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error..  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof ImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery. This function should
         * not be called before {@link ImageryProvider#ready} returns true.
         * @memberof ImageryProvider.prototype
         * @type {Credit}
         * @readonly
         */
        credit : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof ImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof ImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     * @function
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getTileCredits = DeveloperError.throwInstantiationError;

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link ImageryProvider#ready} returns true.
     * @function
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Promise.<Image|Canvas>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.requestImage = DeveloperError.throwInstantiationError;

    /**
     * Asynchronously determines what features, if any, are located at a given longitude and latitude within
     * a tile.  This function should not be called before {@link ImageryProvider#ready} returns true.
     * This function is optional, so it may not exist on all ImageryProviders.
     *
     * @function
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     *
     * @exception {DeveloperError} <code>pickFeatures</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.pickFeatures = DeveloperError.throwInstantiationError;

    /**
     * Loads an image from a given URL.  If the server referenced by the URL already has
     * too many requests pending, this function will instead return undefined, indicating
     * that the request should be retried later.
     *
     * @param {String} url The URL of the image.
     * @returns {Promise.<Image|Canvas>|undefined} A promise for the image that will resolve when the image is available, or
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
