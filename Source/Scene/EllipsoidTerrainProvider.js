/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        './WebMercatorTilingScheme',
        '../Core/Cartographic3',
        '../Core/ExtentTessellator',
        './TerrainProvider'
    ], function(
        DeveloperError,
        defaultValue,
        WebMercatorTilingScheme,
        Cartographic3,
        ExtentTessellator,
        TerrainProvider) {
    "use strict";

    /**
     * A very simple {@link TerrainProvider} that produces geometry by tessellating an ellipsoidal
     * surface.
     *
     * @alias TerrainProvider
     * @constructor
     *
     * @param {TilingScheme} [tilingScheme] The tiling scheme indicating how the ellipsoidal
     * surface is broken into tiles.  If this parameter is not provided, a
     * {@link MercatorTilingScheme} on the surface of the WGS84 ellipsoid is used.
     *
     * @see TerrainProvider
     */
    function EllipsoidTerrainProvider(tilingScheme) {
        /**
         * The tiling scheme used to tile the surface.
         *
         * @type TilingScheme
         */
        this.tilingScheme = defaultValue(tilingScheme, new WebMercatorTilingScheme());
    }

    /**
     * Populates a {@link Tile} with surface geometry from this tile provider.
     *
     * @memberof TerrainProvider
     *
     * @param {Tile} tile The tile to populate with surface geometry.
     * @returns {Boolean|Promise} A boolean value indicating whether the tile was successfully
     * populated with geometry, or a promise for such a value in the future.
     */
    EllipsoidTerrainProvider.prototype.createTileGeometry = function(context, tile) {
        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;
        var extent = tile.extent;
        var level = tile.level;

        // The more vertices we use to tessellate the extent, the less geometric error
        // in the tile.  We only need to use enough vertices to be at or below the
        // geometric error expected for this level.
        var maxErrorMeters = tilingScheme.getLevelMaximumGeometricError(level);

        // Convert the max error in meters to radians at the equator.
        // TODO: we should take the latitude into account to avoid over-tessellation near the poles.
        var maxErrorRadians = maxErrorMeters / ellipsoid.getRadii().x;

        // Create vertex and index buffers for this extent.
        // TODO: do this in a web worker?
//        var center = ellipsoid.toCartesian(new Cartographic3(
//                (extent.east - extent.west) / 2.0,
//                (extent.north - extent.south) / 2.0,
//                0.0));
        var center = tile.get3DBoundingSphere().center;
        var buffers = ExtentTessellator.computeBuffers({
            ellipsoid : ellipsoid,
            extent : extent,
            granularity : maxErrorRadians,
            generateTextureCoords : true,
            interleave : true,
            relativeToCenter : center
        });
        TerrainProvider.createTileGeometryFromBuffers(context, tile, buffers);
        return true;
    };

    return EllipsoidTerrainProvider;
});