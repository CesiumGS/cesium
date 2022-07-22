import { defaultValue, defined } from "../../Source/Cesium.js";

import { Math as CesiumMath } from "../Source/Cesium.js";

function createPackableSpecs(packable, instance, packedInstance, namePrefix) {
  namePrefix = defaultValue(namePrefix, "");

  it(`${namePrefix} can pack`, function () {
    const packedArray = [];
    const returnArray = packable.pack(instance, packedArray);
    expect(returnArray).toBe(packedArray);
    const packedLength = defined(packable.packedLength)
      ? packable.packedLength
      : instance.packedLength;
    expect(packedArray.length).toEqual(packedLength);
    expect(packedArray).toEqualEpsilon(packedInstance, CesiumMath.EPSILON15);
  });

  it(`${namePrefix} can roundtrip`, function () {
    const packedArray = [];
    packable.pack(instance, packedArray);
    const result = packable.unpack(packedArray);
    expect(instance).toEqual(result);
  });

  it(`${namePrefix} can unpack`, function () {
    const result = packable.unpack(packedInstance);
    expect(result).toEqual(instance);
  });

  it(`${namePrefix} can pack with startingIndex`, function () {
    const packedArray = [0];
    const expected = packedArray.concat(packedInstance);
    packable.pack(instance, packedArray, 1);
    expect(packedArray).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it(`${namePrefix} can unpack with startingIndex`, function () {
    const packedArray = [0].concat(packedInstance);
    const result = packable.unpack(packedArray, 1);
    expect(instance).toEqual(result);
  });

  it(`${namePrefix} pack throws with undefined value`, function () {
    const array = [];
    expect(function () {
      packable.pack(undefined, array);
    }).toThrowDeveloperError();
  });

  it(`${namePrefix} pack throws with undefined array`, function () {
    expect(function () {
      packable.pack(instance, undefined);
    }).toThrowDeveloperError();
  });

  it(`${namePrefix} unpack throws with undefined array`, function () {
    expect(function () {
      packable.unpack(undefined);
    }).toThrowDeveloperError();
  });

  if (typeof packable.convertPackedArrayForInterpolation === "function") {
    it(`${namePrefix} packs and unpacks for interpolation.`, function () {
      const packedForInterpolation = [];
      packable.convertPackedArrayForInterpolation(
        packedInstance,
        0,
        0,
        packedForInterpolation
      );
      const value = packable.unpackInterpolationResult(
        packedForInterpolation,
        packedInstance,
        0,
        0
      );
      const result = packable.unpack(packedInstance);
      expect(value).toEqual(result);
    });

    it(`${namePrefix} convertPackedArrayForInterpolation throws without array.`, function () {
      expect(function () {
        packable.convertPackedArrayForInterpolation(undefined);
      }).toThrowDeveloperError();
    });

    it(`${namePrefix} unpackInterpolationResult throws without packed array.`, function () {
      expect(function () {
        packable.unpackInterpolationResult(undefined, []);
      }).toThrowDeveloperError();
    });

    it(`${namePrefix} unpackInterpolationResult throws without source array.`, function () {
      expect(function () {
        packable.unpackInterpolationResult([], undefined);
      }).toThrowDeveloperError();
    });
  }
}
export default createPackableSpecs;
