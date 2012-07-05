/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        './WebMercatorTilingScheme',
        '../Core/Cartographic3',
        '../Core/ExtentTessellator',
        './TerrainProvider',
        '../Core/PlaneTessellator',
        '../Core/Cartographic2',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/loadImage',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        defaultValue,
        WebMercatorTilingScheme,
        Cartographic3,
        ExtentTessellator,
        TerrainProvider,
        PlaneTessellator,
        Cartographic2,
        CesiumMath,
        Cartesian2,
        loadImage,
        when) {
    "use strict";

    /**
     * A {@link TerrainProvider} that produces geometry by tessellating height maps retrieved from an ESRI
     * ImageServer.
     *
     * @alias EsriImageServerTerrainProvider
     * @constructor
     *
     * @param {TilingScheme} [tilingScheme] The tiling scheme indicating how the ellipsoidal
     * surface is broken into tiles.  If this parameter is not provided, a
     * {@link MercatorTilingScheme} on the surface of the WGS84 ellipsoid is used.
     *
     * @see TerrainProvider
     */
    function EsriImageServerTerrainProvider(tilingScheme) {
        /**
         * The tiling scheme used to tile the surface.
         *
         * @type TilingScheme
         */
        this.tilingScheme = defaultValue(tilingScheme, new WebMercatorTilingScheme());
    }

    function computeDesiredGranularity(tilingScheme, tile) {
        var ellipsoid = tilingScheme.ellipsoid;
        var level = tile.level;

        // The more vertices we use to tessellate the extent, the less geometric error
        // in the tile.  We only need to use enough vertices to be at or below the
        // geometric error expected for this level.
        var maxErrorMeters = tilingScheme.getLevelMaximumGeometricError(level);

        // Convert the max error in meters to radians at the equator.
        // TODO: we should take the latitude into account to avoid over-tessellation near the poles.
        var maxErrorRadians = maxErrorMeters / ellipsoid.getRadii().x;

        return maxErrorRadians;
    }

    /**
     * Populates a {@link Tile} with ellipsoid-mapped surface geometry from this
     * tile provider.
     *
     * @memberof EsriImageServerTerrainProvider
     *
     * @param {Context} context The rendered context to use to create renderer resources.
     * @param {Tile} tile The tile to populate with surface geometry.
     * @returns {Boolean|Promise} A boolean value indicating whether the tile was successfully
     * populated with geometry, or a promise for such a value in the future.
     */
    EsriImageServerTerrainProvider.prototype.createTileEllipsoidGeometry = function(context, tile) {
        // Creating the geometry will require a request to the ImageServer, which will complete
        // asynchronously.  The question is, what do we do in the meantime?  The best thing to do is
        // to use terrain associated with the parent tile.  Ideally, we would be able to render
        // high-res imagery attached to low-res terrain.  In some ways, this is similar to the need
        // described in TerrainProvider of creating geometry for tiles at a higher level than
        // the terrain source actually provides.

        // In the short term, for simplicity:
        // 1. If a tile has geometry available but it has not yet been loaded, don't render the tile until
        //    the geometry has been loaded.
        // 2. If a tile does not have geometry available at all, do not render it or its siblings.
        // Longer term, #1 may be acceptable, but #2 won't be for the reasons described above.
        // To address #2, we can subdivide a mesh into its four children.  This will be fairly CPU
        // intensive, though, which is why we probably won't want to do it while waiting for the
        // actual data to load.  We could also potentially add fractal detail when subdividing.

        var url = '...';
        return when(loadImage(url, true), function(image) {

        });
    };

    /**
     * Populates a {@link Tile} with plane-mapped surface geometry from this
     * tile provider.
     *
     * @memberof EsriImageServerTerrainProvider
     *
     * @param {Context} context The rendered context to use to create renderer resources.
     * @param {Tile} tile The tile to populate with surface geometry.
     * @param {Projection} projection The map projection to use.
     * @returns {Boolean|Promise} A boolean value indicating whether the tile was successfully
     * populated with geometry, or a promise for such a value in the future.
     */
    EsriImageServerTerrainProvider.prototype.createTilePlaneGeometry = function(context, tile, projection) {
        throw new DeveloperError('Not supported yet.');
    };

    return EsriImageServerTerrainProvider;
});