import { IndexDatatype } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/IndexDatatype", function () {
  it("IndexDatatype.validate validates input", function () {
    expect(IndexDatatype.validate(IndexDatatype.UNSIGNED_SHORT)).toEqual(true);
    expect(IndexDatatype.validate("invalid")).toEqual(false);
    expect(IndexDatatype.validate(undefined)).toEqual(false);
  });

  it("IndexDatatype.createTypedArray creates array", function () {
    expect(IndexDatatype.createTypedArray(3, 3).BYTES_PER_ELEMENT).toEqual(
      Uint16Array.BYTES_PER_ELEMENT
    );
    expect(
      IndexDatatype.createTypedArray(CesiumMath.SIXTY_FOUR_KILOBYTES + 1, 3)
        .BYTES_PER_ELEMENT
    ).toEqual(Uint32Array.BYTES_PER_ELEMENT);
  });

  it("IndexDatatype.createTypedArray throws without numberOfVertices", function () {
    expect(function () {
      IndexDatatype.createTypedArray(undefined);
    }).toThrowDeveloperError();
  });

  it("IndexDatatype.createTypedArrayFromArrayBuffer creates Uint16Array", function () {
    var sourceArray = new Uint16Array(10);
    sourceArray.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    var indexBuffer = IndexDatatype.createTypedArrayFromArrayBuffer(
      3,
      sourceArray.buffer,
      0,
      5
    );
    expect(indexBuffer.BYTES_PER_ELEMENT).toEqual(
      Uint16Array.BYTES_PER_ELEMENT
    );
    expect(indexBuffer.length).toEqual(5);
    expect(indexBuffer[0]).toEqual(0);
  });

  it("IndexDatatype.createTypedArrayFromArrayBuffer creates Uint16Array with offset", function () {
    var sourceArray = new Uint16Array(10);
    sourceArray.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    var indexBuffer = IndexDatatype.createTypedArrayFromArrayBuffer(
      3,
      sourceArray.buffer,
      Uint16Array.BYTES_PER_ELEMENT * 5,
      5
    );
    expect(indexBuffer.BYTES_PER_ELEMENT).toEqual(
      Uint16Array.BYTES_PER_ELEMENT
    );
    expect(indexBuffer.length).toEqual(5);
    expect(indexBuffer[0]).toEqual(5);
  });

  it("IndexDatatype.createTypedArrayFromArrayBuffer creates Uint32Array", function () {
    var sourceArray = new Uint32Array(10);
    sourceArray.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    var indexBuffer = IndexDatatype.createTypedArrayFromArrayBuffer(
      CesiumMath.SIXTY_FOUR_KILOBYTES + 1,
      sourceArray.buffer,
      0,
      5
    );
    expect(indexBuffer.BYTES_PER_ELEMENT).toEqual(
      Uint32Array.BYTES_PER_ELEMENT
    );
    expect(indexBuffer.length).toEqual(5);
    expect(indexBuffer[0]).toEqual(0);
  });

  it("IndexDatatype.createTypedArrayFromArrayBuffer creates Uint32Array with offset", function () {
    var sourceArray = new Uint32Array(10);
    sourceArray.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    var indexBuffer = IndexDatatype.createTypedArrayFromArrayBuffer(
      CesiumMath.SIXTY_FOUR_KILOBYTES + 1,
      sourceArray.buffer,
      Uint32Array.BYTES_PER_ELEMENT * 5,
      5
    );
    expect(indexBuffer.BYTES_PER_ELEMENT).toEqual(
      Uint32Array.BYTES_PER_ELEMENT
    );
    expect(indexBuffer.length).toEqual(5);
    expect(indexBuffer[0]).toEqual(5);
  });

  it("IndexDatatype.createTypedArrayFromArrayBuffer throws without numberOfVertices", function () {
    expect(function () {
      IndexDatatype.createTypedArrayFromArrayBuffer(undefined);
    }).toThrowDeveloperError();
  });

  it("IndexDatatype.createTypedArrayFromArrayBuffer throws without sourceArray", function () {
    expect(function () {
      IndexDatatype.createTypedArrayFromArrayBuffer(3, undefined);
    }).toThrowDeveloperError();
  });

  it("IndexDatatype.createTypedArrayFromArrayBuffer throws without byteOffset", function () {
    var sourceArray = new Uint16Array(5);
    expect(function () {
      IndexDatatype.createTypedArrayFromArrayBuffer(
        3,
        sourceArray.buffer,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("IndexDatatype.getSizeInBytes returns size", function () {
    expect(IndexDatatype.getSizeInBytes(IndexDatatype.UNSIGNED_BYTE)).toEqual(
      Uint8Array.BYTES_PER_ELEMENT
    );
    expect(IndexDatatype.getSizeInBytes(IndexDatatype.UNSIGNED_SHORT)).toEqual(
      Uint16Array.BYTES_PER_ELEMENT
    );
    expect(IndexDatatype.getSizeInBytes(IndexDatatype.UNSIGNED_INT)).toEqual(
      Uint32Array.BYTES_PER_ELEMENT
    );
  });

  it("IndexDatatype.getSizeInBytes throws without indexDatatype", function () {
    expect(function () {
      IndexDatatype.getSizeInBytes(undefined);
    }).toThrowDeveloperError();
  });
});
