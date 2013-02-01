/*global defineSuite*/
defineSuite([
         'Scene/TileReplacementQueue',
         'Scene/ImageryState',
         'Scene/TileState'
     ], function(
         TileReplacementQueue,
         ImageryState,
         TileState) {
    "use strict";
    /*global document,describe,it,expect,beforeEach*/

    function Tile(num, transitioning)
    {
        this._num = num;
        this.state = transitioning ? TileState.TRANSITIONING : TileState.READY;
        this.imagery = [];
    }

    Tile.prototype.freeResources = function() {

    };

    var queue;
    var one, two, three, four, transitioning;
    beforeEach(function() {
        queue = new TileReplacementQueue();
        one = new Tile(1);
        two = new Tile(2);
        three = new Tile(3);
        four = new Tile(4);
        transitioning = new Tile(1, true);
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
           queue.markTileRendered(transitioning);
           queue.markTileRendered(three);

           queue.markStartOfRenderFrame();

           queue.trimTiles(0);
           expect(queue.count).toEqual(1);
           expect(queue.head).toEqual(transitioning);
       });

       it('does not remove a tile with transitioning imagery.', function() {
           queue.markTileRendered(one);
           queue.markTileRendered(two);
           queue.markTileRendered(three);

           two.imagery.push({
               imagery : {
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
           queue.markTileRendered(transitioning);

           queue.markStartOfRenderFrame();

           queue.trimTiles(0);
           expect(queue.count).toEqual(1);
           expect(queue.head).toEqual(transitioning);
       });

       it('removes two tiles not used last render frame.', function() {
           queue.markTileRendered(transitioning);
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