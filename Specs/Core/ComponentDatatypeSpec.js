import { ComponentDatatype } from "../../Source/Cesium.js";

describe("Core/ComponentDatatype", function () {
  it("fromTypedArray works", function () {
    expect(ComponentDatatype.fromTypedArray(new Int8Array())).toBe(
      ComponentDatatype.BYTE
    );
    expect(ComponentDatatype.fromTypedArray(new Uint8Array())).toBe(
      ComponentDatatype.UNSIGNED_BYTE
    );
    expect(ComponentDatatype.fromTypedArray(new Int16Array())).toBe(
      ComponentDatatype.SHORT
    );
    expect(ComponentDatatype.fromTypedArray(new Uint16Array())).toBe(
      ComponentDatatype.UNSIGNED_SHORT
    );
    expect(ComponentDatatype.fromTypedArray(new Int32Array())).toBe(
      ComponentDatatype.INT
    );
    expect(ComponentDatatype.fromTypedArray(new Uint32Array())).toBe(
      ComponentDatatype.UNSIGNED_INT
    );
    expect(ComponentDatatype.fromTypedArray(new Float32Array())).toBe(
      ComponentDatatype.FLOAT
    );
    expect(ComponentDatatype.fromTypedArray(new Float64Array())).toBe(
      ComponentDatatype.DOUBLE
    );
  });

  it("validate works", function () {
    expect(ComponentDatatype.validate(ComponentDatatype.BYTE)).toBe(true);
    expect(ComponentDatatype.validate(ComponentDatatype.UNSIGNED_BYTE)).toBe(
      true
    );
    expect(ComponentDatatype.validate(ComponentDatatype.SHORT)).toBe(true);
    expect(ComponentDatatype.validate(ComponentDatatype.UNSIGNED_SHORT)).toBe(
      true
    );
    expect(ComponentDatatype.validate(ComponentDatatype.INT)).toBe(true);
    expect(ComponentDatatype.validate(ComponentDatatype.UNSIGNED_INT)).toBe(
      true
    );
    expect(ComponentDatatype.validate(ComponentDatatype.FLOAT)).toBe(true);
    expect(ComponentDatatype.validate(ComponentDatatype.DOUBLE)).toBe(true);
    expect(ComponentDatatype.validate(undefined)).toBe(false);
    expect(ComponentDatatype.validate({})).toBe(false);
  });

  it("createTypedArray works with size", function () {
    let typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.BYTE,
      0
    );
    expect(typedArray).toBeInstanceOf(Int8Array);
    expect(typedArray.length).toBe(0);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.UNSIGNED_BYTE,
      1
    );
    expect(typedArray).toBeInstanceOf(Uint8Array);
    expect(typedArray.length).toBe(1);

    typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.SHORT, 2);
    expect(typedArray).toBeInstanceOf(Int16Array);
    expect(typedArray.length).toBe(2);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.UNSIGNED_SHORT,
      3
    );
    expect(typedArray).toBeInstanceOf(Uint16Array);
    expect(typedArray.length).toBe(3);

    typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.INT, 4);
    expect(typedArray).toBeInstanceOf(Int32Array);
    expect(typedArray.length).toBe(4);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.UNSIGNED_INT,
      5
    );
    expect(typedArray).toBeInstanceOf(Uint32Array);
    expect(typedArray.length).toBe(5);

    typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, 6);
    expect(typedArray).toBeInstanceOf(Float32Array);
    expect(typedArray.length).toBe(6);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.DOUBLE,
      7
    );
    expect(typedArray).toBeInstanceOf(Float64Array);
    expect(typedArray.length).toBe(7);
  });

  it("createTypedArray works with values", function () {
    const values = [34, 12, 4, 1];
    let typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.BYTE,
      values
    );
    expect(typedArray).toBeInstanceOf(Int8Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.UNSIGNED_BYTE,
      values
    );
    expect(typedArray).toBeInstanceOf(Uint8Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.SHORT,
      values
    );
    expect(typedArray).toBeInstanceOf(Int16Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.UNSIGNED_SHORT,
      values
    );
    expect(typedArray).toBeInstanceOf(Uint16Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.INT,
      values
    );
    expect(typedArray).toBeInstanceOf(Int32Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.UNSIGNED_INT,
      values
    );
    expect(typedArray).toBeInstanceOf(Uint32Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.FLOAT,
      values
    );
    expect(typedArray).toBeInstanceOf(Float32Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);

    typedArray = ComponentDatatype.createTypedArray(
      ComponentDatatype.DOUBLE,
      values
    );
    expect(typedArray).toBeInstanceOf(Float64Array);
    expect(typedArray).toEqual(values);
    expect(typedArray.length).toBe(values.length);
  });

  it("createArrayBufferView works", function () {
    const buffer = new ArrayBuffer(100);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.BYTE,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Int8Array);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.UNSIGNED_BYTE,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Uint8Array);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.SHORT,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Int16Array);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.UNSIGNED_SHORT,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Uint16Array);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.INT,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Int32Array);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.UNSIGNED_INT,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Uint32Array);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.FLOAT,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Float32Array);
    expect(
      ComponentDatatype.createArrayBufferView(
        ComponentDatatype.DOUBLE,
        buffer,
        0,
        1
      )
    ).toBeInstanceOf(Float64Array);
  });

  it("createTypedArray throws without type", function () {
    expect(function () {
      ComponentDatatype.createTypedArray(undefined, 1);
    }).toThrowDeveloperError();
  });

  it("createTypedArray throws without length or values", function () {
    expect(function () {
      ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, undefined);
    }).toThrowDeveloperError();
  });

  it("createArrayBufferView throws without type", function () {
    const buffer = new ArrayBuffer(100);
    expect(function () {
      ComponentDatatype.createTypedArray(undefined, buffer, 0, 1);
    }).toThrowDeveloperError();
  });

  it("createArrayBufferView throws with invalid type", function () {
    const buffer = new ArrayBuffer(100);
    expect(function () {
      ComponentDatatype.createTypedArray({}, buffer, 0, 1);
    }).toThrowDeveloperError();
  });

  it("createArrayBufferView throws without buffer", function () {
    expect(function () {
      ComponentDatatype.createTypedArray(
        ComponentDatatype.BYTE,
        undefined,
        0,
        1
      );
    }).toThrowDeveloperError();
  });

  it("fromName works", function () {
    expect(ComponentDatatype.fromName("BYTE")).toEqual(ComponentDatatype.BYTE);
    expect(ComponentDatatype.fromName("UNSIGNED_BYTE")).toEqual(
      ComponentDatatype.UNSIGNED_BYTE
    );
    expect(ComponentDatatype.fromName("SHORT")).toEqual(
      ComponentDatatype.SHORT
    );
    expect(ComponentDatatype.fromName("UNSIGNED_SHORT")).toEqual(
      ComponentDatatype.UNSIGNED_SHORT
    );
    expect(ComponentDatatype.fromName("INT")).toEqual(ComponentDatatype.INT);
    expect(ComponentDatatype.fromName("UNSIGNED_INT")).toEqual(
      ComponentDatatype.UNSIGNED_INT
    );
    expect(ComponentDatatype.fromName("FLOAT")).toEqual(
      ComponentDatatype.FLOAT
    );
    expect(ComponentDatatype.fromName("DOUBLE")).toEqual(
      ComponentDatatype.DOUBLE
    );
  });

  it("fromName throws without name", function () {
    expect(function () {
      ComponentDatatype.fromName();
    }).toThrowDeveloperError();
  });
});
