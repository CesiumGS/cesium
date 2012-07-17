/*global define*/
define([
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic2',
        '../Core/ComponentDatatype',
        '../Core/Extent',
        '../Core/ExtentTessellator',
        '../Core/IndexDatatype',
        '../Core/Intersect',
        '../Core/JulianDate',
        '../Core/PlaneTessellator',
        '../Core/PrimitiveType',
        '../Core/Queue',
        '../Core/Rectangle',
        '../Renderer/BufferUsage',
        '../Renderer/MipmapHint',
        '../Renderer/PixelFormat',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './Tile',
        './TileImagery',
        './TileState',
        './Projections',
        './SceneMode',
        '../ThirdParty/when'
    ], function(
        combine,
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic2,
        ComponentDatatype,
        Extent,
        ExtentTessellator,
        IndexDatatype,
        Intersect,
        JulianDate,
        PlaneTessellator,
        PrimitiveType,
        Queue,
        Rectangle,
        BufferUsage,
        MipmapHint,
        PixelFormat,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        Tile,
        TileImagery,
        TileState,
        Projections,
        SceneMode,
        when) {
    "use strict";

    /**
     * An imagery layer that display tiled image data from a single tile provider
     * on a central body.
     *
     * @name ImageryLayer
     */
    function ImageryLayer(imageryProvider, description) {
        this.imageryProvider = imageryProvider;

        description = defaultValue(description, {});

        var extent = defaultValue(description.extent, imageryProvider.extent);
        extent = defaultValue(extent, Extent.MAX_VALUE);

        this.maxScreenSpaceError = defaultValue(description.maxScreenSpaceError, 1);

        this.extent = extent;

        this._tileFailCount = 0;

        /**
         * The maximum number of tiles that can fail consecutively before the
         * layer will stop loading tiles.
         *
         * @type {Number}
         */
        this.maxTileFailCount = 10;

        /**
         * The maximum number of failures allowed for each tile before the
         * layer will stop loading a failing tile.
         *
         * @type {Number}
         */
        this.perTileMaxFailCount = 3;

        /**
         * The number of seconds between attempts to retry a failing tile.
         *
         * @type {Number}
         */
        this.failedTileRetryTime = 5.0;

        /**
         * DOC_TBA
         *
         * @type {Number}
         */
        this.pixelError3D = 5.0;

        /**
         * DOC_TBA
         *
         * @type {Number}
         */
        this.pixelError2D = 2.0;
    }

    ImageryLayer.prototype.createTileImagerySkeletons = function(tile, geometryTilingScheme) {
        var imageryTilingScheme = this.imageryProvider.tilingScheme;

        var extent = tile.extent.intersectWith(this.imageryProvider.extent);
        //TODO: calculate level correctly
        var imageryLevel = tile.level + (geometryTilingScheme.numberOfLevelZeroTilesX === 1 ? 0 : 1);

        var northwestTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getNorthwest(), imageryLevel);
        var southeastTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getSoutheast(), imageryLevel);

        // If the southeast corner of the extent lies very close to the north or west side
        // of the southeast tile, we don't actually need the southernmost or easternmost
        // tiles.
        // Similarly, if the northwest corner of the extent list very close to the south or east side
        // of the northwest tile, we don't actually need the northernmost or westnernmod tiles.
        // TODO: The northwest corner is especially sketchy...  Should we be doing something
        // elsewhere to ensure better alignment?
        // TODO: Is 1e-10 the right epsilon to use?
        var northwestTileExtent = imageryTilingScheme.tileXYToExtent(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        if (Math.abs(northwestTileExtent.south - extent.north) < 1e-10) {
            ++northwestTileCoordinates.y;
        }
        if (Math.abs(northwestTileExtent.east - extent.west) < 1e-10) {
            ++northwestTileCoordinates.x;
        }

        var southeastTileExtent = imageryTilingScheme.tileXYToExtent(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
        if (Math.abs(southeastTileExtent.north - extent.south) < 1e-10) {
            --southeastTileCoordinates.y;
        }
        if (Math.abs(southeastTileExtent.west - extent.east) < 1e-10) {
            --southeastTileCoordinates.x;
        }

        if (northwestTileCoordinates.x !== southeastTileCoordinates.x ||
            northwestTileCoordinates.y !== southeastTileCoordinates.y) {
            console.log('too many tiles!');
        }

        for ( var i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
            for ( var j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
                //TODO: compute texture translation and scale
                tile.imagery.push(new TileImagery(this, i, j, imageryLevel));
            }
        }
    };

    var activeTileImageRequests = {};

    ImageryLayer.prototype.requestImagery = function(tileImagery) {
        var imageryProvider = this.imageryProvider;
        var hostname;
        var postpone = false;

        when(imageryProvider.buildImageUrl(tileImagery.x, tileImagery.y, tileImagery.level), function(url) {
            hostname = getHostname(url);

            if (hostname !== '') {
                var activeRequestsForHostname = defaultValue(activeTileImageRequests[hostname], 0);

                //cap image requests per hostname, because the browser itself is capped,
                //and we have no way to cancel an image load once it starts, but we need
                //to be able to reorder pending image requests
                if (activeRequestsForHostname > 6) {
                    // postpone loading tile
                    tileImagery.state = TileState.UNLOADED;
                    postpone = true;
                    return;
                }

                activeTileImageRequests[hostname] = activeRequestsForHostname + 1;
            }

            return imageryProvider.requestImage(url);
        }).then(function(image) {
            activeTileImageRequests[hostname]--;

            if (postpone) {
                return;
            }

            tileImagery.image = image;

            if (typeof image === 'undefined') {
                tileImagery.state = TileState.INVALID;
                return;
            }

            tileImagery.state = TileState.RECEIVED;
        }, function() {
            tileImagery.state = TileState.FAILED;
        });
    };

    ImageryLayer.prototype.transformImagery = function(context, tileImagery) {
        this.imageryProvider.transformImagery(context, tileImagery);
    };

    ImageryLayer.prototype.createResources = function(context, tileImagery) {
        this.imageryProvider.createResources(context, tileImagery);
    };

    var anchor;
    function getHostname(url) {
        if (typeof anchor === 'undefined') {
            anchor = document.createElement('a');
        }
        anchor.href = url;
        return anchor.hostname;
    }

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof ImageryLayer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see ImageryLayer#destroy
     */
    ImageryLayer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof ImageryLayer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ImageryLayer#isDestroyed
     *
     * @example
     * imageryLayer = imageryLayer && imageryLayer.destroy();
     */
    ImageryLayer.prototype.destroy = function() {
        return destroyObject(this);
    };

    return ImageryLayer;
});