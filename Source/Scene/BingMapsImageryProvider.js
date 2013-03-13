/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/Cartesian2',
        '../Core/DeveloperError',
        '../Core/Event',
        './BingMapsStyle',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider',
        './TileProviderError',
        './WebMercatorTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        jsonp,
        Cartesian2,
        DeveloperError,
        Event,
        BingMapsStyle,
        DiscardMissingTileImagePolicy,
        ImageryProvider,
        TileProviderError,
        WebMercatorTilingScheme,
        when) {
    "use strict";

    /**
     * Provides tiled imagery using the Bing Maps Imagery REST API.
     *
     * @alias BingMapsImageryProvider
     * @constructor
     *
     * @param {String} description.url The url of the Bing Maps server hosting the imagery.
     * @param {String} [description.key] An optional Bing Maps key, which can be created at
     *        <a href='https://www.bingmapsportal.com/'>https://www.bingmapsportal.com/</a>.
     * @param {Enumeration} [description.mapStyle=BingMapsStyle.AERIAL] The type of Bing Maps
     *        imagery to load.
     * @param {TileDiscardPolicy} [description.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  If this value is not specified, a default
     *        {@link DiscardMissingTileImagePolicy} is used which requests
     *        tile 0,0 at the maximum tile level and checks pixels (0,0), (120,140), (130,160),
     *        (200,50), and (200,200).  If all of these pixels are transparent, the discard check is
     *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
     *        tile that has the same values in these pixel locations is discarded.  The end result of
     *        these defaults should be correct tile discarding for a standard Bing Maps server.  To ensure
     *        that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this
     *        parameter.
     * @param {Proxy} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see ArcGisMapServerImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @see <a href='http://msdn.microsoft.com/en-us/library/ff701713.aspx'>Bing Maps REST Services</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var bing = new BingMapsImageryProvider({
     *     url : 'http://dev.virtualearth.net',
     *     mapStyle : BingMapsStyle.AERIAL
     * });
     */
    var BingMapsImageryProvider = function BingMapsImageryProvider(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        this._url = description.url;
        this._key = defaultValue(description.key, 'Auc5O1omLRY_ub2safz0m2vJbzhYhSfTkO9eRDtLOauonIVoAiy6BV8c-L4jl1MT');
        this._mapStyle = defaultValue(description.mapStyle, BingMapsStyle.AERIAL);
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._proxy = description.proxy;

        /**
         * The default {@link ImageryLayer#gamma} to use for imagery layers created for this provider.
         * By default, this is set to 1.3 for the "aerial" and "aerial with labels" map styles and 1.0 for
         * all others.  Changing this value after creating an {@link ImageryLayer} for this provider will have
         * no effect.  Instead, set the layer's {@link ImageryLayer#gamma} property.
         *
         * @type {Number}
         */
        this.defaultGamma = 1.0;
        if (this._mapStyle === BingMapsStyle.AERIAL || this._mapStyle === BingMapsStyle.AERIAL_WITH_LABELS) {
            this.defaultGamma = 1.3;
        }

        this._tilingScheme = new WebMercatorTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 2
        });

        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._imageUrlTemplate = undefined;
        this._imageUrlSubdomains = undefined;

        this._errorEvent = new Event();

        this._ready = false;

        var metadataUrl = this._url + '/REST/v1/Imagery/Metadata/' + this._mapStyle.imagerySetName + '?key=' + this._key;
        var that = this;
        var metadataError;

        function metadataSuccess(data) {
            var resource = data.resourceSets[0].resources[0];

            that._tileWidth = resource.imageWidth;
            that._tileHeight = resource.imageHeight;
            that._maximumLevel = resource.zoomMax - 1;
            that._imageUrlSubdomains = resource.imageUrlSubdomains;
            that._imageUrlTemplate = resource.imageUrl.replace('{culture}', '');

            // Install the default tile discard policy if none has been supplied.
            if (typeof that._tileDiscardPolicy === 'undefined') {
                that._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                    missingImageUrl : buildImageUrl(that, 0, 0, that._maximumLevel),
                    pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(120, 140), new Cartesian2(130, 160), new Cartesian2(200, 50), new Cartesian2(200, 200)],
                    disableCheckIfAllPixelsAreTransparent : true
                });
            }

            that._ready = true;
            TileProviderError.handleSuccess(metadataError);
        }

        function metadataFailure(e) {
            var message = 'An error occurred while accessing ' + metadataUrl + '.';
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
        }

        function requestMetadata() {
            var metadata = jsonp(metadataUrl, {
                callbackParameterName : 'jsonp',
                proxy : that._proxy
            });
            when(metadata, metadataSuccess, metadataFailure);
        }

        requestMetadata();
    };

    /**
     * Gets the name of the Bing Maps server url hosting the imagery.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {String} The url.
     */
    BingMapsImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the proxy used by this provider.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Proxy} The proxy.
     *
     * @see DefaultProxy
     */
    BingMapsImageryProvider.prototype.getProxy = function() {
        return this._proxy;
    };

    /**
     * Gets the Bing Maps key.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {String} The key.
     */
    BingMapsImageryProvider.prototype.getKey = function() {
        return this._key;
    };

    /**
     * Gets the type of Bing Maps imagery to load.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {BingMapsStyle} The style.
     */
    BingMapsImageryProvider.prototype.getMapStyle = function() {
        return this._mapStyle;
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Number} The width.
     *
     * @exception {DeveloperError} <code>getTileWidth</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTileWidth = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileWidth must not be called before the imagery provider is ready.');
        }
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Number} The height.
     *
     * @exception {DeveloperError} <code>getTileHeight</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTileHeight = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileHeight must not be called before the imagery provider is ready.');
        }
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Number} The maximum level.
     *
     * @exception {DeveloperError} <code>getMaximumLevel</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getMaximumLevel = function() {
        if (!this._ready) {
            throw new DeveloperError('getMaximumLevel must not be called before the imagery provider is ready.');
        }
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTilingScheme = function() {
        if (!this._ready) {
            throw new DeveloperError('getTilingScheme must not be called before the imagery provider is ready.');
        }
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Extent} The extent.
     *
     * @exception {DeveloperError} <code>getExtent</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getExtent = function() {
        if (!this._ready) {
            throw new DeveloperError('getExtent must not be called before the imagery provider is ready.');
        }
        return this._tilingScheme.getExtent();
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getTileDiscardPolicy = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileDiscardPolicy must not be called before the imagery provider is ready.');
        }
        return this._tileDiscardPolicy;
    };

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Event} The event.
     */
    BingMapsImageryProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    BingMapsImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
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
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.requestImage = function(x, y, level) {
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(url);
    };

    /**
     * Gets the logo to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof BingMapsImageryProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the imagery provider is ready.
     */
    BingMapsImageryProvider.prototype.getLogo = function() {
        if (!this._ready) {
            throw new DeveloperError('getLogo must not be called before the imagery provider is ready.');
        }
        if (typeof BingMapsImageryProvider._logo === 'undefined') {
            var image = new Image();
            image.loaded = false;
            image.onload = function() {
                BingMapsImageryProvider._logo.loaded = true;
            };
            image.src = BingMapsImageryProvider._logoData;
            BingMapsImageryProvider._logo = image;
        }

        var logo = BingMapsImageryProvider._logo;
        return (logo && logo.loaded) ? logo : undefined;
    };

    BingMapsImageryProvider._logo = undefined;
    BingMapsImageryProvider._logoLoaded = false;
    BingMapsImageryProvider._logoData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF0AAAAdCAYAAADIKWCvAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAABBZSURBVHja1FoJdFTVGZ6ZzJZlskMgsrcEoqAQrBhBliKBiBDAgFUL5RQkgIDaKCoqGEBAFkGSgEYrCKgoYtWICLIZBBEOFkX0YEKoDSQo2SczmX36fS/3xscUBAKxp/ecl5eZd99/7/3+/37/cker0Wi0moami4qKCvJ6vVqj0RjEL4KCgvwul8vLe3l5uRdf+cXV2CZPnqwJbHl5eZSpjY2NDcL7Oj2a3+9XxtFqtX632+3FV76qqirK9Ak5fs3/oGGu11Qe1nnJPlpx6cLDw4mNPiQkxARggggSLi8AcuOzG8rwqIC/pFwoUA9lEWyj2Ww28X8+8Hg8EOV1QawTz9xq4C/VrkQxQvHN0fzXAnRauB7AGiIiIsJCQ0PDAFIIPusAjKO+vt5WU1Njs1qtDpvN5v4VgORoioXjboAcc3BwsAWKDA8LCwuFTK3D4aiHrBorBeJ/nU7nUilTeyULlkq4CMDaS6xbGofuUiBxp2P3+7Ecf3FxsXq3+5sCurQ+WroZ4FhGpI1Mur1vvyGYltZaa/156dLF7wDscxhUoR3SDYBsXBCU4gdwftIGJwfL9TudziD00ZtMpuCYmJjY8SmdUgYl1N3H/ierwg4/t+nHPEzOh34eXARcg8VrSW3cYT6fT6seA318Kvk+SXMqalCDGHQhOZynAEX5zLXwOebeCDrH4Fr4v8FgUPrxM+T5eIcRemBQPmDlA/i+pm4Vgq7FAJyoEXdLn9v6pg4dOngCH1ZX19SsXLn8MwzoxoI5OTeA9NJipQB89omJeXH3RUZGerkYNDPkhfXvGX/jA4mfL9D765XFJcRoulnTUirmr69Zh/5OLhSL8IvF6zAOwdCpx4AcjuEDYB6A6qHiAZpXKEDBy2KxBHEdMCCK0As5FKOMC4PSYIp+QZuKAZFG0bRgVfbhQ2UN7AdZjSDxO/QlL7oxVzd2qFso2t9k0LlINAJv9njcRtVW0eFZFC4bJmbARN0EGBcthO9xEfyDf31eLNhJ7heWacD35vjIoNaBg7o9XgPHQp9gAgXZ3ML410DuV/wJ72IX+gQQ0he48MjFBgV4OZYA0IDvjbBsI+4mvEPK1EnQOVeuVewCOncDqNQEZbA/n9F/2bGr6+h3VIATXBqaC3fg7eCO83Xq1IlU0yTg9WJCnAwtg8DrfyFQRV4wJhaHxUTDmrSwbJ2YiFSMH5NUQLDb7XW1tbV15GkuDhM0rt1WeKzOcfPKkTc5h7H/8Z9Cvl35XlEBFmfAQsIgz4/FG8n5bADDjIuAy22vKBTi3fQvGMNah4Y+9QDcRZ6FsvQY04h5QkyYBWIskGumIiX1kGsBqg9yaCF6KMr88COZw264PrGb0Iv/ZHHxwdlPPv7qoUOHsiXdQHarwsLCtR07dhzaq1evUfjswfserE17NfSiyBccGET6UrstbKew4cNH3DBq9OjU1q1axUdGRoQHCqmrs9kBdtWJEyeOZmU9uw7bHr63xsGtDpCCvNFJnvdLg3aUlZbWdu9+YyuH40U9xgphpAQ6CoHFRi5YsCijffu2v4+Ojm6BYMeolk9rr6ioqjx16tR3mzZtevfgwQNFGKOSSqBPYHQEgwiHnJhHH52V3qtX0gD6kkA5DofTda68vMLpcDrbtLkuPvB5YWHREe6YpKSkBwoKCp4aMGDAc9u2bZvSoUOHVKLBXSMM9KoiI73ao0sno+JS/VtvbZofHR1lCQC5HkCQ1zQwUBppCK/4+NbXJSdvH1yw7/PdT81+YmNlZWU9I6H0u9NHJCZ26cr+lVVV1ry8l/bh+1iAZH755Vce6t79hh6CVxtBxhh1Uj6fxcW1iMXV7+abk/oWFRWfyM5elbdnz+4f6BdgGKGPPPLonaNGpd2rNopAOQS5bZvrWl8MjBUrln0MC3Zx82JH/Iw7Zcfl5+cvSklJGQPQvcLR0qleE9D/q1ksYcFqKzly5KvD72x++71vvv66hE5FOCLj+PETBtwx+I67YDyK9aQMHjQ0MfH9m+4ZO2YOF+5Xh2/4wFCSBP7O5nfnqUEoOX2mbNfOXfnr16/bS/4W4ZoxNXVYj3vvu/fPlE8FdO2akPj8888vzMzMXHD48KHTU6ZO6z9u3H0TpOJoFPsPfLHv+cUL3wA49cKAgqdOm56WOnRIKhTQuK4jR/75bfGpUyfhpRwwkiqAbsOcbQMHDlxCeklOTn6YQM+dO/cgeR2WztTFR1prKugEQ09LgRDs7Oj28+cvfDA9fVS6utPp06Vl999/79zq6uoyTKoaW9pOXuN2w2KM4M8wyIjNzJx1z8iRw0fKxZeUnCmbMGH8wuzs3BnXX981QbH0yiprevrds5ctWz4xKalnD2mRa9et3/BK3ks7QNc/Q75Vgk6HxyiI8tPSRiXPmDk9wxLWYAxU0qSJf13ywQcfLKEe+R0Iv37WY7OeO3Bg/3HIqpSgQ3nB4PoorDFu87tbFsa1bBEjx54586GsgoLPjsHPnMbY5RjbjnG9MoIh+HQs+I6Ri4evlZaW+i6Us1x2nC77U3hgh59+Plcxdmz6M+fOnSthvI4J0bs7pNfGO0xk7Viga8GCrLf5HZQ2mve2ba9rnTF12h2BtAUlGTt37txFfj745eGDq3Ozd8LSSrGoSsi3cmFCPsMaDG1zvPXWG/sTEhLapaePVuS3bhUXN2lSxiAJOFv2qpy8vXv3FCL3qgSAVcDKLuSYIZvRjiHr2axVq1fnZAml6tLSRvYBVR2ilTMe4Dt03gwdIZu0qyiHpQsCLQBvsqXr1IBfCPQPP8j/EBljJRwlF1FNS8cEajGpGt7xuRYOrRqgwLdVVSxfvmQrt7d8P6lnz56BuSHjaDV1lZWVnYWMGsqHZXInUXYNxqgGCByzis8IZHb2i582WgwAg5zz/M2OHZ+cgCwH3qMjd9L3MLrizuFnfO88duzrsyLWVlqbtm3aITojXyulCVInI1vMk1SihKkA340QkRZ+wRrUFXO6zChxIUXTnrdl3nxzw2EsuB4AKBN3NjSX2FrM+FgQ08sYGs/cJSUl/05M7KpYcjS85Vm08zStCjkFx1GWA2PUQw4VVg8lS1AArIVxI+N+ZR7qd9u1axuv/pySMrTLhg2vVwBgM/qbmE0KYzJBSSb6kzvvvCtRvTvKSs+eJI+jP52oG8r14LqYNV91YU4nrZzZGBdktdZWqDsMHjwkgXQgkg2m9ibwK4tYRoR7TCyMMjFRshuTydAKoaV832az2y6rQqZVlO3morFrZBGMFyuSHkYUzAoZQajf++77738gj8vP4PzJAwYOTEC6Hot5RoHHoxGaxkRERMQijIzD3KKnTMmYqA4QsrLmbCB/cVcwEQuwZH/ApbkmoDOtFlZsf+3vr+7iRGSH8ePH3wNjjcLEI5FQ8GI5Mhygh2OCESwd4ArH4qCDyGg402EIuy2/8PWXhy89VcXwvSqKO2+R8nsqRoCidlwehLWbyblKxAUnu+KFFc/k5q75G+Lrjrg6tG/fviOuTstfWJmxdevHK+T8+M6GjRs3IECoRj5BSvKw7PxrBa1r0fSCY5nK0zMz2Svfv//Ap4MGDVQyyDZt4luvWfPywzNmPLgCCY+B3EsFMXqhgwQIBlYS0WInT56Syuil0Qn/dK5izeqcHTk5q7v8quZ1SqHJJ6w9cLGyoOaTV8Bm98JQCuDoy6dNnfoAAWXY2qdPcp9du3b1qa6uqWW3wKSOUdSWLe/9Izc3ey+ozEYeF/WdZq/rE3Q/BvUilKLDIZeWP/307NXBwSvCb7vt1tsVZ5jUo8dHH23N2bNn7yc5Oavy2Y90JONocGTP4SOGp4HGu0rBVVXV1jlz57xAC9IEOGgoLIBaFMCVYlOgJasrgKQXPPcGPsOc7Rs3rD/wUf6HRzIypvXr379fSgvkUkzYLpRBs4WHW0LbtWsXH9TQdDLCCoy0ms3SiYOnodVjYdWMvzMzH1n4+BOzxw3o3+8uTpwWNHr0yDEjRtx1t8zyZBytTja4ZQuLTv6A+HlRRUWFjY5Lq9UEgu49P/PVuyCHTsyroheNurSL3cSdRWt0BERCbkY5rNGzGLV06eKSl17KfZ++hzmEKOixiGaGf7px4qSJ4xijM/IZMmTwHUing6dPn7YI1GJiSRp37dVUEC/b0oW1eFjQohfHAgiM59m5z6yBA9qcmfnYGHU9I9B6Amsj+/fvKwRN1jEsY2JTW2M9g23OzFOLHVDBwhjutaJ660eEV8pKpgjTAi3dz/hYJGMMAatramqrpUXa7Ha+a8X3dSyKQbYGY1eyeikiJRbyGAQEr1v3WvnWrfnH33578zzSJp/37v2H5D59b+/86Y7tZ0ExDAR08KnNaunawGM7AM8JMjoJxmKDydes3PH0h4cSDLvG/2VCHzjNKK1G69+9e/fho0e/KmNZVFYB0eyMK0WtPBh9w3lAwrMD+AzWpVnt4skSlWtn7I9Wjjifcb9ThIuNloZAhKgbMbewli1bxsBpx0A5oQDZR2qBr7G7GqIB7gaWmLljqCifTOAAfigunmDFDRkytNvq1blZUv6BL74smDY14ynszB9FvsHd5G2KtV9JRip7+gAYC/Us6JByXOLIrhZgl7N8SjpZvGhhMbcna9T0+FwwLRGLpiU6leIEKISgQ56NoMLyzKzbs5bNgQCUErEAPNaxmcg4eBaL6MgnKsYyctEiOeNpDUuq9XSYAIWOz4guPKwwsTQMhZg4H44N4OqZHPkaGg8naPFOzIF+y33s2DdKciRjdeQSsSwnywOO34rT1cD7haV5eUqCuxJKMkrhVmW8ztMWeczla6gA0cEpFMBLfJagBeF9ngjZ1YvicZg8oBDveHkqJc5LA5sPFuqFopysibDwRLDFcWDIcwsXTxTJkKaosLDw9dfXHmDxCruOPsotDkXMrKFjh5lT7xx2XnJ05kxpMRO7i/mU5gQ9MFTzAnxanUecO9KCdeQ8eQYpowrubIJM7gVNBGZybtCD8o66Do3/Gw99eTEDxOVXW7k8JKG1y/SbZ5SsofPwg6VngKi/tXfvsRERlsiGZOePSPfdKzZvfucg5s+SglOciYaw4NW7d3LXmTNmZKjPAubNm7sWu6PW03DW52tuS9dewXPtr7xzzZKJi8XJ6jNT6grg87QpLA5t0KDBt8ye/eSLoaEhodKxFxWdPJGfn//h9u2fHBflgW7Dhw8f0bnz7xJkFZRJYE5O7pKNG9dvA22dYc2HVUmVT2kWTtdeQwVpLiexUIPXlEREvK8F9RkY7oHLI3G17D9gYM/pD06f1aFDu06XIweUUrps2bLFe/fuOQra+glUxGKbDbTkbKoTbQ7QmzzINd2aAnT+toYRDaMsUAcjrCgoosUtvXt3uWfsn+7u2LHj9SaT0cgTI0EjdU6ny3X27Nl/7dy1c9t7W94l/TB8rQS11LCkS/8FJ+25mjrLbwL6hX5W19xN/mxP/kiK1USEtiHgeQuPB3lAzViXzl8cciu/LGMkg6iFoW0dwGbtnGesdvgXhwBcFtr8zWmE/5egq4GnxQNERlT8iYjy8wv5cw6Gp+L3OhpR4vXJErQ4mXLhXZf4DY36533NCvp/BBgAjIr8TQiNmVwAAAAASUVORK5CYII=';

    /**
     * Converts a tiles (x, y, level) position into a quadkey used to request an image
     * from a Bing Maps server.
     *
     * @memberof BingMapsImageryProvider
     *
     * @param {Number} x The tile's x coordinate.
     * @param {Number} y The tile's y coordinate.
     * @param {Number} level The tile's zoom level.
     *
     * @see <a href='http://msdn.microsoft.com/en-us/library/bb259689.aspx'>Bing Maps Tile System</a>
     * @see BingMapsImageryProvider#quadKeyToTileXY
     */
    BingMapsImageryProvider.tileXYToQuadKey = function(x, y, level) {
        var quadkey = '';
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = 0;

            if ((x & bitmask) !== 0) {
                digit |= 1;
            }

            if ((y & bitmask) !== 0) {
                digit |= 2;
            }

            quadkey += digit;
        }
        return quadkey;
    };

    /**
     * Converts a tile's quadkey used to request an image from a Bing Maps server into the
     * (x, y, level) position.
     *
     * @memberof BingMapsImageryProvider
     *
     * @param {String} quadkey The tile's quad key
     *
     * @see <a href='http://msdn.microsoft.com/en-us/library/bb259689.aspx'>Bing Maps Tile System</a>
     * @see BingMapsImageryProvider#tileXYToQuadKey
     */
    BingMapsImageryProvider.quadKeyToTileXY = function(quadkey) {
        var x = 0;
        var y = 0;
        var level = quadkey.length - 1;
        for ( var i = level; i >= 0; --i) {
            var bitmask = 1 << i;
            var digit = +quadkey[level - i];

            if ((digit & 1) !== 0) {
                x |= bitmask;
            }

            if ((digit & 2) !== 0) {
                y |= bitmask;
            }
        }
        return {
            x : x,
            y : y,
            level : level
        };
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var imageUrl = imageryProvider._imageUrlTemplate;

        var quadkey = BingMapsImageryProvider.tileXYToQuadKey(x, y, level);
        imageUrl = imageUrl.replace('{quadkey}', quadkey);

        var subdomains = imageryProvider._imageUrlSubdomains;
        var subdomainIndex = (x + y + level) % subdomains.length;
        imageUrl = imageUrl.replace('{subdomain}', subdomains[subdomainIndex]);

        var proxy = imageryProvider._proxy;
        if (typeof proxy !== 'undefined') {
            imageUrl = proxy.getURL(imageUrl);
        }

        return imageUrl;
    }

    return BingMapsImageryProvider;
});