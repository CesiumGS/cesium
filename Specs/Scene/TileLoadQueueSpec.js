/*global defineSuite*/
defineSuite([
         'Scene/TileLoadQueue',
         'Scene/TileState'
     ], function(
         TileLoadQueue,
         TileState) {
    "use strict";
    /*global document,describe,it,expect,beforeEach*/

    function Tile(num)
    {
        this._num = num;
        this.loadNext = undefined;
        this.loadPrevious = undefined;
    }

    var queue;
    var one, two, three, four;
    beforeEach(function() {
        queue = new TileLoadQueue();
        one = new Tile(1);
        two = new Tile(2);
        three = new Tile(3);
        four = new Tile(4);
    });

    it('inserts tiles at the marked insertion point', function() {
        queue.markInsertionPoint();
        queue.insertBeforeInsertionPoint(one);
        queue.insertBeforeInsertionPoint(two);
        expect(queue.head).toBe(one);
        expect(queue.head.loadNext).toBe(two);

        queue.markInsertionPoint();
        queue.insertBeforeInsertionPoint(three);
        queue.insertBeforeInsertionPoint(four);
        expect(queue.head).toBe(three);
        expect(queue.head.loadNext).toBe(four);
        expect(queue.head.loadNext.loadNext).toBe(one);
        expect(queue.head.loadNext.loadNext.loadNext).toBe(two);
    });

    describe('remove', function() {
        it('removes a tile when it is the only one in the queue', function() {
            queue.insertBeforeInsertionPoint(one);
            queue.remove(one);
            expect(queue.head).toBeUndefined();
        });

        it('removes a tile when it is the head of the queue', function() {
            queue.insertBeforeInsertionPoint(one);
            queue.insertBeforeInsertionPoint(two);
            queue.insertBeforeInsertionPoint(three);
            queue.remove(one);
            expect(one.loadNext).toBeUndefined();
            expect(one.loadPrevious).toBeUndefined();
            expect(queue.head).toBe(two);
            expect(two.loadPrevious).toBeUndefined();
        });

        it('removes a tile when it is the tail of the queue', function() {
            queue.insertBeforeInsertionPoint(one);
            queue.insertBeforeInsertionPoint(two);
            queue.insertBeforeInsertionPoint(three);
            queue.remove(three);
            expect(three.loadNext).toBeUndefined();
            expect(three.loadPrevious).toBeUndefined();
            expect(two.loadNext).toBeUndefined();
            expect(queue.head).toBe(one);
            expect(queue.tail).toBe(two);
        });

        it('removes a tile when it is in the middle of the queue', function() {
            queue.insertBeforeInsertionPoint(one);
            queue.insertBeforeInsertionPoint(two);
            queue.insertBeforeInsertionPoint(three);
            queue.remove(two);
            expect(two.loadNext).toBeUndefined();
            expect(two.loadPrevious).toBeUndefined();
            expect(queue.head).toBe(one);
            expect(queue.tail).toBe(three);
            expect(queue.head.loadNext).toBe(three);
            expect(queue.tail.loadPrevious).toBe(one);
        });
    });

    it('clears', function() {
        queue.insertBeforeInsertionPoint(one);
        queue.insertBeforeInsertionPoint(two);
        queue.insertBeforeInsertionPoint(three);
        queue.clear();

        expect(queue.head).toBeUndefined();
        expect(queue.tail).toBeUndefined();
        expect(one.loadNext).toBeUndefined();
        expect(one.loadPrevious).toBeUndefined();
        expect(two.loadNext).toBeUndefined();
        expect(two.loadPrevious).toBeUndefined();
        expect(three.loadNext).toBeUndefined();
        expect(three.loadPrevious).toBeUndefined();
    });
});