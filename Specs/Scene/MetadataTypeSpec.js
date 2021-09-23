import { FeatureDetection, MetadataType } from "../../Source/Cesium.js";

describe("Scene/MetadataType", function () {
  it("getMinimum", function () {
    expect(MetadataType.getMinimum(MetadataType.INT8)).toBe(-128);
    expect(MetadataType.getMinimum(MetadataType.UINT8)).toBe(0);
    expect(MetadataType.getMinimum(MetadataType.INT16)).toBe(-32768);
    expect(MetadataType.getMinimum(MetadataType.UINT16)).toBe(0);
    expect(MetadataType.getMinimum(MetadataType.INT32)).toBe(-2147483648);
    expect(MetadataType.getMinimum(MetadataType.UINT32)).toBe(0);
    expect(MetadataType.getMinimum(MetadataType.FLOAT32)).toBe(
      -340282346638528859811704183484516925440.0
    );
    expect(MetadataType.getMinimum(MetadataType.FLOAT64)).toBe(
      -Number.MAX_VALUE
    );

    if (FeatureDetection.supportsBigInt()) {
      expect(MetadataType.getMinimum(MetadataType.INT64)).toBe(
        BigInt("-9223372036854775808") // eslint-disable-line
      );
      expect(MetadataType.getMinimum(MetadataType.UINT64)).toBe(
        BigInt(0) // eslint-disable-line
      );
    }
  });

  it("getMinimum returns approximate number for INT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataType.getMinimum(MetadataType.INT64)).toBe(-Math.pow(2, 63));
  });

  it("getMinimum returns number for UINT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataType.getMinimum(MetadataType.UINT64)).toBe(0);
  });

  it("getMinimum throws without type", function () {
    expect(function () {
      MetadataType.getMinimum();
    }).toThrowDeveloperError();
  });

  it("getMinimum throws if type is not a numeric type", function () {
    expect(function () {
      MetadataType.getMinimum(MetadataType.STRING);
    }).toThrowDeveloperError();
  });

  it("getMaximum", function () {
    expect(MetadataType.getMaximum(MetadataType.INT8)).toBe(127);
    expect(MetadataType.getMaximum(MetadataType.UINT8)).toBe(255);
    expect(MetadataType.getMaximum(MetadataType.INT16)).toBe(32767);
    expect(MetadataType.getMaximum(MetadataType.UINT16)).toBe(65535);
    expect(MetadataType.getMaximum(MetadataType.INT32)).toBe(2147483647);
    expect(MetadataType.getMaximum(MetadataType.UINT32)).toBe(4294967295);
    expect(MetadataType.getMaximum(MetadataType.FLOAT32)).toBe(
      340282346638528859811704183484516925440.0
    );
    expect(MetadataType.getMaximum(MetadataType.FLOAT64)).toBe(
      Number.MAX_VALUE
    );

    if (FeatureDetection.supportsBigInt()) {
      expect(MetadataType.getMaximum(MetadataType.INT64)).toBe(
        BigInt("9223372036854775807") // eslint-disable-line
      );
      expect(MetadataType.getMaximum(MetadataType.UINT64)).toBe(
        BigInt("18446744073709551615") // eslint-disable-line
      );
    }
  });

  it("getMaximum returns approximate number for INT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataType.getMaximum(MetadataType.INT64)).toBe(
      Math.pow(2, 63) - 1
    );
  });

  it("getMaximum returns approximate number for UINT64 when BigInt is not supported", function () {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
    expect(MetadataType.getMaximum(MetadataType.UINT64)).toBe(
      Math.pow(2, 64) - 1
    );
  });

  it("getMaximum throws without type", function () {
    expect(function () {
      MetadataType.getMaximum();
    }).toThrowDeveloperError();
  });

  it("getMaximum throws if type is not a numeric type", function () {
    expect(function () {
      MetadataType.getMaximum(MetadataType.STRING);
    }).toThrowDeveloperError();
  });

  it("isNumericType", function () {
    expect(MetadataType.isNumericType(MetadataType.INT8)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.UINT8)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.INT16)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.UINT16)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.INT32)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.UINT32)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.INT64)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.UINT64)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.FLOAT32)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.FLOAT64)).toBe(true);
    expect(MetadataType.isNumericType(MetadataType.BOOLEAN)).toBe(false);
    expect(MetadataType.isNumericType(MetadataType.STRING)).toBe(false);
    expect(MetadataType.isNumericType(MetadataType.ENUM)).toBe(false);
    expect(MetadataType.isNumericType(MetadataType.ARRAY)).toBe(false);
  });

  it("isNumericType throws without type", function () {
    expect(function () {
      MetadataType.isNumericType();
    }).toThrowDeveloperError();
  });

  it("isIntegerType", function () {
    expect(MetadataType.isIntegerType(MetadataType.INT8)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.UINT8)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.INT16)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.UINT16)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.INT32)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.UINT32)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.INT64)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.UINT64)).toBe(true);
    expect(MetadataType.isIntegerType(MetadataType.FLOAT32)).toBe(false);
    expect(MetadataType.isIntegerType(MetadataType.FLOAT64)).toBe(false);
    expect(MetadataType.isIntegerType(MetadataType.BOOLEAN)).toBe(false);
    expect(MetadataType.isIntegerType(MetadataType.STRING)).toBe(false);
    expect(MetadataType.isIntegerType(MetadataType.ENUM)).toBe(false);
    expect(MetadataType.isIntegerType(MetadataType.ARRAY)).toBe(false);
  });

  it("isIntegerType throws without type", function () {
    expect(function () {
      MetadataType.isIntegerType();
    }).toThrowDeveloperError();
  });

  it("isUnsignedIntegerType", function () {
    expect(MetadataType.isUnsignedIntegerType(MetadataType.INT8)).toBe(false);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.UINT8)).toBe(true);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.INT16)).toBe(false);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.UINT16)).toBe(true);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.INT32)).toBe(false);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.UINT32)).toBe(true);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.INT64)).toBe(false);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.UINT64)).toBe(true);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.FLOAT32)).toBe(
      false
    );
    expect(MetadataType.isUnsignedIntegerType(MetadataType.FLOAT64)).toBe(
      false
    );
    expect(MetadataType.isUnsignedIntegerType(MetadataType.BOOLEAN)).toBe(
      false
    );
    expect(MetadataType.isUnsignedIntegerType(MetadataType.STRING)).toBe(false);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.ENUM)).toBe(false);
    expect(MetadataType.isUnsignedIntegerType(MetadataType.ARRAY)).toBe(false);
  });

  it("isUnsignedIntegerType throws without type", function () {
    expect(function () {
      MetadataType.isUnsignedIntegerType();
    }).toThrowDeveloperError();
  });

  it("normalizes signed integers", function () {
    var signedTypes = ["INT8", "INT16", "INT32"];
    for (var i = 0; i < signedTypes.length; ++i) {
      var type = signedTypes[i];
      var min = MetadataType.getMinimum(MetadataType[type]);
      var max = MetadataType.getMaximum(MetadataType[type]);
      var values = [min, min / 2, 0, max / 2, max];
      var expectedResults = [-1.0, -0.5, 0.0, 0.5, 1.0];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataType.normalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("normalizes unsigned integers", function () {
    var unsignedTypes = ["UINT8", "UINT16", "UINT32"];
    for (var i = 0; i < unsignedTypes.length; ++i) {
      var type = unsignedTypes[i];
      var max = MetadataType.getMaximum(MetadataType[type]);
      var values = [0, max / 4, max / 2, max];
      var expectedResults = [0.0, 0.25, 0.5, 1.0];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataType.normalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("normalizes INT64 integers", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var min = MetadataType.getMinimum(MetadataType.INT64);
    var max = MetadataType.getMaximum(MetadataType.INT64);
    var values = [min, min / BigInt(2), 0, max / BigInt(2), max]; // eslint-disable-line
    var expectedResults = [-1.0, -0.5, 0.0, 0.5, 1.0];
    for (var j = 0; j < values.length; ++j) {
      var result = MetadataType.normalize(values[j], MetadataType.INT64);
      expect(result).toBe(expectedResults[j]);
    }
  });

  it("normalizes UINT64 integers", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var max = MetadataType.getMaximum(MetadataType.UINT64);
    var values = [BigInt(0), max / BigInt(4), max / BigInt(2), max]; // eslint-disable-line
    var expectedResults = [0.0, 0.25, 0.5, 1.0];
    for (var j = 0; j < values.length; ++j) {
      var result = MetadataType.normalize(values[j], MetadataType.UINT64);
      expect(result).toBe(expectedResults[j]);
    }
  });

  it("normalize throws without value", function () {
    expect(function () {
      MetadataType.normalize();
    }).toThrowDeveloperError();
  });

  it("normalize throws without type", function () {
    expect(function () {
      MetadataType.normalize(10.0);
    }).toThrowDeveloperError();
  });

  it("normalize throws if value is not a number or BigInt", function () {
    expect(function () {
      MetadataType.normalize("10", MetadataType.INT16);
    }).toThrowDeveloperError();
  });

  it("normalize throws if type is not an integer type", function () {
    expect(function () {
      MetadataType.normalize(10.0, MetadataType.STRING);
    }).toThrowDeveloperError();
  });

  it("unnormalizes signed numbers", function () {
    var signedTypes = ["INT8", "INT16", "INT32"];
    for (var i = 0; i < signedTypes.length; ++i) {
      var type = signedTypes[i];
      var min = MetadataType.getMinimum(MetadataType[type]);
      var max = MetadataType.getMaximum(MetadataType[type]);
      var values = [-1.0, -0.5, 0.0, 0.5, 1.0];
      var expectedResults = [min, min / 2, 0, max / 2, max];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataType.unnormalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("unnormalizes unsigned numbers", function () {
    var unsignedTypes = ["UINT8", "UINT16", "UINT32"];
    for (var i = 0; i < unsignedTypes.length; ++i) {
      var type = unsignedTypes[i];
      var max = MetadataType.getMaximum(MetadataType[type]);
      var values = [0.0, 0.25, 0.5, 1.0];
      var expectedResults = [0, max / 4, max / 2, max];
      for (var j = 0; j < values.length; ++j) {
        var result = MetadataType.unnormalize(values[j], type);
        expect(result).toBe(expectedResults[j]);
      }
    }
  });

  it("unnormalizes INT64", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var min = MetadataType.getMinimum(MetadataType.INT64);
    var max = MetadataType.getMaximum(MetadataType.INT64);
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
      var result = MetadataType.unnormalize(values[i], MetadataType.INT64);
      expect(result).toBe(expectedResults[i]);
    }
  });

  it("unnormalizes UINT64", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var max = MetadataType.getMaximum(MetadataType.UINT64);
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
      var result = MetadataType.unnormalize(values[i], MetadataType.UINT64);
      expect(result).toBe(expectedResults[i]);
    }
  });

  it("unnormalize clamps values outside the range", function () {
    expect(MetadataType.unnormalize(-1.1, MetadataType.INT8)).toBe(-128);
    expect(MetadataType.unnormalize(-0.1, MetadataType.UINT8)).toBe(0);
    expect(MetadataType.unnormalize(1.1, MetadataType.INT8)).toBe(127);
    expect(MetadataType.unnormalize(1.1, MetadataType.UINT8)).toBe(255);
  });

  it("unnormalize throws without value", function () {
    expect(function () {
      MetadataType.unnormalize();
    }).toThrowDeveloperError();
  });

  it("unnormalize throws without type", function () {
    expect(function () {
      MetadataType.unnormalize(10.0);
    }).toThrowDeveloperError();
  });

  it("unnormalize throws if type is not an integer type", function () {
    expect(function () {
      MetadataType.unnormalize(10.0, MetadataType.STRING);
    }).toThrowDeveloperError();
  });

  it("getSizeInBytes", function () {
    expect(MetadataType.getSizeInBytes(MetadataType.INT8)).toBe(1);
    expect(MetadataType.getSizeInBytes(MetadataType.UINT8)).toBe(1);
    expect(MetadataType.getSizeInBytes(MetadataType.INT16)).toBe(2);
    expect(MetadataType.getSizeInBytes(MetadataType.UINT16)).toBe(2);
    expect(MetadataType.getSizeInBytes(MetadataType.INT32)).toBe(4);
    expect(MetadataType.getSizeInBytes(MetadataType.UINT32)).toBe(4);
    expect(MetadataType.getSizeInBytes(MetadataType.FLOAT32)).toBe(4);
    expect(MetadataType.getSizeInBytes(MetadataType.FLOAT64)).toBe(8);
  });

  it("getSizeInBytes throws without type", function () {
    expect(function () {
      MetadataType.getSizeInBytes();
    }).toThrowDeveloperError();
  });

  it("getSizeInBytes throws if type is not a numeric type", function () {
    expect(function () {
      MetadataType.getSizeInBytes(MetadataType.STRING);
    }).toThrowDeveloperError();
  });
});
