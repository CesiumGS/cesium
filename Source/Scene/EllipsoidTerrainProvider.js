/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Ellipsoid',
        '../Core/ExtentTessellator',
        '../Core/Occluder',
        '../Core/PlaneTessellator',
        '../Core/TaskProcessor',
        './HeightmapTerrainData',
        './TerrainProvider',
        './TileState',
        './GeographicTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        ExtentTessellator,
        Occluder,
        PlaneTessellator,
        TaskProcessor,
        HeightmapTerrainData,
        TerrainProvider,
        TileState,
        GeographicTilingScheme,
        when) {
    "use strict";

    /**
     * A very simple {@link TerrainProvider} that produces geometry by tessellating an ellipsoidal
     * surface.
     *
     * @alias EllipsoidTerrainProvider
     * @constructor
     * @private
     *
     * @param {TilingScheme} [description.tilingScheme] The tiling scheme specifying how the ellipsoidal
     * surface is broken into tiles.  If this parameter is not provided, a {@link GeographicTilingScheme}
     * is used.
     * @param {Ellipsoid} [description.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     * this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     * parameter is specified, the WGS84 ellipsoid is used.
     *
     * @see TerrainProvider
     */
    function EllipsoidTerrainProvider(description) {
        description = defaultValue(description, {});

        /**
         * The tiling scheme used to tile the surface.
         *
         * @type TilingScheme
         */
        this.tilingScheme = defaultValue(description.tilingScheme, new GeographicTilingScheme({ ellipsoid : defaultValue(description.ellipsoid, Ellipsoid.WGS84) }));

        // Note: the 64 below does NOT need to match the actual vertex dimensions.
        this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this.tilingScheme.getEllipsoid(), 64, this.tilingScheme.getNumberOfXTilesAtLevel(0));

        var width = 16;
        var height = 16;
        var buffer = new Uint8Array(width * height);
        this._terrainData = new HeightmapTerrainData(buffer, width, height);

        this.ready = true;
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    EllipsoidTerrainProvider.prototype.getLevelMaximumGeometricError = TerrainProvider.prototype.getLevelMaximumGeometricError;

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link TerrainProvider#isReady} returns true.  The result must include terrain data and
     * may optionally include an indication of which child tiles are available.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Promise|TerrainData} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    EllipsoidTerrainProvider.prototype.requestTileGeometry = function(x, y, level) {
        return this._terrainData;
    };

    return EllipsoidTerrainProvider;
});