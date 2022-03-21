import { Heap } from "../../Source/Cesium.js";

describe("Core/Heap", function () {
  const length = 100;

  function expectTrailingReferenceToBeRemoved(heap) {
    const array = heap._array;
    const length = heap._length;
    const reservedLength = array.length;
    for (let i = length; i < reservedLength; ++i) {
      expect(array[i]).toBeUndefined();
    }
  }

  function checkHeap(heap, comparator) {
    const array = heap.internalArray;
    let pass = true;
    const length = heap.length;
    for (let i = 0; i < length; ++i) {
      const left = 2 * (i + 1) - 1;
      const right = 2 * (i + 1);
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
    const heap = new Heap({
      comparator: comparator,
    });
    let pass = true;
    for (let i = 0; i < length; ++i) {
      heap.insert(Math.random());
      pass = pass && checkHeap(heap, comparator);
    }

    expect(pass).toBe(true);
  });

  it("maintains heap property on pop", function () {
    const heap = new Heap({
      comparator: comparator,
    });
    let i;
    for (i = 0; i < length; ++i) {
      heap.insert(Math.random());
    }
    let pass = true;
    for (i = 0; i < length; ++i) {
      heap.pop();
      pass = pass && checkHeap(heap, comparator);
    }
    expect(pass).toBe(true);
  });

  it("limited by maximum length", function () {
    const heap = new Heap({
      comparator: comparator,
    });
    heap.maximumLength = length / 2;
    let pass = true;
    for (let i = 0; i < length; ++i) {
      heap.insert(Math.random());
      pass = pass && checkHeap(heap, comparator);
    }
    expect(pass).toBe(true);
    expect(heap.length).toBeLessThanOrEqual(heap.maximumLength);
    // allowed one extra slot for swapping
    expect(heap.internalArray.length).toBeLessThanOrEqual(
      heap.maximumLength + 1
    );
  });

  it("pops in sorted order", function () {
    const heap = new Heap({
      comparator: comparator,
    });
    let i;
    for (i = 0; i < length; ++i) {
      heap.insert(Math.random());
    }
    let curr = heap.pop();
    let pass = true;
    for (i = 0; i < length - 1; ++i) {
      const next = heap.pop();
      pass = pass && comparator(curr, next) <= 0;
      curr = next;
    }
    expect(pass).toBe(true);
  });

  it("pop removes trailing references", function () {
    const heap = new Heap({
      comparator: comparator,
    });

    for (let i = 0; i < 10; ++i) {
      heap.insert(Math.random());
    }

    heap.pop();
    heap.pop();

    expectTrailingReferenceToBeRemoved(heap);
  });

  it("setting maximum length less than current length removes trailing references", function () {
    const heap = new Heap({
      comparator: comparator,
    });

    for (let i = 0; i < 10; ++i) {
      heap.insert(Math.random());
    }

    heap.maximumLength = 5;
    expectTrailingReferenceToBeRemoved(heap);
  });

  it("insert returns the removed element when maximumLength is set", function () {
    const heap = new Heap({
      comparator: comparator,
    });
    heap.maximumLength = length;

    let i;
    let max = 0.0;
    let min = 1.0;
    const values = new Array(length);
    for (i = 0; i < length; ++i) {
      const value = Math.random();
      max = Math.max(max, value);
      min = Math.min(min, value);
      values[i] = value;
    }

    // Push 99 values
    for (i = 0; i < length - 1; ++i) {
      heap.insert(values[i]);
    }

    // Push 100th, nothing is removed so it returns undefined
    let removed = heap.insert(values[length - 1]);
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

    let i;
    const heap = new Heap({
      comparator: comparator,
    });
    for (i = 0; i < length; ++i) {
      heap.insert({
        distance: i / (length - 1),
        id: i,
      });
    }

    // Check that elements are initially sorted
    let element;
    const elements = [];
    let currentId = 0;
    while (heap.length > 0) {
      element = heap.pop();
      elements.push(element);
      expect(element.id).toBeGreaterThanOrEqual(currentId);
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
      expect(element.id).toBeLessThanOrEqual(currentId);
      currentId = element.id;
    }
  });

  it("maximumLength setter throws if length is less than 0", function () {
    const heap = new Heap({
      comparator: comparator,
    });
    expect(function () {
      heap.maximumLength = -1;
    }).toThrowDeveloperError();
  });
});
