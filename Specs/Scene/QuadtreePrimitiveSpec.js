defineSuite([
        'Scene/QuadtreePrimitive',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/defineProperties',
        'Core/EventHelper',
        'Core/GeographicTilingScheme',
        'Core/Visibility',
        'Scene/QuadtreeTileLoadState',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        QuadtreePrimitive,
        Cartesian3,
        Cartographic,
        defineProperties,
        EventHelper,
        GeographicTilingScheme,
        Visibility,
        QuadtreeTileLoadState,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene();
        scene.render();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('must be constructed with a tileProvider', function() {
        expect(function() {
            return new QuadtreePrimitive();
        }).toThrowDeveloperError();

        expect(function() {
            return new QuadtreePrimitive({});
        }).toThrowDeveloperError();
    });

    function createSpyTileProvider() {
        var result = jasmine.createSpyObj('tileProvider', [
            'getQuadtree', 'setQuadtree', 'getReady', 'getTilingScheme', 'getErrorEvent',
            'initialize', 'updateImagery', 'beginUpdate', 'endUpdate', 'getLevelMaximumGeometricError', 'loadTile',
            'computeTileVisibility', 'showTileThisFrame', 'computeDistanceToTile', 'isDestroyed', 'destroy']);

        defineProperties(result, {
            quadtree : {
                get : result.getQuadtree,
                set : result.setQuadtree
            },
            ready : {
                get : result.getReady
            },
            tilingScheme : {
                get : result.getTilingScheme
            },
            errorEvent : {
                get : result.getErrorEvent
            }
        });

        var tilingScheme = new GeographicTilingScheme();
        result.getTilingScheme.and.returnValue(tilingScheme);

        return result;
    }

    it('calls initialize, beginUpdate, loadTile, and endUpdate', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        // determine what tiles to load
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(tileProvider.initialize).toHaveBeenCalled();
        expect(tileProvider.beginUpdate).toHaveBeenCalled();
        expect(tileProvider.loadTile).toHaveBeenCalled();
        expect(tileProvider.endUpdate).toHaveBeenCalled();
    });

    it('shows the root tiles when they are ready and visible', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.renderable = true;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        // determine what tiles to load
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(tileProvider.showTileThisFrame).toHaveBeenCalled();
    });

    it('stops loading a tile that moves to the DONE state', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

        var calls = 0;
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            ++calls;
            tile.state = QuadtreeTileLoadState.DONE;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        // determine what tiles to load
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(calls).toBe(2);

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(calls).toBe(2);
    });

    it('tileLoadProgressEvent is raised when tile loaded and when new children discovered', function() {
        var eventHelper = new EventHelper();

        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        var progressEventSpy = jasmine.createSpy('progressEventSpy');
        eventHelper.add(quadtree.tileLoadProgressEvent, progressEventSpy);

        // Initial update to get the zero-level tiles set up.
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load zero-level tiles
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        quadtree.update(scene.frameState);

        scene.renderForSpecs();

        // There will now be two zero-level tiles in the load queue.
        expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(2);

        // Change one to loaded and update again
        quadtree._levelZeroTiles[0].state = QuadtreeTileLoadState.DONE;
        quadtree._levelZeroTiles[1].state = QuadtreeTileLoadState.LOADING;

        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        quadtree.update(scene.frameState);

        scene.renderForSpecs();

        // Now there should only be one left in the update queue
        expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(1);

        // Simulate the second zero-level child having loaded with two children.
        quadtree._levelZeroTiles[1].state = QuadtreeTileLoadState.DONE;
        quadtree._levelZeroTiles[1].renderable = true;

        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        quadtree.update(scene.frameState);

        scene.renderForSpecs();

        // Now that tile's four children should be in the load queue.
        expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(4);
    });

    it('forEachLoadedTile does not enumerate tiles in the START state', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
        tileProvider.computeDistanceToTile.and.returnValue(1e-15);

        // Load the root tiles.
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.state = QuadtreeTileLoadState.DONE;
            tile.renderable = true;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        // determine what tiles to load
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // Don't load further tiles.
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.state = QuadtreeTileLoadState.START;
        });

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        quadtree.forEachLoadedTile(function(tile) {
            expect(tile.state).not.toBe(QuadtreeTileLoadState.START);
        });
    });

    it('add and remove callbacks to tiles', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
        tileProvider.computeDistanceToTile.and.returnValue(1e-15);

        // Load the root tiles.
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.state = QuadtreeTileLoadState.DONE;
            tile.renderable = true;
            tile.data = {
                pick : function() {
                    return undefined;
                }
            };
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        var removeFunc = quadtree.updateHeight(Cartographic.fromDegrees(-72.0, 40.0), function(position) {
        });

        // determine what tiles to load
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        var addedCallback = false;
        quadtree.forEachLoadedTile(function(tile) {
            addedCallback = addedCallback || tile.customData.length > 0;
        });

        expect(addedCallback).toEqual(true);

        removeFunc();

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        var removedCallback = true;
        quadtree.forEachLoadedTile(function(tile) {
            removedCallback = removedCallback && tile.customData.length === 0;
        });

        expect(removedCallback).toEqual(true);
    });

    it('updates heights', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
        tileProvider.computeDistanceToTile.and.returnValue(1e-15);

        tileProvider.terrainProvider = {
            getTileDataAvailable : function() {
                return true;
            }
        };

        var position = Cartesian3.clone(Cartesian3.ZERO);
        var updatedPosition = Cartesian3.clone(Cartesian3.UNIT_X);
        var currentPosition = position;

        // Load the root tiles.
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.state = QuadtreeTileLoadState.DONE;
            tile.renderable = true;
            tile.data = {
                pick : function() {
                    return currentPosition;
                }
            };
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.updateHeight(Cartographic.fromDegrees(-72.0, 40.0), function(p) {
            Cartesian3.clone(p, position);
        });

        // determine what tiles to load
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(position).toEqual(Cartesian3.ZERO);

        currentPosition = updatedPosition;

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(position).toEqual(updatedPosition);
    });

    it('gives correct priority to tile loads', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // The root tiles should be in the high priority load queue
        expect(quadtree._tileLoadQueueHigh.length).toBe(2);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
        expect(quadtree._tileLoadQueueMedium.length).toBe(0);
        expect(quadtree._tileLoadQueueLow.length).toBe(0);

        // Mark the first root tile renderable (but not done loading)
        quadtree._levelZeroTiles[0].renderable = true;

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // That root tile should now load with low priority while its children should load with high.
        expect(quadtree._tileLoadQueueHigh.length).toBe(5);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[1]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[2]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[3]);
        expect(quadtree._tileLoadQueueMedium.length).toBe(0);
        expect(quadtree._tileLoadQueueLow.length).toBe(1);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0]);

        // Mark the children of that root tile renderable too, so we can refine it
        quadtree._levelZeroTiles[0].children[0].renderable = true;
        quadtree._levelZeroTiles[0].children[1].renderable = true;
        quadtree._levelZeroTiles[0].children[2].renderable = true;
        quadtree._levelZeroTiles[0].children[3].renderable = true;

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(quadtree._tileLoadQueueHigh.length).toBe(17); // levelZeroTiles[1] plus levelZeroTiles[0]'s 16 grandchildren
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[0]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[1]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[2]);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[3]);
        expect(quadtree._tileLoadQueueMedium.length).toBe(0);
        expect(quadtree._tileLoadQueueLow.length).toBe(5);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0]);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[0]);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[1]);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[2]);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[3]);

        // Mark the children of levelZeroTiles[0] upsampled
        quadtree._levelZeroTiles[0].children[0].upsampledFromParent = true;
        quadtree._levelZeroTiles[0].children[1].upsampledFromParent = true;
        quadtree._levelZeroTiles[0].children[2].upsampledFromParent = true;
        quadtree._levelZeroTiles[0].children[3].upsampledFromParent = true;

        quadtree.update(scene.frameState);
        quadtree.beginFrame(scene.frameState);
        quadtree.render(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // levelZeroTiles[0] should move to medium priority.
        // Its descendents should continue loading, so they have a chance to decide they're not upsampled later.
        expect(quadtree._tileLoadQueueHigh.length).toBe(1);
        expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
        expect(quadtree._tileLoadQueueMedium.length).toBe(1);
        expect(quadtree._tileLoadQueueMedium).toContain(quadtree._levelZeroTiles[0]);
        expect(quadtree._tileLoadQueueLow.length).toBe(4);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[0]);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[1]);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[2]);
        expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[3]);
    });

    it('renders tiles in approximate near-to-far order', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);
        tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            if (tile.level <= 1) {
                tile.state = QuadtreeTileLoadState.DONE;
                tile.renderable = true;
            }
        });

        scene.camera.setView({
            destination : Cartesian3.fromDegrees(1.0, 1.0, 15000.0)
        });
        scene.camera.update(scene.mode);

        return pollToPromise(function() {
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            return quadtree._tilesToRender.filter(function(tile) { return tile.level === 1; }).length === 8;
        }).then(function() {
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // Rendered tiles:
            // +----+----+----+----+
            // |w.nw|w.ne|e.nw|e.ne|
            // +----+----+----+----+
            // |w.sw|w.se|e.sw|e.se|
            // +----+----+----+----+
            // camera is located in e.nw (east.northwestChild)

            var west = quadtree._levelZeroTiles.filter(function(tile) { return tile.x === 0; })[0];
            var east = quadtree._levelZeroTiles.filter(function(tile) { return tile.x === 1; })[0];
            expect(quadtree._tilesToRender[0]).toBe(east.northwestChild);
            expect(quadtree._tilesToRender[1] === east.southwestChild || quadtree._tilesToRender[1] === east.northeastChild).toBe(true);
            expect(quadtree._tilesToRender[2] === east.southwestChild || quadtree._tilesToRender[2] === east.northeastChild).toBe(true);
            expect(quadtree._tilesToRender[3]).toBe(east.southeastChild);
            expect(quadtree._tilesToRender[4]).toBe(west.northeastChild);
            expect(quadtree._tilesToRender[5] === west.northwestChild || quadtree._tilesToRender[5] === west.southeastChild).toBe(true);
            expect(quadtree._tilesToRender[6] === west.northwestChild || quadtree._tilesToRender[6] === west.southeastChild).toBe(true);
            expect(quadtree._tilesToRender[7]).toBe(west.southwestChild);
        });
    });
}, 'WebGL');
