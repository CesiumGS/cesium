/*global defineSuite*/
defineSuite([
        'Scene/QuadtreePrimitive',
        'Core/defineProperties',
        'Core/GeographicTilingScheme',
        'Scene/QuadtreeTileState',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext'
    ], function(
        QuadtreePrimitive,
        defineProperties,
        GeographicTilingScheme,
        QuadtreeTileState,
        createContext,
        createFrameState,
        destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
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
            'beginFrame', 'endFrame', 'getLevelMaximumGeometricError', 'loadTile',
            'isTileVisible', 'renderTile', 'getDistanceToTile', 'isDestroyed', 'destroy']);

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

    it('calls beginFrame, loadTile, and endFrame', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.andReturn(true);

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(context, frameState, []);

        expect(tileProvider.beginFrame).toHaveBeenCalled();
        expect(tileProvider.loadTile).toHaveBeenCalled();
        expect(tileProvider.endFrame).toHaveBeenCalled();
    });

    it('renders the root tiles when they are ready and visible', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.andReturn(true);
        tileProvider.isTileVisible.andReturn(true);
        tileProvider.loadTile.andCallFake(function(context, frameState, tile) {
            tile.renderable = true;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(context, frameState, []);
        quadtree.update(context, frameState, []);

        expect(tileProvider.renderTile).toHaveBeenCalled();
    });

    it('stops loading a tile that moves to the READY state', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.andReturn(true);
        tileProvider.isTileVisible.andReturn(true);

        var calls = 0;
        tileProvider.loadTile.andCallFake(function(context, frameState, tile) {
            ++calls;
            tile.state = QuadtreeTileState.READY;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(context, frameState, []);
        expect(calls).toBe(2);

        quadtree.update(context, frameState, []);
        expect(calls).toBe(2);
    });
});