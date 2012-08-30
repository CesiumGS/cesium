/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/ExtentTessellator',
        '../Core/PlaneTessellator',
        '../Core/TaskProcessor',
        './TerrainProvider',
        './TileState',
        './WebMercatorTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ExtentTessellator,
        PlaneTessellator,
        TaskProcessor,
        TerrainProvider,
        TileState,
        WebMercatorTilingScheme,
        when) {
    "use strict";

    /**
     * A very simple {@link TerrainProvider} that produces geometry by tessellating an ellipsoidal
     * surface.
     *
     * @alias EllipsoidTerrainProvider
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

        // Note: the 64 below does NOT need to match the actual vertex dimensions.
        this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this.tilingScheme.ellipsoid, 64, this.tilingScheme.numberOfLevelZeroTilesX);
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
        var ellipsoid = tilingScheme.ellipsoid;
        var extent = tile.extent;

        tile.center = ellipsoid.cartographicToCartesian(extent.getCenter());

        var width = 16;
        var height = 16;

        var verticesPromise = taskProcessor.scheduleTask({
            extent : extent,
            altitude : 0,
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
            tile.geometry = undefined;
            tile.transformedGeometry = {
                vertices : result.vertices,
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
        var buffers = tile.transformedGeometry;
        tile.transformedGeometry = undefined;

        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.maxHeight = 0;
        tile.boundingSphere3D = BoundingSphere.fromFlatArray(buffers.vertices, tile.center, 5);

        var ellipsoid = this.tilingScheme.ellipsoid;
        var extent = tile.extent;
        tile.southwestCornerCartesian = ellipsoid.cartographicToCartesian(extent.getSouthwest());
        tile.southeastCornerCartesian = ellipsoid.cartographicToCartesian(extent.getSoutheast());
        tile.northeastCornerCartesian = ellipsoid.cartographicToCartesian(extent.getNortheast());
        tile.northwestCornerCartesian = ellipsoid.cartographicToCartesian(extent.getNorthwest());

        tile.westNormal = Cartesian3.UNIT_Z.cross(tile.southwestCornerCartesian.negate(scratch), scratch).normalize();
        tile.eastNormal = tile.northeastCornerCartesian.negate(scratch).cross(Cartesian3.UNIT_Z, scratch).normalize();
        tile.southNormal = ellipsoid.geodeticSurfaceNormal(tile.southeastCornerCartesian).cross(tile.southwestCornerCartesian.subtract(tile.southeastCornerCartesian, scratch)).normalize();
        tile.northNormal = ellipsoid.geodeticSurfaceNormal(tile.northwestCornerCartesian).cross(tile.northeastCornerCartesian.subtract(tile.northwestCornerCartesian, scratch)).normalize();

        tile.state = TileState.READY;
    };

    /**
     * Populates a {@link Tile} with plane-mapped surface geometry from this
     * tile provider.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @param {Context} context The rendered context to use to create renderer resources.
     * @param {Tile} tile The tile to populate with surface geometry.
     * @param {Projection} projection The map projection to use.
     * @returns {Boolean|Promise} A boolean value indicating whether the tile was successfully
     * populated with geometry, or a promise for such a value in the future.
     */
    EllipsoidTerrainProvider.prototype.createTilePlaneGeometry = function(context, tile, projection) {
        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;
        var extent = tile.extent;

        var granularity = computeDesiredGranularity(tilingScheme, tile);

        var vertices = [];
        var width = tile.extent.east - tile.extent.west;
        var height = tile.extent.north - tile.extent.south;
        var lonScalar = 1.0 / width;
        var latScalar = 1.0 / height;

        var center = tile.boundingSphere3D.center;
        var projectedRTC = tile.get2DBoundingSphere(projection).center.clone();

        var mesh = PlaneTessellator.compute({
            resolution : {
                x : Math.max(Math.ceil(width / granularity), 2.0),
                y : Math.max(Math.ceil(height / granularity), 2.0)
            },
            onInterpolation : function(time) {
                var lonLat = new Cartographic(CesiumMath.lerp(extent.west, extent.east, time.x),
                                              CesiumMath.lerp(extent.south, extent.north, time.y));

                var p = ellipsoid.cartographicToCartesian(lonLat).subtract(center);
                vertices.push(p.x, p.y, p.z);

                var u = (lonLat.longitude - extent.west) * lonScalar;
                var v = (lonLat.latitude - extent.south) * latScalar;
                vertices.push(u, v);

                // TODO: This will not work if the projection's ellipsoid is different
                // than the central body's ellipsoid.  Throw an exception?
                var projectedLonLat = projection.project(lonLat).subtract(projectedRTC);
                vertices.push(projectedLonLat.x, projectedLonLat.y);
            }
        });

        TerrainProvider.createTilePlaneGeometryFromBuffers(context, tile, {
            vertices: vertices,
            indices: mesh.indexLists[0].values
        });


        tile._drawUniforms = {
            u_center3D : function() {
                return center;
            },
            u_center2D : function() {
                return (projectedRTC) ? projectedRTC.getXY() : Cartesian2.ZERO;
            },
            u_modifiedModelView : function() {
                return tile.modelView;
            }
        };

        return true;
    };

    return EllipsoidTerrainProvider;
});