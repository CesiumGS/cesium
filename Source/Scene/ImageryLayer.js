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

    function TileLoadList() {
        this._head = undefined;
        this._tail = undefined;
    }

    TileLoadList.prototype.append = function(item) {
        if (typeof this._head === 'undefined') {
            item._previous = undefined;
            item._next = undefined;
            this._head = item;
            this._tail = item;
        } else {
            item._previous = this._tail;
            item._next = undefined;
            this._tail._next = item;
            this._tail = item;
        }
    };

    TileLoadList.prototype.remove = function(item) {
        var previous = item._previous;
        var next = item._next;

        if (item === this._head) {
            this._head = next;
        } else {
            previous._next = next;
        }

        if (item === this._tail) {
            this._tail = previous;
        } else {
            next._previous = previous;
        }

        item._previous = undefined;
        item._next = undefined;
    };

    TileLoadList.prototype.insertBefore = function(insertionPoint, item) {
        if (insertionPoint === item) {
            return;
        }

        if (typeof this._head === 'undefined') {
            // no other tiles in the list
            item._previous = undefined;
            item._next = undefined;
            this._head = item;
            this._tail = item;
            return;
        }

        if (typeof item._previous !== 'undefined' || typeof item._next !== 'undefined') {
            // tile already in the list, remove from its current location
            this.remove(item);
        }

        if (typeof insertionPoint === 'undefined') {
            this.append(item);
            return;
        }

        var insertAfter = insertionPoint._previous;
        item._previous = insertAfter;
        if (typeof insertAfter !== 'undefined') {
            insertAfter._next = item;
        }

        item._next = insertionPoint;
        insertionPoint._previous = item;

        if (insertionPoint === this._head) {
            this._head = item;
        }
    };

    var layerID = 0;
    function nextLayerID() {
        return layerID++;
    }

    /**
     * An imagery layer that display tiled image data from a single tile provider
     * on a central body.
     *
     * @name ImageryLayer
     */
    function ImageryLayer(centralBody, imageryProvider, description) {
        this._centralBody = centralBody;
        this.imageryProvider = imageryProvider;

        this._id = nextLayerID();

        description = defaultValue(description, {});

        var extent = defaultValue(description.extent, imageryProvider.extent);
        extent = defaultValue(extent, Extent.MAX_VALUE);

        this.maxScreenSpaceError = defaultValue(description.maxScreenSpaceError, 1);

        this.extent = extent;

        // reusable stack used during update for tile tree traversal
        this._tileStack = [];

        // reusable array of tile built by update for rendering
        this._tilesToRender = [];

        // a doubly linked list of tiles that need to be loaded, maintained in priority order
        this._tileImageryLoadList = new TileLoadList();

        this._minTileDistance = undefined;
        this._preloadLevelLimit = 1;
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

    ImageryLayer.prototype.requestImagery = function(tileImagery) {
        var imageryProvider = this.imageryProvider;
        var hostname;
        var postpone = false;

        when(imageryProvider.buildTileImageUrl(tileImagery.x, tileImagery.y, tileImagery.level), function(url) {
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

            return imageryProvider.loadTileImage(url);
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
        var imageryProvider = this.imageryProvider;
        imageryProvider.transformImagery(context, tileImagery);
    };

    ImageryLayer.prototype.createResources = function(context, tileImagery) {
        var imageryProvider = this.imageryProvider;
        imageryProvider.createResources(context, tileImagery);
    };

    function getTileImagery(layer, tile) {
        var tileImagery = tile._imagery[layer._id];
        if (typeof tileImagery === 'undefined') {
            tileImagery = {
                tile : tile,
                state : TileState.UNLOADED
            };
            tile._imagery[layer._id] = tileImagery;
        }
        return tileImagery;
    }

    var anchor;
    function getHostname(url) {
        if (typeof anchor === 'undefined') {
            anchor = document.createElement('a');
        }
        anchor.href = url;
        return anchor.hostname;
    }

    var activeTileImageRequests = {};

    function loadTileImagery(layer, tileImagery) {
        if (!tileNeedsImageLoad(layer, tileImagery)) {
            return;
        }

        var tileProvider = layer.imageryProvider;

        // start loading tile
        tileImagery.state = TileState.IMAGE_LOADING;
        var tile = tileImagery.tile;

        var hostname;
        var postpone = false;
        var x = tile.x;
        var y = tile.y;
        var level = tile.level + layer._levelOffset;

        when(tileProvider.buildTileImageUrl(x, y, level), function(imageUrl) {
            hostname = getHostname(imageUrl);

            if (hostname !== '') {
                var activeRequestsForHostname = defaultValue(activeTileImageRequests[hostname], 0);

                //cap image requests per hostname, because the browser itself is capped,
                //and we have no way to cancel an image load once it starts, but we need
                //to be able to reorder pending image requests
                if (activeRequestsForHostname > 6) {
                    // postpone loading tile
                    tileImagery.state = TileState.UNLOADED;
                    postpone = true;
                    return undefined;
                }

                activeTileImageRequests[hostname] = activeRequestsForHostname + 1;
            }

            return tileProvider.loadTileImage(imageUrl);
        }).then(function(image) {
            activeTileImageRequests[hostname]--;

            if (postpone) {
                return;
            }

            if (typeof image === 'undefined') {
                tileImagery.state = TileState.IMAGE_INVALID;
                return;
            }

            tileImagery._failCount = 0;
            layer._tileFailCount = 0;
            layer._lastFailedTime = 0;

            tileImagery.state = TileState.REPROJECTING;

            tileImagery._image = image;
            tileImagery._width = image.width;
            tileImagery._height = image.height;
        }, function() {
            tileImagery._failCount++;
            layer._tileFailCount++;
            layer._lastFailedTime = Date.now();

            tileImagery.state = TileState.IMAGE_FAILED;
        });

        tileImagery._width = tileProvider.tileWidth;
        tileImagery._height = tileProvider.tileHeight;
        tileImagery._projection = tileProvider.projection;
    }

    function tileNeedsImageLoad(layer, tileImagery) {
        if (tileImagery.state === TileState.UNLOADED) {
            return true;
        }

        // only retry failed tiles
        if (tileImagery.state !== TileState.IMAGE_FAILED) {
            return false;
        }

        // delay retry until enough time has passed
        var timeSinceFailure = (Date.now() - tileImagery._lastFailTime) / 1000;
        if (timeSinceFailure < layer.failedTileRetryTime) {
            return false;
        }

        // don't retry if the layer has failed too many tiles
        if (layer._tileFailCount >= layer.maxTileFailCount) {
            return false;
        }

        // don't retry if the tile has failed too many times
        if (tileImagery._failCount >= layer.perTileMaxFailCount) {
            return false;
        }

        return true;
    }

    function shouldRefine(layer, tile, context, sceneState) {
        var camera = sceneState.camera;

        if (sceneState.mode === SceneMode.SCENE2D) {
            var frustum = camera.frustum;
            var projection = sceneState.scene2D.projection;
            var viewport = context.getViewport();
            var viewportWidth = viewport.width;
            var viewportHeight = viewport.height;

            var pixelError2D = (layer.pixelError2D > 0.0) ? layer.pixelError2D : 1.0;

            var a = projection.project(new Cartographic2(tile.extent.west, tile.extent.north)).getXY();
            var b = projection.project(new Cartographic2(tile.extent.east, tile.extent.south)).getXY();
            var diagonal = a.subtract(b);
            var texelSize = Math.max(diagonal.x, diagonal.y) / Math.max(tile.width, tile.height);
            var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(viewportWidth, viewportHeight);

            if (texelSize > pixelSize * pixelError2D) {
                return true;
            }

            return false;
        }

        var boundingVolume = getTileBoundingSphere(layer, tile, sceneState);
        var cameraPosition = camera.getPositionWC();
        var direction = camera.getDirectionWC();

        var pixelError3D = (layer.pixelError3D > 0.0) ? layer.pixelError3D : 1.0;
        var level = tile.level + layer._levelOffset;
        var dmin = layer._minTileDistance(level, pixelError3D);

        var toCenter = boundingVolume.center.subtract(cameraPosition);
        var toSphere = toCenter.normalize().multiplyWithScalar(toCenter.magnitude() - boundingVolume.radius);
        var distance = direction.multiplyWithScalar(direction.dot(toSphere)).magnitude();

        if (distance > 0.0 && distance < dmin) {
            return true;
        }

        return false;
    }

    function getTileBoundingSphere(layer, tile, sceneState) {
        if (sceneState.mode === SceneMode.SCENE3D) {
            return tile.get3DBoundingSphere();
        } else if (sceneState.mode === SceneMode.COLUMBUS_VIEW) {
            var boundingVolume = tile.get2DBoundingSphere(sceneState.scene2D.projection).clone();
            boundingVolume.center = new Cartesian3(0.0, boundingVolume.center.x, boundingVolume.center.y);
            return boundingVolume;
        } else {
            return tile.computeMorphBounds(layer._centralBody.morphTime, sceneState.scene2D.projection);
        }
    }

    function cull(layer, tile, sceneState) {
        if (sceneState.mode === SceneMode.SCENE2D) {
            var bRect = tile.get2DBoundingRectangle(sceneState.scene2D.projection);

            var frustum = sceneState.camera.frustum;
            var position = sceneState.camera.position;
            var x = position.x + frustum.left;
            var y = position.y + frustum.bottom;
            var w = position.x + frustum.right - x;
            var h = position.y + frustum.top - y;
            var fRect = new Rectangle(x, y, w, h);

            return !Rectangle.rectangleRectangleIntersect(bRect, fRect);
        }

        var boundingVolume = getTileBoundingSphere(layer, tile, sceneState);
        if (sceneState.camera.getVisibility(boundingVolume, BoundingSphere.planeSphereIntersect) === Intersect.OUTSIDE) {
            return true;
        }

        if (sceneState.mode === SceneMode.SCENE3D) {
            var occludeePoint = tile.getOccludeePoint();
            var occluder = layer._centralBody._occluder;
            return (occludeePoint && !occluder.isVisible(new BoundingSphere(occludeePoint, 0.0))) || !occluder.isVisible(boundingVolume);
        }

        return false;
    }

    function createMinTileDistanceFunction(layer, context, sceneState) {
        var tileProvider = layer.imageryProvider;
        var extent = layer.extent;

        var frustum = sceneState.camera.frustum;
        var fovy = frustum.fovy;
        var aspectRatio = frustum.aspectRatio;

        var pixelSizePerDistance = 2.0 * Math.tan(fovy * 0.5);
        var canvas = context.getCanvas();
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;
        if (height > width * aspectRatio) {
            pixelSizePerDistance /= height;
        } else {
            pixelSizePerDistance /= width;
        }

        var invPixelSizePerDistance = 1.0 / pixelSizePerDistance;
        var texelHeight = (extent.north - extent.south) / tileProvider.tileHeight;
        var texelWidth = (extent.east - extent.west) / tileProvider.tileWidth;
        var texelSize = (texelWidth > texelHeight) ? texelWidth : texelHeight;
        var dmin = texelSize * invPixelSizePerDistance;
        dmin *= layer._centralBody.getEllipsoid().getMaximumRadius();

        var func = function(level, pixelError) {
            return (dmin / pixelError) * Math.exp(-0.693147181 * level);
        };

        func.needsUpdate = function(context, sceneState) {
            var frustum = sceneState.camera.frustum;
            if (frustum.fovy !== fovy || frustum.aspectRatio !== aspectRatio) {
                return true;
            }

            var canvas = context.getCanvas();
            if (canvas.clientWidth !== width || canvas.clientHeight !== height) {
                return true;
            }

            return false;
        };

        return func;
    }

    /**
     * @private
     */
    ImageryLayer.prototype.update = function(context, sceneState) {
        var tileProvider = this.imageryProvider;
        if (!tileProvider.ready) {
            return;
        }

        var minTileDistance = this._minTileDistance;
        if (typeof minTileDistance === 'undefined' || minTileDistance.needsUpdate(context, sceneState)) {
            this._minTileDistance = minTileDistance = createMinTileDistanceFunction(this, context, sceneState);
        }

        // TODO: remove this offset calculation
        if (typeof this._levelOffset === 'undefined') {
            this._levelOffset = 0;
            var zeroTileDifference = this._centralBody._terrain.tilingScheme.numberOfLevelZeroTilesX - tileProvider.tilingScheme.numberOfLevelZeroTilesX;
            while (zeroTileDifference > 0) {
                this._levelOffset++;
                zeroTileDifference = zeroTileDifference >> 1;
            }
        }

        var maxLevel = tileProvider.maxLevel;
        var now = Date.now();

        // start loading tiles and build render list
        var tile;
        var tileImagery;

        var tileImageryLoadList = this._tileImageryLoadList;
        var insertionPoint = tileImageryLoadList._head;

        var tileStack = this._tileStack;
        Array.prototype.push.apply(tileStack, this._centralBody._levelZeroTiles);
        while (tileStack.length > 0) {
            tile = tileStack.pop();

            if (cull(this, tile, sceneState)) {
                tile.destroyVertexArray();
                continue;
            }

            tileImagery = getTileImagery(this, tile);

            if (tileImagery.state !== TileState.TEXTURE_LOADED) {
                tileImageryLoadList.insertBefore(insertionPoint, tileImagery);
            }

            var renderTile = tileImagery.state === TileState.TEXTURE_LOADED;
            var level = tile.level + this._levelOffset;
            if (level < maxLevel && shouldRefine(this, tile, context, sceneState)) {
                var allChildrenLoaded = true;

                var children = tile.getChildren();
                for ( var i = 0, len = children.length; i < len; ++i) {
                    var child = children[i];

                    tileStack.push(child);

                    allChildrenLoaded = allChildrenLoaded && typeof child.vertexArray !== 'undefined';
                }

                if (allChildrenLoaded) {
                    renderTile = false;
                }
            }

            if (renderTile) {
                addToTilesToRender(this, tile, context, sceneState);
            }
        }

        // process tiles in the load queue
        var startTime = Date.now();
        var timeSlice = 10;

        tileImagery = tileImageryLoadList._head;
        while (typeof tileImagery !== 'undefined') {
            if (Date.now() - startTime > timeSlice) {
                break;
            }

            loadTileImagery(this, tileImagery);

            if (tileImagery.state === TileState.REPROJECTING) {
                tileImagery._image = tileImagery._projection.toWgs84(tileImagery.tile.extent, tileImagery._image);
                tileImagery._projection = Projections.WGS84;
                tileImagery.state = TileState.TEXTURE_LOADING;
            }

            if (tileImagery.state === TileState.TEXTURE_LOADING) {
                tileImagery._texture = this._centralBody._texturePool.createTexture2D(context, {
                    width : tileImagery._width,
                    height : tileImagery._height,
                    pixelFormat : PixelFormat.RGB
                });

                tileImagery._texture.copyFrom(tileImagery._image);
                tileImagery._texture.generateMipmap(MipmapHint.NICEST);
                tileImagery._texture.setSampler({
                    wrapS : TextureWrap.CLAMP,
                    wrapT : TextureWrap.CLAMP,
                    minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR,

                    // TODO: Remove Chrome work around
                    maximumAnisotropy : context.getMaximumTextureFilterAnisotropy() || 8
                });
                tileImagery.state = TileState.TEXTURE_LOADED;
                tileImagery._image = undefined;

                tileImageryLoadList.remove(tileImagery);
            }

            tileImagery = tileImagery._next;
        }
    };

    function addToTilesToRender(layer, tile, context, sceneState) {
        if (layer._tilesToRender.indexOf(tile) !== -1) {
            return;
        }

        var mode = sceneState.mode;
        var projection = sceneState.scene2D.projection;

        // create vertex array the first time it is needed or when morphing
        if (tile.vertexArray &&
            (tile.vertexArray.isDestroyed() ||
             layer._centralBody._isModeTransition(layer._centralBody._mode, mode) ||
             tile._mode !== mode ||
             layer._centralBody._projection !== projection)) {

            tile.vertexArray = tile.vertexArray.destroy();
            tile.loading = false;
        }

        if (!tile.vertexArray) {
            // TODO: hacktastic!
            if (!tile.loading) {
                tile.loading = true;

                if (mode === SceneMode.SCENE3D) {
                    when(layer._centralBody._terrain.createTileEllipsoidGeometry(context, tile), function() {
                        tile.loading = false;
                    });
                } else {
                    when(layer._centralBody._terrain.createTilePlaneGeometry(context, tile, projection), function() {
                        tile.loading = false;
                    });
                }
            }

            // TODO: can we get rid of this?
            tile._mode = mode;
        }

        var tileImagery = getTileImagery(layer, tile);
        if (typeof tileImagery._drawUniforms === 'undefined') {
            var intensity = 0.0;
            if (typeof layer.imageryProvider.getIntensity === 'function') {
                intensity = layer.imageryProvider.getIntensity(tile);
            }

            var drawUniforms = {
                u_numberOfDayTextures : function() {
                    return 1;
                },
                u_dayTextures : function() {
                    return [tileImagery._texture, tileImagery._texture, tileImagery._texture, tileImagery._texture, tileImagery._texture, tileImagery._texture, tileImagery._texture, tileImagery._texture];
                },
                u_dayTextureTranslation : function() {
                    return [new Cartesian2(0.0, 0.0), new Cartesian2(0.0, 0.0), new Cartesian2(0.0, 0.0), new Cartesian2(0.0, 0.0), new Cartesian2(0.0, 0.0), new Cartesian2(0.0, 0.0), new Cartesian2(0.0, 0.0), new Cartesian2(0.0, 0.0)];
                },
                u_dayTextureScale : function() {
                    return [new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0)];
                },
                u_dayIntensity : function() {
                    return intensity;
                },
                u_center3D : function() {
                    return tile.get3DBoundingSphere().center;
                },
                u_center2D : function() {
                    return tile.get2DBoundingSphere(projection).center;
                },
                u_modifiedModelView : function() {
                    return tile.modelView;
                }
            };

            tileImagery._drawUniforms = combine(drawUniforms, layer._centralBody._drawUniforms);
        }

        layer._tilesToRender.push(tile);
    }

    ImageryLayer.prototype.render = function(context) {
        if (!this.imageryProvider.ready) {
            return;
        }

        var tilesToRender = this._tilesToRender;

        if (tilesToRender.length === 0) {
            return;
        }

        // TODO: remove this hack.  It's needed because a beginDraw/endDraw without
        // a continueDraw throws an exception.
        var somethingToRender = false;
        for (var i = 0; i < tilesToRender.length; ++i) {
            if (tilesToRender[i].vertexArray) {
                somethingToRender = true;
                break;
            }
        }

        if (!somethingToRender) {
            return;
        }

        context.beginDraw({
            framebuffer : this._centralBody._fb,
            shaderProgram : this._centralBody._sp,
            renderState : this._centralBody._rsColor
        });

        // TODO: remove once multi-frustum/depth testing is implemented
        tilesToRender.sort(function(a, b) {
            return a.level - b.level;
        });

        var uniformState = context.getUniformState();
        var mv = uniformState.getModelView();
        var morphTime = this._centralBody.morphTime;

        // render tiles to FBO
        for ( var i = 0, len = tilesToRender.length; i < len; i++) {
            var tile = tilesToRender[i];
            if (!tile.vertexArray) {
                continue;
            }

            var rtc;
            if (morphTime === 1.0) {
                rtc = tile.get3DBoundingSphere().center;
                tile.mode = 0;
            } else if (morphTime === 0.0) {
                var center = tile.get2DBoundingSphere(projection).center;
                rtc = new Cartesian3(0.0, center.x, center.y);
                tile.mode = 1;
            } else {
                rtc = Cartesian3.ZERO;
                tile.mode = 2;
            }

            var centerEye = mv.multiplyWithVector(new Cartesian4(rtc.x, rtc.y, rtc.z, 1.0));
            var mvrtc = mv.clone();
            mvrtc.setColumn3(centerEye);
            tile.modelView = mvrtc;

            var tileImagery = getTileImagery(this, tile);

            context.continueDraw({
                primitiveType : PrimitiveType.TRIANGLES,
                vertexArray : tile.vertexArray,
                uniformMap : tileImagery._drawUniforms
            });
        }

        tilesToRender.length = 0;

        context.endDraw();
    };

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