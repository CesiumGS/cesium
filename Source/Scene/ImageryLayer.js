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
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './Tile',
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
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        Tile,
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

    /**
     * An imagery layer that display tiled image data from a single tile provider
     * on a central body.
     *
     * @name ImageryLayer
     */
    function ImageryLayer(centralBody, tileProvider, description) {
        this._centralBody = centralBody;
        this._tileProvider = tileProvider;

        description = defaultValue(description, {});

        this._maxExtent = description.maxExtent;

        // reusable stack used during update for tile tree traversal
        this._tileStack = [];

        // reusable array of tile built by update for rendering
        this._tilesToRender = [];

        // a doubly linked list of tiles that need to be loaded, maintained in priority order
        this._tileLoadList = new TileLoadList();

        this._minTileDistance = undefined;
        this._preloadZoomLimit = 1;
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

    /**
     * Gets the tile provider used by this layer.
     */
    ImageryLayer.prototype.getTileProvider = function() {
        return this._tileProvider;
    };

    var anchor;
    function getHostname(url) {
        if (typeof anchor === 'undefined') {
            anchor = document.createElement('a');
        }
        anchor.href = url;
        return anchor.hostname;
    }

    var activeTileImageRequests = {};

    function loadImageForTile(layer, tile) {
        if (!tileNeedsImageLoad(layer, tile)) {
            return;
        }

        var tileProvider = layer._tileProvider;

        var isAvailable = tileProvider.isTileAvailable(tile);
        var image = when(tileProvider.getTileImageUrl(tile), function(imageUrl) {
            var isDataUri = /^data:/.test(imageUrl);

            var image = new Image();

            if (!isDataUri) {
                var hostname = getHostname(imageUrl);
                var activeRequestsForHostname = defaultValue(activeTileImageRequests[hostname], 0);

                //cap image requests per hostname, because the browser itself is capped,
                //and we have no way to cancel an image load once it starts, but we need
                //to be able to reorder pending image requests
                if (activeRequestsForHostname > 6) {
                    return undefined;
                }

                activeTileImageRequests[hostname] = activeRequestsForHostname + 1;
                image.hostname = hostname;

                image.crossOrigin = '';
            }

            var deferred = when.defer();
            image.onload = function() {
                deferred.resolve(image);
            };
            image.onerror = function() {
                deferred.reject();
            };

            // start loading tile
            tile.state = TileState.IMAGE_LOADING;

            image.src = imageUrl;

            return deferred.promise;
        });

        when.all([isAvailable, image], function(values) {
            var isAvailable = values[0];
            if (!isAvailable) {
                tile.state = TileState.IMAGE_INVALID;
                tile._image = undefined;
                return;
            }
            var image = values[1];

            if (typeof image === 'undefined') {
                return;
            }

            activeTileImageRequests[image.hostname]--;

            tile._failCount = 0;
            layer._tileFailCount = 0;
            layer._lastFailedTime = 0;

            tile.state = TileState.REPROJECTING;

            tile._image = image;
            tile._width = image.width;
            tile._height = image.height;
        }, function() {
            tile._failCount++;
            layer._tileFailCount++;
            layer._lastFailedTime = Date.now();

            tile.state = TileState.IMAGE_FAILED;
            tile._image = undefined;
        });

        tile._width = tileProvider.tileWidth;
        tile._height = tileProvider.tileHeight;

        if (typeof tile._projection === 'undefined') {
            tile._projection = tileProvider.projection;
        }
    }

    function tileNeedsImageLoad(layer, tile) {
        if (tile.state === TileState.UNLOADED) {
            return true;
        }

        // only retry failed tiles
        if (tile.state !== TileState.IMAGE_FAILED) {
            return false;
        }

        // delay retry until enough time has passed
        var timeSinceFailure = (Date.now() - tile._lastFailTime) / 1000;
        if (timeSinceFailure < layer.failedTileRetryTime) {
            return false;
        }

        // don't retry if the layer has failed too many tiles
        if (layer._tileFailCount >= layer.maxTileFailCount) {
            return false;
        }

        // don't retry if the tile has failed too many times
        if (tile._failCount >= layer.perTileMaxFailCount) {
            return false;
        }

        return true;
    }

    function refine3D(layer, tile, context, sceneState) {
        var boundingVolume = getTileBoundingSphere(layer, tile, sceneState);
        var cameraPosition = sceneState.camera.getPositionWC();
        var direction = sceneState.camera.getDirectionWC();

        var texturePixelError = layer.pixelError3D;
        if (texturePixelError <= 0.0) {
            texturePixelError = 1.0;
        }

        var dmin = layer._minTileDistance(tile.zoom, texturePixelError);

        var toCenter = boundingVolume.center.subtract(cameraPosition);
        var toSphere = toCenter.normalize().multiplyWithScalar(toCenter.magnitude() - boundingVolume.radius);
        var distance = direction.multiplyWithScalar(direction.dot(toSphere)).magnitude();

        if (distance > 0.0 && distance < dmin) {
            return true;
        }

        return false;
    }

    function refine2D(layer, tile, context, sceneState) {
        var camera = sceneState.camera;
        var frustum = camera.frustum;
        var pixelError = layer.pixelError2D;
        var projection = sceneState.scene2D.projection;
        var viewport = context.getViewport();
        var viewportWidth = viewport.width;
        var viewportHeight = viewport.height;

        var texturePixelError = (pixelError > 0.0) ? pixelError : 1.0;

        var a = projection.project(new Cartographic2(tile.extent.west, tile.extent.north)).getXY();
        var b = projection.project(new Cartographic2(tile.extent.east, tile.extent.south)).getXY();
        var diagonal = a.subtract(b);
        var texelSize = Math.max(diagonal.x, diagonal.y) / Math.max(tile.width, tile.height);
        var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(viewportWidth, viewportHeight);

        if (texelSize > pixelSize * texturePixelError) {
            return true;
        }

        return false;
    }

    function refine(layer, tile, context, sceneState) {
        var tileProvider = layer._tileProvider;

        if (sceneState.mode === SceneMode.SCENE2D) {
            return refine2D(layer, tile, context, sceneState);
        }

        return refine3D(layer, tile, context, sceneState);
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
        var tileProvider = layer._tileProvider;
        var extent = layer._maxExtent;

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

        var func = function(zoom, pixelError) {
            return (dmin / pixelError) * Math.exp(-0.693147181 * zoom);
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
        if (!this._tileProvider.ready) {
            return;
        }

        if (typeof this._levelZeroTiles === 'undefined') {
            var tileProvider = this._tileProvider;
            var maxExtent = defaultValue(this._maxExtent, tileProvider.maxExtent);
            maxExtent = defaultValue(maxExtent, Extent.MAX_VALUE);

            this._maxExtent = maxExtent;
            this._levelZeroTiles = this._tileProvider.tilingScheme.createLevelZeroTiles();
        }

        var minTileDistance = this._minTileDistance;
        if (typeof minTileDistance === 'undefined' || minTileDistance.needsUpdate(context, sceneState)) {
            this._minTileDistance = minTileDistance = createMinTileDistanceFunction(this, context, sceneState);
        }

        var zoomMax = this._tileProvider.zoomMax;

        var now = Date.now();

        // start loading tiles and build render list
        var tile;

        var tileLoadList = this._tileLoadList;
        var insertionPoint = tileLoadList._head;

        var tileStack = this._tileStack;
        Array.prototype.push.apply(tileStack, this._levelZeroTiles);
        while (tileStack.length > 0) {
            tile = tileStack.pop();

            if (cull(this, tile, sceneState)) {
                continue;
            }

            if (tile.state !== TileState.TEXTURE_LOADED) {
                tileLoadList.insertBefore(insertionPoint, tile);
            }

            tile._lastUsedTime = now;

            var renderTile = tile.state === TileState.TEXTURE_LOADED;
            if (tile.zoom < zoomMax && refine(this, tile, context, sceneState)) {
                var allChildrenLoaded = true;

                var children = tile.getChildren();
                for ( var i = 0, len = children.length; i < len; ++i) {
                    var child = children[i];

                    tileStack.push(child);

                    allChildrenLoaded = allChildrenLoaded && child.state === TileState.TEXTURE_LOADED;
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

        tile = tileLoadList._head;
        while (typeof tile !== 'undefined') {
            if (Date.now() - startTime > timeSlice) {
                break;
            }

            loadImageForTile(this, tile);

            if (tile.state === TileState.REPROJECTING) {
                tile._image = tile._projection.toWgs84(tile.extent, tile._image);
                tile._projection = Projections.WGS84;
                tile.state = TileState.TEXTURE_LOADING;
            }

            if (tile.state === TileState.TEXTURE_LOADING) {
                tile._texture = this._centralBody._tileCache.getTexture(context, tile);
                tile._texture.copyFrom(tile._image);
                tile._texture.generateMipmap(MipmapHint.NICEST);
                tile._texture.setSampler({
                    wrapS : TextureWrap.CLAMP,
                    wrapT : TextureWrap.CLAMP,
                    minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR,

                    // TODO: Remove Chrome work around
                    maximumAnisotropy : context.getMaximumTextureFilterAnisotropy() || 8
                });
                tile.state = TileState.TEXTURE_LOADED;
                tile._image = undefined;

                tileLoadList.remove(tile);
            }

            tile = tile._next;
        }
    };

    function addToTilesToRender(layer, tile, context, sceneState) {
        if (layer._tilesToRender.indexOf(tile) !== -1) {
            return;
        }

        var mode = sceneState.mode;
        var projection = sceneState.scene2D.projection;

        // create vertex array the first time it is needed or when morphing
        if (!tile._extentVA ||
            tile._extentVA.isDestroyed() ||
            layer._centralBody._isModeTransition(layer._centralBody._mode, mode) ||
            tile._mode !== mode ||
            layer._centralBody._projection !== projection) {

            tile._extentVA = tile._extentVA && tile._extentVA.destroy();

            var ellipsoid = layer._centralBody._ellipsoid;
            var rtc = tile.get3DBoundingSphere().center;
            var projectedRTC = tile.get2DBoundingSphere(projection).center.clone();

            var gran = (tile.zoom > 0) ? 0.05 * (1.0 / tile.zoom * 2.0) : 0.05; // seems like a good value after testing it for what looks good

            var typedArray;
            var buffer;
            var stride;
            var attributes;
            var indexBuffer;
            var datatype = ComponentDatatype.FLOAT;
            var usage = BufferUsage.STATIC_DRAW;

            var attributeIndices = layer._centralBody._attributeIndices;

            if (mode === SceneMode.SCENE3D) {
                var buffers = ExtentTessellator.computeBuffers({
                    ellipsoid : ellipsoid,
                    extent : tile.extent,
                    granularity : gran,
                    generateTextureCoords : true,
                    interleave : true,
                    relativeToCenter : rtc
                });

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
            } else {
                var vertices = [];
                var width = tile.extent.east - tile.extent.west;
                var height = tile.extent.north - tile.extent.south;
                var lonScalar = 1.0 / width;
                var latScalar = 1.0 / height;

                var mesh = PlaneTessellator.compute({
                    resolution : {
                        x : Math.max(Math.ceil(width / gran), 2.0),
                        y : Math.max(Math.ceil(height / gran), 2.0)
                    },
                    onInterpolation : function(time) {
                        var lonLat = new Cartographic2(
                                CesiumMath.lerp(tile.extent.west, tile.extent.east, time.x),
                                CesiumMath.lerp(tile.extent.south, tile.extent.north, time.y));

                        var p = ellipsoid.toCartesian(lonLat).subtract(rtc);
                        vertices.push(p.x, p.y, p.z);

                        var u = (lonLat.longitude - tile.extent.west) * lonScalar;
                        var v = (lonLat.latitude - tile.extent.south) * latScalar;
                        vertices.push(u, v);

                        // TODO: This will not work if the projection's ellipsoid is different
                        // than the central body's ellipsoid.  Throw an exception?
                        var projectedLonLat = projection.project(lonLat).subtract(projectedRTC);
                        vertices.push(projectedLonLat.x, projectedLonLat.y);
                    }
                });

                typedArray = datatype.toTypedArray(vertices);
                buffer = context.createVertexBuffer(typedArray, usage);
                stride = 7 * datatype.sizeInBytes;
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
                    vertexBuffer : buffer,
                    componentDatatype : datatype,
                    componentsPerAttribute : 2,
                    offsetInBytes : 5 * datatype.sizeInBytes,
                    strideInBytes : stride
                }];

                indexBuffer = context.createIndexBuffer(new Uint16Array(mesh.indexLists[0].values), usage, IndexDatatype.UNSIGNED_SHORT);
            }

            tile._extentVA = context.createVertexArray(attributes, indexBuffer);

            var intensity = 0.0;
            if (typeof layer._tileProvider.getIntensity === 'function') {
                intensity = layer._tileProvider.getIntensity(tile);
            }

            var drawUniforms = {
                u_dayTexture : function() {
                    return tile._texture;
                },
                u_center3D : function() {
                    return rtc;
                },
                u_center2D : function() {
                    return (projectedRTC) ? projectedRTC.getXY() : Cartesian2.ZERO;
                },
                u_modifiedModelView : function() {
                    return tile.modelView;
                },
                u_dayIntensity : function() {
                    return intensity;
                },
                u_mode : function() {
                    return tile.mode;
                }
            };
            tile._drawUniforms = combine(drawUniforms, layer._centralBody._drawUniforms);

            tile._mode = mode;
        }

        layer._tilesToRender.push(tile);
    }

    ImageryLayer.prototype.render = function(context) {
        if (!this._tileProvider.ready) {
            return;
        }

        var tilesToRender = this._tilesToRender;

        if (tilesToRender.length === 0) {
            return;
        }

        context.beginDraw({
            framebuffer : this._centralBody._fb,
            shaderProgram : this._centralBody._sp,
            renderState : this._centralBody._rsColor
        });

        // TODO: remove once multi-frustum/depth testing is implemented
        tilesToRender.sort(function(a, b) {
            return a.zoom - b.zoom;
        });

        var uniformState = context.getUniformState();
        var mv = uniformState.getModelView();
        var morphTime = this._centralBody.morphTime;

        // render tiles to FBO
        for ( var i = 0, len = tilesToRender.length; i < len; i++) {
            var tile = tilesToRender[i];

            var rtc;
            if (morphTime === 1.0) {
                rtc = tile._drawUniforms.u_center3D();
                tile.mode = 0;
            } else if (morphTime === 0.0) {
                var center = tile._drawUniforms.u_center2D();
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

            context.continueDraw({
                primitiveType : PrimitiveType.TRIANGLES,
                vertexArray : tile._extentVA,
                uniformMap : tile._drawUniforms
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
        if (typeof this._levelZeroTiles !== 'undefined') {
            this._levelZeroTiles.forEach(function(tile) { tile.destroy(); });
        }

        return destroyObject(this);
    };

    return ImageryLayer;
});