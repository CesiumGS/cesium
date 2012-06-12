/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Ellipsoid'
    ], function(
        DeveloperError,
        Ellipsoid) {
    "use strict";

    /**
     * A container for tile providers that will change based of the altitude of the camera.
     *
     * @name CompositeTileProvider
     * @constructor
     *
     * @param {Array} list An array of objects with provider and height attributes. The height attribute determines
     * the minimum height at which to use the accompanying provider.
     * @param {Camera} camera The camera.
     * @param {Ellipsoid} ellipsoid An ellipsoid to test the altitude against. Defaults to a WGS84 ellipsoid.
     *
     * @exception {DeveloperError} A non-empty list is required.
     * @exception {DeveloperError} camera is required.
     *
     * @see SingleTileProvider
     * @see ArcGISTileProvider
     * @see OpenStreetMapTileProvider
     * @see BingMapsTileProvider
     *
     * @example
     * // Create a CompositeTileProvider from a SingleTileProvider and BingMapsTileProvider
     *
     * // Single
     *  var single = new SingleTileProvider('Images/NE2_50M_SR_W_4096.jpg');
     *  // Bing Maps
     *  var bing = new BingMapsTileProvider({
     *      server : 'dev.virtualearth.net',
     *      mapStyle : BingMapsStyle.AERIAL
     *  });
     *  // Composite
     *  var composite = new CompositeTileProvider([
     *      { provider : single, height : 1000000 },
     *      { provider : bing, height : 0}
     *  ], scene.getCamera(), ellipsoid);
     *
     */
    function CompositeTileProvider(list, camera, ellipsoid) {
        if (!list) {
            throw new DeveloperError('A non-empty list is required.');
        }

        if (!camera) {
            throw new DeveloperError('camera is required.');
        }

        this._camera = camera;

        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        this._radius = ellipsoid.getMaximumRadius();

        this._list = list;
        this._list.sort(CompositeTileProvider._compare);
        this._currentProviderIndex = 0;

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @constant
         * @type {Extent}
         */
        this.maxExtent = this._list[0].provider.maxExtent;

        /**
         * The minimum zoom level that can be requested.
         *
         * @constant
         * @type {Number}
         */
        this.zoomMin = this._list[0].provider.zoomMin;

        /**
         * The maximum zoom level that can be requested.
         *
         * @constant
         * @type {Number}
         */
        this.zoomMax = this._list[this._list.length - 1].provider.zoomMax;

        /**
         * The smallest width of any image loaded.
         *
         * @type {Number}
         */
        this.tileWidth = Number.MAX_VALUE;

        /**
         * The smallest height of any image loaded.
         *
         * @type {Number}
         */
        this.tileHeight = Number.MAX_VALUE;

        // TODO: good idea?
        for ( var i = 0; i < this._list.length; ++i) {
            var provider = this._list[i].provider;
            if (provider.tileHeight < this.tileHeight || provider.tileWidth < this.tileWidth) {
                this.tileHeight = provider.tileHeight;
                this.tileWidth = provider.tileWidth;
            }
        }

        if (this.tileWidth === Number.MAX_VALUE) {
            this.tileWidth = null;
        }
        if (this.tileHeight === Number.MAX_VALUE) {
            this.tileHeight = null;
        }
    }

    CompositeTileProvider._compare = function(a, b) {
        // if height isn't provided, default to 0.0
        if (typeof a.height === 'undefined') {
            a.height = 0.0;
        }
        if (typeof b.height === 'undefined') {
            b.height = 0.0;
        }
        return b.height - a.height;
    };

    CompositeTileProvider.prototype._findIndex = function(currentIndex, height) {
        var i = currentIndex;
        if (this._list[i].height < height) {
            // search backwards
            for (i = i - 1; i >= 0; --i) {
                if (this._list[i].height > height) {
                    break;
                }
            }

            if (i === 0 && this._list[i].height < height) {
                return i;
            }

            return (i + 1 >= this._list.length) ? i : i + 1;
        }

        // search forwards
        for (i = i + 1; i < this._list.length; ++i) {
            if (this._list[i].height < height) {
                break;
            }
        }
        return (i >= this._list.length) ? this._list.length - 1 : i;
    };

    /**
     * Loads the top-level tile.
     *
     * @memberof CompositeTileProvider
     *
     * @param {Tile} tile The top-level tile.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     * @param {Function} oninvalid A function that will be called if the image loaded is not valid.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    CompositeTileProvider.prototype.loadTileImage = function(tile, onload, onerror, oninvalid) {
        if (tile.zoom < this.zoomMin || tile.zoom > this.zoomMax) {
            throw new DeveloperError('tile.zoom must be between in [zoomMin, zoomMax].');
        }

        var height = this._camera.position.magnitude() - this._radius;
        this._currentProviderIndex = this._findIndex(this._currentProviderIndex, height);
        var provider = this._list[this._currentProviderIndex].provider;
        var image = null;

        if (tile.zoom >= provider.zoomMin && tile.zoom <= provider.zoomMax) {
            image = provider.loadTileImage(tile, onload, onerror, oninvalid);
            tile.projection = provider.projection;
        } else {
            if (oninvalid && typeof oninvalid === 'function') {
                oninvalid();
            }
        }

        return image;
    };

    /**
     * DOC_TBA
     * @memberof CompositeTileProvider
     */
    CompositeTileProvider.prototype.getLogo = function() {
        var height = this._camera.position.magnitude() - this._radius;
        this._currentProviderIndex = this._findIndex(this._currentProviderIndex, height);
        var provider = this._list[this._currentProviderIndex].provider;
        return (provider && provider.getLogo) ? provider.getLogo() : undefined;
    };

    return CompositeTileProvider;
});