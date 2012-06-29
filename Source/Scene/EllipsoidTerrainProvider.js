/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue'
    ], function(
        DeveloperError,
        defaultValue) {
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
        this.tilingScheme = defaultValue(tilingScheme, new MercatorTilingScheme());
    }

    /**
     * Populates a {@link Tile} with surface geometry from this tile provider.
     *
     * @memberof TerrainProvider
     *
     * @param {Tile} tile The tile to populate with surface geometry.
     * @returns {Promise} TODO: what are we promising?  Some sort of indication of success?
     */
    EllipsoidTerrainProvider.prototype.createTileGeometry = function(tile) {
        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;
        var extent = tile.extent;
        var level = tile.level;

        // The more vertices we use to tessellate the extent, the less geometric error
        // in the tile.  We only need to use enough vertices to be at or below the
        // geometric error expected for this level.
        //
        var levelZeroMaxError = tilingScheme.levelZeroMaximumGeometricError;
        var errorDivisor = 1 << level;
        var maxErrorMeters = levelZeroMaxError / errorDivisor;

        // Convert the max error in meters to radians at the equator.
        // TODO: we should take the latitude into account to avoid over-tessellation near the poles.
        var maxErrorRadians = maxErrorMeters / ellipsoid.getRadii().x;

        // Create vertex and index buffers for this extent.
        // TODO: do this in a web worker?
        var center = ellipsoid.toCartesian(new Cartographic3(
                (extent.east - extent.west) / 2.0,
                (extent.north - extent.south) / 2.0,
                0.0));
        var buffers = ExtentTessellator.computeBuffers({
            ellipsoid : ellipsoid,
            extent : extent,
            granularity : maxErrorRadians,
            generateTextureCoords : true,
            interleave : true,
            relativeToCenter : center
        });

        var datatype = ComponentDatatype.FLOAT;
        typedArray = datatype.toTypedArray(buffers.vertices);
        buffer = context.createVertexBuffer(typedArray, usage);
        stride = 5 * datatype.sizeInBytes;
        attributes = [{
            index : attributeIndices.position3D,
            vertexBuffer : buffer,
            componentDatatype : datatype,
            componentsPerAttribute : 3,
            offsetInBytes : 0,
            strideInBytes : stride
        }, {
            index : attributeIndices.textureCoordinates,
            vertexBuffer : buffer,
            componentDatatype : datatype,
            componentsPerAttribute : 2,
            offsetInBytes : 3 * datatype.sizeInBytes,
            strideInBytes : stride
        }, {
            index : attributeIndices.position2D,
            value : [0.0, 0.0]
        }];
        indexBuffer = context.createIndexBuffer(new Uint16Array(buffers.indices), usage, IndexDatatype.UNSIGNED_SHORT);

        tile._extentVA = context.createVertexArray(attributes, indexBuffer);
    };

    return EllipsoidTerrainProvider;
});