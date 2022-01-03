import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Matrix2,
  Matrix3,
  Matrix4,
  FeatureDetection,
  MetadataClassProperty,
  MetadataComponentType,
  MetadataEnum,
  MetadataType,
} from "../../Source/Cesium.js";

describe("Scene/MetadataClassProperty", function () {
  it("creates property with default values", function () {
    var property = new MetadataClassProperty({
      id: "height",
      property: {
        componentType: "FLOAT32",
      },
    });

    expect(property.id).toBe("height");
    expect(property.name).toBeUndefined();
    expect(property.description).toBeUndefined();
    expect(property.type).toBe(MetadataType.SINGLE);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBe(MetadataComponentType.FLOAT32);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT32);
    expect(property.componentCount).toBe(1);
    expect(property.normalized).toBe(false);
    expect(property.max).toBeUndefined();
    expect(property.min).toBeUndefined();
    expect(property.default).toBeUndefined();
    expect(property.optional).toBe(false);
    expect(property.semantic).toBeUndefined();
    expect(property.extras).toBeUndefined();
    expect(property.extensions).toBeUndefined();
  });

  it("creates property", function () {
    var max = [32767, 0, 100];
    var min = [-32768, 0, -100];
    var propertyDefault = [0, 0, 0];
    var extras = {
      coordinates: [0, 1, 2],
    };
    var extensions = {
      EXT_other_extension: {},
    };

    var property = new MetadataClassProperty({
      id: "position",
      property: {
        name: "Position",
        description: "Position (X, Y, Z)",
        type: "ARRAY",
        componentType: "INT16",
        componentCount: 3,
        normalized: true,
        max: max,
        min: min,
        default: propertyDefault,
        optional: false,
        semantic: "_POSITION",
        extras: extras,
        extensions: extensions,
      },
    });

    expect(property.id).toBe("position");
    expect(property.name).toBe("Position");
    expect(property.description).toBe("Position (X, Y, Z)");
    expect(property.type).toBe(MetadataType.ARRAY);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBe(MetadataComponentType.INT16);
    expect(property.valueType).toBe(MetadataComponentType.INT16);
    expect(property.componentCount).toBe(3);
    expect(property.normalized).toBe(true);
    expect(property.max).toBe(max);
    expect(property.min).toBe(min);
    expect(property.default).toBe(propertyDefault);
    expect(property.optional).toBe(false);
    expect(property.semantic).toBe("_POSITION");
    expect(property.extras).toBe(extras);
    expect(property.extensions).toBe(extensions);
  });

  it("transcodes single properties from EXT_feature_metadata", function () {
    var max = [32767, 0, 100];
    var min = [-32768, 0, -100];
    var propertyDefault = 0;
    var extras = {
      coordinates: [0, 1, 2],
    };
    var extensions = {
      EXT_other_extension: {},
    };

    var property = new MetadataClassProperty({
      id: "population",
      property: {
        name: "Population",
        description: "Population (thousands)",
        type: "INT32",
        normalized: true,
        max: max,
        min: min,
        default: propertyDefault,
        optional: false,
        semantic: "_POSITION",
        extras: extras,
        extensions: extensions,
      },
    });

    expect(property.id).toBe("population");
    expect(property.name).toBe("Population");
    expect(property.description).toBe("Population (thousands)");
    expect(property.type).toBe(MetadataType.SINGLE);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBe(MetadataComponentType.INT32);
    expect(property.valueType).toBe(MetadataComponentType.INT32);
    expect(property.componentCount).toBe(1);
    expect(property.normalized).toBe(true);
    expect(property.max).toBe(max);
    expect(property.min).toBe(min);
    expect(property.default).toBe(propertyDefault);
    expect(property.optional).toBe(false);
    expect(property.semantic).toBe("_POSITION");
    expect(property.extras).toBe(extras);
    expect(property.extensions).toBe(extensions);
  });

  it("creates enum property", function () {
    var colorEnum = new MetadataEnum({
      id: "color",
      enum: {
        values: [
          {
            name: "RED",
            value: 0,
          },
        ],
      },
    });

    var enums = {
      color: colorEnum,
    };

    var property = new MetadataClassProperty({
      id: "color",
      property: {
        componentType: "ENUM",
        enumType: "color",
      },
      enums: enums,
    });

    expect(property.type).toBe(MetadataType.SINGLE);
    expect(property.componentType).toBe(MetadataComponentType.ENUM);
    expect(property.enumType).toBe(colorEnum);
    expect(property.valueType).toBe(MetadataComponentType.UINT16); // default enum valueType
  });

  it("creates vector and matrix types", function () {
    var property = new MetadataClassProperty({
      id: "speed",
      property: {
        type: "VEC2",
        componentType: "FLOAT32",
      },
    });

    expect(property.id).toBe("speed");
    expect(property.type).toBe(MetadataType.VEC2);
    expect(property.componentCount).toBe(2);
    expect(property.componentType).toBe(MetadataComponentType.FLOAT32);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT32);

    property = new MetadataClassProperty({
      id: "scale",
      property: {
        type: "MAT3",
        componentType: "FLOAT64",
      },
    });

    expect(property.id).toBe("scale");
    expect(property.type).toBe(MetadataType.MAT3);
    expect(property.componentCount).toBe(9);
    expect(property.componentType).toBe(MetadataComponentType.FLOAT64);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT64);
  });

  it("constructor throws without id", function () {
    expect(function () {
      return new MetadataClassProperty({
        property: {
          componentType: "FLOAT32",
        },
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without property", function () {
    expect(function () {
      return new MetadataClassProperty({
        id: "propertyId",
      });
    }).toThrowDeveloperError();
  });

  it("normalize single values", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var properties = {
      propertyInt8: {
        type: "SINGLE",
        componentType: "INT8",
        normalized: true,
      },
      propertyUint8: {
        // SINGLE is the default type
        componentType: "UINT8",
        normalized: true,
      },
      propertyInt16: {
        componentType: "INT16",
        normalized: true,
      },
      propertyUint16: {
        componentType: "UINT16",
        normalized: true,
      },
      propertyInt32: {
        componentType: "INT32",
        normalized: true,
      },
      propertyUint32: {
        componentType: "UINT32",
        normalized: true,
      },
      propertyInt64: {
        componentType: "INT64",
        normalized: true,
      },
      propertyUint64: {
        componentType: "UINT64",
        normalized: true,
      },
    };

    var propertyValues = {
      propertyInt8: [-128, 0, 127],
      propertyUint8: [0, 51, 255],
      propertyInt16: [-32768, 0, 32767],
      propertyUint16: [0, 13107, 65535],
      propertyInt32: [-2147483648, 0, 2147483647],
      propertyUint32: [0, 858993459, 4294967295],
      propertyInt64: [
        BigInt("-9223372036854775808"), // eslint-disable-line
        BigInt(0), // eslint-disable-line
        BigInt("9223372036854775807"), // eslint-disable-line
      ],
      propertyUint64: [
        BigInt(0), // eslint-disable-line
        BigInt("3689348814741910323"), // eslint-disable-line
        BigInt("18446744073709551615"), // eslint-disable-line
      ],
    };

    var normalizedValues = {
      propertyInt8: [-1.0, 0, 1.0],
      propertyUint8: [0.0, 0.2, 1.0],
      propertyInt16: [-1.0, 0, 1.0],
      propertyUint16: [0.0, 0.2, 1.0],
      propertyInt32: [-1.0, 0, 1.0],
      propertyUint32: [0.0, 0.2, 1.0],
      propertyInt64: [-1.0, 0, 1.0],
      propertyUint64: [0.0, 0.2, 1.0],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        var length = normalizedValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = propertyValues[propertyId][i];
          var normalizedValue = property.normalize(value);
          expect(normalizedValue).toEqual(normalizedValues[propertyId][i]);
        }
      }
    }
  });

  it("normalize array values", function () {
    var properties = {
      propertyInt8: {
        type: "ARRAY",
        componentType: "INT8",
        normalized: true,
      },
      propertyUint8: {
        type: "ARRAY",
        componentType: "UINT8",
        componentCount: 2,
        normalized: true,
      },
    };

    var propertyValues = {
      propertyInt8: [[-128, 0], [127], []],
      propertyUint8: [
        [0, 255],
        [0, 51],
        [255, 255],
      ],
    };

    var normalizedValues = {
      propertyInt8: [[-1.0, 0.0], [1.0], []],
      propertyUint8: [
        [0.0, 1.0],
        [0.0, 0.2],
        [1.0, 1.0],
      ],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        var length = normalizedValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = propertyValues[propertyId][i];
          var normalizedValue = property.normalize(value);
          expect(normalizedValue).toEqual(normalizedValues[propertyId][i]);
        }
      }
    }
  });

  it("normalize vector and matrix values", function () {
    var properties = {
      vec4Int8: {
        type: "VEC4",
        componentType: "INT8",
        normalized: true,
      },
      mat2Uint8: {
        type: "MAT2",
        componentType: "UINT8",
        normalized: true,
      },
    };

    var propertyValues = {
      vec4Int8: [
        [-128, 0, 127, 0],
        [-128, -128, -128, 0],
        [127, 127, 127, 127],
      ],
      mat2Uint8: [
        [0, 255, 0, 0],
        [0, 51, 51, 0],
        [255, 0, 0, 255],
      ],
    };

    var normalizedValues = {
      vec4Int8: [
        [-1.0, 0.0, 1.0, 0],
        [-1.0, -1.0, -1.0, 0],
        [1.0, 1.0, 1.0, 1.0],
      ],
      mat2Uint8: [
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.2, 0.2, 0.0],
        [1.0, 0.0, 0.0, 1.0],
      ],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        var length = normalizedValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = propertyValues[propertyId][i];
          var normalizedValue = property.normalize(value);
          expect(normalizedValue).toEqual(normalizedValues[propertyId][i]);
        }
      }
    }
  });

  it("does not normalize non integer types", function () {
    var myEnum = new MetadataEnum({
      id: "myEnum",
      enum: {
        values: [
          {
            value: 0,
            name: "ValueA",
          },
          {
            value: 1,
            name: "ValueB",
          },
          {
            value: 999,
            name: "Other",
          },
        ],
      },
    });

    var properties = {
      propertyEnum: {
        componentType: "ENUM",
        enumType: "myEnum",
        normalized: true,
      },
      propertyEnumArray: {
        type: "ARRAY",
        componentType: "ENUM",
        enumType: "myEnum",
        normalized: true,
      },
      propertyString: {
        componentType: "STRING",
        normalized: true,
      },
      propertyBoolean: {
        componentType: "BOOLEAN",
        normalized: true,
      },
    };

    var propertyValues = {
      propertyEnum: ["Other", "ValueA", "ValueB"],
      propertyEnumArray: [["Other", "ValueA"], ["ValueB"], []],
      propertyString: ["a", "bc", ""],
      propertyBoolean: [true, false, false],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
          enums: {
            myEnum: myEnum,
          },
        });
        var length = propertyValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = propertyValues[propertyId][i];
          var normalizeValue = property.normalize(value);
          expect(normalizeValue).toEqual(value);
        }
      }
    }
  });

  it("packVectorAndMatrixTypes packs vectors and matrices", function () {
    var properties = {
      propertyVec2: {
        type: "VEC2",
        componentType: "FLOAT32",
      },
      propertyIVec3: {
        type: "VEC3",
        componentType: "INT32",
      },
      propertyDVec4: {
        type: "VEC4",
        componentType: "FLOAT64",
      },
      propertyMat4: {
        type: "MAT4",
        componentType: "FLOAT32",
      },
      propertyIMat3: {
        type: "MAT3",
        componentType: "FLOAT32",
      },
      propertyDMat2: {
        type: "MAT2",
        componentType: "FLOAT32",
      },
    };

    var propertyValues = {
      propertyVec2: [
        new Cartesian2(0.1, 0.8),
        new Cartesian2(0.3, 0.5),
        new Cartesian2(0.7, 0.2),
      ],
      propertyIVec3: [
        new Cartesian3(1, 2, 3),
        new Cartesian3(4, 5, 6),
        new Cartesian3(7, 8, 9),
      ],
      propertyDVec4: [
        new Cartesian4(0.1, 0.2, 0.3, 0.4),
        new Cartesian4(0.3, 0.2, 0.1, 0.0),
        new Cartesian4(0.1, 0.2, 0.4, 0.5),
      ],
      propertyMat4: [
        new Matrix4(1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1),
        new Matrix4(0, 2.5, 0, 0, 0, 0.5, 0.25, 0, 0, 0, 3.5, 0, 0, 0, 0, 1),
        new Matrix4(1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0),
      ],
      propertyIMat3: [
        new Matrix3(2, 0, 0, 0, 2, 0, 0, 0, 2),
        new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1),
        new Matrix3(1, 2, 3, 2, 3, 1, 3, 1, 2),
      ],
      propertyDMat2: [
        new Matrix2(1.5, 0.0, 0.0, 2.5),
        new Matrix2(1.0, 0.0, 0.0, 1.0),
        new Matrix2(1.5, 2.5, 3.5, 4.5),
      ],
    };

    var packedValues = {
      propertyVec2: [
        [0.1, 0.8],
        [0.3, 0.5],
        [0.7, 0.2],
      ],
      propertyIVec3: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      propertyDVec4: [
        [0.1, 0.2, 0.3, 0.4],
        [0.3, 0.2, 0.1, 0.0],
        [0.1, 0.2, 0.4, 0.5],
      ],
      propertyMat4: [
        // the MatrixN constructor is row-major, but internally things are
        // stored column-major. So these are the transpose of the above
        [1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 2.5, 0.5, 0, 0, 0, 0.25, 3.5, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 0, 0, 0, 0],
      ],
      propertyIMat3: [
        [2, 0, 0, 0, 2, 0, 0, 0, 2],
        [1, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 2, 3, 2, 3, 1, 3, 1, 2],
      ],
      propertyDMat2: [
        [1.5, 0.0, 0.0, 2.5],
        [1.0, 0.0, 0.0, 1.0],
        [1.5, 3.5, 2.5, 4.5],
      ],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        var length = propertyValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = propertyValues[propertyId][i];
          var packed = property.packVectorAndMatrixTypes(value);
          expect(packed).toEqual(packedValues[propertyId][i]);
        }
      }
    }
  });

  it("packVectorAndMatrixTypes does not affect other types", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var properties = {
      propertyString: {
        componentType: "STRING",
      },
      propertyBoolean: {
        componentType: "BOOLEAN",
      },
      propertyArray: {
        type: "ARRAY",
        componentType: "UINT8",
        componentCount: 5,
      },
      propertyBigIntArray: {
        type: "ARRAY",
        componentType: "UINT64",
        componentCount: 2,
      },
    };

    var propertyValues = {
      propertyString: ["a", "bc", ""],
      propertyBoolean: [true, false, false],
      propertyArray: [
        [1, 2, 3, 4, 5],
        [0, 1, 2, 3, 4],
        [1, 4, 9, 16, 25],
      ],
      propertyBigIntArray: [
        [BigInt(0), BigInt(0)], // eslint-disable-line
        [BigInt(1), BigInt(3)], // eslint-disable-line
        [BigInt(45), BigInt(32)], // eslint-disable-line
      ],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        var length = propertyValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = propertyValues[propertyId][i];
          var packed = property.packVectorAndMatrixTypes(value);
          expect(packed).toEqual(value);
        }
      }
    }
  });

  it("unpackVectorAndMatrixTypes unpacks vectors and matrices", function () {
    var properties = {
      propertyVec2: {
        type: "VEC2",
        componentType: "FLOAT32",
      },
      propertyIVec3: {
        type: "VEC3",
        componentType: "INT32",
      },
      propertyDVec4: {
        type: "VEC3",
        componentType: "FLOAT64",
      },
      propertyMat4: {
        type: "MAT4",
        componentType: "FLOAT32",
      },
      propertyIMat3: {
        type: "MAT3",
        componentType: "FLOAT32",
      },
      propertyDMat2: {
        type: "MAT2",
        componentType: "FLOAT32",
      },
    };

    var propertyValues = {
      propertyVec2: [
        new Cartesian2(0.1, 0.8),
        new Cartesian2(0.3, 0.5),
        new Cartesian2(0.7, 0.2),
      ],
      propertyIVec3: [
        new Cartesian3(1, 2, 3),
        new Cartesian3(4, 5, 6),
        new Cartesian3(7, 8, 9),
      ],
      propertyDVec4: [
        new Cartesian4(0.1, 0.2, 0.3, 0.4),
        new Cartesian4(0.3, 0.2, 0.1, 0.0),
        new Cartesian4(0.1, 0.2, 0.4, 0.5),
      ],
      propertyMat4: [
        new Matrix4(1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1),
        new Matrix4(0, 2.5, 0, 0, 0, 0.5, 0.25, 0, 0, 0, 3.5, 0, 0, 0, 0, 1),
        new Matrix4(1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0),
      ],
      propertyIMat3: [
        new Matrix3(2, 0, 0, 0, 2, 0, 0, 0, 2),
        new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1),
        new Matrix3(1, 2, 3, 2, 3, 1, 3, 1, 2),
      ],
      propertyDMat2: [
        new Matrix2(1.5, 0.0, 0.0, 2.5),
        new Matrix2(1.0, 0.0, 0.0, 1.0),
        new Matrix2(1.5, 2.5, 3.5, 4.5),
      ],
    };

    var packedValues = {
      propertyVec2: [
        [0.1, 0.8],
        [0.3, 0.5],
        [0.7, 0.2],
      ],
      propertyIVec3: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      propertyDVec4: [
        [0.1, 0.2, 0.3, 0.4],
        [0.3, 0.2, 0.1, 0.0],
        [0.1, 0.2, 0.4, 0.5],
      ],
      propertyMat4: [
        // the MatrixN constructor is row-major, but internally things are
        // stored column-major. So these are the transpose of the above
        [1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 2.5, 0.5, 0, 0, 0, 0.25, 3.5, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 0, 0, 0, 0],
      ],
      propertyIMat3: [
        [2, 0, 0, 0, 2, 0, 0, 0, 2],
        [1, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 2, 3, 2, 3, 1, 3, 1, 2],
      ],
      propertyDMat2: [
        [1.5, 0.0, 0.0, 2.5],
        [1.0, 0.0, 0.0, 1.0],
        [1.5, 3.5, 2.5, 4.5],
      ],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        var length = propertyValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = packedValues[propertyId][i];
          var unpacked = property.unpackVectorAndMatrixTypes(value);
          expect(unpacked).toEqual(propertyValues[propertyId][i]);
        }
      }
    }
  });

  it("unpackVectorAndMatrixTypes does not affect other types", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var properties = {
      propertyString: {
        componentType: "STRING",
      },
      propertyBoolean: {
        componentType: "BOOLEAN",
      },
      propertyArray: {
        type: "ARRAY",
        componentType: "UINT8",
        componentCount: 5,
      },
      propertyBigIntArray: {
        type: "ARRAY",
        componentType: "UINT64",
        componentCount: 2,
      },
    };

    var propertyValues = {
      propertyString: ["a", "bc", ""],
      propertyBoolean: [true, false, false],
      propertyArray: [
        [1, 2, 3, 4, 5],
        [0, 1, 2, 3, 4],
        [1, 4, 9, 16, 25],
      ],
      propertyBigIntArray: [
        [BigInt(0), BigInt(0)], // eslint-disable-line
        [BigInt(1), BigInt(3)], // eslint-disable-line
        [BigInt(45), BigInt(32)], // eslint-disable-line
      ],
    };

    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        var length = propertyValues[propertyId].length;
        for (var i = 0; i < length; ++i) {
          var value = propertyValues[propertyId][i];
          var unpacked = property.unpackVectorAndMatrixTypes(value);
          expect(unpacked).toEqual(value);
        }
      }
    }
  });

  it("validate returns undefined if the value is valid", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC3",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(new Cartesian3(1.0, 2.0, 3.0))).toBeUndefined();
  });

  it("validate returns error message if type is ARRAY and value is not an array", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "ARRAY",
        componentType: "FLOAT32",
        componentCount: 8,
      },
    });

    expect(property.validate(8.0)).toBe("value 8 does not match type ARRAY");
  });

  it("validate returns error message if type is a vector or matrix and the component type is not vector-compatibile", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC2",
        componentType: "STRING",
      },
    });

    expect(property.validate(8.0)).toBe(
      "componentType STRING is incompatible with vector type VEC2"
    );

    property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "MAT3",
        componentType: "INT64",
      },
    });

    expect(property.validate(8.0)).toBe(
      "componentType INT64 is incompatible with matrix type MAT3"
    );
  });

  it("validate returns error message if type is a vector and value is not a Cartesian", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC2",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(8.0)).toBe("vector value 8 must be a Cartesian2");

    property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC3",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(8.0)).toBe("vector value 8 must be a Cartesian3");

    property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC4",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(8.0)).toBe("vector value 8 must be a Cartesian4");
  });

  it("validate returns error message if type is a matrix and value is not a Matrix", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "MAT2",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(8.0)).toBe("matrix value 8 must be a Matrix2");

    property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "MAT3",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(8.0)).toBe("matrix value 8 must be a Matrix3");

    property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "MAT4",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(8.0)).toBe("matrix value 8 must be a Matrix4");
  });

  it("validate returns error message if type is ARRAY and the array length does not match componentCount", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "ARRAY",
        componentType: "FLOAT32",
        componentCount: 6,
      },
    });

    expect(property.validate([1.0, 2.0])).toBe(
      "Array length does not match componentCount"
    );
  });

  it("validate returns error message if enum name is invalid", function () {
    var myEnum = new MetadataEnum({
      id: "myEnum",
      enum: {
        values: [
          {
            value: 0,
            name: "ValueA",
          },
          {
            value: 1,
            name: "ValueB",
          },
          {
            value: 999,
            name: "Other",
          },
        ],
      },
    });

    var property = new MetadataClassProperty({
      id: "myEnum",
      property: {
        componentType: "ENUM",
        enumType: "myEnum",
      },
      enums: {
        myEnum: myEnum,
      },
    });

    expect(property.validate("INVALID")).toBe(
      "value INVALID is not a valid enum name for myEnum"
    );
    expect(property.validate(0)).toBe(
      "value 0 is not a valid enum name for myEnum"
    );
  });

  it("validate returns error message if value does not match the type", function () {
    var types = [
      "INT8",
      "UINT8",
      "INT16",
      "UINT16",
      "INT32",
      "UINT32",
      "INT64",
      "UINT64",
      "FLOAT32",
      "FLOAT64",
      "BOOLEAN",
      "STRING",
    ];

    for (var i = 0; i < types.length; ++i) {
      var property = new MetadataClassProperty({
        id: "property",
        property: {
          componentType: types[i],
        },
      });
      expect(property.validate({})).toBe(
        "value [object Object] does not match type " + types[i]
      );
    }
  });

  it("validate returns error message if value is out of range", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var outOfRangeValues = {
      INT8: [-129, 128],
      UINT8: [-1, 256],
      INT16: [-32769, 32768],
      UINT16: [-1, 65536],
      INT32: [-2147483649, 2147483648],
      UINT32: [-1, 4294967296],
      INT64: [
        BigInt("-9223372036854775809"), // eslint-disable-line
        BigInt("9223372036854775808"), // eslint-disable-line
      ],
      UINT64: [
        BigInt(-1), // eslint-disable-line
        BigInt("18446744073709551616"), // eslint-disable-line
      ],
      FLOAT32: [-Number.MAX_VALUE, Number.MAX_VALUE],
    };

    for (var type in outOfRangeValues) {
      if (outOfRangeValues.hasOwnProperty(type)) {
        var values = outOfRangeValues[type];
        var property = new MetadataClassProperty({
          id: "property",
          property: {
            componentType: type,
          },
        });
        for (var i = 0; i < values.length; ++i) {
          expect(property.validate(values[i])).toBe(
            "value " + values[i] + " is out of range for type " + type
          );
        }
      }
    }
  });

  it("validate returns error message if component value is out of range", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    var outOfRangeValues = {
      INT8: [-129, 128],
      UINT8: [-1, 256],
      INT16: [-32769, 32768],
      UINT16: [-1, 65536],
      INT32: [-2147483649, 2147483648],
      UINT32: [-1, 4294967296],
      INT64: [
        BigInt("-9223372036854775809"), // eslint-disable-line
        BigInt("9223372036854775808"), // eslint-disable-line
      ],
      UINT64: [
        BigInt(-1), // eslint-disable-line
        BigInt("18446744073709551616"), // eslint-disable-line
      ],
      FLOAT32: [-Number.MAX_VALUE, Number.MAX_VALUE],
    };

    for (var componentType in outOfRangeValues) {
      if (outOfRangeValues.hasOwnProperty(componentType)) {
        var values = outOfRangeValues[componentType];
        var property = new MetadataClassProperty({
          id: "property",
          property: {
            type: "ARRAY",
            componentType: componentType,
          },
        });
        for (var i = 0; i < values.length; ++i) {
          expect(property.validate(values)).toBe(
            "value " + values[0] + " is out of range for type " + componentType
          );
        }
      }
    }
  });

  it("validate returns error message if value is outside the normalized range", function () {
    var propertyInt8 = new MetadataClassProperty({
      id: "property",
      property: {
        componentType: "INT8",
        normalized: true,
      },
    });

    var propertyUint8 = new MetadataClassProperty({
      id: "property",
      property: {
        componentType: "UINT8",
        normalized: true,
      },
    });

    expect(propertyInt8.validate(-1.1)).toBe(
      "value -1.1 is out of range for type INT8 (normalized)"
    );
    expect(propertyInt8.validate(1.1)).toBe(
      "value 1.1 is out of range for type INT8 (normalized)"
    );
    expect(propertyUint8.validate(-0.1)).toBe(
      "value -0.1 is out of range for type UINT8 (normalized)"
    );
    expect(propertyUint8.validate(1.1)).toBe(
      "value 1.1 is out of range for type UINT8 (normalized)"
    );
  });
});
