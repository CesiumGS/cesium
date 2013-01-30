/*global define*/
define([
        '../Core/defaultValue',
        '../Core/getImagePixels',
        '../Core/jsonp',
        '../Core/loadArrayBuffer',
        '../Core/loadImage',
        '../Core/throttleRequestByServer',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Extent',
        '../Core/Occluder',
        '../Core/TaskProcessor',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './GeographicTilingScheme',
        './HeightmapTerrainData',
        './Projections',
        './TerrainProvider',
        './TileState',
        './WebMercatorTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        getImagePixels,
        jsonp,
        loadArrayBuffer,
        loadImage,
        throttleRequestByServer,
        writeTextToCanvas,
        DeveloperError,
        CesiumMath,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Extent,
        Occluder,
        TaskProcessor,
        PixelDatatype,
        PixelFormat,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        GeographicTilingScheme,
        HeightmapTerrainData,
        Projections,
        TerrainProvider,
        TileState,
        WebMercatorTilingScheme,
        when) {
    "use strict";

    /**
     * A {@link TerrainProvider} that produces geometry by tessellating height maps
     * retrieved from a Tile Map Service (TMS) server.
     *
     * @alias CesiumTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the TMS service.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see TerrainProvider
     */
    function CesiumTerrainProvider(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        /**
         * The URL of the ArcGIS ImageServer.
         * @type {String}
         */
        this.url = description.url;

        /**
         * The tiling scheme used to tile the surface.
         *
         * @type TilingScheme
         */
        this.tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 1
        });
        //this.maxLevel = 17;
        this.heightmapWidth = 65;
        this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this.tilingScheme.getEllipsoid(), this.heightmapWidth, this.tilingScheme.getNumberOfXTilesAtLevel(0));

        this._proxy = description.proxy;

        this.ready = true;
        this.hasWaterMask = false; // TODO: change this back to true.

        this._allLandTexture = undefined;
        this._allWaterTexture = undefined;
        this._waterMaskSampler = undefined;

        this._terrainDataStructure = {
            heightScale : 1.0 / 5.0,
            heightOffset : -1000.0,
            stride : 1,
            strideMultiplier : 256.0,
            isBigEndian : false
        };
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    CesiumTerrainProvider.prototype.getLevelMaximumGeometricError = TerrainProvider.prototype.getLevelMaximumGeometricError;

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link TerrainProvider#isReady} returns true.  The result must include terrain data and
     * may optionally include a water mask and an indication of which child tiles are available.
     *
     * @memberof CesiumTerrainProvider
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Promise|TerrainData} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    CesiumTerrainProvider.prototype.requestTileGeometry2 = function(x, y, level) {
        var yTiles = this.tilingScheme.getNumberOfYTilesAtLevel(level);
        var url = this.url + '/' + level + '/' + x + '/' + (yTiles - y - 1) + '.terrain';

        var promise = throttleRequestByServer(url, loadArrayBuffer);
        if (typeof promise === 'undefined') {
            return undefined;
        }

        var that = this;
        return when(promise, function(buffer) {
            var heightBuffer = new Uint16Array(buffer, 0, that.heightmapWidth * that.heightmapWidth);
            var childTileMask = new Uint8Array(buffer, heightBuffer.byteLength, 1)[0];
            return new HeightmapTerrainData(heightBuffer, that.heightmapWidth, that.heightmapWidth, childTileMask, that._terrainDataStructure);
        });
    };

    /**
     * DOC_TBA
     * @memberof CesiumTerrainProvider
     */
    CesiumTerrainProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return CesiumTerrainProvider;
});