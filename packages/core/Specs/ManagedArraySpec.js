import { ManagedArray } from "../../index.js";

describe("Core/ManagedArray", function () {
  function expectTrailingReferenceToBeRemoved(managedArray) {
    const array = managedArray._array;
    const length = managedArray._length;
    const reservedLength = array.length;
    for (let i = length; i < reservedLength; ++i) {
      expect(array[i]).toBeUndefined();
    }
  }

  it("constructor has expected default values", function () {
    const array = new ManagedArray();
    expect(array.length).toEqual(0);
  });

  it("constructor initializes length", function () {
    const array = new ManagedArray(10);
    expect(array.length).toEqual(10);
    expect(array.values.length).toEqual(10);
  });

  it("can get and set values", function () {
    const length = 10;
    const array = new ManagedArray(length);
    let i;
    for (i = 0; i < length; ++i) {
      array.set(i, i * i);
    }
    for (i = 0; i < length; ++i) {
      expect(array.get(i)).toEqual(i * i);
      expect(array.values[i]).toEqual(i * i);
    }
  });

  it("get throws if index does not exist", function () {
    const array = new ManagedArray();
    array.reserve(5);
    expect(array.values.length).toEqual(5);
    expect(function () {
      array.get(5);
    }).toThrowDeveloperError();
  });

  it("set throws if index invalid", function () {
    const array = new ManagedArray();
    array.resize(10);
    expect(function () {
      array.set(undefined, 5);
    }).toThrowDeveloperError();
  });

  it("length setter throws if length is less than 0", function () {
    const array = new ManagedArray();
    expect(function () {
      array.length = -1;
    }).toThrowDeveloperError();
  });

  it("set resizes array", function () {
    const array = new ManagedArray();
    array.set(0, "a");
    expect(array.length).toEqual(1);
    array.set(5, "b");
    expect(array.length).toEqual(6);
    array.set(2, "c");
    expect(array.length).toEqual(6);
  });

  it("peeks at the last element of the array", function () {
    const array = new ManagedArray();
    expect(array.peek()).toBeUndefined();
    array.push(0);
    expect(array.peek()).toBe(0);
    array.push(1);
    array.push(2);
    expect(array.peek()).toBe(2);
  });

  it("can push values", function () {
    const array = new ManagedArray();
    const length = 10;
    for (let i = 0; i < length; ++i) {
      const val = Math.random();
      array.push(val);
      expect(array.length).toEqual(i + 1);
      expect(array.values.length).toEqual(i + 1);
      expect(array.get(i)).toEqual(val);
      expect(array.values[i]).toEqual(val);
    }
  });

  it("can pop values", function () {
    const length = 10;
    const array = new ManagedArray(length);
    let i;
    for (i = 0; i < length; ++i) {
      array.set(i, Math.random());
    }
    for (i = length - 1; i >= 0; --i) {
      const val = array.get(i);
      expect(array.pop()).toEqual(val);
      expect(array.length).toEqual(i);
      expect(array.values.length).toEqual(length);
    }
  });

  it("pop removes trailing references", function () {
    const length = 10;
    const array = new ManagedArray(length);
    array.set(0, Math.random());
    array.set(1, Math.random());
    array.set(2, Math.random());
    array.pop();
    array.pop();
    expectTrailingReferenceToBeRemoved(array);
  });

  it("pop returns undefined if array is empty", function () {
    const array = new ManagedArray();
    array.push(1);
    expect(array.pop()).toBe(1);
    expect(array.pop()).toBeUndefined();
  });

  it("reserve throws if length is less than 0", function () {
    const array = new ManagedArray();
    expect(function () {
      array.reserve(-1);
    }).toThrowDeveloperError();
  });

  it("reserve", function () {
    const array = new ManagedArray(2);
    array.reserve(10);
    expect(array.values.length).toEqual(10);
    expect(array.length).toEqual(2);
    array.reserve(20);
    expect(array.values.length).toEqual(20);
    expect(array.length).toEqual(2);
    array.reserve(5);
    expect(array.values.length).toEqual(20);
    expect(array.length).toEqual(2);
  });

  it("resize throws if length is less than 0", function () {
    const array = new ManagedArray();
    expect(function () {
      array.resize(-1);
    }).toThrowDeveloperError();
  });

  it("resize", function () {
    const array = new ManagedArray(2);
    array.resize(10);
    expect(array.values.length).toEqual(10);
    expect(array.length).toEqual(10);
    array.resize(20);
    expect(array.values.length).toEqual(20);
    expect(array.length).toEqual(20);
    array.resize(5);
    expect(array.values.length).toEqual(20);
    expect(array.length).toEqual(5);
  });

  it("resize removes trailing references", function () {
    const length = 10;
    const array = new ManagedArray(length);
    array.set(0, Math.random());
    array.set(1, Math.random());
    array.set(2, Math.random());
    array.resize(1);
    expectTrailingReferenceToBeRemoved(array);
  });

  it("trim", function () {
    const array = new ManagedArray(2);
    array.reserve(10);
    expect(array.length).toEqual(2);
    expect(array.values.length).toEqual(10);
    array.trim();
    expect(array.values.length).toEqual(2);
    array.trim(5);
    expect(array.length).toEqual(2);
    expect(array.values.length).toEqual(5);
    array.trim(3);
    expect(array.length).toEqual(2);
    expect(array.values.length).toEqual(3);
  });
});
