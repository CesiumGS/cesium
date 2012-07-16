/*global define*/
define([
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/DeveloperError',
        '../Core/Intersect',
        '../Core/Math',
        '../Core/Occluder',
        '../Core/PrimitiveType',
        './ImageryLayerCollection',
        './TileState',
        './TileImagery',
        '../ThirdParty/when'
    ], function(
        combine,
        defaultValue,
        destroyObject,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        DeveloperError,
        Intersect,
        CesiumMath,
        Occluder,
        PrimitiveType,
        ImageryLayerCollection,
        TileState,
        TileImagery,
        when) {
    "use strict";

    /**
     * @param {TerrainProvider} description.terrain
     * @param {ImageryLayerCollection} description.imageryCollection
     * @param {Number} [description.maxScreenSpaceError=2]
     */
    var EllipsoidSurface = function(description) {
        // TODO: make sure description has these properties.
        this.terrain = description.terrain;
        this.imageryCollection = description.imageryCollection;
        this.maxScreenSpaceError = defaultValue(description.maxScreenSpaceError, 2);

        this._levelZeroTiles = undefined;
        this._renderList = [];
        this._tileLoadQueue = new TileLoadQueue();
        this._tilingScheme = undefined;
        this._occluder = undefined;

        var that = this;
        when(this.terrain.tilingScheme, function(tilingScheme) {
            that._tilingScheme = tilingScheme;
            that._levelZeroTiles = tilingScheme.createLevelZeroTiles();
            that._occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, that.terrain.tilingScheme.ellipsoid.getMinimumRadius()), Cartesian3.ZERO);
        });
    };

    function countTileStats(tile, counters) {
        ++counters.tiles;
        if (tile.renderable) {
            ++counters.renderable;
        }
        if (typeof tile.children !== 'undefined') {
            for (var i = 0; i < tile.children.length; ++i) {
                countTileStats(tile.children[i], counters);
            }
        }
    }

    function dumpTileStats(levelZeroTiles) {
        var counters = {
                tiles: 0,
                renderable: 0
        };
        for (var i = 0; i < levelZeroTiles.length; ++i) {
            countTileStats(levelZeroTiles[i], counters);
        }

        console.log('tiles: ' + counters.tiles + ' renderable: ' + counters.renderable);
    }

    var maxDepth;
    var tilesVisited;
    var tilesCulled;
    var tilesRendered;
    var minimumTilesNeeded;
    var doit = false;

    var lastMaxDepth = -1;
    var lastTilesVisited = -1;
    var lastTilesCulled = -1;
    var lastTilesRendered = -1;
    var lastMinimumTilesNeeded = -1;

    EllipsoidSurface.prototype.update = function(context, sceneState) {
        if (typeof this._levelZeroTiles === 'undefined') {
            return;
        }

        var i, len;
        for (i = 0, len = this.imageryCollection.getLength(); i < len; i++) {
            if (!this.imageryCollection.get(i).imageryProvider.ready) {
                return;
            }
        }

        maxDepth = 0;
        tilesVisited = 0;
        tilesCulled = 0;
        tilesRendered = 0;
        minimumTilesNeeded = 0;

        this._tileLoadQueue.markInsertionPoint();

        var cameraPosition = sceneState.camera.getPositionWC();
        this._occluder.setCameraPosition(cameraPosition);

        var levelZeroTiles = this._levelZeroTiles;
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            var tile = levelZeroTiles[i];
            if (!tile.doneLoading) {
                queueTileLoad(this, tile);
            }
            if (tile.renderable) {
                addBestAvailableTilesToRenderList(this, context, sceneState, tile);
            }
        }

        if (tilesVisited !== lastTilesVisited || tilesRendered !== lastTilesRendered ||
            tilesCulled !== lastTilesCulled || minimumTilesNeeded !== lastMinimumTilesNeeded ||
            maxDepth !== lastMaxDepth) {

            console.log('Visited ' + tilesVisited + ' Rendered: ' + tilesRendered + ' Culled: ' + tilesCulled + ' Needed: ' + minimumTilesNeeded + ' Max Depth: ' + maxDepth);

            lastTilesVisited = tilesVisited;
            lastTilesRendered = tilesRendered;
            lastTilesCulled = tilesCulled;
            lastMinimumTilesNeeded = minimumTilesNeeded;
            lastMaxDepth = maxDepth;
        }

        if (doit) {
            dumpTileStats(levelZeroTiles);
        }
        processTileLoadQueue(this, context, sceneState);
    };

    var uniformMapTemplate = {
        u_center3D : function() {
            return this.center3D;
        },
        u_center2D : function() {
            return Cartesian2.ZERO;
        },
        u_modifiedModelView : function() {
            return this.modifiedModelView;
        },
        u_numberOfDayTextures : function() {
            return this.numberOfDayTextures;
        },
        u_dayTextures : function() {
            return this.dayTextures;
        },
        u_dayTextureTranslation : function() {
            return this.dayTextureTranslation;
        },
        u_dayTextureScale : function() {
            return this.dayTextureScale;
        },

        center3D : undefined,
        modifiedModelView : undefined,

        numberOfDayTextures : 0,
        dayTextures : new Array(8),
        dayTextureTranslation : new Array(8),
        dayTextureScale : new Array(8)
    };

    EllipsoidSurface.prototype.render = function(context, centralBodyUniformMap, drawArguments) {
        var renderList = this._renderList;
        if (renderList.length === 0) {
            return;
        }

        var uniformState = context.getUniformState();
        var mv = uniformState.getModelView();

        context.beginDraw(drawArguments);

        var uniformMap = combine(uniformMapTemplate, centralBodyUniformMap);

        for (var i = 0, len = renderList.length; i < len; i++) {
            var tile = renderList[i];

            var rtc = tile.get3DBoundingSphere().center;
            uniformMap.center3D = rtc;

            var centerEye = mv.multiplyWithVector(new Cartesian4(rtc.x, rtc.y, rtc.z, 1.0));
            // PERFORMANCE_TODO: use a scratch matrix instead of cloning for every tile.
            var mvrtc = mv.clone();
            mvrtc.setColumn3(centerEye);
            uniformMap.modifiedModelView = mvrtc;

            var imageryCollection = tile.imagery;

            // TODO: clear out uniformMap.dayTextures?

            var numberOfDayTextures = 0;
            for (var imageryIndex = 0, imageryLen = imageryCollection.length; imageryIndex < imageryLen; ++imageryIndex) {
                var imagery = imageryCollection[imageryIndex];
                if (!imagery || imagery.state !== TileState.READY) {
                    continue;
                }

                uniformMap.dayTextures[numberOfDayTextures] = imagery.texture;
                uniformMap.dayTextureTranslation[numberOfDayTextures] = imagery.textureTranslation;
                uniformMap.dayTextureScale[numberOfDayTextures] = imagery.textureScale;

                ++numberOfDayTextures;
            }

            if (numberOfDayTextures !== 0) {
                uniformMap.numberOfDayTextures = numberOfDayTextures;

                context.continueDraw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    vertexArray : tile.vertexArray,
                    uniformMap : uniformMap
                });
            }
        }

        context.endDraw();

        renderList.length = 0;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof EllipsoidSurface
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see EllipsoidSurface#destroy
     */
    EllipsoidSurface.prototype.isDestroyed = function() {
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
     * @memberof EllipsoidSurface
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see EllipsoidSurface#isDestroyed
     */
    EllipsoidSurface.prototype.destroy = function() {
        when(this.levelZeroTiles, function(levelZeroTiles) {
            for (var i = 0; i < levelZeroTiles.length; ++i) {
                levelZeroTiles[i].destroy();
            }
        });
        return destroyObject(this);
    };

    function addBestAvailableTilesToRenderList(surface, context, sceneState, tile) {
        ++tilesVisited;

        if (!isTileVisible(surface, sceneState, tile)) {
            ++tilesCulled;
            return;
        }

        if (tile.level > maxDepth) {
            maxDepth = tile.level;
        }

        // Algorithm #1: Don't load children unless we refine to them.
        if (screenSpaceError(surface, context, sceneState, tile) < surface.maxScreenSpaceError) {
            // This tile meets SSE requirements, so render it.
            surface._renderList.push(tile);
            ++tilesRendered;
            ++minimumTilesNeeded;
        } else if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, tile)) {
            // SSE is not good enough and children are loaded, so refine.
            var children = tile.children;
            // PERFORMANCE_TODO: traverse children front-to-back
            var tilesRenderedBefore = tilesRendered;
            for (var i = 0, len = children.length; i < len; ++i) {
                addBestAvailableTilesToRenderList(surface, context, sceneState, children[i]);
            }
            if (tilesRendered !== tilesRenderedBefore) {
                ++minimumTilesNeeded;
            }
        } else {
            // SSE is not good enough but not all children are loaded, so render this tile anyway.
            surface._renderList.push(tile);
            ++tilesRendered;
            ++minimumTilesNeeded;
        }

        // Algorithm #2: Pre-load children of rendered tiles.
        /*if (screenSpaceError(surface, context, sceneState, tile) < surface.maxScreenSpaceError) {
            // This tile meets SSE requirements, so render it.
            surface._renderList.push(tile);
            ++tilesRendered;
            ++minimumTilesNeeded;
            queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, tile);
        } else if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, tile)) {
            // SSE is not good enough and children are loaded, so refine.
            var children = tile.children;
            // PERFORMANCE_TODO: traverse children front-to-back
            var tilesRenderedBefore = tilesRendered;
            for (var i = 0, len = children.length; i < len; ++i) {
                addBestAvailableTilesToRenderList(surface, context, sceneState, children[i]);
            }
            if (tilesRendered !== tilesRenderedBefore) {
                ++minimumTilesNeeded;
            }
        } else {
            // SSE is not good enough but not all children are loaded, so render this tile anyway.
            surface._renderList.push(tile);
            ++tilesRendered;
            ++minimumTilesNeeded;
        }*/

        // Algorithm #3: Pre-load children of all visited tiles
        /*if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, tile)) {
            // All children are renderable.
            if (screenSpaceError(surface, context, sceneState, tile) < surface.maxScreenSpaceError) {
                surface._renderList.push(tile);
                ++tilesRendered;
                ++minimumTilesNeeded;
            } else {
                var children = tile.children;
                // PERFORMANCE_TODO: traverse children front-to-back
                var tilesRenderedBefore = tilesRendered;
                for (var i = 0, len = children.length; i < len; ++i) {
                    addBestAvailableTilesToRenderList(surface, context, sceneState, children[i]);
                }
                if (tilesRendered !== tilesRenderedBefore) {
                    ++minimumTilesNeeded;
                }
            }
        } else {
            // At least one child is not renderable, so render this tile.
            surface._renderList.push(tile);
            ++tilesRendered;
            ++minimumTilesNeeded;
        }*/
    }

    function isTileVisible(surface, sceneState, tile) {
        var boundingVolume = tile.get3DBoundingSphere();
        if (sceneState.camera.getVisibility(boundingVolume, BoundingSphere.planeSphereIntersect) === Intersect.OUTSIDE) {
            return false;
        }

        var occludeePoint = tile.getOccludeePoint();
        var occluder = surface._occluder;
        return (!occludeePoint || occluder.isVisible(new BoundingSphere(occludeePoint, 0.0))) && occluder.isVisible(boundingVolume);
    }

    function screenSpaceError(surface, context, sceneState, tile) {
        var maxGeometricError = surface._tilingScheme.getLevelMaximumGeometricError(tile.level);

        var boundingVolume = tile.get3DBoundingSphere();
        var camera = sceneState.camera;
        var cameraPosition = camera.getPositionWC();

        var toCenter = boundingVolume.center.subtract(cameraPosition);
        var distance = toCenter.magnitude() - boundingVolume.radius;

        if (distance < 0.0) {
            // The camera is inside the bounding sphere, so the screen-space error could be enormous, but
            // we don't really have any way to calculate it.  So return positive infinity, which will
            // force a refine.
            return 1.0/0.0;
        }

        var viewport = context.getViewport();
        var viewportHeight = viewport.height;

        var frustum = camera.frustum;
        var fovy = frustum.fovy;

        // PERFORMANCE_TODO: factor out stuff that's constant across tiles.
        return (maxGeometricError * viewportHeight) / (2 * distance * Math.tan(0.5 * fovy));
    }

    function queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, tile) {
        var allRenderable = true;

        var children = tile.getChildren();
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];
            if (!child.doneLoading) {
                queueTileLoad(surface, child);
            }
            if (!child.renderable) {
                allRenderable = false;
            }
        }

        return allRenderable;
    }

    function queueTileLoad(surface, tile) {
        surface._tileLoadQueue.insertBeforeInsertionPoint(tile);
    }

    function processTileLoadQueue(surface, context, sceneState) {
        var tileLoadQueue = surface._tileLoadQueue;
        var tile = tileLoadQueue.head;

        var startTime = Date.now();
        var timeSlice = 10;
        var endTime = startTime + timeSlice;

        while (Date.now() < endTime && typeof tile !== 'undefined') {
            var i, len;

            // Transition terrain states.
            if (tile.state === TileState.UNLOADED) {
                tile.state = TileState.TRANSITIONING;
                surface.terrain.requestTileGeometry(tile);

                // If we've made it past the UNLOADED state, create skeletons for the imagery.
                if (tile.state !== TileState.UNLOADED) {
                    for (i = 0, len = surface.imageryCollection.getLength(); i < len; ++i) {
                        var imageryLayer = surface.imageryCollection.get(i);
                        imageryLayer.createTileImagerySkeletons(tile, surface.terrain.tilingScheme);
                    }
                }
            }
            if (tile.state === TileState.RECEIVED) {
                tile.state = TileState.TRANSITIONING;
                surface.terrain.transformGeometry(context, tile);
            }
            if (tile.state === TileState.TRANSFORMED) {
                tile.state = TileState.TRANSITIONING;
                surface.terrain.createResources(context, tile);
            }
            // TODO: what about the FAILED and INVALID states?

            var doneLoading = tile.state === TileState.READY;

            // Transition imagery states
            var tileImageryCollection = tile.imagery;
            for (i = 0, len = tileImageryCollection.length; Date.now() < endTime && i < len; ++i) {
                var tileImagery = tileImageryCollection[i];
                var imageryLayer = tileImagery.imageryLayer;

                if (tileImagery.state === TileState.UNLOADED) {
                    tileImagery.state = TileState.TRANSITIONING;
                    imageryLayer.requestImagery(tileImagery);
                }
                if (tileImagery.state === TileState.RECEIVED) {
                    tileImagery.state = TileState.TRANSITIONING;
                    imageryLayer.transformImagery(context, tileImagery);
                }
                if (tileImagery.state === TileState.TRANSFORMED) {
                    tileImagery.state = TileState.TRANSITIONING;
                    imageryLayer.createResources(context, tileImagery);
                }
                doneLoading = doneLoading && tileImagery.state === TileState.READY;
            }

            var next = tile._next;

            // The tile becomes renderable when the terrain and all imagery data are loaded.
            if (i === len && doneLoading) {
                tile.renderable = true;
                tile.doneLoading = true;
                tileLoadQueue.remove(tile);
            }

            tile = next;
        }
    }

    function TileLoadQueue() {
        this.head = undefined;
        this.tail = undefined;
        this._insertionPoint = undefined;
    }

    TileLoadQueue.prototype.remove = function(item) {
        var previous = item._previous;
        var next = item._next;

        if (item === this.head) {
            this.head = next;
        } else {
            previous._next = next;
        }

        if (item === this.tail) {
            this.tail = previous;
        } else {
            next._previous = previous;
        }

        item._previous = undefined;
        item._next = undefined;
    };

    TileLoadQueue.prototype.markInsertionPoint = function(item) {
        this._insertionPoint = this.head;
    };

    TileLoadQueue.prototype.insertBeforeInsertionPoint = function(item) {
        var insertionPoint = this._insertionPoint;
        if (insertionPoint === item) {
            return;
        }

        if (typeof this.head === 'undefined') {
            // no other tiles in the list
            item._previous = undefined;
            item._next = undefined;
            this.head = item;
            this.tail = item;
            return;
        }

        if (typeof item._previous !== 'undefined' || typeof item._next !== 'undefined') {
            // tile already in the list, remove from its current location
            this.remove(item);
        }

        if (typeof insertionPoint === 'undefined') {
            if (typeof this.head === 'undefined') {
                item._previous = undefined;
                item._next = undefined;
                this.head = item;
                this.tail = item;
            } else {
                item._previous = this.tail;
                item._next = undefined;
                this.tail._next = item;
                this.tail = item;
            }
            return;
        }

        var insertAfter = insertionPoint._previous;
        item._previous = insertAfter;
        if (typeof insertAfter !== 'undefined') {
            insertAfter._next = item;
        }

        item._next = insertionPoint;
        insertionPoint._previous = item;

        if (insertionPoint === this.head) {
            this.head = item;
        }
    };

    return EllipsoidSurface;
});
