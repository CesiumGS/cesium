import { MetadataComponentType, MetadataPicking } from "../../index.js";

// The precision for Jasmine `toBeCloseTo` calls
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

    it("decodes component with type INT8", function () {
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

    it("decodes component with type normalized INT8", function () {
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

    it("decodes component with type UINT8", function () {
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

    it("decodes component with type normalized UINT8", function () {
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

    it("decodes component with type INT16", function () {
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

    it("decodes component with type normalized INT16", function () {
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

    it("decodes component with type UINT16", function () {
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

    it("decodes component with type normalized UINT16", function () {
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

    it("decodes component with type INT32", function () {
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

    it("decodes component with type normalized INT32", function () {
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

    it("decodes component with type UINT32", function () {
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

    it("decodes component with type normalized UINT32", function () {
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

    it("decodes component with type INT64", function () {
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

    it("decodes component with type normalized INT64", function () {
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

    it("decodes component with type UINT64", function () {
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

    it("decodes component with type normalized UINT64", function () {
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

    it("decodes component with type FLOAT32", function () {
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

    it("decodes component with type FLOAT64", function () {
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
});
