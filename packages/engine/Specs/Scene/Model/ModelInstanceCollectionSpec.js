import { Matrix4, ModelInstanceCollection } from "../../../index.js";

describe("Scene/Model/ModelInstanceCollection", function () {
  let collection;

  const sampleTransform1 = new Matrix4(
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    0,
    0,
    0,
    1,
  );
  const sampleTransform2 = new Matrix4(
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    0,
    0,
    0,
    1,
  );

  beforeEach(function () {
    collection = new ModelInstanceCollection();
  });

  it("has zero instances when constructed", function () {
    expect(collection.length).toEqual(0);
  });

  it("can add an instance", function () {
    const instance = collection.add(sampleTransform1);

    expect(collection.length).toEqual(1);
    expect(collection.get(0)).toBe(instance);
  });

  it("can remove an instance", function () {
    const sampleInstance1 = collection.add(sampleTransform1);
    collection.add(sampleTransform2);

    const removed = collection.remove(sampleInstance1);

    expect(removed).toEqual(true);

    expect(collection.length).toEqual(1);
  });

  it("can remove all instances", function () {
    collection.add(sampleTransform1);
    collection.add(sampleTransform2);
    expect(collection.length).toEqual(2);
    collection.removeAll();
    expect(collection.length).toEqual(0);
  });

  it("throws when calling get without an index", function () {
    expect(function () {
      collection.get();
    }).toThrowDeveloperError();
  });

  it("throws when calling remove without an instance", function () {
    expect(function () {
      collection.remove();
    }).toThrowDeveloperError();
  });
});
