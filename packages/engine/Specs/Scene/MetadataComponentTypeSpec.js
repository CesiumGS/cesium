import {
  ComponentDatatype,
  FeatureDetection,
  MetadataComponentType,
} from "../../index.js";

describe("Scene/MetadataComponentType", function () {
  it("getMinimum", function () {
    expect(MetadataComponentType.getMinimum(MetadataComponentType.INT8)).toBe(
      -128
    );
    expect(MetadataComponentType.getMinimum(MetadataComponentType.UINT8)).toBe(
      0
    );
    expect(MetadataComponentType.getMinimum(MetadataComponentType.INT16)).toBe(
      -32768
    );
    expect(MetadataComponentType.getMinimum(MetadataComponentType.UINT16)).toBe(
      0
    );
    expect(MetadataComponentType.getMinimum(MetadataComponentType.INT32)).toBe(
      -2147483648
    );
    expect(MetadataComponentType.getMinimum(MetadataComponentType.UINT32)).toBe(
      0
    );
    expect(
      MetadataComponentType.getMinimum(MetadataComponentType.FLOAT32)
    ).toBe(-340282346638528859811704183484516925440.0);
    expect(
      MetadataComponentType.getMinimum(MetadataComponentType.FLOAT64)
    ).toBe(-Number.MAX_VALUE);

    if (FeatureDetection.supportsBigInt()) {
      expect(
        MetadataComponentType.getMinimum(MetadataComponentType.INT64)
      ).toBe(
        BigInt("-9223372036854775808") // eslint-disable-line
      );
      expect(
        MetadataComponentType.getMinimum(MetadataComponentType.UINT64)
      ).toBe(
        BigInt(0) // eslint-disable-line
      );
    }
  });

  it("getMinimum returns approximate number for INT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataComponentType.getMinimum(MetadataComponentType.INT64)).toBe(
      -Math.pow(2, 63)
    );
  });

  it("getMinimum returns number for UINT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataComponentType.getMinimum(MetadataComponentType.UINT64)).toBe(
      0
    );
  });

  it("getMinimum throws without type", function () {
    expect(function () {
      MetadataComponentType.getMinimum();
    }).toThrowDeveloperError();
  });

  it("getMinimum throws if type is not a numeric type", function () {
    expect(function () {
      MetadataComponentType.getMinimum(MetadataComponentType.STRING);
    }).toThrowDeveloperError();
  });

  it("getMaximum", function () {
    expect(MetadataComponentType.getMaximum(MetadataComponentType.INT8)).toBe(
      127
    );
    expect(MetadataComponentType.getMaximum(MetadataComponentType.UINT8)).toBe(
      255
    );
    expect(MetadataComponentType.getMaximum(MetadataComponentType.INT16)).toBe(
      32767
    );
    expect(MetadataComponentType.getMaximum(MetadataComponentType.UINT16)).toBe(
      65535
    );
    expect(MetadataComponentType.getMaximum(MetadataComponentType.INT32)).toBe(
      2147483647
    );
    expect(MetadataComponentType.getMaximum(MetadataComponentType.UINT32)).toBe(
      4294967295
    );
    expect(
      MetadataComponentType.getMaximum(MetadataComponentType.FLOAT32)
    ).toBe(340282346638528859811704183484516925440.0);
    expect(
      MetadataComponentType.getMaximum(MetadataComponentType.FLOAT64)
    ).toBe(Number.MAX_VALUE);

    if (FeatureDetection.supportsBigInt()) {
      expect(
        MetadataComponentType.getMaximum(MetadataComponentType.INT64)
      ).toBe(
        BigInt("9223372036854775807") // eslint-disable-line
      );
      expect(
        MetadataComponentType.getMaximum(MetadataComponentType.UINT64)
      ).toBe(
        BigInt("18446744073709551615") // eslint-disable-line
      );
    }
  });

  it("getMaximum returns approximate number for INT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataComponentType.getMaximum(MetadataComponentType.INT64)).toBe(
      Math.pow(2, 63) - 1
    );
  });

  it("getMaximum returns approximate number for UINT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataComponentType.getMaximum(MetadataComponentType.UINT64)).toBe(
      Math.pow(2, 64) - 1
    );
  });

  it("getMaximum throws without type", function () {
    expect(function () {
      MetadataComponentType.getMaximum();
    }).toThrowDeveloperError();
  });

  it("getMaximum throws if type is not a numeric type", function () {
    expect(function () {
      MetadataComponentType.getMaximum(MetadataComponentType.STRING);
    }).toThrowDeveloperError();
  });

  it("isIntegerType", function () {
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.INT8)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.UINT8)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.INT16)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.UINT16)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.INT32)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.UINT32)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.INT64)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.UINT64)
    ).toBe(true);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.FLOAT32)
    ).toBe(false);
    expect(
      MetadataComponentType.isIntegerType(MetadataComponentType.FLOAT64)
    ).toBe(false);
  });

  it("isIntegerType throws without type", function () {
    expect(function () {
      MetadataComponentType.isIntegerType();
    }).toThrowDeveloperError();
  });

  it("isUnsignedIntegerType", function () {
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.INT8)
    ).toBe(false);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.UINT8)
    ).toBe(true);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.INT16)
    ).toBe(false);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.UINT16)
    ).toBe(true);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.INT32)
    ).toBe(false);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.UINT32)
    ).toBe(true);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.INT64)
    ).toBe(false);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.UINT64)
    ).toBe(true);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.FLOAT32)
    ).toBe(false);
    expect(
      MetadataComponentType.isUnsignedIntegerType(MetadataComponentType.FLOAT64)
    ).toBe(false);
  });

  it("isUnsignedIntegerType throws without type", function () {
    expect(function () {
      MetadataComponentType.isUnsignedIntegerType();
    }).toThrowDeveloperError();
  });

  it("normalizes signed integers", function () {
    const signedTypes = ["INT8", "INT16", "INT32"];

    // Aside from -1.0, 0.0, and -1.0 there's no common normalized value that
    // can be checked for signed types. So hardcode some values.
    const middle = [0.5039370078740157, 0.500015259254738, 0.5000000002328306];

    for (let i = 0; i < signedTypes.length; ++i) {
      const type = signedTypes[i];
      const min = MetadataComponentType.getMinimum(MetadataComponentType[type]);
      const max = MetadataComponentType.getMaximum(MetadataComponentType[type]);
      const values = [min, min + 1, min / 2, 0, (max + 1) / 2, max];
      const expectedResults = [-1.0, -1.0, -middle[i], 0.0, middle[i], 1.0];
      for (let j = 0; j < values.length; ++j) {
        const result = MetadataComponentType.normalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("normalizes unsigned integers", function () {
    const unsignedTypes = ["UINT8", "UINT16", "UINT32"];
    for (let i = 0; i < unsignedTypes.length; ++i) {
      const type = unsignedTypes[i];
      const max = MetadataComponentType.getMaximum(MetadataComponentType[type]);
      const values = [0, max / 5, max];
      const expectedResults = [0.0, 0.2, 1.0];
      for (let j = 0; j < values.length; ++j) {
        const result = MetadataComponentType.normalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("normalizes INT64 integers", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const min = MetadataComponentType.getMinimum(MetadataComponentType.INT64);
    const max = MetadataComponentType.getMaximum(MetadataComponentType.INT64);
    const values = [
      min,
      // eslint-disable-next-line no-undef
      min + BigInt(1),
      // eslint-disable-next-line no-undef
      min / BigInt(2),
      0,
      // eslint-disable-next-line no-undef
      (max + BigInt(1)) / BigInt(2),
      max,
    ];
    const expectedResults = [-1.0, -1.0, -0.5, 0.0, 0.5, 1.0];
    for (let j = 0; j < values.length; ++j) {
      const result = MetadataComponentType.normalize(
        values[j],
        MetadataComponentType.INT64
      );
      expect(result).toBe(expectedResults[j]);
    }
  });

  it("normalizes UINT64 integers", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const max = MetadataComponentType.getMaximum(MetadataComponentType.UINT64);
    // eslint-disable-next-line no-undef
    const values = [BigInt(0), max / BigInt(5), max];
    const expectedResults = [0.0, 0.2, 1.0];
    for (let j = 0; j < values.length; ++j) {
      const result = MetadataComponentType.normalize(
        values[j],
        MetadataComponentType.UINT64
      );
      expect(result).toBe(expectedResults[j]);
    }
  });

  it("normalize throws without value", function () {
    expect(function () {
      MetadataComponentType.normalize();
    }).toThrowDeveloperError();
  });

  it("normalize throws without type", function () {
    expect(function () {
      MetadataComponentType.normalize(10.0);
    }).toThrowDeveloperError();
  });

  it("normalize throws if value is not a number or BigInt", function () {
    expect(function () {
      MetadataComponentType.normalize("10", MetadataComponentType.INT16);
    }).toThrowDeveloperError();
  });

  it("normalize throws if type is not an integer type", function () {
    expect(function () {
      MetadataComponentType.normalize(10.0, MetadataComponentType.STRING);
    }).toThrowDeveloperError();
  });

  it("unnormalizes signed numbers", function () {
    const signedTypes = ["INT8", "INT16", "INT32"];

    // Aside from -1.0, 0.0, and -1.0 there's no common normalized value that
    // can be checked for signed types. So hardcode some values.
    const middle = [0.5039370078740157, 0.500015259254738, 0.5000000002328306];

    for (let i = 0; i < signedTypes.length; ++i) {
      const type = signedTypes[i];
      const min = MetadataComponentType.getMinimum(MetadataComponentType[type]);
      const max = MetadataComponentType.getMaximum(MetadataComponentType[type]);
      const values = [-1.0, -middle[i], -0.5, 0.0, middle[i], 0.5, 1.0];
      const expectedResults = [
        min + 1,
        min / 2,
        min / 2,
        0,
        (max + 1) / 2,
        (max + 1) / 2,
        max,
      ];
      for (let j = 0; j < values.length; ++j) {
        const result = MetadataComponentType.unnormalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("unnormalizes unsigned numbers", function () {
    const unsignedTypes = ["UINT8", "UINT16", "UINT32"];
    for (let i = 0; i < unsignedTypes.length; ++i) {
      const type = unsignedTypes[i];
      const max = MetadataComponentType.getMaximum(MetadataComponentType[type]);
      const values = [0.0, 0.2, 0.5, 1.0];
      const expectedResults = [0, max / 5, (max + 1) / 2, max];
      for (let j = 0; j < values.length; ++j) {
        const result = MetadataComponentType.unnormalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("unnormalizes INT64", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const min = MetadataComponentType.getMinimum(MetadataComponentType.INT64);
    const max = MetadataComponentType.getMaximum(MetadataComponentType.INT64);
    const values = [-1.0, -0.5, 0.0, 0.5, 1.0];

    const expectedResults = [
      min + BigInt(1), // eslint-disable-line
      min / BigInt(2), // eslint-disable-line
      BigInt(0), // eslint-disable-line
      (max + BigInt(1)) / BigInt(2), // eslint-disable-line
      max,
    ];

    for (let i = 0; i < values.length; ++i) {
      const result = MetadataComponentType.unnormalize(
        values[i],
        MetadataComponentType.INT64
      );
      expect(result).toBe(expectedResults[i]);
    }
  });

  it("unnormalizes UINT64", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const max = MetadataComponentType.getMaximum(MetadataComponentType.UINT64);
    const values = [0.0, 0.2, 0.5, 1.0];

    // Second result is max / 5
    // Third result is (max + 1) / 2
    const expectedResults = [
      BigInt(0), // eslint-disable-line
      BigInt(3689348814741910323), // eslint-disable-line
      BigInt(9223372036854775808), // eslint-disable-line
      max,
    ];
    for (let i = 0; i < values.length; ++i) {
      const result = MetadataComponentType.unnormalize(
        values[i],
        MetadataComponentType.UINT64
      );
      expect(result).toBe(expectedResults[i]);
    }
  });

  it("unnormalize clamps values outside the range", function () {
    expect(
      MetadataComponentType.unnormalize(-1.1, MetadataComponentType.INT8)
    ).toBe(-127);
    expect(
      MetadataComponentType.unnormalize(-0.1, MetadataComponentType.UINT8)
    ).toBe(0);
    expect(
      MetadataComponentType.unnormalize(1.1, MetadataComponentType.INT8)
    ).toBe(127);
    expect(
      MetadataComponentType.unnormalize(1.1, MetadataComponentType.UINT8)
    ).toBe(255);
  });

  it("unnormalize throws without value", function () {
    expect(function () {
      MetadataComponentType.unnormalize();
    }).toThrowDeveloperError();
  });

  it("unnormalize throws without type", function () {
    expect(function () {
      MetadataComponentType.unnormalize(10.0);
    }).toThrowDeveloperError();
  });

  it("unnormalize throws if type is not an integer type", function () {
    expect(function () {
      MetadataComponentType.unnormalize(10.0, MetadataComponentType.FLOAT32);
    }).toThrowDeveloperError();
  });

  it("getSizeInBytes", function () {
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.INT8)
    ).toBe(1);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.UINT8)
    ).toBe(1);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.INT16)
    ).toBe(2);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.UINT16)
    ).toBe(2);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.INT32)
    ).toBe(4);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.UINT32)
    ).toBe(4);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.INT64)
    ).toBe(8);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.UINT64)
    ).toBe(8);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.FLOAT32)
    ).toBe(4);
    expect(
      MetadataComponentType.getSizeInBytes(MetadataComponentType.FLOAT64)
    ).toBe(8);
  });

  it("getSizeInBytes throws without type", function () {
    expect(function () {
      MetadataComponentType.getSizeInBytes();
    }).toThrowDeveloperError();
  });

  it("getSizeInBytes throws if type is not a numeric type", function () {
    expect(function () {
      MetadataComponentType.getSizeInBytes(MetadataComponentType.STRING);
    }).toThrowDeveloperError();
  });

  it("fromComponentDatatype", function () {
    expect(
      MetadataComponentType.fromComponentDatatype(ComponentDatatype.BYTE)
    ).toBe(MetadataComponentType.INT8);
    expect(
      MetadataComponentType.fromComponentDatatype(
        ComponentDatatype.UNSIGNED_BYTE
      )
    ).toBe(MetadataComponentType.UINT8);
    expect(
      MetadataComponentType.fromComponentDatatype(ComponentDatatype.SHORT)
    ).toBe(MetadataComponentType.INT16);
    expect(
      MetadataComponentType.fromComponentDatatype(
        ComponentDatatype.UNSIGNED_SHORT
      )
    ).toBe(MetadataComponentType.UINT16);
    expect(
      MetadataComponentType.fromComponentDatatype(ComponentDatatype.INT)
    ).toBe(MetadataComponentType.INT32);
    expect(
      MetadataComponentType.fromComponentDatatype(
        ComponentDatatype.UNSIGNED_INT
      )
    ).toBe(MetadataComponentType.UINT32);
    expect(
      MetadataComponentType.fromComponentDatatype(ComponentDatatype.FLOAT)
    ).toBe(MetadataComponentType.FLOAT32);
    expect(
      MetadataComponentType.fromComponentDatatype(ComponentDatatype.DOUBLE)
    ).toBe(MetadataComponentType.FLOAT64);
  });

  it("fromComponentDatatype throws without componentDatatype", function () {
    expect(function () {
      MetadataComponentType.fromComponentDatatype();
    }).toThrowDeveloperError();
  });

  it("toComponentDatatype", function () {
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.INT8)
    ).toBe(ComponentDatatype.BYTE);
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.UINT8)
    ).toBe(ComponentDatatype.UNSIGNED_BYTE);
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.INT16)
    ).toBe(ComponentDatatype.SHORT);
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.UINT16)
    ).toBe(ComponentDatatype.UNSIGNED_SHORT);
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.INT32)
    ).toBe(ComponentDatatype.INT);
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.UINT32)
    ).toBe(ComponentDatatype.UNSIGNED_INT);
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.FLOAT32)
    ).toBe(ComponentDatatype.FLOAT);
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.FLOAT64)
    ).toBe(ComponentDatatype.DOUBLE);
  });

  it("toComponentDatatype returns undefined for INT64", function () {
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.INT64)
    ).toBeUndefined();
  });

  it("toComponentDatatype returns undefined for UINT64", function () {
    expect(
      MetadataComponentType.toComponentDatatype(MetadataComponentType.UINT64)
    ).toBeUndefined();
  });

  it("toComponentDatatype throws without type", function () {
    expect(function () {
      MetadataComponentType.toComponentDatatype();
    }).toThrowDeveloperError();
  });
});
