function createPackableArraySpecs(
  packable,
  unpackedArray,
  packedArray,
  stride,
  namePrefix,
) {
  namePrefix = namePrefix ?? "";

  it(`${namePrefix} can pack`, function () {
    const actualPackedArray = packable.packArray(unpackedArray);
    expect(actualPackedArray.length).toEqual(packedArray.length);
    expect(actualPackedArray).toEqual(packedArray);
  });

  it(`${namePrefix} can roundtrip`, function () {
    const actualPackedArray = packable.packArray(unpackedArray);
    const result = packable.unpackArray(actualPackedArray);
    expect(result).toEqual(unpackedArray);
  });

  it(`${namePrefix} can unpack`, function () {
    const result = packable.unpackArray(packedArray);
    expect(result).toEqual(unpackedArray);
  });

  it(`${namePrefix} packArray works with typed arrays`, function () {
    const typedArray = new Float64Array(packedArray.length);
    const result = packable.packArray(unpackedArray, typedArray);
    expect(result).toEqual(new Float64Array(packedArray));
  });

  it(`${namePrefix} packArray resizes arrays as needed`, function () {
    const emptyArray = [];
    let result = packable.packArray(unpackedArray, emptyArray);
    expect(result).toEqual(packedArray);

    const largerArray = new Array(packedArray.length + 1).fill(0.0);
    result = packable.packArray(unpackedArray, largerArray);
    expect(result).toEqual(packedArray);
  });

  it(`${namePrefix} packArray throws with undefined array`, function () {
    expect(function () {
      packable.packArray(undefined);
    }).toThrowDeveloperError();
  });

  it(`${namePrefix} packArray throws for typed arrays of the wrong size`, function () {
    expect(function () {
      const tooSmall = new Float64Array(0);
      packable.packArray(unpackedArray, tooSmall);
    }).toThrowDeveloperError();

    expect(function () {
      const tooBig = new Float64Array(10);
      packable.packArray(unpackedArray, tooBig);
    }).toThrowDeveloperError();
  });

  it(`${namePrefix} unpackArray works for typed arrays`, function () {
    const array = packable.unpackArray(new Float64Array(packedArray));
    expect(array).toEqual(unpackedArray);
  });

  it(`${namePrefix} unpackArray throws with undefined array`, function () {
    expect(function () {
      packable.unpackArray(undefined);
    }).toThrowDeveloperError();
  });

  it(`${namePrefix} unpackArray works with a result parameter`, function () {
    let array = [];
    let result = packable.unpackArray(packedArray, array);
    expect(result).toBe(array);
    expect(result).toEqual(unpackedArray);

    const PackableClass = packable;
    array = new Array(unpackedArray.length);
    for (let i = 0; i < unpackedArray.length; i++) {
      array[i] = new PackableClass();
    }

    result = packable.unpackArray(packedArray, array);
    expect(result).toBe(array);
    expect(result).toEqual(unpackedArray);
  });

  it(`${namePrefix} unpackArray throws with array less than the minimum length`, function () {
    expect(function () {
      packable.unpackArray([1.0]);
    }).toThrowDeveloperError();
  });

  it("unpackArray throws with array not multiple of stride", function () {
    expect(function () {
      packable.unpackArray(new Array(stride + 1).fill(1.0));
    }).toThrowDeveloperError();
  });
}
export default createPackableArraySpecs;
