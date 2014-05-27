/*global defineSuite*/
defineSuite([
        'Scene/TileReplacementQueue',
        'Core/defined',
        'Scene/ImageryState',
        'Scene/TerrainState',
        'Scene/TileState'
    ], function(
        TileReplacementQueue,
        defined,
        ImageryState,
        TerrainState,
        TileState) {
    "use strict";
    /*global document,describe,it,expect,beforeEach*/

    function Tile(num, loadedState, upsampledState) {
        this._num = num;
        this.state = TileState.LOADING;
        this.imagery = [];
        if (defined(loadedState)) {
            this.loadedTerrain = {
                state : loadedState
            };
        }
        if (defined(upsampledState)) {
            this.upsampledTerrain = {
                state : upsampledState
            };
        }
    }

    Tile.prototype.freeResources = function() {

    };

    var queue;
    var one, two, three, four, loadTransitioning, upsampleTransitioning;
    beforeEach(function() {
        queue = new TileReplacementQueue();
        one = new Tile(1);
        two = new Tile(2);
        three = new Tile(3);
        four = new Tile(4);
        loadTransitioning = new Tile(5, TerrainState.RECEIVING);
        upsampleTransitioning = new Tile(6, undefined, TerrainState.TRANSFORMING);
    });

    describe('markStartOfRenderFrame', function() {
        it('prevents tiles added afterward from being trimmed.', function() {
            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markStartOfRenderFrame();

            queue.markTileRendered(three);

            queue.trimTiles(0);

            expect(queue.count).toEqual(1);
            expect(queue.head).toEqual(three);
        });

        it('prevents all tiles from being trimmed if called on an empty queue.', function() {
            queue.markStartOfRenderFrame();

            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markTileRendered(three);

            queue.trimTiles(0);
            expect(queue.count).toEqual(3);
        });

        it('adjusts properly when last tile in previous frame is moved to the head.', function() {
            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markTileRendered(three);

            queue.markStartOfRenderFrame();

            queue.markTileRendered(three);

            queue.trimTiles(0);
            expect(queue.count).toEqual(1);
            expect(queue.head).toEqual(three);
        });

        it('adjusts properly when all tiles are moved to the head.', function() {
            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markTileRendered(three);

            queue.markStartOfRenderFrame();

            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markTileRendered(three);

            queue.trimTiles(0);
            expect(queue.count).toEqual(3);
            expect(queue.head).toEqual(three);
            expect(queue.tail).toEqual(one);
        });
    });

    describe('trimTiles', function() {
        it('does not remove a transitioning tile.', function() {
            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markTileRendered(loadTransitioning);
            queue.markTileRendered(upsampleTransitioning);
            queue.markTileRendered(three);

            queue.markStartOfRenderFrame();

            queue.trimTiles(0);
            expect(queue.count).toEqual(2);
            expect(queue.head.replacementNext).toEqual(loadTransitioning);
            expect(queue.head).toEqual(upsampleTransitioning);
        });

        it('does not remove a tile with transitioning imagery.', function() {
            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markTileRendered(three);

            two.imagery.push({
                loadingImagery : {
                    state : ImageryState.TRANSITIONING
                }
            });

            queue.markStartOfRenderFrame();

            queue.trimTiles(0);
            expect(queue.count).toEqual(1);
            expect(queue.head).toEqual(two);
        });

        it('does not remove a transitioning tile at the end of the last render frame.', function() {
            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markTileRendered(three);
            queue.markTileRendered(loadTransitioning);

            queue.markStartOfRenderFrame();

            queue.trimTiles(0);
            expect(queue.count).toEqual(1);
            expect(queue.head).toEqual(loadTransitioning);
        });

        it('removes two tiles not used last render frame.', function() {
            queue.markTileRendered(loadTransitioning);
            queue.markTileRendered(one);
            queue.markTileRendered(two);
            queue.markStartOfRenderFrame();
            queue.markTileRendered(three);
            queue.markTileRendered(four);
            queue.trimTiles(0);
            expect(queue.count).toEqual(3);
        });
    });
});