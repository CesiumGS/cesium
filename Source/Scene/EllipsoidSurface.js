/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/Cartesian4',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/PrimitiveType',
        './ImageryLayerCollection',
        './TileState',
        './TileImagery',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        destroyObject,
        Cartesian4,
        DeveloperError,
        CesiumMath,
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

        this._centralBody = description.centralBody;
        this._levelZeroTiles = undefined;
        this._renderList = [];
        this._tileLoadQueue = new TileLoadQueue();
        this._tilingScheme = undefined;

        var that = this;
        when(this.terrain.tilingScheme, function(tilingScheme) {
            that._tilingScheme = tilingScheme;
            that._levelZeroTiles = tilingScheme.createLevelZeroTiles();
        });
    };

    EllipsoidSurface.prototype.update = function(context, sceneState) {
        if (typeof this._levelZeroTiles === 'undefined') {
            return;
        }

        this._tileLoadQueue.markInsertionPoint();

        var levelZeroTiles = this._levelZeroTiles;
        for (var i = 0, len = levelZeroTiles.length; i < len; ++i) {
            var tile = levelZeroTiles[i];
            if (tile.ready) {
                updateTile(this, context, sceneState, tile);
            } else {
                queueTileLoad(this, tile);
            }
        }

        processTileLoadQueue(this);
    };


    EllipsoidSurface.prototype.render = function(context, framebuffer, shaderProgram, renderState) {
        var renderList = this._renderList;
        if (renderList.length === 0) {
            return;
        }

        context.beginDraw({
            framebuffer : framebuffer,
            shaderProgram : shaderProgram,
            renderState : renderState
        });

        var uniformState = context.getUniformState();
        var mv = uniformState.getModelView();

        var center3D;
        var modifiedModelView;

        var numberOfDayTextures;
        var dayTextures = new Array(8);
        var dayTextureTranslation = new Array(8);
        var dayTextureScale = new Array(8);

        var uniformMap = {
            u_center3D : function() {
                return center3D;
            },
            u_modifiedModelView : function() {
                return modifiedModelView;
            },
            u_numberOfDayTextures : function() {
                return numberOfDayTextures;
            },
            u_dayTextures : function() {
                return dayTextures;
            },
            u_dayTextureTranslation : function() {
                return dayTextureTranslation;
            },
            u_dayTextureScale : function() {
                return dayTextureScale;
            }
        };

        for (var i = 0, len = renderList.length; i < len; i++) {
            var tile = renderList[i];

            var rtc = tile.get3DBoundingSphere().center;
            center3D = rtc;

            var centerEye = mv.multiplyWithVector(new Cartesian4(rtc.x, rtc.y, rtc.z, 1.0));
            // PERFORMANCE_TODO: use a scratch matrix instead of cloning for every tile.
            var mvrtc = mv.clone();
            mvrtc.setColumn3(centerEye);
            modifiedModelView = mvrtc;

            var imageryCollection = tile.imagery;

            numberOfDayTextures = 0;
            for (var imageryIndex = 0, imageryLen = imageryCollection.length; imageryIndex < imageryLen; ++imageryIndex) {
                var imagery = imageryCollection[imageryIndex];
                if (!imagery) {
                    continue;
                }

                dayTextures[numberOfDayTextures] = imagery.texture;
                dayTextureTranslation[numberOfDayTextures] = imagery.textureTranslation;
                dayTextureScale[numberOfDayTextures] = imagery.textureScale;

                ++numberOfDayTextures;
            }

            context.continueDraw({
                primitiveType : PrimitiveType.TRIANGLES,
                vertexArray : tile.vertexArray,
                uniformMap : uniformMap
            });
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

    function updateTile(surface, context, sceneState, tile) {
        if (!isTileVisible(tile)) {
            return;
        }

        if (loadAllChildren(surface, tile)) {
            // All children are loaded.
            if (screenSpaceError(surface, tile) < surface.maxScreenSpaceError) {
                surface._renderList.push(tile);
            } else {
                var children = tile.children;
                // PERFORMANCE_TODO: traverse children front-to-back
                for (var i = 0, len = children.length; i < len; ++i) {
                    updateTile(surface, context, sceneState, children[i]);
                }
            }
        } else {
            // At least one child is not ready, so render this tile.
            surface._renderList.push(tile);
        }
    }

    function isTileVisible(tile) {
        // PERFORMANCE_TODO: implement culling.
        return true;
    }

    function screenSpaceError(surface, context, sceneState, tile) {
        var maxGeometricError = surface._tilingScheme.getLevelMaximumGeometricError(tile.level);

        var boundingVolume = tile.get3DBoundingSphere();
        var camera = sceneState.camera;
        var cameraPosition = camera.getPositionWC();

        var toCenter = boundingVolume.center.subtract(cameraPosition);
        var distance = toCenter.magnitude() - boundingVolume.radius;

        var viewport = context.getViewport();
        var viewportHeight = viewport.height;

        var frustum = camera.frustum;
        var fovy = frustum.fovy;

        // PERFORMANCE_TODO: factor out stuff that's constant across tiles.
        return (maxGeometricError * viewportHeight) / (2 * distance * Math.tan(0.5 * fovy));
    }

    function loadAllChildren(surface, tile) {
        var allLoaded = true;

        var children = tile.children;
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];
            if (!child.ready) {
                queueTileLoad(surface, child);
                allLoaded = false;
            }
        }

        return allLoaded;
    }

    function queueTileLoad(surface, tile) {
        surface._tileLoadQueue.insertBeforeInsertionPoint(tile);
    }

    function processTileLoadQueue(surface, context, sceneState) {
        var tileLoadQueue = surface._tileLoadQueue;
        var tile = tileLoadQueue.head;

        while (typeof tile !== 'undefined') {
            var i, len;
            var tileImageryCollection = tile.imagery;

            if (tile.state === TileState.UNLOADED) {
                tile.state = TileState.TRANSITIONING;
                surface.terrain.requestTileGeometry(tile);

                for (i = 0, len = surface.imageryCollection.length; i < len; ++i) {
                    surface.imageryCollection[i].createTileImagerySkeletons(tile);
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

            var doneLoading = tile.State === TileState.READY;

            for (i = 0, len = tileImageryCollection.length; i < len; ++i) {
                var tileImagery = tileImageryCollection[i];
                // TODO: what if surface.imageryCollection is modified?
                var imageryProvider = surface.imageryCollection[i];

                if (tileImagery.state === TileState.UNLOADED) {
                    tileImagery.state = TileState.TRANSITIONING;
                    imageryProvider.requestImagery(tile, tileImagery);
                }
                if (tileImagery.state === TileState.RECEIVED) {
                    tileImagery.state = TileState.TRANSITIONING;
                    imageryProvider.transformImagery(context, tile, tileImagery);
                }
                if (tileImagery.state === TileState.TRANSFORMED) {
                    tileImagery.state = TileState.TRANSITIONING;
                    imageryProvider.createResources(context, tile, tileImagery);
                }
                doneLoading = doneLoading && tileImagery.state === TileState.READY;
            }

            var next = tile._next;

            if (doneLoading) {
                tile.ready = true;
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

        if (insertionPoint === this.head) {
            this.head = item;
        }
    };

    return EllipsoidSurface;
});
