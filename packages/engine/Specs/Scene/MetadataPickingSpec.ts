import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Matrix2,
  Matrix3,
  Matrix4,
  MetadataComponentType,
  MetadataPicking,
  MetadataType,
} from "../../index.js";

// The precision for Jasmine `toBeCloseTo` calls. Note that this
// is not an "epsilon", but described as "The number of decimal
// points to check" ...
const precision = 3;

describe("Scene/MetadataPicking", function () {
  describe("decodeRawMetadataValue", function () {
    it("throws for invalid component type", function () {
      expect(function () {
        const componentType = "NOT_A_COMPONENT_TYPE";
        const array = new Uint8Array([12, 23]);
        const dataView = new DataView(
          array.buffer,
          array.byteOffset,
          array.byteLength,
        );
        const index = 0;
        MetadataPicking.decodeRawMetadataValue(componentType, dataView, index);
      }).toThrowError();
    });

    it("throws for invalid index", function () {
      expect(function () {
        const componentType = MetadataComponentType.INT8;
        const array = new Uint8Array([12, 23]);
        const dataView = new DataView(
          array.buffer,
          array.byteOffset,
          array.byteLength,
        );
        const index = 1234;
        MetadataPicking.decodeRawMetadataValue(componentType, dataView, index);
      }).toThrowError();
    });

    it("decodes raw value with component type INT8", function () {
      const array = new Int8Array([12, 23]);
      const componentType = MetadataComponentType.INT8;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 1;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(23);
    });

    it("decodes raw value with component type UINT8", function () {
      const array = new Uint8Array([12, 23]);
      const componentType = MetadataComponentType.UINT8;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 1;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(23);
    });

    it("decodes raw value with component type INT16", function () {
      const array = new Int16Array([1234, 2345]);
      const componentType = MetadataComponentType.INT16;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 2;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(2345);
    });

    it("decodes raw value with component type UINT16", function () {
      const array = new Uint16Array([1234, 2345]);
      const componentType = MetadataComponentType.UINT16;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 2;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(2345);
    });

    it("decodes raw value with component type INT32", function () {
      const array = new Int32Array([123456, 234567]);
      const componentType = MetadataComponentType.INT32;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 4;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(234567);
    });

    it("decodes raw value with component type UINT32", function () {
      const array = new Uint32Array([123456, 234567]);
      const componentType = MetadataComponentType.UINT32;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 4;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(234567);
    });

    it("decodes raw value with component type INT64", function () {
      const array = new BigInt64Array([12345678900n, 23456789000n]);
      const componentType = MetadataComponentType.INT64;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 8;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(23456789000n);
    });

    it("decodes raw value with component type UINT64", function () {
      const array = new BigUint64Array([12345678900n, 23456789000n]);
      const componentType = MetadataComponentType.UINT64;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 8;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBe(23456789000n);
    });

    it("decodes raw value with component type FLOAT32", function () {
      const array = new Float32Array([1.23, 2.34]);
      const componentType = MetadataComponentType.FLOAT32;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 4;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBeCloseTo(2.34, precision);
    });

    it("decodes raw value with component type FLOAT64", function () {
      const array = new Float64Array([1.23, 2.34]);
      const componentType = MetadataComponentType.FLOAT64;
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const index = 8;
      const value = MetadataPicking.decodeRawMetadataValue(
        componentType,
        dataView,
        index,
      );
      expect(value).toBeCloseTo(2.34, precision);
    });
  });

  describe("decodeRawMetadataValueComponent", function () {
    it("throws for invalid component type", function () {
      expect(function () {
        const classProperty = {
          componentType: "NOT_A_COMPONENT_TYPE",
          normalized: false,
        };
        const array = new Uint8Array([12, 23]);
        const dataView = new DataView(
          array.buffer,
          array.byteOffset,
          array.byteLength,
        );
        const dataViewOffset = 0;
        MetadataPicking.decodeRawMetadataValueComponent(
          classProperty,
          dataView,
          dataViewOffset,
        );
      }).toThrowError();
    });

    it("throws for invalid offset", function () {
      expect(function () {
        const classProperty = {
          componentType: MetadataComponentType.INT8,
          normalized: false,
        };
        const array = new Uint8Array([12, 23]);
        const dataView = new DataView(
          array.buffer,
          array.byteOffset,
          array.byteLength,
        );
        const dataViewOffset = 1234;
        MetadataPicking.decodeRawMetadataValueComponent(
          classProperty,
          dataView,
          dataViewOffset,
        );
      }).toThrowError();
    });

    it("decodes component with componentType INT8", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Uint8Array([12, 23]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 1;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(23);
    });

    it("decodes component with componentType normalized INT8", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT8,
        normalized: true,
      };
      const array = new Uint8Array([12, 23]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 1;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(23 / 127.0, precision);
    });

    it("decodes component with componentType UINT8", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT8,
        normalized: false,
      };
      const array = new Uint8Array([12, 23]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 1;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(23);
    });

    it("decodes component with componentType normalized UINT8", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT8,
        normalized: true,
      };
      const array = new Uint8Array([12, 23]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 1;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(23 / 255.0, precision);
    });

    it("decodes component with componentType INT16", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT16,
        normalized: false,
      };
      const array = new Int16Array([1234, 2345]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 2;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(2345);
    });

    it("decodes component with componentType normalized INT16", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT16,
        normalized: true,
      };
      const array = new Int16Array([1234, 2345]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 2;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(2345 / 32767.0, precision);
    });

    it("decodes component with componentType UINT16", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT16,
        normalized: false,
      };
      const array = new Uint16Array([1234, 2345]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 2;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(2345);
    });

    it("decodes component with componentType normalized UINT16", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT16,
        normalized: true,
      };
      const array = new Uint16Array([1234, 2345]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 2;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(2345 / 65535.0, precision);
    });

    it("decodes component with componentType INT32", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT32,
        normalized: false,
      };
      const array = new Int32Array([123456, 234567]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 4;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(234567);
    });

    it("decodes component with componentType normalized INT32", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT32,
        normalized: true,
      };
      const array = new Int32Array([123456, 234567]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 4;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(234567 / 2147483647.0, precision);
    });

    it("decodes component with componentType UINT32", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT32,
        normalized: false,
      };
      const array = new Uint32Array([123456, 234567]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 4;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(234567);
    });

    it("decodes component with componentType normalized UINT32", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT32,
        normalized: true,
      };
      const array = new Uint32Array([123456, 234567]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 4;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(234567 / 4294967295.0, precision);
    });

    it("decodes component with componentType INT64", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT64,
        normalized: false,
      };
      const array = new BigInt64Array([12345678900n, 23456789000n]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 8;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(23456789000n);
    });

    it("decodes component with componentType normalized INT64", function () {
      const classProperty = {
        componentType: MetadataComponentType.INT64,
        normalized: true,
      };
      const array = new BigInt64Array([12345678900n, 23456789000n]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 8;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(Number(value)).toBeCloseTo(
        Number(23456789000n / 9223372036854775807n),
        precision,
      );
    });

    it("decodes component with componentType UINT64", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT64,
        normalized: false,
      };
      const array = new BigUint64Array([12345678900n, 23456789000n]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 8;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBe(23456789000n);
    });

    it("decodes component with componentType normalized UINT64", function () {
      const classProperty = {
        componentType: MetadataComponentType.UINT64,
        normalized: true,
      };
      const array = new BigUint64Array([12345678900n, 23456789000n]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 8;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(Number(value)).toBeCloseTo(
        Number(23456789000n / 18446744073709551615n),
        precision,
      );
    });

    it("decodes component with componentType FLOAT32", function () {
      const classProperty = {
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([1.23, 2.34]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 4;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(2.34, precision);
    });

    it("decodes component with componentType FLOAT64", function () {
      const classProperty = {
        componentType: MetadataComponentType.FLOAT64,
        normalized: false,
      };
      const array = new Float64Array([1.23, 2.34]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const dataViewOffset = 8;
      const value = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        dataViewOffset,
      );
      expect(value).toBeCloseTo(2.34, precision);
    });
  });

  describe("decodeRawMetadataValueElement", function () {
    it("throws for invalid component type", function () {
      expect(function () {
        const classProperty = {
          type: "SCALAR",
          componentType: "NOT_A_COMPONENT_TYPE",
          normalized: false,
        };
        const array = new Int8Array([12, 23]);
        const dataView = new DataView(
          array.buffer,
          array.byteOffset,
          array.byteLength,
        );
        const elementIndex = 0;
        MetadataPicking.decodeRawMetadataValueElement(
          classProperty,
          dataView,
          elementIndex,
        );
      }).toThrowError();
    });

    it("throws for invalid element index", function () {
      expect(function () {
        const classProperty = {
          type: "SCALAR",
          componentType: MetadataComponentType.INT8,
          normalized: false,
        };
        const array = new Int8Array([12, 23]);
        const dataView = new DataView(
          array.buffer,
          array.byteOffset,
          array.byteLength,
        );
        const elementIndex = 1234;
        MetadataPicking.decodeRawMetadataValueElement(
          classProperty,
          dataView,
          elementIndex,
        );
      }).toThrowError();
    });

    it("decodes element with type SCALAR and component type INT8", function () {
      const classProperty = {
        type: MetadataType.SCALAR,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Int8Array([0, 1]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toBe(1);
    });

    it("decodes element with type VEC2 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC2,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Int8Array([0, 1, 2, 3]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([2, 3]);
    });

    it("decodes element with type VEC3 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC3,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Int8Array([0, 1, 2, 3, 4, 5]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([3, 4, 5]);
    });

    it("decodes element with type VEC4 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC4,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Int8Array([0, 1, 2, 3, 4, 5, 6, 7]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([4, 5, 6, 7]);
    });

    it("decodes element with type MAT2 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.MAT2,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Int8Array([0, 1, 2, 3, 4, 5, 6, 7]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([4, 5, 6, 7]);
    });

    it("decodes element with type MAT3 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.MAT3,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Int8Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
      ]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    });

    it("decodes element with type MAT4 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.MAT4,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const array = new Int8Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([
        16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ]);
    });

    it("decodes element with type SCALAR and component type FLOAT32", function () {
      const classProperty = {
        type: MetadataType.SCALAR,
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([0, 1]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toBe(1);
    });

    it("decodes element with type VEC2 and component type FLOAT32", function () {
      const classProperty = {
        type: MetadataType.VEC2,
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([0, 1, 2, 3]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([2, 3]);
    });

    it("decodes element with type VEC3 and component type FLOAT32", function () {
      const classProperty = {
        type: MetadataType.VEC3,
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([0, 1, 2, 3, 4, 5]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([3, 4, 5]);
    });

    it("decodes element with type VEC4 and component type FLOAT32", function () {
      const classProperty = {
        type: MetadataType.VEC4,
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([4, 5, 6, 7]);
    });

    it("decodes element with type MAT2 and component type FLOAT32", function () {
      const classProperty = {
        type: MetadataType.MAT2,
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([4, 5, 6, 7]);
    });

    it("decodes element with type MAT3 and component type FLOAT32", function () {
      const classProperty = {
        type: MetadataType.MAT3,
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
      ]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    });

    it("decodes element with type MAT4 and component type FLOAT32", function () {
      const classProperty = {
        type: MetadataType.MAT4,
        componentType: MetadataComponentType.FLOAT32,
        normalized: false,
      };
      const array = new Float32Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ]);
      const dataView = new DataView(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      const elementIndex = 1;
      const value = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        elementIndex,
      );
      expect(value).toEqual([
        16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ]);
    });
  });

  describe("decodeRawMetadataValues", function () {
    it("throws for invalid component type", function () {
      expect(function () {
        const classProperty = {
          type: "SCALAR",
          componentType: "NOT_A_COMPONENT_TYPE",
          normalized: false,
        };
        const rawPixelValues = new Uint8Array([0, 1, 2, 3]);
        MetadataPicking.decodeRawMetadataValues(classProperty, rawPixelValues);
      }).toThrowError();
    });

    it("throws for invalid input length", function () {
      expect(function () {
        const classProperty = {
          type: MetadataType.VEC2,
          componentType: MetadataComponentType.UINT8,
          normalized: false,
        };
        const rawPixelValues = new Uint8Array([0]);
        MetadataPicking.decodeRawMetadataValues(classProperty, rawPixelValues);
      }).toThrowError();
    });

    it("decodes raw values with type SCALAR and component type INT8", function () {
      const classProperty = {
        type: MetadataType.SCALAR,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeRawMetadataValues(
        classProperty,
        rawPixelValues,
      );
      expect(value).toEqual(12);
    });

    it("decodes raw values with type VEC2 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC2,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const rawPixelValues = new Uint8Array([0, 1, 2, 3]);
      const value = MetadataPicking.decodeRawMetadataValues(
        classProperty,
        rawPixelValues,
      );
      expect(value).toEqual([0, 1]);
    });

    it("decodes raw values with type VEC3 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC3,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const rawPixelValues = new Uint8Array([0, 1, 2, 3]);
      const value = MetadataPicking.decodeRawMetadataValues(
        classProperty,
        rawPixelValues,
      );
      expect(value).toEqual([0, 1, 2]);
    });

    it("decodes raw values with type VEC4 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC4,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const rawPixelValues = new Uint8Array([0, 1, 2, 3]);
      const value = MetadataPicking.decodeRawMetadataValues(
        classProperty,
        rawPixelValues,
      );
      expect(value).toEqual([0, 1, 2, 3]);
    });
  });

  describe("convertToObjectType", function () {
    it("throws for invalid type", function () {
      expect(function () {
        const type = "NOT_A_TYPE";
        const value = 0;
        MetadataPicking.convertToObjectType(type, value);
      }).toThrowError();
    });

    it("returns SCALAR, STRING, BOOLEAN, and ENUM types (and arrays thereof) unmodified", function () {
      const value0 = MetadataPicking.convertToObjectType(
        MetadataType.SCALAR,
        123,
      );
      const value1 = MetadataPicking.convertToObjectType(
        MetadataType.STRING,
        "Value",
      );
      const value2 = MetadataPicking.convertToObjectType(
        MetadataType.SCALAR,
        true,
      );
      const value3 = MetadataPicking.convertToObjectType(
        MetadataType.ENUM,
        "VALUE",
      );

      expect(value0).toEqual(123);
      expect(value1).toEqual("Value");
      expect(value2).toEqual(true);
      expect(value3).toEqual("VALUE");

      const value0a = MetadataPicking.convertToObjectType(
        MetadataType.SCALAR,
        [123, 234],
      );
      const value1a = MetadataPicking.convertToObjectType(MetadataType.STRING, [
        "Value0",
        "Value1",
      ]);
      const value2a = MetadataPicking.convertToObjectType(MetadataType.SCALAR, [
        true,
        false,
      ]);
      const value3a = MetadataPicking.convertToObjectType(MetadataType.ENUM, [
        "VALUE_A",
        "VALUE_B",
      ]);

      expect(value0a).toEqual([123, 234]);
      expect(value1a).toEqual(["Value0", "Value1"]);
      expect(value2a).toEqual([true, false]);
      expect(value3a).toEqual(["VALUE_A", "VALUE_B"]);
    });

    it("converts array-based VEC2 input into a Cartesian2", function () {
      const array = [0, 1];
      const expected = Cartesian2.unpack(array, 0, new Cartesian2());
      const actual = MetadataPicking.convertToObjectType(
        MetadataType.VEC2,
        array,
      );
      expect(actual).toEqual(expected);
    });

    it("converts array-based VEC3 input into a Cartesian3", function () {
      const array = [0, 1, 2];
      const expected = Cartesian3.unpack(array, 0, new Cartesian3());
      const actual = MetadataPicking.convertToObjectType(
        MetadataType.VEC3,
        array,
      );
      expect(actual).toEqual(expected);
    });

    it("converts array-based VEC4 input into a Cartesian4", function () {
      const array = [0, 1, 2, 3];
      const expected = Cartesian4.unpack(array, 0, new Cartesian4());
      const actual = MetadataPicking.convertToObjectType(
        MetadataType.VEC4,
        array,
      );
      expect(actual).toEqual(expected);
    });

    it("converts array-based MAT2 input into a Matrix2", function () {
      const array = [0, 1, 2, 3];
      const expected = Matrix2.unpack(array, 0, new Matrix2());
      const actual = MetadataPicking.convertToObjectType(
        MetadataType.MAT2,
        array,
      );
      expect(actual).toEqual(expected);
    });

    it("converts array-based MAT3 input into a Matrix3", function () {
      const array = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const expected = Matrix3.unpack(array, 0, new Matrix3());
      const actual = MetadataPicking.convertToObjectType(
        MetadataType.MAT3,
        array,
      );
      expect(actual).toEqual(expected);
    });

    it("converts array-based MAT4 input into a Matrix4", function () {
      const array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const expected = Matrix4.unpack(array, 0, new Matrix4());
      const actual = MetadataPicking.convertToObjectType(
        MetadataType.MAT4,
        array,
      );
      expect(actual).toEqual(expected);
    });
  });

  describe("convertFromObjectType", function () {
    it("throws for invalid type", function () {
      expect(function () {
        const type = "NOT_A_TYPE";
        const value = new Cartesian2();
        MetadataPicking.convertFromObjectType(type, value);
      }).toThrowError();
    });

    it("returns SCALAR, STRING, BOOLEAN, and ENUM types (and arrays thereof) unmodified", function () {
      const value0 = MetadataPicking.convertFromObjectType(
        MetadataType.SCALAR,
        123,
      );
      const value1 = MetadataPicking.convertFromObjectType(
        MetadataType.STRING,
        "Value",
      );
      const value2 = MetadataPicking.convertFromObjectType(
        MetadataType.SCALAR,
        true,
      );
      const value3 = MetadataPicking.convertFromObjectType(
        MetadataType.ENUM,
        "VALUE",
      );

      expect(value0).toEqual(123);
      expect(value1).toEqual("Value");
      expect(value2).toEqual(true);
      expect(value3).toEqual("VALUE");

      const value0a = MetadataPicking.convertFromObjectType(
        MetadataType.SCALAR,
        [123, 234],
      );
      const value1a = MetadataPicking.convertFromObjectType(
        MetadataType.STRING,
        ["Value0", "Value1"],
      );
      const value2a = MetadataPicking.convertFromObjectType(
        MetadataType.SCALAR,
        [true, false],
      );
      const value3a = MetadataPicking.convertFromObjectType(MetadataType.ENUM, [
        "VALUE_A",
        "VALUE_B",
      ]);

      expect(value0a).toEqual([123, 234]);
      expect(value1a).toEqual(["Value0", "Value1"]);
      expect(value2a).toEqual([true, false]);
      expect(value3a).toEqual(["VALUE_A", "VALUE_B"]);
    });

    it("converts Cartesian2 into array-based VEC2", function () {
      const expected = [0, 1];
      const value = Cartesian2.unpack(expected, 0, new Cartesian2());
      const actual = MetadataPicking.convertFromObjectType(
        MetadataType.VEC2,
        value,
      );
      expect(actual).toEqual(expected);
    });

    it("converts Cartesian3 into array-based VEC3", function () {
      const expected = [0, 1, 2];
      const value = Cartesian3.unpack(expected, 0, new Cartesian3());
      const actual = MetadataPicking.convertFromObjectType(
        MetadataType.VEC3,
        value,
      );
      expect(actual).toEqual(expected);
    });

    it("converts Cartesian4 into array-based VEC4", function () {
      const expected = [0, 1, 2, 3];
      const value = Cartesian4.unpack(expected, 0, new Cartesian4());
      const actual = MetadataPicking.convertFromObjectType(
        MetadataType.VEC4,
        value,
      );
      expect(actual).toEqual(expected);
    });

    it("converts Matrix2 into array-based MAT2", function () {
      const expected = [0, 1, 2, 3];
      const value = Matrix2.unpack(expected, 0, new Matrix2());
      const actual = MetadataPicking.convertFromObjectType(
        MetadataType.MAT2,
        value,
      );
      expect(actual).toEqual(expected);
    });

    it("converts Matrix3 into array-based MAT3", function () {
      const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const value = Matrix3.unpack(expected, 0, new Matrix3());
      const actual = MetadataPicking.convertFromObjectType(
        MetadataType.MAT3,
        value,
      );
      expect(actual).toEqual(expected);
    });

    it("converts Matrix4 into array-based MAT4", function () {
      const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const value = Matrix4.unpack(expected, 0, new Matrix4());
      const actual = MetadataPicking.convertFromObjectType(
        MetadataType.MAT4,
        value,
      );
      expect(actual).toEqual(expected);
    });
  });

  describe("decodeMetadataValues", function () {
    it("throws for invalid type", function () {
      expect(function () {
        const classProperty = {
          type: "NOT_A_TYPE",
          componentType: MetadataComponentType.UINT8,
          normalized: false,
        };
        const metadataProperty = {
          hasValueTransform: false,
        };
        const rawPixelValues = new Uint8Array([0, 1, 2, 3]);
        MetadataPicking.decodeMetadataValues(
          classProperty,
          metadataProperty,
          rawPixelValues,
        );
      }).toThrowError();
    });

    it("decodes values with type SCALAR and component type INT8", function () {
      const classProperty = {
        type: MetadataType.SCALAR,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const metadataProperty = {
        hasValueTransform: false,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      expect(value).toEqual(12);
    });

    it("decodes values with type VEC2 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC2,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const metadataProperty = {
        hasValueTransform: false,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      expect(value).toEqual(new Cartesian2(12, 23));
    });

    it("decodes values with type VEC3 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC3,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const metadataProperty = {
        hasValueTransform: false,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      expect(value).toEqual(new Cartesian3(12, 23, 34));
    });

    it("decodes values with type VEC4 and component type INT8", function () {
      const classProperty = {
        type: MetadataType.VEC4,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const metadataProperty = {
        hasValueTransform: false,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      expect(value).toEqual(new Cartesian4(12, 23, 34, 45));
    });

    it("decodes values with type SCALAR and component type INT8 and offset and scale", function () {
      const classProperty = {
        type: MetadataType.SCALAR,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const offset = 100;
      const scale = 2;
      const metadataProperty = {
        hasValueTransform: true,
        offset: offset,
        scale: scale,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      expect(value).toEqual(offset + 12 * scale);
    });

    it("decodes values with type VEC2 and component type INT8 and offset and scale", function () {
      const classProperty = {
        type: MetadataType.VEC2,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const offset = new Cartesian2(100, 200);
      const scale = new Cartesian2(2, 3);
      const metadataProperty = {
        hasValueTransform: true,
        offset: offset,
        scale: scale,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      const expected = new Cartesian2(
        offset.x + 12 * scale.x,
        offset.y + 23 * scale.y,
      );
      expect(value).toEqual(expected);
    });

    it("decodes values with type VEC3 and component type INT8 and offset and scale", function () {
      const classProperty = {
        type: MetadataType.VEC3,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const offset = new Cartesian3(100, 200, 300);
      const scale = new Cartesian3(2, 3, 4);
      const metadataProperty = {
        hasValueTransform: true,
        offset: offset,
        scale: scale,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      const expected = new Cartesian3(
        offset.x + 12 * scale.x,
        offset.y + 23 * scale.y,
        offset.z + 34 * scale.z,
      );
      expect(value).toEqual(expected);
    });

    it("decodes values with type VEC4 and component type INT8 and offset and scale", function () {
      const classProperty = {
        type: MetadataType.VEC4,
        componentType: MetadataComponentType.INT8,
        normalized: false,
      };
      const offset = new Cartesian4(100, 200, 300, 400);
      const scale = new Cartesian4(2, 3, 4, 5);
      const metadataProperty = {
        hasValueTransform: true,
        offset: offset,
        scale: scale,
      };
      const rawPixelValues = new Uint8Array([12, 23, 34, 45]);
      const value = MetadataPicking.decodeMetadataValues(
        classProperty,
        metadataProperty,
        rawPixelValues,
      );
      const expected = new Cartesian4(
        offset.x + 12 * scale.x,
        offset.y + 23 * scale.y,
        offset.z + 34 * scale.z,
        offset.w + 45 * scale.w,
      );
      expect(value).toEqual(expected);
    });
  });
});
