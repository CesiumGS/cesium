/*global define*/
define([
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Extent',
        '../Core/PlaneTessellator',
        './ImageryCache',
        './Tile',
        './TileImagery',
        './TileState',
        './TexturePool',
        './Projections',
        '../ThirdParty/when'
    ], function(
        combine,
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Extent,
        PlaneTessellator,
        ImageryCache,
        Tile,
        TileImagery,
        TileState,
        TexturePool,
        Projections,
        when) {
    "use strict";

    /**
     * An imagery layer that display tiled image data from a single imagery provider
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

        this._imageryCache = new ImageryCache();
        this._texturePool = new TexturePool();

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
        var imageryProvider = this.imageryProvider;
        var imageryTilingScheme = imageryProvider.tilingScheme;

        // Compute the extent of the imagery from this imageryProvider that overlaps
        // the geometry tile.  The ImageryProvider and ImageryLayer both have the
        // opportunity to constrain the extent.  The imagery TilingScheme's extent
        // always fully contains the ImageryProvider's extent.
        var extent = tile.extent.intersectWith(imageryProvider.extent);
        extent = extent.intersectWith(this.extent);

        if (extent.east <= extent.west ||
            extent.north <= extent.south) {
            // There is no overlap between this terrain tile and this imagery
            // provider, so no skeletons need to be created.
            return;
        }


        // Compute the required level in the imagery tiling scheme.
        // TODO: this should be imagerySSE / terrainSSE.
        var errorRatio = 0.5;
        var targetGeometricError = errorRatio * geometryTilingScheme.getLevelMaximumGeometricError(tile.level);
        var imageryLevel = imageryTilingScheme.getLevelWithMaximumGeometricError(targetGeometricError);
        imageryLevel = Math.max(0, Math.min(imageryProvider.maxLevel, imageryLevel));

        var northwestTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getNorthwest(), imageryLevel);
        var southeastTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getSoutheast(), imageryLevel);

        // If the southeast corner of the extent lies very close to the north or west side
        // of the southeast tile, we don't actually need the southernmost or easternmost
        // tiles.
        // Similarly, if the northwest corner of the extent list very close to the south or east side
        // of the northwest tile, we don't actually need the northernmost or westernmost tiles.
        // TODO: The northwest corner is especially sketchy...  Should we be doing something
        // elsewhere to ensure better alignment?
        // TODO: Is CesiumMath.EPSILON10 the right epsilon to use?
        var northwestTileExtent = imageryTilingScheme.tileXYToExtent(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        if (Math.abs(northwestTileExtent.south - extent.north) < CesiumMath.EPSILON10) {
            ++northwestTileCoordinates.y;
        }
        if (Math.abs(northwestTileExtent.east - extent.west) < CesiumMath.EPSILON10) {
            ++northwestTileCoordinates.x;
        }

        var southeastTileExtent = imageryTilingScheme.tileXYToExtent(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
        if (Math.abs(southeastTileExtent.north - extent.south) < CesiumMath.EPSILON10) {
            --southeastTileCoordinates.y;
        }
        if (Math.abs(southeastTileExtent.west - extent.east) < CesiumMath.EPSILON10) {
            --southeastTileCoordinates.x;
        }

        // Create TileImagery instances for each imagery tile overlapping this terrain tile.
        // We need to do all texture coordinate computations in the terrain tile's tiling scheme.
        var terrainExtent = geometryTilingScheme.tileXYToNativeExtent(tile.x, tile.y, tile.level);
        var terrainWidth = terrainExtent.east - terrainExtent.west;
        var terrainHeight = terrainExtent.north - terrainExtent.south;

        for ( var i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
            for ( var j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
                var imageryExtent = imageryTilingScheme.tileXYToExtent(i, j, imageryLevel);
                imageryExtent = geometryTilingScheme.extentToNativeExtent(imageryExtent);
                var textureTranslation = new Cartesian2(
                        (imageryExtent.west - terrainExtent.west) / terrainWidth,
                        (imageryExtent.south - terrainExtent.south) / terrainHeight);
                var textureScale = new Cartesian2(
                        (imageryExtent.east - imageryExtent.west) / terrainWidth,
                        (imageryExtent.north - imageryExtent.south) / terrainHeight);
                tile.imagery.push(new TileImagery(this, i, j, imageryLevel, textureTranslation, textureScale));
            }
        }
    };

    var activeTileImageRequests = {};

    ImageryLayer.prototype.requestImagery = function(tileImagery) {
        var imageryProvider = this.imageryProvider;
        var imageryCache = this._imageryCache;
        var hostname;

        when(imageryProvider.buildImageUrl(tileImagery.x, tileImagery.y, tileImagery.level), function(imageUrl) {
            var texture = imageryCache.get(imageUrl);
            if (typeof texture !== 'undefined') {
                tileImagery.texture = texture;
                tileImagery.state = TileState.READY;
                return false;
            }

            hostname = getHostname(imageUrl);
            if (hostname !== '') {
                var activeRequestsForHostname = defaultValue(activeTileImageRequests[hostname], 0);

                //cap image requests per hostname, because the browser itself is capped,
                //and we have no way to cancel an image load once it starts, but we need
                //to be able to reorder pending image requests
                if (activeRequestsForHostname > 6) {
                    // postpone loading tile
                    tileImagery.state = TileState.UNLOADED;
                    return false;
                }

                activeTileImageRequests[hostname] = activeRequestsForHostname + 1;
            }

            tileImagery.imageUrl = imageUrl;
            return imageryProvider.requestImage(imageUrl);
        }).then(function(image) {
            if (typeof image === 'boolean') {
                return;
            }

            activeTileImageRequests[hostname]--;

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
        this.imageryProvider.createResources(context, tileImagery, this._texturePool);

        if (tileImagery.state === TileState.READY) {
            tileImagery.texture = this._imageryCache.add(tileImagery.imageUrl, tileImagery.texture);
            tileImagery.imageUrl = undefined;
        }
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
        this._texturePool = this._texturePool && this._texturePool.destroy();

        return destroyObject(this);
    };

    return ImageryLayer;
});