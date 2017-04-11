/*global defineSuite*/
defineSuite([
        'Core/Heap'
], function(
        Heap) {
    'use strict';

    var length = 100;

    function checkHeap(heap, comparator) {
        var data = heap.data;
        var pass = true;
        for (var i = 0; i < heap.length; ++i) {
            var left = 2 * (i + 1) - 1;
            var right = 2 * (i + 1);
            if (left < heap.length) {
                pass = pass && (comparator(data[i], data[left]) <= 0);
            }
            if (right < heap.length) {
                pass = pass && (comparator(data[i], data[right]) <= 0);
            }
        }
        return pass;
    }

    // min heap
    function comparator(a, b) {
        return a - b;
    }

    it('maintains heap property on insert', function() {
        var heap = new Heap(comparator);
        var pass = true;
        for (var i = 0; i < length; ++i) {
            heap.insert(Math.random());
            pass = pass && checkHeap(heap, comparator);
        }
        expect(pass).toBe(true);
    });

    it('maintains heap property on pop', function() {
        var heap = new Heap(comparator);
        var i;
        for (i = 0; i < length; ++i) {
            heap.insert(Math.random());
        }
        var pass = true;
        for (i = 0; i < length; ++i) {
            heap.pop();
            pass = pass && checkHeap(heap, comparator);
        }
        expect(pass).toBe(true);
    });

    it('can build heap', function() {
        var heap = new Heap(comparator);
        var arr = new Array(length);
        for (var i = 0; i < length; ++i) {
            arr[i] = Math.random();
        }
        heap.buildHeap(arr);
        expect(checkHeap(heap, comparator)).toBe(true);
    });

    it('limited by maximum size', function() {
        var heap = new Heap(comparator);
        heap.maximumSize = length / 2;
        var pass = true;
        for (var i = 0; i < length; ++i) {
            heap.insert(Math.random());
            pass = pass && checkHeap(heap, comparator);
        }
        expect(pass).toBe(true);
        expect(heap.length <= heap.maximumSize).toBe(true);
        // allowed one extra slot for swapping
        expect(heap.data.length <= heap.maximumSize + 1).toBe(true);
    });

    it('pops in sorted order', function() {
        var heap = new Heap(comparator);
        var i;
        for (i = 0; i < length; ++i) {
            heap.insert(Math.random());
        }
        var curr = heap.pop();
        var pass = true;
        for (i = 0; i < length - 1; ++i) {
            var next = heap.pop();
            pass = pass && (comparator(curr, next) <= 0);
            curr = next;
        }
        expect(pass).toBe(true);
    });
});
