import { Heap } from "../../Source/Cesium.js";

describe("Core/Heap", function () {
  var length = 100;

  function expectTrailingReferenceToBeRemoved(heap) {
    var array = heap._array;
    var length = heap._length;
    var reservedLength = array.length;
    for (var i = length; i < reservedLength; ++i) {
      expect(array[i]).toBeUndefined();
    }
  }

  function checkHeap(heap, comparator) {
    var array = heap.internalArray;
    var pass = true;
    var length = heap.length;
    for (var i = 0; i < length; ++i) {
      var left = 2 * (i + 1) - 1;
      var right = 2 * (i + 1);
      if (left < heap.length) {
        pass = pass && comparator(array[i], array[left]) <= 0;
      }
      if (right < heap.length) {
        pass = pass && comparator(array[i], array[right]) <= 0;
      }
    }
    return pass;
  }

  // min heap
  function comparator(a, b) {
    return a - b;
  }

  it("maintains heap property on insert", function () {
    var heap = new Heap({
      comparator: comparator,
    });
    var pass = true;
    for (var i = 0; i < length; ++i) {
      heap.insert(Math.random());
      pass = pass && checkHeap(heap, comparator);
    }

    expect(pass).toBe(true);
  });

  it("maintains heap property on pop", function () {
    var heap = new Heap({
      comparator: comparator,
    });
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

  it("limited by maximum length", function () {
    var heap = new Heap({
      comparator: comparator,
    });
    heap.maximumLength = length / 2;
    var pass = true;
    for (var i = 0; i < length; ++i) {
      heap.insert(Math.random());
      pass = pass && checkHeap(heap, comparator);
    }
    expect(pass).toBe(true);
    expect(heap.length).toBeLessThanOrEqualTo(heap.maximumLength);
    // allowed one extra slot for swapping
    expect(heap.internalArray.length).toBeLessThanOrEqualTo(
      heap.maximumLength + 1
    );
  });

  it("pops in sorted order", function () {
    var heap = new Heap({
      comparator: comparator,
    });
    var i;
    for (i = 0; i < length; ++i) {
      heap.insert(Math.random());
    }
    var curr = heap.pop();
    var pass = true;
    for (i = 0; i < length - 1; ++i) {
      var next = heap.pop();
      pass = pass && comparator(curr, next) <= 0;
      curr = next;
    }
    expect(pass).toBe(true);
  });

  it("pop removes trailing references", function () {
    var heap = new Heap({
      comparator: comparator,
    });

    for (var i = 0; i < 10; ++i) {
      heap.insert(Math.random());
    }

    heap.pop();
    heap.pop();

    expectTrailingReferenceToBeRemoved(heap);
  });

  it("setting maximum length less than current length removes trailing references", function () {
    var heap = new Heap({
      comparator: comparator,
    });

    for (var i = 0; i < 10; ++i) {
      heap.insert(Math.random());
    }

    heap.maximumLength = 5;
    expectTrailingReferenceToBeRemoved(heap);
  });

  it("insert returns the removed element when maximumLength is set", function () {
    var heap = new Heap({
      comparator: comparator,
    });
    heap.maximumLength = length;

    var i;
    var max = 0.0;
    var min = 1.0;
    var values = new Array(length);
    for (i = 0; i < length; ++i) {
      var value = Math.random();
      max = Math.max(max, value);
      min = Math.min(min, value);
      values[i] = value;
    }

    // Push 99 values
    for (i = 0; i < length - 1; ++i) {
      heap.insert(values[i]);
    }

    // Push 100th, nothing is removed so it returns undefined
    var removed = heap.insert(values[length - 1]);
    expect(removed).toBeUndefined();

    // Insert value, an element is removed
    removed = heap.insert(max - 0.1);
    expect(removed).toBeDefined();

    // If this value is the least priority it will be returned
    removed = heap.insert(max + 0.1);
    expect(removed).toBe(max + 0.1);
  });

  it("resort", function () {
    function comparator(a, b) {
      return a.distance - b.distance;
    }

    var i;
    var heap = new Heap({
      comparator: comparator,
    });
    for (i = 0; i < length; ++i) {
      heap.insert({
        distance: i / (length - 1),
        id: i,
      });
    }

    // Check that elements are initially sorted
    var element;
    var elements = [];
    var currentId = 0;
    while (heap.length > 0) {
      element = heap.pop();
      elements.push(element);
      expect(element.id).toBeGreaterThanOrEqualTo(currentId);
      currentId = element.id;
    }

    // Add back into heap
    for (i = 0; i < length; ++i) {
      heap.insert(elements[i]);
    }

    // Invert priority
    for (i = 0; i < length; ++i) {
      elements[i].distance = 1.0 - elements[i].distance;
    }

    // Resort and check the the elements are popped in the opposite order now
    heap.resort();
    while (heap.length > 0) {
      element = heap.pop();
      expect(element.id).toBeLessThanOrEqualTo(currentId);
      currentId = element.id;
    }
  });

  it("maximumLength setter throws if length is less than 0", function () {
    var heap = new Heap({
      comparator: comparator,
    });
    expect(function () {
      heap.maximumLength = -1;
    }).toThrowDeveloperError();
  });
});
