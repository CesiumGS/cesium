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
     * Request the tile geometry from the remote server.  Once complete, the
     * tile state should be set to RECEIVED.  Alternatively, tile state can be set to
     * UNLOADED to indicate that the request should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Tile} The tile to request geometry for.
     */
    EllipsoidTerrainProvider.prototype.requestTileGeometry = function(tile) {
        tile.state = TileState.RECEIVED;
    };

    var taskProcessor = new TaskProcessor('createVerticesFromExtent');

    /**
     * Transform the tile geometry from the format requested from the remote server
     * into a format suitable for resource creation.  Once complete, the tile
     * state should be set to TRANSFORMED.  Alternatively, tile state can be set to
     * RECEIVED to indicate that the transformation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Tile} tile The tile to transform geometry for.
     */
    EllipsoidTerrainProvider.prototype.transformGeometry = function(context, tile) {
        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.getEllipsoid();
        var extent = tile.extent;

        tile.center = ellipsoid.cartographicToCartesian(extent.getCenter());

        var width = 16;
        var height = 16;

        var verticesPromise = taskProcessor.scheduleTask({
            extent : extent,
            surfaceHeight : 0,
            width : width,
            height : height,
            relativeToCenter : tile.center,
            radiiSquared : ellipsoid.getRadiiSquared()
        });

        if (typeof verticesPromise === 'undefined') {
            //postponed
            tile.state = TileState.RECEIVED;
            return;
        }

        when(verticesPromise, function(result) {
            tile.transientData = {
                vertices : result,
                indices : TerrainProvider.getRegularGridIndices(width, height)
            };
            tile.state = TileState.TRANSFORMED;
        }, function(e) {
            /*global console*/
            console.error('failed to transform geometry: ' + e);
            tile.state = TileState.FAILED;
        });
    };

    var scratch = new Cartesian3();

    /**
     * Create WebGL resources for the tile using whatever data the transformGeometry step produced.
     * Once complete, the tile state should be set to READY.  Alternatively, tile state can be set to
     * TRANSFORMED to indicate that resource creation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Tile} tile The tile to create resources for.
     */
    EllipsoidTerrainProvider.prototype.createResources = function(context, tile) {
        var buffers = tile.transientData;
        tile.transientData = undefined;

        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.maxHeight = 0;
        tile.boundingSphere3D = BoundingSphere.fromVertices(buffers.vertices, tile.center, 5);

        var ellipsoid = this.tilingScheme.getEllipsoid();
        var extent = tile.extent;
        tile.southwestCornerCartesian = ellipsoid.cartographicToCartesian(extent.getSouthwest());
        tile.southeastCornerCartesian = ellipsoid.cartographicToCartesian(extent.getSoutheast());
        tile.northeastCornerCartesian = ellipsoid.cartographicToCartesian(extent.getNortheast());
        tile.northwestCornerCartesian = ellipsoid.cartographicToCartesian(extent.getNorthwest());

        tile.westNormal = Cartesian3.UNIT_Z.cross(tile.southwestCornerCartesian.negate(scratch), scratch).normalize();
        tile.eastNormal = tile.northeastCornerCartesian.negate(scratch).cross(Cartesian3.UNIT_Z, scratch).normalize();
        tile.southNormal = ellipsoid.geodeticSurfaceNormal(tile.southeastCornerCartesian).cross(tile.southwestCornerCartesian.subtract(tile.southeastCornerCartesian, scratch)).normalize();
        tile.northNormal = ellipsoid.geodeticSurfaceNormal(tile.northwestCornerCartesian).cross(tile.northeastCornerCartesian.subtract(tile.northwestCornerCartesian, scratch)).normalize();

        var occludeePoint = Occluder.computeOccludeePointFromExtent(tile.extent, ellipsoid);
        if (typeof occludeePoint !== 'undefined') {
            Cartesian3.multiplyComponents(occludeePoint, ellipsoid.getOneOverRadii(), occludeePoint);
        }
        tile.occludeePointInScaledSpace = occludeePoint;

        tile.state = TileState.READY;
    };

    return EllipsoidTerrainProvider;
});