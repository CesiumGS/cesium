/*global defineSuite*/
defineSuite([
        'Scene/QuadtreePrimitive',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/defineProperties',
        'Core/EventHelper',
        'Core/GeographicTilingScheme',
        'Core/Visibility',
        'Scene/QuadtreeTile',
        'Scene/QuadtreeTileLoadState',
        'Specs/createScene'
    ], function(
        QuadtreePrimitive,
        Cartesian3,
        Cartographic,
        defineProperties,
        EventHelper,
        GeographicTilingScheme,
        Visibility,
        QuadtreeTile,
        QuadtreeTileLoadState,
        createScene) {
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
            'initialize', 'beginUpdate', 'endUpdate', 'getLevelMaximumGeometricError', 'loadTile',
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
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
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
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
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
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);
        expect(calls).toBe(2);

        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
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
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load zero-level tiles
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // There will now be two zero-level tiles in the load queue.
        expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(2);

        // Change one to loaded and update again
        quadtree._levelZeroTiles[0].state = QuadtreeTileLoadState.DONE;
        quadtree._levelZeroTiles[1].state = QuadtreeTileLoadState.LOADING;
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // Now there should only be one left in the update queue
        expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(1);

        // Simulate the second zero-level child having loaded with two children.
        quadtree._levelZeroTiles[1]._children = [
            buildEmptyQuadtreeTile(tileProvider),
            buildEmptyQuadtreeTile(tileProvider)
        ];
        quadtree._levelZeroTiles[1].state = QuadtreeTileLoadState.DONE;
        quadtree._levelZeroTiles[1].renderable = true;
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // Now this should be back to 2.
        expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(2);
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
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // Don't load further tiles.
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.state = QuadtreeTileLoadState.START;
        });

        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
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
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        var addedCallback = false;
        quadtree.forEachLoadedTile(function(tile) {
            addedCallback = addedCallback || tile.customData.length > 0;
        });

        expect(addedCallback).toEqual(true);

        removeFunc();
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
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
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        // load tiles
        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(position).toEqual(Cartesian3.ZERO);

        currentPosition = updatedPosition;

        quadtree.beginFrame(scene.frameState);
        quadtree.update(scene.frameState);
        quadtree.endFrame(scene.frameState);

        expect(position).toEqual(updatedPosition);
    });

    function buildEmptyQuadtreeTile(tileProvider) {
        return new QuadtreeTile({
            x : 0,
            y : 0,
            level : 0,
            tilingScheme : tileProvider.tilingScheme
        });
    }
}, 'WebGL');