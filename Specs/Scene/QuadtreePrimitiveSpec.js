/*global defineSuite*/
defineSuite([
        'Scene/QuadtreePrimitive',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/defineProperties',
        'Core/GeographicTilingScheme',
        'Core/Visibility',
        'Scene/QuadtreeTileLoadState',
        'Specs/createContext',
        'Specs/createFrameState'
    ], function(
        QuadtreePrimitive,
        Cartesian3,
        Cartographic,
        defineProperties,
        GeographicTilingScheme,
        Visibility,
        QuadtreeTileLoadState,
        createContext,
        createFrameState) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;
    var frameState;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        frameState = createFrameState(context);
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
        result.getTilingScheme.and.returnValue(tilingScheme);

        return result;
    }

    it('calls beginUpdate, loadTile, and endUpdate', function() {
        var tileProvider = createSpyTileProvider();
        tileProvider.getReady.and.returnValue(true);

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        quadtree.update(frameState);

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

        quadtree.update(frameState);
        quadtree.update(frameState);

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

        quadtree.update(frameState);
        expect(calls).toBe(2);

        quadtree.update(frameState);
        expect(calls).toBe(2);
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

        quadtree.update(frameState);

        // Don't load further tiles.
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.state = QuadtreeTileLoadState.START;
        });

        quadtree.update(frameState);

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
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        var removeFunc = quadtree.updateHeight(Cartographic.fromDegrees(-72.0, 40.0), function(position) {});

        quadtree.update(frameState);

        var addedCallback = false;
        quadtree.forEachLoadedTile(function (tile) {
            addedCallback = addedCallback || tile.customData.length > 0;
        });

        expect(addedCallback).toEqual(true);

        removeFunc();
        quadtree.update(frameState);

        var removedCallback = true;
        quadtree.forEachLoadedTile(function (tile) {
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

        // Load the root tiles.
        tileProvider.loadTile.and.callFake(function(frameState, tile) {
            tile.state = QuadtreeTileLoadState.DONE;
            tile.renderable = true;
        });

        var quadtree = new QuadtreePrimitive({
            tileProvider : tileProvider
        });

        var position = Cartesian3.clone(Cartesian3.ZERO);
        var updatedPosition = Cartesian3.clone(Cartesian3.UNIT_X);

        quadtree.updateHeight(Cartographic.fromDegrees(-72.0, 40.0), function(p) {
            Cartesian3.clone(p, position);
        });

        quadtree.update(frameState);
        expect(position).toEqual(Cartesian3.ZERO);

        quadtree.forEachLoadedTile(function (tile) {
            tile.data = {
                pick : function() {
                    return updatedPosition;
                }
            };
        });

        quadtree.update(frameState);

        expect(position).toEqual(updatedPosition);
    });
});