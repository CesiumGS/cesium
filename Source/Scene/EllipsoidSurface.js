/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        './ImageryLayerCollection',
        './TileState',
        './TileImagery',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
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
        // TODO: make sure all this exists.
        this.terrain = description.terrain;
        this.imageryCollection = description.imageryCollection;
        this.maxScreenSpaceError = defaultValue(description.maxScreenSpaceError, 2);

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
                // TODO: traverse children front-to-back
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
        // TODO: implement culling.
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

        // TODO: factor out stuff that's constant across tiles.
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
                tileLoadQueue.remove(tile);
            }

            tile = next;
        }
    }

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


    EllipsoidSurface.prototype.render = function(context) {

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
