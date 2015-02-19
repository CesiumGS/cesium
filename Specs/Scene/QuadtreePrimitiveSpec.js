/*global defineSuite*/
defineSuite([
        'Scene/QuadtreePrimitive',
        'Core/defineProperties',
        'Core/GeographicTilingScheme',
        'Core/Visibility',
        'Scene/QuadtreeTileLoadState',
        'Specs/createContext',
        'Specs/createFrameState'
    ], function(
        QuadtreePrimitive,
        defineProperties,
        GeographicTilingScheme,
        Visibility,
        QuadtreeTileLoadState,
        createContext,
        createFrameState) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        frameState = createFrameState();
    });

    afterEach(function() {
    });

    it('must be constructed with a tileProvider', function() {
        expect(function() {
            var primitive = new QuadtreePrimitive();
        }).toThrowDeveloperError();

        expect(function() {
            var primitive = new QuadtreePrimitive({});
        }).toThrowDeveloperError();
    });

    function createSpyTileProvider() {
        var result = jasmine.createSpyObj('tileProvider', [
            'getQuadtree', 'setQuadtree', 'getReady', 'getTilingScheme', 'getErrorEvent',
            'beginUpdate', 'endUpdate', 'getLevelMaximumGeometricError', 'loadTile',
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
        result.getTilingScheme.andReturn(tilingScheme);

        return result;
    }

    it('calls beginUpdate, loadTile, and endUpdate', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.andReturn(true);

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(context, frameState, []);

        expect(tileProvider.beginUpdate).toHaveBeenCalled();
        expect(tileProvider.loadTile).toHaveBeenCalled();
        expect(tileProvider.endUpdate).toHaveBeenCalled();
    });

    it('shows the root tiles when they are ready and visible', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.andReturn(true);
        tileProvider.computeTileVisibility.andReturn(Visibility.FULL);
        tileProvider.loadTile.andCallFake(function(context, frameState, tile) {
            tile.renderable = true;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(context, frameState, []);
        quadtree.update(context, frameState, []);

        expect(tileProvider.showTileThisFrame).toHaveBeenCalled();
    });

    it('stops loading a tile that moves to the DONE state', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.andReturn(true);
        tileProvider.computeTileVisibility.andReturn(Visibility.FULL);

        var calls = 0;
        tileProvider.loadTile.andCallFake(function(context, frameState, tile) {
            ++calls;
            tile.state = QuadtreeTileLoadState.DONE;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(context, frameState, []);
        expect(calls).toBe(2);

        quadtree.update(context, frameState, []);
        expect(calls).toBe(2);
    });

    it('forEachLoadedTile does not enumerate tiles in the START state', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.andReturn(true);
        tileProvider.computeTileVisibility.andReturn(Visibility.FULL);
        tileProvider.computeDistanceToTile.andReturn(1e-15);

        // Load the root tiles.
        tileProvider.loadTile.andCallFake(function(context, frameState, tile) {
            tile.state = QuadtreeTileLoadState.DONE;
            tile.renderable = true;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(context, frameState, []);

        // Don't load further tiles.
        tileProvider.loadTile.andCallFake(function(context, frameState, tile) {
            tile.state = QuadtreeTileLoadState.START;
        });

        quadtree.update(context, frameState, []);

        quadtree.forEachLoadedTile(function(tile) {
            expect(tile.state).not.toBe(QuadtreeTileLoadState.START);
        });
    });
});