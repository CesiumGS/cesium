import {
  FeatureDetection,
  MetadataBasicType,
  MetadataCompoundType,
} from "../../Source/Cesium.js";

describe("Scene/MetadataBasicType", function () {
  it("getMinimum", function () {
    expect(MetadataBasicType.getMinimum(MetadataBasicType.INT8)).toBe(-128);
    expect(MetadataBasicType.getMinimum(MetadataBasicType.UINT8)).toBe(0);
    expect(MetadataBasicType.getMinimum(MetadataBasicType.INT16)).toBe(-32768);
    expect(MetadataBasicType.getMinimum(MetadataBasicType.UINT16)).toBe(0);
    expect(MetadataBasicType.getMinimum(MetadataBasicType.INT32)).toBe(
      -2147483648
    );
    expect(MetadataBasicType.getMinimum(MetadataBasicType.UINT32)).toBe(0);
    expect(MetadataBasicType.getMinimum(MetadataBasicType.FLOAT32)).toBe(
      -340282346638528859811704183484516925440.0
    );
    expect(MetadataBasicType.getMinimum(MetadataBasicType.FLOAT64)).toBe(
      -Number.MAX_VALUE
    );

    if (FeatureDetection.supportsBigInt()) {
      expect(MetadataBasicType.getMinimum(MetadataBasicType.INT64)).toBe(
        BigInt("-9223372036854775808") // eslint-disable-line
      );
      expect(MetadataBasicType.getMinimum(MetadataBasicType.UINT64)).toBe(
        BigInt(0) // eslint-disable-line
      );
    }
  });

  it("getMinimum returns approximate number for INT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataBasicType.getMinimum(MetadataBasicType.INT64)).toBe(
      -Math.pow(2, 63)
    );
  });

  it("getMinimum returns number for UINT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataBasicType.getMinimum(MetadataBasicType.UINT64)).toBe(0);
  });

  it("getMinimum throws without type", function () {
    expect(function () {
      MetadataBasicType.getMinimum();
    }).toThrowDeveloperError();
  });

  it("getMinimum throws if type is not a numeric type", function () {
    expect(function () {
      MetadataBasicType.getMinimum(MetadataBasicType.STRING);
    }).toThrowDeveloperError();
  });

  it("getMaximum", function () {
    expect(MetadataBasicType.getMaximum(MetadataBasicType.INT8)).toBe(127);
    expect(MetadataBasicType.getMaximum(MetadataBasicType.UINT8)).toBe(255);
    expect(MetadataBasicType.getMaximum(MetadataBasicType.INT16)).toBe(32767);
    expect(MetadataBasicType.getMaximum(MetadataBasicType.UINT16)).toBe(65535);
    expect(MetadataBasicType.getMaximum(MetadataBasicType.INT32)).toBe(
      2147483647
    );
    expect(MetadataBasicType.getMaximum(MetadataBasicType.UINT32)).toBe(
      4294967295
    );
    expect(MetadataBasicType.getMaximum(MetadataBasicType.FLOAT32)).toBe(
      340282346638528859811704183484516925440.0
    );
    expect(MetadataBasicType.getMaximum(MetadataBasicType.FLOAT64)).toBe(
      Number.MAX_VALUE
    );

    if (FeatureDetection.supportsBigInt()) {
      expect(MetadataBasicType.getMaximum(MetadataBasicType.INT64)).toBe(
        BigInt("9223372036854775807") // eslint-disable-line
      );
      expect(MetadataBasicType.getMaximum(MetadataBasicType.UINT64)).toBe(
        BigInt("18446744073709551615") // eslint-disable-line
      );
    }
  });

  it("getMaximum returns approximate number for INT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataBasicType.getMaximum(MetadataBasicType.INT64)).toBe(
      Math.pow(2, 63) - 1
    );
  });

  it("getMaximum returns approximate number for UINT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataBasicType.getMaximum(MetadataBasicType.UINT64)).toBe(
      Math.pow(2, 64) - 1
    );
  });

  it("getMaximum throws without type", function () {
    expect(function () {
      MetadataBasicType.getMaximum();
    }).toThrowDeveloperError();
  });

  it("getMaximum throws if type is not a numeric type", function () {
    expect(function () {
      MetadataBasicType.getMaximum(MetadataBasicType.STRING);
    }).toThrowDeveloperError();
  });

  it("isNumericType", function () {
    expect(MetadataBasicType.isNumericType(MetadataBasicType.INT8)).toBe(true);
    expect(MetadataBasicType.isNumericType(MetadataBasicType.UINT8)).toBe(true);
    expect(MetadataBasicType.isNumericType(MetadataBasicType.INT16)).toBe(true);
    expect(MetadataBasicType.isNumericType(MetadataBasicType.UINT16)).toBe(
      true
    );
    expect(MetadataBasicType.isNumericType(MetadataBasicType.INT32)).toBe(true);
    expect(MetadataBasicType.isNumericType(MetadataBasicType.UINT32)).toBe(
      true
    );
    expect(MetadataBasicType.isNumericType(MetadataBasicType.INT64)).toBe(true);
    expect(MetadataBasicType.isNumericType(MetadataBasicType.UINT64)).toBe(
      true
    );
    expect(MetadataBasicType.isNumericType(MetadataBasicType.FLOAT32)).toBe(
      true
    );
    expect(MetadataBasicType.isNumericType(MetadataBasicType.FLOAT64)).toBe(
      true
    );
    expect(MetadataBasicType.isNumericType(MetadataBasicType.BOOLEAN)).toBe(
      false
    );
    expect(MetadataBasicType.isNumericType(MetadataBasicType.STRING)).toBe(
      false
    );
    expect(MetadataBasicType.isNumericType(MetadataBasicType.ENUM)).toBe(false);
    expect(MetadataBasicType.isNumericType(MetadataCompoundType.ARRAY)).toBe(
      false
    );
  });

  it("isNumericType throws without type", function () {
    expect(function () {
      MetadataBasicType.isNumericType();
    }).toThrowDeveloperError();
  });

  it("isIntegerType", function () {
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.INT8)).toBe(true);
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.UINT8)).toBe(true);
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.INT16)).toBe(true);
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.UINT16)).toBe(
      true
    );
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.INT32)).toBe(true);
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.UINT32)).toBe(
      true
    );
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.INT64)).toBe(true);
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.UINT64)).toBe(
      true
    );
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.FLOAT32)).toBe(
      false
    );
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.FLOAT64)).toBe(
      false
    );
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.BOOLEAN)).toBe(
      false
    );
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.STRING)).toBe(
      false
    );
    expect(MetadataBasicType.isIntegerType(MetadataBasicType.ENUM)).toBe(false);
    expect(MetadataBasicType.isIntegerType(MetadataCompoundType.ARRAY)).toBe(
      false
    );
  });

  it("isIntegerType throws without type", function () {
    expect(function () {
      MetadataBasicType.isIntegerType();
    }).toThrowDeveloperError();
  });

  it("isUnsignedIntegerType", function () {
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.INT8)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.UINT8)
    ).toBe(true);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.INT16)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.UINT16)
    ).toBe(true);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.INT32)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.UINT32)
    ).toBe(true);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.INT64)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.UINT64)
    ).toBe(true);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.FLOAT32)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.FLOAT64)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.BOOLEAN)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.STRING)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataBasicType.ENUM)
    ).toBe(false);
    expect(
      MetadataBasicType.isUnsignedIntegerType(MetadataCompoundType.ARRAY)
    ).toBe(false);
  });

  it("isUnsignedIntegerType throws without type", function () {
    expect(function () {
      MetadataBasicType.isUnsignedIntegerType();
    }).toThrowDeveloperError();
  });

  it("normalizes signed integers", function () {
    var signedTypes = ["INT8", "INT16", "INT32"];
    for (var i = 0; i < signedTypes.length; ++i) {
      var type = signedTypes[i];
      var min = MetadataBasicType.getMinimum(MetadataBasicType[type]);
      var max = MetadataBasicType.getMaximum(MetadataBasicType[type]);
      var values = [min, min / 2, 0, max / 2, max];
      var expectedResults = [-1.0, -0.5, 0.0, 0.5, 1.0];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataBasicType.normalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("normalizes unsigned integers", function () {
    var unsignedTypes = ["UINT8", "UINT16", "UINT32"];
    for (var i = 0; i < unsignedTypes.length; ++i) {
      var type = unsignedTypes[i];
      var max = MetadataBasicType.getMaximum(MetadataBasicType[type]);
      var values = [0, max / 4, max / 2, max];
      var expectedResults = [0.0, 0.25, 0.5, 1.0];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataBasicType.normalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("normalizes INT64 integers", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var min = MetadataBasicType.getMinimum(MetadataBasicType.INT64);
    var max = MetadataBasicType.getMaximum(MetadataBasicType.INT64);
    var values = [min, min / BigInt(2), 0, max / BigInt(2), max]; // eslint-disable-line
    var expectedResults = [-1.0, -0.5, 0.0, 0.5, 1.0];
    for (var j = 0; j < values.length; ++j) {
      var result = MetadataBasicType.normalize(
        values[j],
        MetadataBasicType.INT64
      );
      expect(result).toBe(expectedResults[j]);
    }
  });

  it("normalizes UINT64 integers", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var max = MetadataBasicType.getMaximum(MetadataBasicType.UINT64);
    var values = [BigInt(0), max / BigInt(4), max / BigInt(2), max]; // eslint-disable-line
    var expectedResults = [0.0, 0.25, 0.5, 1.0];
    for (var j = 0; j < values.length; ++j) {
      var result = MetadataBasicType.normalize(
        values[j],
        MetadataBasicType.UINT64
      );
      expect(result).toBe(expectedResults[j]);
    }
  });

  it("normalize throws without value", function () {
    expect(function () {
      MetadataBasicType.normalize();
    }).toThrowDeveloperError();
  });

  it("normalize throws without type", function () {
    expect(function () {
      MetadataBasicType.normalize(10.0);
    }).toThrowDeveloperError();
  });

  it("normalize throws if value is not a number or BigInt", function () {
    expect(function () {
      MetadataBasicType.normalize("10", MetadataBasicType.INT16);
    }).toThrowDeveloperError();
  });

  it("normalize throws if type is not an integer type", function () {
    expect(function () {
      MetadataBasicType.normalize(10.0, MetadataBasicType.STRING);
    }).toThrowDeveloperError();
  });

  it("unnormalizes signed numbers", function () {
    var signedTypes = ["INT8", "INT16", "INT32"];
    for (var i = 0; i < signedTypes.length; ++i) {
      var type = signedTypes[i];
      var min = MetadataBasicType.getMinimum(MetadataBasicType[type]);
      var max = MetadataBasicType.getMaximum(MetadataBasicType[type]);
      var values = [-1.0, -0.5, 0.0, 0.5, 1.0];
      var expectedResults = [min, min / 2, 0, max / 2, max];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataBasicType.unnormalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("unnormalizes unsigned numbers", function () {
    var unsignedTypes = ["UINT8", "UINT16", "UINT32"];
    for (var i = 0; i < unsignedTypes.length; ++i) {
      var type = unsignedTypes[i];
      var max = MetadataBasicType.getMaximum(MetadataBasicType[type]);
      var values = [0.0, 0.25, 0.5, 1.0];
      var expectedResults = [0, max / 4, max / 2, max];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataBasicType.unnormalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("unnormalizes INT64", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var min = MetadataBasicType.getMinimum(MetadataBasicType.INT64);
    var max = MetadataBasicType.getMaximum(MetadataBasicType.INT64);
    var values = [-1.0, -0.5, 0.0, 0.5, 1.0];

    // Unnormalization is not always exact since it must be through Float64 math
    // first, hence the + BigInt(1)
    var expectedResults = [
      min,
      min / BigInt(2), // eslint-disable-line
      BigInt(0), // eslint-disable-line
      max / BigInt(2) + BigInt(1), // eslint-disable-line
      max,
    ];
    for (var i = 0; i < values.length; ++i) {
      var result = MetadataBasicType.unnormalize(
        values[i],
        MetadataBasicType.INT64
      );
      expect(result).toBe(expectedResults[i]);
    }
  });

  it("unnormalizes UINT64", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var max = MetadataBasicType.getMaximum(MetadataBasicType.UINT64);
    var values = [0.0, 0.25, 0.5, 1.0];

    // Unnormalization is not always exact since it must be through Float64 math
    // first, hence the + BigInt(1)
    var expectedResults = [
      BigInt(0), // eslint-disable-line
      max / BigInt(4) + BigInt(1), // eslint-disable-line
      max / BigInt(2) + BigInt(1), // eslint-disable-line
      max,
    ];
    for (var i = 0; i < values.length; ++i) {
      var result = MetadataBasicType.unnormalize(
        values[i],
        MetadataBasicType.UINT64
      );
      expect(result).toBe(expectedResults[i]);
    }
  });

  it("unnormalize clamps values outside the range", function () {
    expect(MetadataBasicType.unnormalize(-1.1, MetadataBasicType.INT8)).toBe(
      -128
    );
    expect(MetadataBasicType.unnormalize(-0.1, MetadataBasicType.UINT8)).toBe(
      0
    );
    expect(MetadataBasicType.unnormalize(1.1, MetadataBasicType.INT8)).toBe(
      127
    );
    expect(MetadataBasicType.unnormalize(1.1, MetadataBasicType.UINT8)).toBe(
      255
    );
  });

  it("unnormalize throws without value", function () {
    expect(function () {
      MetadataBasicType.unnormalize();
    }).toThrowDeveloperError();
  });

  it("unnormalize throws without type", function () {
    expect(function () {
      MetadataBasicType.unnormalize(10.0);
    }).toThrowDeveloperError();
  });

  it("unnormalize throws if type is not an integer type", function () {
    expect(function () {
      MetadataBasicType.unnormalize(10.0, MetadataBasicType.STRING);
    }).toThrowDeveloperError();
  });

  it("getSizeInBytes", function () {
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.INT8)).toBe(1);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.UINT8)).toBe(1);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.INT16)).toBe(2);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.UINT16)).toBe(2);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.INT32)).toBe(4);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.UINT32)).toBe(4);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.INT64)).toBe(8);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.UINT64)).toBe(8);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.FLOAT32)).toBe(4);
    expect(MetadataBasicType.getSizeInBytes(MetadataBasicType.FLOAT64)).toBe(8);
  });

  it("getSizeInBytes throws without type", function () {
    expect(function () {
      MetadataBasicType.getSizeInBytes();
    }).toThrowDeveloperError();
  });

  it("getSizeInBytes throws if type is not a numeric type", function () {
    expect(function () {
      MetadataBasicType.getSizeInBytes(MetadataBasicType.STRING);
    }).toThrowDeveloperError();
  });
});
