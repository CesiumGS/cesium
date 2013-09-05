/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadArrayBuffer',
        '../Core/throttleRequestByServer',
        '../Core/writeTextToCanvas',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/DeveloperError',
        '../Core/Event',
        './Credit',
        './GeographicTilingScheme',
        './MeshTerrainData',
        './TerrainProvider',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        loadArrayBuffer,
        throttleRequestByServer,
        writeTextToCanvas,
        BoundingSphere,
        Cartesian3,
        DeveloperError,
        Event,
        Credit,
        GeographicTilingScheme,
        MeshTerrainData,
        TerrainProvider,
        when) {
    "use strict";

    /**
     * A {@link TerrainProvider} that produces geometry by tessellating height maps
     * retrieved from a Cesium terrain server.  The format of the terrain tiles is described on the
     * {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Cesium-Terrain-Server|Cesium wiki}.
     *
     * @alias CesiumMeshTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the Cesium terrain server.
     * @param {Proxy} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @param {String} [description.credit] A string crediting the data source, which is displayed on the canvas.
     *
     * @see TerrainProvider
     */
    var CesiumMeshTerrainProvider = function CesiumTerrainProvider(description) {
        if (typeof description === 'undefined' || typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        this._url = description.url;
        this._proxy = description.proxy;

        this._tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 1
        });

        this._heightmapWidth = 65;
        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this._tilingScheme.getEllipsoid(), this._heightmapWidth, this._tilingScheme.getNumberOfXTilesAtLevel(0));

        this._errorEvent = new Event();

        var credit = description.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;
    };

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link CesiumTerrainProvider#isReady} returns true.  The result must include terrain data and
     * may optionally include a water mask and an indication of which child tiles are available.
     *
     * @memberof CesiumTerrainProvider
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @param {Boolean} [throttleRequests=true] True if the number of simultaneous requests should be limited,
     *                  or false if the request should be initiated regardless of the number of requests
     *                  already in progress.
     * @returns {Promise|TerrainData} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    CesiumMeshTerrainProvider.prototype.requestTileGeometry = function(x, y, level, throttleRequests) {
        var yTiles = this._tilingScheme.getNumberOfYTilesAtLevel(level);
        var url = this._url + '/' + level + '/' + x + '/' + (yTiles - y - 1) + '.terrain';

        var proxy = this._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        var promise;

        throttleRequests = defaultValue(throttleRequests, true);
        if (throttleRequests) {
            promise = throttleRequestByServer(url, loadArrayBuffer);
            if (typeof promise === 'undefined') {
                return undefined;
            }
        } else {
            promise = loadArrayBuffer(url);
        }

        return when(promise, function(buffer) {
            var pos = 0;
            var uint16Length = 2;
            var uint32Length = 4;
            var float32Length = 4;
            var float64Length = 8;
            var cartesian3Elements = 3;
            var boundingSphereElements = cartesian3Elements + 1;
            var cartesian3Length = float64Length * cartesian3Elements;
            var boundingSphereLength = float64Length * boundingSphereElements;
            var vertexElements = 6;
            var vertexLength = float32Length * vertexElements;
            var triangleElements = 3;
            var triangleLength = uint16Length * triangleElements;

            var view = new DataView(buffer);
            var center = new Cartesian3(view.getFloat64(pos, true), view.getFloat64(pos + 8, true), view.getFloat64(pos + 16, true));
            pos += cartesian3Length;

            var minimumHeight = view.getFloat32(pos, true);
            pos += float32Length;
            var maximumHeight = view.getFloat32(pos, true);
            pos += float32Length;

            var boundingSphere = new BoundingSphere(
                    new Cartesian3(view.getFloat64(pos, true), view.getFloat64(pos + 8, true), view.getFloat64(pos + 16, true)),
                    view.getFloat64(pos + cartesian3Length, true));
            pos += boundingSphereLength;

            var horizonOcclusionPoint = new Cartesian3(view.getFloat64(pos, true), view.getFloat64(pos + 8, true), view.getFloat64(pos + 16, true));
            pos += cartesian3Length;

            var vertexCount = view.getUint32(pos, true);
            pos += uint32Length;
            var vertexBuffer = new Float32Array(buffer, pos, vertexCount * vertexElements);
            pos += vertexCount * vertexLength;

            if (vertexCount > 64 * 1024) {
                // More than 64k vertices, so read 32-bit indices.
                // TODO: Basic WebGL doesn't support 32-bit indices, so we also need to
                //       split this mesh or maybe use an extension.
                throw new DeveloperError('TODO: 32-bit indices are not yet supported.');
            }

            var triangleCount = view.getUint32(pos, true);
            pos += uint32Length;
            var indexBuffer = new Uint16Array(buffer, pos, triangleCount * triangleElements);
            pos += triangleCount * triangleLength;

            var westVertexCount = view.getUint32(pos, true);
            pos += uint32Length;
            var westVertices = new Uint16Array(buffer, pos, westVertexCount);
            pos += westVertexCount * uint16Length;

            var southVertexCount = view.getUint32(pos, true);
            pos += uint32Length;
            var southVertices = new Uint16Array(buffer, pos, southVertexCount);
            pos += southVertexCount * uint16Length;

            var eastVertexCount = view.getUint32(pos, true);
            pos += uint32Length;
            var eastVertices = new Uint16Array(buffer, pos, eastVertexCount);
            pos += eastVertexCount * uint16Length;

            var northVertexCount = view.getUint32(pos, true);
            pos += uint32Length;
            var northVertices = new Uint16Array(buffer, pos, northVertexCount);
            pos += northVertexCount * uint16Length;

            return new MeshTerrainData({
                center : center,
                minimumHeight : minimumHeight,
                maximumHeight : maximumHeight,
                boundingSphere : boundingSphere,
                horizonOcclusionPoint : horizonOcclusionPoint,
                vertexBuffer : vertexBuffer,
                indexBuffer : indexBuffer,
                westVertices : westVertices,
                southVertices : southVertices,
                eastVertices : eastVertices,
                northVertices : northVertices
            });
        });
    };

    /**
     * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof CesiumTerrainProvider
     *
     * @returns {Event} The event.
     */
    CesiumMeshTerrainProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @memberof CesiumTerrainProvider
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    CesiumMeshTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
     * the source of the terrain.  This function should not be called before {@link CesiumMeshTerrainProvider#isReady} returns true.
     *
     * @memberof CesiumMeshTerrainProvider
     *
     * @returns {Credit} The credit, or undefined if no credix exists
     */
    CesiumMeshTerrainProvider.prototype.getCredit = function() {
        return this._credit;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link CesiumTerrainProvider#isReady} returns true.
     *
     * @memberof CesiumTerrainProvider
     *
     * @returns {GeographicTilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the terrain provider is ready.
     */
    CesiumMeshTerrainProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets a value indicating whether or not the provider includes a water mask.  The water mask
     * indicates which areas of the globe are water rather than land, so they can be rendered
     * as a reflective surface with animated waves.
     *
     * @memberof CesiumTerrainProvider
     *
     * @returns {Boolean} True if the provider has a water mask; otherwise, false.
     */
    CesiumMeshTerrainProvider.prototype.hasWaterMask = function() {
        return false;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof CesiumTerrainProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    CesiumMeshTerrainProvider.prototype.isReady = function() {
        return true;
    };

    return CesiumMeshTerrainProvider;
});