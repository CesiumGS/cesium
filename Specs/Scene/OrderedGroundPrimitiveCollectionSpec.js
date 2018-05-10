defineSuite([
    'Scene/OrderedGroundPrimitiveCollection',
    'Core/destroyObject'
], function(
    OrderedGroundPrimitiveCollection,
    destroyObject) {
    'use strict';

    var updateCallOrder;

    beforeEach(function() {
        updateCallOrder = [];
    });

    function MockPrimitive() {}

    MockPrimitive.prototype.update = function() {
        updateCallOrder.push(this);
    };

    MockPrimitive.prototype.isDestroyed = function() { return false; };
    MockPrimitive.prototype.destroy = function() {
        return destroyObject(this);
    };

    it('constructs', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        expect(collection.length).toBe(0);
        expect(collection.show).toBe(true);
    });

    it('add throws without primitive', function() {
        expect(function() {
            var collection = new OrderedGroundPrimitiveCollection();
            collection.add();
        }).toThrowDeveloperError();
    });

    it('add throws if zIndex is not a number', function() {
        expect(function() {
            var collection = new OrderedGroundPrimitiveCollection();
            collection.add(new MockPrimitive(), '3');
        }).toThrowDeveloperError();
    });

    it('adds a primitive', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        collection.add(new MockPrimitive());
        expect(collection.length).toBe(1);
    });

    it('add handles multiple zIndexes', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive());
        var p2 = collection.add(new MockPrimitive(), 0);
        var p3 = collection.add(new MockPrimitive(), 2);
        var p4 = collection.add(new MockPrimitive(), 1);
        expect(collection.length).toBe(4);

        var array = collection._collectionsArray;
        expect(array.length).toBe(3);
        expect(array[0].length).toBe(2);
        expect(array[0].get(0)).toBe(p1);
        expect(array[0].get(1)).toBe(p2);
        expect(array[1].length).toBe(1);
        expect(array[1].get(0)).toBe(p4);
        expect(array[2].length).toBe(1);
        expect(array[2].get(0)).toBe(p3);
    });

    it('add works with negative zIndexes', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive(), 0);
        var p2 = collection.add(new MockPrimitive(), -3);
        var p3 = collection.add(new MockPrimitive(), -1);
        var p4 = collection.add(new MockPrimitive(), -3);
        expect(collection.length).toBe(4);

        var array = collection._collectionsArray;
        expect(array.length).toBe(3);
        expect(array[0].length).toBe(2);
        expect(array[0].get(0)).toBe(p2);
        expect(array[0].get(1)).toBe(p4);
        expect(array[1].length).toBe(1);
        expect(array[1].get(0)).toBe(p3);
        expect(array[2].length).toBe(1);
        expect(array[2].get(0)).toBe(p1);
    });

    it('set throws without primitive', function() {
        expect(function() {
            var collection = new OrderedGroundPrimitiveCollection();
            collection.set(undefined, 3);
        }).toThrowDeveloperError();
    });

    it('set throws without zIndex', function() {
        expect(function() {
            var collection = new OrderedGroundPrimitiveCollection();
            collection.set(new MockPrimitive(), undefined);
        }).toThrowDeveloperError();
    });

    it('set throws if zIndex is not a number', function() {
        expect(function() {
            var collection = new OrderedGroundPrimitiveCollection();
            collection.set(new MockPrimitive(), '3');
        }).toThrowDeveloperError();
    });

    it('set adds primitive if it is not in the collection', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        collection.set(new MockPrimitive(), 3);
        expect(collection.length).toBe(1);
    });

    it('set changes a primitives index', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive(), 0);
        var p2 = collection.add(new MockPrimitive(), 0);
        var p3 = collection.add(new MockPrimitive(), 2);
        var p4 = collection.add(new MockPrimitive(), 1);
        expect(collection.length).toBe(4);

        collection.set(p4, 2);

        expect(collection.length).toBe(4);

        var array = collection._collectionsArray;
        expect(array.length).toBe(2);
        expect(array[0].length).toBe(2);
        expect(array[0].get(0)).toBe(p1);
        expect(array[0].get(1)).toBe(p2);
        expect(array[1].length).toBe(2);
        expect(array[1].get(0)).toBe(p3);
        expect(array[1].get(1)).toBe(p4);
    });

    it('set works with negative indexes', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive(), 0);
        var p2 = collection.add(new MockPrimitive(), 0);
        expect(collection.length).toBe(2);

        collection.set(p2, -1);

        var array = collection._collectionsArray;
        expect(array.length).toBe(2);
        expect(array[0].length).toBe(1);
        expect(array[0].get(0)).toBe(p2);
        expect(array[1].length).toBe(1);
        expect(array[1].get(0)).toBe(p1);
    });

    it('set throws without primitive', function() {
        expect(function() {
            var collection = new OrderedGroundPrimitiveCollection();
            collection.set(undefined, 3);
        }).toThrowDeveloperError();
    });

    it('removes a primitive', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p = collection.add(new MockPrimitive());
        var result = collection.remove(p);
        expect(result).toBe(true);
        expect(collection.length).toBe(0);
        expect(collection._collectionsArray.length).toBe(0);
        expect(p.isDestroyed()).toBe(true);
    });

    it('removes handles multiple zIndexes', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive(), 0);
        var p2 = collection.add(new MockPrimitive(), 2);
        var p3 = collection.add(new MockPrimitive(), 2);
        var p4 = collection.add(new MockPrimitive(), 1);
        expect(collection.length).toBe(4);

        var array = collection._collectionsArray;
        expect(array.length).toBe(3);
        collection.remove(p3);
        expect(array.length).toBe(3);
        collection.remove(p2);
        expect(array.length).toBe(2);
        expect(array[0].get(0)).toBe(p1);
        expect(array[1].get(0)).toBe(p4);
    });

    it('removes null', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        expect(collection.remove()).toEqual(false);
    });

    it('removeAll removes and destroys all primitives', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive(), 0);
        var p2 = collection.add(new MockPrimitive(), 0);
        var p3 = collection.add(new MockPrimitive(), 2);
        var p4 = collection.add(new MockPrimitive(), 1);
        expect(collection.length).toBe(4);
        collection.removeAll();
        expect(collection.length).toBe(0);
        expect(p1.isDestroyed()).toBe(true);
        expect(p2.isDestroyed()).toBe(true);
        expect(p3.isDestroyed()).toBe(true);
        expect(p4.isDestroyed()).toBe(true);
    });

    it('contains primitive', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive());

        expect(collection.contains(p1)).toBe(true);
    });

    it('does not contain primitive', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = new MockPrimitive();

        expect(collection.contains(p1)).toBe(false);
    });

    it('does not contain undefined', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        expect(collection.contains()).toEqual(false);
    });

    it('update is called in the correct order', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        var p1 = collection.add(new MockPrimitive(), 0);
        var p2 = collection.add(new MockPrimitive(), 3);
        var p3 = collection.add(new MockPrimitive(), 1);
        var p4 = collection.add(new MockPrimitive(), 2);
        collection.update();
        expect(updateCallOrder).toEqual([p1, p3, p4, p2]);

        updateCallOrder = [];
        collection.set(p1, 4);
        collection.update();
        expect(updateCallOrder).toEqual([p3, p4, p2, p1]);

        updateCallOrder = [];
        collection.set(p2, 0);
        collection.update();
        expect(updateCallOrder).toEqual([p2, p3, p4, p1]);

        updateCallOrder = [];
        collection.set(p4, -1);
        collection.update();
        expect(updateCallOrder).toEqual([p4, p2, p3, p1]);
    });

    it('update is not called when show is false', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        collection.add(new MockPrimitive(), 0);
        collection.add(new MockPrimitive(), 3);
        collection.show = false;
        collection.update();
        expect(updateCallOrder).toEqual([]);
    });

    it('destroys', function() {
        var collection = new OrderedGroundPrimitiveCollection();
        expect(collection.isDestroyed()).toBe(false);
        collection.destroy();
        expect(collection.isDestroyed()).toBe(true);
    });
});
