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
        '../Core/Ellipsoid',
        '../Core/Intersect',
        '../Core/Math',
        '../Core/Occluder',
        '../Core/PrimitiveType',
        '../Core/CubeMapEllipsoidTessellator',
        '../Core/MeshFilters',
        './ImageryLayerCollection',
        './TerrainProvider',
        './TileState',
        './TileImagery',
        './TileLoadQueue',
        './TileReplacementQueue',
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
        Ellipsoid,
        Intersect,
        CesiumMath,
        Occluder,
        PrimitiveType,
        CubeMapEllipsoidTessellator,
        MeshFilters,
        ImageryLayerCollection,
        TerrainProvider,
        TileState,
        TileImagery,
        TileLoadQueue,
        TileReplacementQueue,
        when) {
    "use strict";

    /**
     * @param {TerrainProvider} description.terrainProvider
     * @param {ImageryLayerCollection} description.imageryLayerCollection
     * @param {Number} [description.maxScreenSpaceError=2]
     */
    var EllipsoidSurface = function(description) {
        if (typeof description.terrainProvider === 'undefined') {
            throw new DeveloperError('description.terrainProvider is required.');
        }
        if (typeof description.imageryLayerCollection === 'undefined') {
            throw new DeveloperError('description.imageryLayerCollection is required.');
        }

        this.terrainProvider = description.terrainProvider;
        this.imageryLayerCollection = description.imageryLayerCollection;
        this.maxScreenSpaceError = defaultValue(description.maxScreenSpaceError, 2);

        this._levelZeroTiles = undefined;
        this._renderList = [];
        this._tileLoadQueue = new TileLoadQueue();
        this._tileReplacementQueue = new TileReplacementQueue();
        this._tilingScheme = undefined;
        this._occluder = undefined;
        this._doLodUpdate = true;
        this._frozenLodCameraPosition = undefined;
        this._boundingSphereTile = undefined;
        this._boundingSphereVA = undefined;

        var that = this;
        when(this.terrainProvider.tilingScheme, function(tilingScheme) {
            that._tilingScheme = tilingScheme;
            that._levelZeroTiles = tilingScheme.createLevelZeroTiles();
            that._occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, that.terrainProvider.tilingScheme.ellipsoid.getMinimumRadius()), Cartesian3.ZERO);
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
        if (!this._doLodUpdate) {
            return;
        }

        this._renderList.length = 0;

        if (typeof this._levelZeroTiles === 'undefined') {
            return;
        }

        var i, len;
        for (i = 0, len = this.imageryLayerCollection.getLength(); i < len; i++) {
            var imageryLayer = this.imageryLayerCollection.get(i);
            if (!imageryLayer.imageryProvider.ready) {
                return;
            }
        }

        maxDepth = 0;
        tilesVisited = 0;
        tilesCulled = 0;
        tilesRendered = 0;
        minimumTilesNeeded = 0;

        this._tileLoadQueue.markInsertionPoint();
        this._tileReplacementQueue.markStartOfRenderFrame();

        var cameraPosition = sceneState.camera.getPositionWC();
        if (!this._doLodUpdate) {
            cameraPosition = this._frozenLodCameraPosition;
        } else {
            this._frozenLodCameraPosition = cameraPosition;
        }

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

    EllipsoidSurface.prototype.toggleLodUpdate = function(sceneState) {
        this._doLodUpdate = !this._doLodUpdate;
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
        u_cameraInsideBoundingSphere : function() {
            return this.cameraInsideBoundingSphere;
        },
        u_level : function() {
            return this.level;
        },

        center3D : undefined,
        modifiedModelView : undefined,

        numberOfDayTextures : 0,
        dayTextures : new Array(8),
        dayTextureTranslation : new Array(8),
        dayTextureScale : new Array(8),
        cameraInsideBoundingSphere : false,
        level : 0
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
            uniformMap.level = tile.level;

            var rtc = tile.center;
            uniformMap.center3D = rtc;

            var centerEye = mv.multiplyByVector(new Cartesian4(rtc.x, rtc.y, rtc.z, 1.0));
            // PERFORMANCE_TODO: use a scratch matrix instead of cloning for every tile.
            var mvrtc = mv.clone();
            mvrtc.setColumn3(centerEye);
            uniformMap.modifiedModelView = mvrtc;

            var imageryCollection = tile.imagery;

            // TODO: clear out uniformMap.dayTextures?

            var numberOfDayTextures = 0;
            if (!tile.culled) {
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
            }

            if (typeof tile.parent !== 'undefined' &&
                tile.parent.cameraInsideBoundingSphere) {
                uniformMap.cameraInsideBoundingSphere = true;
            } else {
                uniformMap.cameraInsideBoundingSphere = false;
            }

            uniformMap.numberOfDayTextures = numberOfDayTextures;

            context.continueDraw({
                primitiveType : TerrainProvider.wireframe ? PrimitiveType.LINES : PrimitiveType.TRIANGLES,
                vertexArray : tile.vertexArray,
                uniformMap : uniformMap
            });
        }

        if (this._boundingSphereTile) {
            if (!this._boundingSphereVA) {
                var radius = this._boundingSphereTile.get3DBoundingSphere().radius;
                var sphere = CubeMapEllipsoidTessellator.compute(new Ellipsoid({x:radius, y:radius, z:radius}), 10);
                MeshFilters.toWireframeInPlace(sphere);
                this._boundingSphereVA = context.createVertexArrayFromMesh({
                    mesh : sphere,
                    attributeIndices : MeshFilters.createAttributeIndices(sphere)
                });
            }

            var rtc2 = this._boundingSphereTile.get3DBoundingSphere().center;
            uniformMap.center3D = rtc2;

            var centerEye2 = mv.multiplyByVector(new Cartesian4(rtc2.x, rtc2.y, rtc2.z, 1.0));
            // PERFORMANCE_TODO: use a scratch matrix instead of cloning for every tile.
            var mvrtc2 = mv.clone();
            mvrtc2.setColumn3(centerEye2);
            uniformMap.modifiedModelView = mvrtc2;

            context.continueDraw({
                primitiveType : PrimitiveType.LINES,
                vertexArray : this._boundingSphereVA,
                uniformMap : uniformMap
            });

        }

        context.endDraw();
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

    EllipsoidSurface.prototype.showBoundingSphereOfTileAt = function(cartographicPick) {
        // Find the tile in the render list that overlaps this extent
        var renderList = this._renderList;
        var tile;
        for (var i = 0, len = renderList.length; i < len; ++i) {
            tile = renderList[i];
            if (tile.extent.contains(cartographicPick)) {
                break;
            }
        }

        if (typeof tile !== 'undefined') {
            console.log('x: ' + tile.x + ' y: ' + tile.y + ' level: ' + tile.level);
        }


        this._boundingSphereTile = tile;
        this._boundingSphereVA = undefined;
    };

    function addBestAvailableTilesToRenderList(surface, context, sceneState, tile) {
        ++tilesVisited;

        surface._tileReplacementQueue.markTileRendered(tile);

        if (!isTileVisible(surface, sceneState, tile)) {
            ++tilesCulled;
            tile.culled = true;
            surface._renderList.push(tile);
            return;
        }

        tile.culled = false;

        if (tile.level > maxDepth) {
            maxDepth = tile.level;
        }

        // Algorithm #1: Don't load children unless we refine to them.
        if (screenSpaceError(surface, context, sceneState, tile) < surface.maxScreenSpaceError) {
            // This tile meets SSE requirements, so render it.
            surface._renderList.push(tile);
            ++tilesRendered;
            ++minimumTilesNeeded;
        } else if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, sceneState, tile)) {
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
            queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, sceneState, tile);
        } else if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, sceneState, tile)) {
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
        /*if (queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, sceneState, tile)) {
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

    function distanceSquaredToTile(cameraCartesianPosition, cameraCartographicPosition, tile) {
        var vectorFromSouthwestCorner = cameraCartesianPosition.subtract(tile.southwestCornerCartesian);
        var distanceToWestPlane = vectorFromSouthwestCorner.dot(tile.westNormal);
        var distanceToSouthPlane = vectorFromSouthwestCorner.dot(tile.southNormal);

        var vectorFromNortheastCorner = cameraCartesianPosition.subtract(tile.northeastCornerCartesian);
        var distanceToEastPlane = vectorFromNortheastCorner.dot(tile.eastNormal);
        var distanceToNorthPlane = vectorFromNortheastCorner.dot(tile.northNormal);

        var distanceFromTop = cameraCartographicPosition.height - tile.maxHeight;

        var result = 0.0;

        if (distanceToWestPlane > 0.0) {
            result += distanceToWestPlane * distanceToWestPlane;
        } else if (distanceToEastPlane > 0.0) {
            result += distanceToEastPlane * distanceToEastPlane;
        }

        if (distanceToSouthPlane > 0.0) {
            result += distanceToSouthPlane * distanceToSouthPlane;
        } else if (distanceToNorthPlane > 0.0) {
            result += distanceToNorthPlane * distanceToNorthPlane;
        }

        if (distanceFromTop > 0.0) {
            result += distanceFromTop * distanceFromTop;
        }

        return result;
    }

    function screenSpaceError(surface, context, sceneState, tile) {
        var maxGeometricError = surface._tilingScheme.getLevelMaximumGeometricError(tile.level);

        //var boundingVolume = tile.get3DBoundingSphere();
        var camera = sceneState.camera;
        var cameraPosition = camera.getPositionWC();
        if (!surface._doLodUpdate) {
            cameraPosition = surface._frozenLodCameraPosition;
        }

        //var toCenter = boundingVolume.center.subtract(cameraPosition);
        //var distanceToBoundingSphere = toCenter.magnitude() - boundingVolume.radius;

        var ellipsoid = surface.terrainProvider.tilingScheme.ellipsoid;
        var cameraPositionCartographic = ellipsoid.cartesianToCartographic(cameraPosition);
        //var heightAboveEllipsoid = cameraPositionCartographic.height;
        //var distanceToTerrainHeight = heightAboveEllipsoid - tile.maxHeight;

        /*var distance;
        if (typeof distanceToBoundingSphere !== 'undefined' && distanceToBoundingSphere > 0.0 && typeof distanceToTerrainHeight !== 'undefined' && distanceToTerrainHeight > 0.0) {
            distance = Math.max(distanceToBoundingSphere, distanceToTerrainHeight);
        } else if (typeof distanceToBoundingSphere !== 'undefined' && distanceToBoundingSphere > 0.0) {
            distance = distanceToBoundingSphere;
        } else if (typeof distanceToTerrainHeight !== 'undefined' && distanceToTerrainHeight > 0.0) {
            distance = distanceToTerrainHeight;
        } else {
            // The camera is inside the bounding sphere and below the maximum terrain height,
            // so the screen-space error could be enormous, but we don't really have any way
            // to calculate it.  So return positive infinity, which will force a refine.
            tile.cameraInsideBoundingSphere = true;
            return 1.0/0.0;
        }*/

        var distance = Math.sqrt(distanceSquaredToTile(cameraPosition, cameraPositionCartographic, tile));

        tile.cameraInsideBoundingSphere = distance === 0.0;

        var viewport = context.getViewport();
        var viewportHeight = viewport.height;

        var frustum = camera.frustum;
        var fovy = frustum.fovy;

        // PERFORMANCE_TODO: factor out stuff that's constant across tiles.
        return (maxGeometricError * viewportHeight) / (2 * distance * Math.tan(0.5 * fovy));
    }

    function queueChildrenLoadAndDetermineIfChildrenAreAllRenderable(surface, sceneState, tile) {
        var allRenderable = true;

        var children = tile.getChildren();
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];
            surface._tileReplacementQueue.markTileRendered(child);
            // TODO: should we be culling here?  Technically, we don't know the
            // bounding volume accurately until the tile geometry is loaded.
//            if (!isTileVisible(surface, sceneState, child)) {
//                continue;
//            }
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
                surface.terrainProvider.requestTileGeometry(tile);

                // If we've made it past the UNLOADED state, add this tile to the replacement queue
                // (replacing another tile if necessary), and create skeletons for the imagery.
                if (tile.state !== TileState.UNLOADED) {
                    surface._tileReplacementQueue.markTileRendered(tile);

                    // TODO: Base this value on the minimum number of tiles needed,
                    // the amount of memory available, or something else?
                    surface._tileReplacementQueue.trimTiles(100);

                    for (i = 0, len = surface.imageryLayerCollection.getLength(); i < len; ++i) {
                        var imageryLayer = surface.imageryLayerCollection.get(i);
                        imageryLayer.createTileImagerySkeletons(tile, surface.terrainProvider.tilingScheme);
                    }
                }
            }
            if (tile.state === TileState.RECEIVED) {
                tile.state = TileState.TRANSITIONING;
                surface.terrainProvider.transformGeometry(context, tile);
            }
            if (tile.state === TileState.TRANSFORMED) {
                tile.state = TileState.TRANSITIONING;
                surface.terrainProvider.createResources(context, tile);
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

    return EllipsoidSurface;
});
