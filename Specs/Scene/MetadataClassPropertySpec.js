import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  clone,
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
    const property = new MetadataClassProperty({
      id: "height",
      property: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    });

    expect(property.id).toBe("height");
    expect(property.name).toBeUndefined();
    expect(property.description).toBeUndefined();
    expect(property.type).toBe(MetadataType.SCALAR);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBe(MetadataComponentType.FLOAT32);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT32);
    expect(property.isArray).toBe(false);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.normalized).toBe(false);
    expect(property.max).toBeUndefined();
    expect(property.min).toBeUndefined();
    expect(property.default).toBeUndefined();
    expect(property.required).toBe(false);
    expect(property.semantic).toBeUndefined();
    expect(property.extras).toBeUndefined();
    expect(property.extensions).toBeUndefined();
    expect(property._isLegacyExtension).toBe(false);
  });

  it("creates property", function () {
    const max = [32767, 0, 100];
    const min = [-32768, 0, -100];
    const propertyDefault = [0, 0, 0];
    const extras = {
      coordinates: [0, 1, 2],
    };
    const extensions = {
      EXT_other_extension: {},
    };

    const property = new MetadataClassProperty({
      id: "position",
      property: {
        name: "Position",
        description: "Position (X, Y, Z)",
        array: true,
        count: 3,
        type: "SCALAR",
        componentType: "INT16",
        normalized: true,
        max: max,
        min: min,
        default: propertyDefault,
        required: true,
        semantic: "_POSITION",
        extras: extras,
        extensions: extensions,
      },
    });

    expect(property.id).toBe("position");
    expect(property.name).toBe("Position");
    expect(property.description).toBe("Position (X, Y, Z)");
    expect(property.type).toBe(MetadataType.SCALAR);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBe(MetadataComponentType.INT16);
    expect(property.valueType).toBe(MetadataComponentType.INT16);
    expect(property.isArray).toBe(true);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).toBe(3);
    expect(property.normalized).toBe(true);
    expect(property.max).toBe(max);
    expect(property.min).toBe(min);
    expect(property.default).toBe(propertyDefault);
    expect(property.required).toBe(true);
    expect(property.semantic).toBe("_POSITION");
    expect(property.extras).toBe(extras);
    expect(property.extensions).toBe(extensions);
    expect(property._isLegacyExtension).toBe(false);
  });

  it("transcodes single properties from EXT_feature_metadata", function () {
    const max = [32767, 0, 100];
    const min = [-32768, 0, -100];
    const propertyDefault = 0;
    const extras = {
      coordinates: [0, 1, 2],
    };
    const extensions = {
      EXT_other_extension: {},
    };

    const property = new MetadataClassProperty({
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
    expect(property.type).toBe(MetadataType.SCALAR);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBe(MetadataComponentType.INT32);
    expect(property.valueType).toBe(MetadataComponentType.INT32);
    expect(property.isArray).toBe(false);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.normalized).toBe(true);
    expect(property.max).toBe(max);
    expect(property.min).toBe(min);
    expect(property.default).toBe(propertyDefault);
    expect(property.required).toBe(true);
    expect(property.semantic).toBe("_POSITION");
    expect(property.extras).toBe(extras);
    expect(property.extensions).toBe(extensions);
    expect(property._isLegacyExtension).toBe(true);
  });

  it("creates enum property", function () {
    const colorEnum = new MetadataEnum({
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

    const enums = {
      color: colorEnum,
    };

    const property = new MetadataClassProperty({
      id: "color",
      property: {
        type: "ENUM",
        enumType: "color",
        required: true,
      },
      enums: enums,
    });

    expect(property.required).toBe(true);
    expect(property.isArray).toBe(false);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.type).toBe(MetadataType.ENUM);
    expect(property.componentType).not.toBeDefined();
    expect(property.enumType).toBe(colorEnum);
    expect(property.valueType).toBe(MetadataComponentType.UINT16); // default enum valueType
    expect(property._isLegacyExtension).toBe(false);
  });

  it("creates array of enums with EXT_feature_metadata", function () {
    const colorEnum = new MetadataEnum({
      id: "color",
      enum: {
        valueType: "UINT32",
        values: [
          {
            name: "RED",
            value: 0,
          },
        ],
      },
    });

    const enums = {
      color: colorEnum,
    };

    const property = new MetadataClassProperty({
      id: "color",
      property: {
        type: "ARRAY",
        componentType: "ENUM",
        componentCount: 4,
        enumType: "color",
      },
      enums: enums,
    });

    expect(property.isArray).toBe(true);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).toBe(4);
    expect(property.type).toBe(MetadataType.ENUM);
    expect(property.componentType).not.toBeDefined();
    expect(property.enumType).toBe(colorEnum);
    expect(property.valueType).toBe(MetadataComponentType.UINT32);
    expect(property._isLegacyExtension).toBe(true);
  });

  it("creates vector and matrix types", function () {
    let property = new MetadataClassProperty({
      id: "speed",
      property: {
        type: "VEC2",
        componentType: "FLOAT32",
      },
    });

    expect(property.id).toBe("speed");
    expect(property.type).toBe(MetadataType.VEC2);
    expect(property.isArray).toBe(false);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.componentType).toBe(MetadataComponentType.FLOAT32);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT32);
    expect(property._isLegacyExtension).toBe(false);

    property = new MetadataClassProperty({
      id: "scale",
      property: {
        type: "MAT3",
        componentType: "FLOAT64",
      },
    });

    expect(property.id).toBe("scale");
    expect(property.type).toBe(MetadataType.MAT3);
    expect(property.isArray).toBe(false);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.componentType).toBe(MetadataComponentType.FLOAT64);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT64);
    expect(property._isLegacyExtension).toBe(false);
  });

  it("creates arrays of BOOLEAN and STRING with EXT_feature_metadata", function () {
    let property = new MetadataClassProperty({
      id: "booleanArray",
      property: {
        type: "ARRAY",
        componentType: "BOOLEAN",
      },
    });

    expect(property.id).toBe("booleanArray");
    expect(property.type).toBe(MetadataType.BOOLEAN);
    expect(property.isArray).toBe(true);
    expect(property.isVariableLengthArray).toBe(true);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.componentType).not.toBeDefined();
    expect(property.valueType).not.toBeDefined();
    expect(property._isLegacyExtension).toBe(true);

    property = new MetadataClassProperty({
      id: "stringArray",
      property: {
        type: "ARRAY",
        componentType: "STRING",
        componentCount: 2,
      },
    });

    expect(property.id).toBe("stringArray");
    expect(property.type).toBe(MetadataType.STRING);
    expect(property.isArray).toBe(true);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).toBe(2);
    expect(property.componentType).not.toBeDefined();
    expect(property.valueType).not.toBeDefined();
    expect(property._isLegacyExtension).toBe(true);
  });

  it("creates arrays of vector and matrix types", function () {
    let property = new MetadataClassProperty({
      id: "speeds",
      property: {
        type: "VEC2",
        componentType: "FLOAT32",
        array: true,
      },
    });

    expect(property.id).toBe("speeds");
    expect(property.type).toBe(MetadataType.VEC2);
    expect(property.isArray).toBe(true);
    expect(property.isVariableLengthArray).toBe(true);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.componentType).toBe(MetadataComponentType.FLOAT32);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT32);
    expect(property._isLegacyExtension).toBe(false);

    property = new MetadataClassProperty({
      id: "scaleFactors",
      property: {
        type: "MAT3",
        componentType: "FLOAT64",
        array: true,
        count: 2,
      },
    });

    expect(property.id).toBe("scaleFactors");
    expect(property.type).toBe(MetadataType.MAT3);
    expect(property.isArray).toBe(true);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).toBe(2);
    expect(property.componentType).toBe(MetadataComponentType.FLOAT64);
    expect(property.valueType).toBe(MetadataComponentType.FLOAT64);
    expect(property._isLegacyExtension).toBe(false);
  });

  it("handles ambiguous extension gracefully", function () {
    const property = new MetadataClassProperty({
      id: "name",
      property: {
        // this is valid in both EXT_structural_metadata and EXT_feature_metadata
        type: "STRING",
      },
    });

    expect(property.id).toBe("name");
    expect(property.required).toBe(false);
    expect(property.type).toBe(MetadataType.STRING);
    expect(property.isArray).toBe(false);
    expect(property.isVariableLengthArray).toBe(false);
    expect(property.arrayLength).not.toBeDefined();
    expect(property.componentType).not.toBeDefined();
    expect(property.valueType).not.toBeDefined();
    expect(property._isLegacyExtension).not.toBeDefined();
  });

  it("constructor throws with invalid type definition", function () {
    expect(function () {
      return new MetadataClassProperty({
        id: "propertyId",
        property: {
          type: "NOT_A_TYPE",
        },
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without id", function () {
    expect(function () {
      return new MetadataClassProperty({
        id: undefined,
        property: {
          type: "VEC2",
          componentType: "FLOAT32",
        },
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without property", function () {
    expect(function () {
      return new MetadataClassProperty({
        id: "propertyId",
        property: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without property.type", function () {
    expect(function () {
      return new MetadataClassProperty({
        id: "propertyId",
        property: {
          type: undefined,
          componentType: "FLOAT32",
        },
      });
    }).toThrowDeveloperError();
  });

  describe("expandConstant", function () {
    fail();
  });

  describe("normalize and unnormalize", function () {
    let scalarProperties;
    let scalarValues;
    let normalizedScalarValues;

    let arrayProperties;
    let arrayValues;
    let normalizedArrayValues;

    let vectorProperties;
    let vectorValues;
    let normalizedVectorValues;

    let arrayOfVectorProperties;
    let arrayOfVectorValues;
    let normalizedArrayOfVectorValues;

    let myEnum;
    let nonIntegerProperties;
    let nonIntegerValues;
    beforeAll(function () {
      scalarProperties = {
        propertyInt8: {
          type: "SCALAR",
          componentType: "INT8",
          normalized: true,
        },
        propertyUint8: {
          type: "SCALAR",
          componentType: "UINT8",
          normalized: true,
        },
        propertyInt16: {
          type: "SCALAR",
          componentType: "INT16",
          normalized: true,
        },
        propertyUint16: {
          type: "SCALAR",
          componentType: "UINT16",
          normalized: true,
        },
        propertyInt32: {
          type: "SCALAR",
          componentType: "INT32",
          normalized: true,
        },
        propertyUint32: {
          type: "SCALAR",
          componentType: "UINT32",
          normalized: true,
        },
        propertyInt64: {
          type: "SCALAR",
          componentType: "INT64",
          normalized: true,
        },
        propertyUint64: {
          type: "SCALAR",
          componentType: "UINT64",
          normalized: true,
        },
      };

      scalarValues = {
        propertyInt8: [-127, 0, 127],
        propertyUint8: [0, 51, 255],
        propertyInt16: [-32767, 0, 32767],
        propertyUint16: [0, 13107, 65535],
        propertyInt32: [-2147483647, 0, 2147483647],
        propertyUint32: [0, 858993459, 4294967295],
        propertyInt64: [
          BigInt("-9223372036854775807"), // eslint-disable-line
          BigInt(0), // eslint-disable-line
          BigInt("9223372036854775807"), // eslint-disable-line
        ],
        propertyUint64: [
          BigInt(0), // eslint-disable-line
          BigInt("3689348814741910528"), // eslint-disable-line
          BigInt("18446744073709551615"), // eslint-disable-line
        ],
      };

      normalizedScalarValues = {
        propertyInt8: [-1.0, 0, 1.0],
        propertyUint8: [0.0, 0.2, 1.0],
        propertyInt16: [-1.0, 0, 1.0],
        propertyUint16: [0.0, 0.2, 1.0],
        propertyInt32: [-1.0, 0, 1.0],
        propertyUint32: [0.0, 0.2, 1.0],
        propertyInt64: [-1.0, 0, 1.0],
        propertyUint64: [0.0, 0.2, 1.0],
      };

      arrayProperties = {
        propertyInt8: {
          array: true,
          type: "SCALAR",
          componentType: "INT8",
          normalized: true,
        },
        propertyUint8: {
          array: true,
          count: 2,
          type: "SCALAR",
          componentType: "UINT8",
          normalized: true,
        },
        propertyVector: {
          type: "VEC3",
          componentType: "UINT8",
          normalized: true,
          array: true,
          count: 3,
        },
        propertyMatrix: {
          type: "MAT2",
          componentType: "UINT8",
          normalized: true,
          array: true,
        },
      };

      arrayValues = {
        propertyInt8: [[-127, 0], [127], []],
        propertyUint8: [
          [0, 255],
          [0, 51],
          [255, 255],
        ],
        propertyVector: [
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 255],
        ],
        propertyMatrix: [
          [255, 255, 255, 255],
          [51, 0, 0, 51],
        ],
      };

      normalizedArrayValues = {
        propertyInt8: [[-1.0, 0.0], [1.0], []],
        propertyUint8: [
          [0.0, 1.0],
          [0.0, 0.2],
          [1.0, 1.0],
        ],
        propertyVector: [
          [1.0, 0.0, 0.0],
          [0.0, 1.0, 0.0],
          [0.0, 0.0, 1.0],
        ],
        propertyMatrix: [
          [1.0, 1.0, 1.0, 1.0],
          [0.2, 0.0, 0.0, 0.2],
        ],
      };

      vectorProperties = {
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

      vectorValues = {
        vec4Int8: [
          [-127, 0, 127, 0],
          [-127, -127, -127, 0],
          [127, 127, 127, 127],
        ],
        mat2Uint8: [
          [0, 255, 0, 0],
          [0, 51, 51, 0],
          [255, 0, 0, 255],
        ],
      };

      normalizedVectorValues = {
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

      arrayOfVectorProperties = {
        propertyVector: {
          type: "VEC3",
          componentType: "UINT8",
          normalized: true,
          array: true,
          count: 2,
        },
        propertyMatrix: {
          type: "MAT2",
          componentType: "UINT8",
          normalized: true,
          array: true,
        },
      };

      arrayOfVectorValues = {
        propertyVector: [
          [
            [255, 0, 0],
            [0, 255, 0],
          ],
          [
            [0, 0, 255],
            [255, 255, 0],
          ],
        ],
        propertyMatrix: [
          [
            [255, 255, 255, 255],
            [51, 0, 0, 51],
          ],
          [],
        ],
      };

      normalizedArrayOfVectorValues = {
        propertyVector: [
          [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
          ],
          [
            [0.0, 0.0, 1.0],
            [1.0, 1.0, 0.0],
          ],
        ],
        propertyMatrix: [
          [
            [1.0, 1.0, 1.0, 1.0],
            [0.2, 0.0, 0.0, 0.2],
          ],
          [],
        ],
      };

      myEnum = new MetadataEnum({
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

      nonIntegerProperties = {
        propertyEnum: {
          type: "ENUM",
          enumType: "myEnum",
        },
        propertyEnumArray: {
          type: "ENUM",
          array: true,
          enumType: "myEnum",
        },
        propertyString: {
          type: "STRING",
        },
        propertyBoolean: {
          type: "BOOLEAN",
        },
      };

      nonIntegerValues = {
        propertyEnum: ["Other", "ValueA", "ValueB"],
        propertyEnumArray: [["Other", "ValueA"], ["ValueB"], []],
        propertyString: ["a", "bc", ""],
        propertyBoolean: [true, false, false],
      };
    });

    it("normalizes scalar values", function () {
      if (!FeatureDetection.supportsBigInt()) {
        return;
      }

      for (const propertyId in scalarProperties) {
        if (scalarProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: scalarProperties[propertyId],
          });
          const length = normalizedScalarValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = scalarValues[propertyId][i];
            const normalizedValue = property.normalize(value);
            expect(normalizedValue).toEqual(
              normalizedScalarValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unnormalizes scalar values", function () {
      if (!FeatureDetection.supportsBigInt()) {
        return;
      }

      for (const propertyId in scalarProperties) {
        if (scalarProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: scalarProperties[propertyId],
          });
          const length = scalarValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const normalizedValue = normalizedScalarValues[propertyId][i];
            const value = property.unnormalize(normalizedValue);
            expect(value).toEqual(scalarValues[propertyId][i]);
          }
        }
      }
    });

    it("normalizes array values", function () {
      for (const propertyId in arrayProperties) {
        if (arrayProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayProperties[propertyId],
          });
          const length = normalizedArrayValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = arrayValues[propertyId][i];
            const normalizedValue = property.normalize(clone(value, true));
            expect(normalizedValue).toEqual(
              normalizedArrayValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unnormalizes array values", function () {
      for (const propertyId in arrayProperties) {
        if (arrayProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayProperties[propertyId],
          });
          const length = arrayValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const normalizedValue = normalizedArrayValues[propertyId][i];
            const value = property.unnormalize(clone(normalizedValue, true));
            expect(value).toEqual(arrayValues[propertyId][i]);
          }
        }
      }
    });

    it("normalizes vector and matrix values", function () {
      for (const propertyId in vectorProperties) {
        if (vectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: vectorProperties[propertyId],
          });
          const length = normalizedVectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = vectorValues[propertyId][i];
            const normalizedValue = property.normalize(clone(value, true));
            expect(normalizedValue).toEqual(
              normalizedVectorValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unnormalizes vector and matrix values", function () {
      for (const propertyId in vectorProperties) {
        if (vectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: vectorProperties[propertyId],
          });
          const length = vectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const normalizedValue = normalizedVectorValues[propertyId][i];
            const value = property.unnormalize(clone(normalizedValue, true));
            expect(value).toEqual(vectorValues[propertyId][i]);
          }
        }
      }
    });

    it("normalizes nested arrays of vectors", function () {
      for (const propertyId in arrayOfVectorProperties) {
        if (arrayOfVectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayOfVectorProperties[propertyId],
          });
          const length = normalizedArrayOfVectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = arrayOfVectorValues[propertyId][i];
            const normalizedValue = property.normalize(clone(value, true));
            expect(normalizedValue).toEqual(
              normalizedArrayOfVectorValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unnormalizes nested arrays of vectors", function () {
      for (const propertyId in arrayOfVectorProperties) {
        if (arrayOfVectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayOfVectorProperties[propertyId],
          });
          const length = arrayOfVectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const normalizedValue =
              normalizedArrayOfVectorValues[propertyId][i];
            const value = property.unnormalize(clone(normalizedValue, true));
            expect(value).toEqual(arrayOfVectorValues[propertyId][i]);
          }
        }
      }
    });

    it("does not normalize non integer types", function () {
      for (const propertyId in nonIntegerProperties) {
        if (nonIntegerProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: nonIntegerProperties[propertyId],
            enums: {
              myEnum: myEnum,
            },
          });
          const length = nonIntegerValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = nonIntegerValues[propertyId][i];
            const normalizedValue = property.normalize(value);
            expect(normalizedValue).toEqual(value);
          }
        }
      }
    });

    it("does not unnormalize non integer types", function () {
      for (const propertyId in nonIntegerProperties) {
        if (nonIntegerProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: nonIntegerProperties[propertyId],
            enums: {
              myEnum: myEnum,
            },
          });
          const length = nonIntegerValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const normalizedValue = nonIntegerValues[propertyId][i];
            const value = property.unnormalize(normalizedValue);
            expect(value).toEqual(normalizedValue);
          }
        }
      }
    });
  });

  describe("value transform", function () {
    let scalarProperties;
    let scalarValues;
    let transformedScalarValues;

    let arrayProperties;
    let arrayValues;
    let transformedArrayValues;

    let vectorProperties;
    let vectorValues;
    let transformedVectorValues;

    let arrayOfVectorProperties;
    let arrayOfVectorValues;
    let transformedArrayOfVectorValues;

    let myEnum;
    let otherProperties;
    let otherValues;
    beforeAll(function () {
      scalarProperties = {
        propertyInt8: {
          type: "SCALAR",
          componentType: "INT8",
          normalized: true,
          offset: 1,
          scale: 2,
        },
        propertyUint8: {
          type: "SCALAR",
          componentType: "UINT8",
          normalized: true,
          offset: 2,
          scale: 2,
        },
        propertyInt16: {
          type: "SCALAR",
          componentType: "INT16",
          normalized: true,
          scale: 2,
        },
        propertyUint16: {
          type: "SCALAR",
          componentType: "UINT16",
          normalized: true,
          offset: 4,
        },
        propertyInt32: {
          type: "SCALAR",
          componentType: "INT32",
          normalized: true,
          offset: 0,
          scale: 1,
        },
        propertyUint32: {
          type: "SCALAR",
          componentType: "UINT32",
          normalized: true,
          scale: 2,
          offset: 2,
        },
        propertyInt64: {
          type: "SCALAR",
          componentType: "INT64",
          normalized: true,
          offset: -1,
          scale: 0.5,
        },
        propertyUint64: {
          type: "SCALAR",
          componentType: "UINT64",
          normalized: true,
          offset: 1,
          scale: 2,
        },
        propertyFloat32: {
          type: "SCALAR",
          componentType: "FLOAT32",
          offset: 8,
          scale: 4,
        },
        propertyFloat64: {
          type: "SCALAR",
          componentType: "FLOAT64",
          offset: 4,
          scale: 2,
        },
      };

      scalarValues = {
        // Integer properties must be normalized to use valueTransform
        propertyInt8: [-1.0, 0.0, 1.0],
        propertyUint8: [0.0, 0.5, 1.0],
        propertyInt16: [-1.0, 0.0, 1.0],
        propertyUint16: [0.0, 0.5, 1.0],
        propertyInt32: [-1.0, 0.0, 1.0],
        propertyUint32: [0, 0.5, 1.0],
        propertyInt64: [-1.0, 0.0, 1.0],
        propertyUint64: [0, 0.5, 1.0],
        // Float properties do not have such restriction
        propertyFloat32: [-8.0, 3.0, 256.0],
        propertyFloat64: [-4.5, 0.0, 45.0],
      };

      transformedScalarValues = {
        propertyInt8: [-1.0, 1.0, 3.0],
        propertyUint8: [2.0, 3.0, 4.0],
        propertyInt16: [-2.0, 0, 2.0],
        propertyUint16: [4.0, 4.5, 5.0],
        propertyInt32: [-1.0, 0, 1.0],
        propertyUint32: [2.0, 3.0, 4.0],
        propertyInt64: [-1.5, -1.0, -0.5],
        propertyUint64: [1.0, 2.0, 3.0],
        propertyFloat32: [-24.0, 20.0, 1032.0],
        propertyFloat64: [-5.0, 4.0, 94.0],
      };

      arrayProperties = {
        propertyInt8: {
          array: true,
          count: 3,
          type: "SCALAR",
          componentType: "INT8",
          normalized: true,
          offset: [1, 2, 3],
          scale: [2, 2, 2],
        },
        propertyFloat32: {
          array: true,
          count: 2,
          type: "SCALAR",
          componentType: "FLOAT32",
          normalized: true,
          offset: [-1, -1],
          scale: [2, 1],
        },
        propertyDefaultOffset: {
          array: true,
          count: 2,
          type: "SCALAR",
          componentType: "FLOAT32",
          normalized: true,
          scale: [2, 2],
        },
        propertyDefaultScale: {
          array: true,
          count: 2,
          type: "SCALAR",
          componentType: "FLOAT32",
          normalized: true,
          offset: [1, 2],
        },
      };

      arrayValues = {
        propertyInt8: [
          [-1.0, 0.0, 1.0],
          [1.0, 1.0, 1.0],
          [0.0, 0.5, 1.0],
        ],
        propertyFloat32: [
          [0.0, 1.0],
          [0.0, 0.125],
          [1.0, 1.0],
        ],
        propertyDefaultOffset: [
          [-1, 1],
          [-2, 4],
          [-0.5, 0.5],
        ],
        propertyDefaultScale: [
          [-1, 1],
          [-2, 4],
          [-0.5, 0.5],
        ],
      };

      transformedArrayValues = {
        propertyInt8: [
          [-1.0, 2.0, 5.0],
          [3.0, 4.0, 5.0],
          [1.0, 3.0, 5.0],
        ],
        propertyFloat32: [
          [-1.0, 0.0],
          [-1.0, -0.875],
          [1.0, 0.0],
        ],
        propertyDefaultOffset: [
          [-2, 2],
          [-4, 8],
          [-1, 1],
        ],
        propertyDefaultScale: [
          [0, 3],
          [-1, 6],
          [0.5, 2.5],
        ],
      };

      vectorProperties = {
        vec4Int8: {
          type: "VEC4",
          componentType: "INT8",
          normalized: true,
          offset: [3, 3, 0, 1],
          scale: [2, 8, 4, 1],
        },
        mat2Float32: {
          type: "MAT2",
          componentType: "FLOAT32",
          normalized: true,
          scale: [0.25, 0.25, 1.0, 1.0],
        },
      };

      vectorValues = {
        vec4Int8: [
          [-1.0, 0.0, 1.0, 0],
          [-1.0, -1.0, -1.0, 0],
          [1.0, 1.0, 1.0, 1.0],
        ],
        mat2Float32: [
          [0.0, 1.0, 0.0, 0.0],
          [0.0, 0.25, 0.25, 0.0],
          [1.0, 0.0, 0.0, 1.0],
        ],
      };

      transformedVectorValues = {
        vec4Int8: [
          [1, 3, 4, 1],
          [1, -5, -4, 1],
          [5, 11, 4, 2],
        ],
        mat2Float32: [
          [0.0, 0.25, 0.0, 0.0],
          [0.0, 0.0625, 0.25, 0.0],
          [0.25, 0.0, 0.0, 1.0],
        ],
      };

      arrayOfVectorProperties = {
        propertyVector: {
          type: "VEC3",
          componentType: "UINT8",
          normalized: true,
          array: true,
          count: 2,
          offset: [
            [2, 2, 2],
            [0, 1, 2],
          ],
        },
        propertyMatrix: {
          type: "MAT2",
          componentType: "UINT8",
          normalized: true,
          array: true,
          count: 2,
          scale: [
            [2, 2, 2, 1],
            [1, 1, 1, 1],
          ],
        },
      };

      arrayOfVectorValues = {
        propertyVector: [
          [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
          ],
          [
            [0.0, 0.0, 1.0],
            [1.0, 1.0, 0.0],
          ],
        ],
        propertyMatrix: [
          [
            [1.0, 1.0, 1.0, 1.0],
            [0.25, 0.0, 0.0, 0.25],
          ],
          [
            [0.0, -1.0, 1.0, 0.0],
            [2.0, 0.0, 0.0, 2.0],
          ],
        ],
      };

      transformedArrayOfVectorValues = {
        propertyVector: [
          [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
          ],
          [
            [0.0, 0.0, 1.0],
            [1.0, 1.0, 0.0],
          ],
        ],
        propertyMatrix: [
          [
            [1.0, 1.0, 1.0, 1.0],
            [0.25, 0.0, 0.0, 0.25],
          ],
          [
            [0.0, -1.0, 1.0, 0],
            [2.0, 0.0, 0.0, 2.0],
          ],
        ],
      };

      transformedArrayOfVectorValues = {
        propertyVector: [
          [
            [3.0, 2.0, 2.0],
            [0.0, 2.0, 2.0],
          ],
          [
            [2.0, 2.0, 3.0],
            [1.0, 2.0, 2.0],
          ],
        ],
        propertyMatrix: [
          [
            [2.0, 2.0, 2.0, 1.0],
            [0.25, 0.0, 0.0, 0.25],
          ],
          [
            [0.0, -2.0, 2.0, 0.0],
            [2.0, 0.0, 0.0, 2.0],
          ],
        ],
      };

      myEnum = new MetadataEnum({
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

      otherProperties = {
        propertyEnum: {
          type: "ENUM",
          enumType: "myEnum",
        },
        propertyEnumArray: {
          type: "ENUM",
          array: true,
          enumType: "myEnum",
        },
        propertyString: {
          type: "STRING",
        },
        propertyBoolean: {
          type: "BOOLEAN",
        },
        propertyIntegerNotNormalized: {
          type: "SCALAR",
          normalized: false,
          offset: 1,
          scale: 2,
        },
      };

      otherValues = {
        propertyEnum: ["Other", "ValueA", "ValueB"],
        propertyEnumArray: [["Other", "ValueA"], ["ValueB"], []],
        propertyString: ["a", "bc", ""],
        propertyBoolean: [true, false, false],
        propertyIntegerNotNormalized: [1.0, 2.0, 3.0],
      };
    });

    it("applies value transform for scalar values", function () {
      if (!FeatureDetection.supportsBigInt()) {
        return;
      }

      for (const propertyId in scalarProperties) {
        if (scalarProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: scalarProperties[propertyId],
          });
          const length = transformedScalarValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = scalarValues[propertyId][i];
            const transformedValue = property.applyValueTransform(value);
            expect(transformedValue).toEqual(
              transformedScalarValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unapplies value transform for scalar values", function () {
      if (!FeatureDetection.supportsBigInt()) {
        return;
      }

      for (const propertyId in scalarProperties) {
        if (scalarProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: scalarProperties[propertyId],
          });
          const length = scalarValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const transformedValue = transformedScalarValues[propertyId][i];
            const value = property.unapplyValueTransform(transformedValue);
            expect(value).toEqual(scalarValues[propertyId][i]);
          }
        }
      }
    });

    it("unapplyValueTransform returns 0 when scale is 0", function () {
      const property = new MetadataClassProperty({
        id: "zeroScale",
        property: {
          type: "SCALAR",
          componentType: "FLOAT32",
          offset: 1,
          scale: 0,
        },
      });

      expect(property.unapplyValueTransform(35.0)).toBe(0.0);
    });

    it("applies value transform for array values", function () {
      for (const propertyId in arrayProperties) {
        if (arrayProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayProperties[propertyId],
          });
          const length = transformedArrayValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = arrayValues[propertyId][i];
            const transformedValue = property.applyValueTransform(
              clone(value, true)
            );
            expect(transformedValue).toEqual(
              transformedArrayValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unapplies value transform for array values", function () {
      for (const propertyId in arrayProperties) {
        if (arrayProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayProperties[propertyId],
          });
          const length = arrayValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const transformedValue = transformedArrayValues[propertyId][i];
            const value = property.unapplyValueTransform(
              clone(transformedValue, true)
            );
            expect(value).toEqual(arrayValues[propertyId][i]);
          }
        }
      }
    });

    it("applyValueTranform does not transform variable length arrays", function () {
      fail();
    });

    it("unapplyValueTransform does not transform variable length arrays", function () {
      fail();
    });

    it("applies value transform for vector and matrix values", function () {
      for (const propertyId in vectorProperties) {
        if (vectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: vectorProperties[propertyId],
          });
          const length = transformedVectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = vectorValues[propertyId][i];
            const transformedValue = property.applyValueTransform(
              clone(value, true)
            );
            expect(transformedValue).toEqual(
              transformedVectorValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unapplies value transform for vector and matrix values", function () {
      for (const propertyId in vectorProperties) {
        if (vectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: vectorProperties[propertyId],
          });
          const length = vectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const transformedValue = transformedVectorValues[propertyId][i];
            const value = property.unapplyValueTransform(
              clone(transformedValue, true)
            );
            expect(value).toEqual(vectorValues[propertyId][i]);
          }
        }
      }
    });

    it("applies value transform for arrays of vectors", function () {
      for (const propertyId in arrayOfVectorProperties) {
        if (arrayOfVectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayOfVectorProperties[propertyId],
          });
          const length = transformedArrayOfVectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = arrayOfVectorValues[propertyId][i];
            const transformedValue = property.applyValueTransform(
              clone(value, true)
            );
            expect(transformedValue).toEqual(
              transformedArrayOfVectorValues[propertyId][i]
            );
          }
        }
      }
    });

    it("unapplies value transform for arrays of vectors", function () {
      for (const propertyId in arrayOfVectorProperties) {
        if (arrayOfVectorProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: arrayOfVectorProperties[propertyId],
          });
          const length = arrayOfVectorValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const transformedValue =
              transformedArrayOfVectorValues[propertyId][i];
            const value = property.unapplyValueTransform(
              clone(transformedValue, true)
            );
            expect(value).toEqual(arrayOfVectorValues[propertyId][i]);
          }
        }
      }
    });

    it("does not apply transform to other types", function () {
      for (const propertyId in otherProperties) {
        if (otherProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: otherProperties[propertyId],
            enums: {
              myEnum: myEnum,
            },
          });
          const length = otherValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = otherValues[propertyId][i];
            const normalizedValue = property.normalize(value);
            expect(normalizedValue).toEqual(value);
          }
        }
      }
    });

    it("does not unaapply transform to other types", function () {
      for (const propertyId in otherProperties) {
        if (otherProperties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: otherProperties[propertyId],
            enums: {
              myEnum: myEnum,
            },
          });
          const length = otherValues[propertyId].length;
          for (let i = 0; i < length; ++i) {
            const value = otherValues[propertyId][i];
            const normalizedValue = property.normalize(value);
            expect(normalizedValue).toEqual(value);
          }
        }
      }
    });
  });

  describe("handleNoData", function () {
    let properties;
    beforeAll(function () {
      properties = {
        float: {
          type: "SCALAR",
          componentType: "FLOAT64",
          noData: -1.0,
        },
        array: {
          array: true,
          count: 4,
          type: "SCALAR",
          componentType: "UINT8",
          noData: [255, 255, 255, 255],
        },
        variableLengthArray: {
          array: true,
          type: "STRING",
          noData: [],
        },
        arrayOfVector: {
          array: true,
          count: 2,
          type: "VEC2",
          componentType: "FLOAT32",
          noData: [
            [0, 0],
            [0, 0],
          ],
        },
      };
    });

    it("passes through valid values unchanged", function () {
      const propertyValues = {
        float: 1.0,
        array: [0, 0, 0, 255],
        variableLengthArray: ["Hello", "World"],
        arrayOfVector: [
          [1, 1],
          [2, -1],
        ],
      };

      for (const propertyId in properties) {
        if (properties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: properties[propertyId],
          });
          const expected = propertyValues[propertyId];
          const actual = property.handleNoData(expected);
          expect(actual).toBe(expected);
        }
      }
    });

    it("converts noData values to undefined", function () {
      const propertyValues = {
        float: -1,
        array: [255, 255, 255, 255],
        variableLengthArray: [],
        arrayOfVector: [
          [0, 0],
          [0, 0],
        ],
      };

      for (const propertyId in properties) {
        if (properties.hasOwnProperty(propertyId)) {
          const property = new MetadataClassProperty({
            id: propertyId,
            property: properties[propertyId],
          });
          const value = propertyValues[propertyId];
          const actual = property.handleNoData(value);
          expect(actual).not.toBeDefined();
        }
      }
    });
  });

  it("packVectorAndMatrixTypes packs vectors and matrices", function () {
    const properties = {
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

    const propertyValues = {
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

    const packedValues = {
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

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        const length = propertyValues[propertyId].length;
        for (let i = 0; i < length; ++i) {
          const value = propertyValues[propertyId][i];
          const packed = property.packVectorAndMatrixTypes(value);
          expect(packed).toEqual(packedValues[propertyId][i]);
        }
      }
    }
  });

  it("packVectorAndMatrixTypes packs arrays of vectors and matrices", function () {
    const properties = {
      propertyVec2: {
        type: "VEC2",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIVec3: {
        type: "VEC3",
        componentType: "INT32",
        array: true,
        count: 3,
      },
      propertyDVec4: {
        type: "VEC4",
        componentType: "FLOAT64",
        array: true,
      },
      propertyMat4: {
        type: "MAT4",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIMat3: {
        type: "MAT3",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
      propertyDMat2: {
        type: "MAT2",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
    };

    const propertyValues = {
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

    // prettier-ignore
    const packedValues = {
      propertyVec2: [
        0.1, 0.8,
        0.3, 0.5,
        0.7, 0.2,
      ],
      propertyIVec3: [
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
      ],
      propertyDVec4: [
        0.1, 0.2, 0.3, 0.4,
        0.3, 0.2, 0.1, 0.0,
        0.1, 0.2, 0.4, 0.5,
      ],
      propertyMat4: [
        // the MatrixN constructor is row-major, but internally things are
        // stored column-major. So these are the transpose of the above
        1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 2.5, 0.5, 0, 0, 0, 0.25, 3.5, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 0, 0, 0, 0,
      ],
      propertyIMat3: [
        2, 0, 0, 0, 2, 0, 0, 0, 2,
        1, 0, 0, 0, 1, 0, 0, 0, 1,
        1, 2, 3, 2, 3, 1, 3, 1, 2,
      ],
      propertyDMat2: [
        1.5, 0.0, 0.0, 2.5,
        1.0, 0.0, 0.0, 1.0,
        1.5, 3.5, 2.5, 4.5,
      ],
    };

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });

        const value = propertyValues[propertyId];
        const packed = property.packVectorAndMatrixTypes(value);
        const expected = packedValues[propertyId];
        expect(packed).toEqual(expected);
      }
    }
  });

  it("packVectorAndMatrixTypes packs nested arrays of vectors", function () {
    const properties = {
      propertyVec2: {
        type: "VEC2",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIVec3: {
        type: "VEC3",
        componentType: "INT32",
        array: true,
        count: 3,
      },
      propertyDVec4: {
        type: "VEC4",
        componentType: "FLOAT64",
        array: true,
      },
      propertyMat4: {
        type: "MAT4",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIMat3: {
        type: "MAT3",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
      propertyDMat2: {
        type: "MAT2",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
    };

    const propertyValues = {
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

    // prettier-ignore
    const packedValues = {
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

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });

        const value = propertyValues[propertyId];
        const nested = true;
        const packed = property.packVectorAndMatrixTypes(value, nested);
        const expected = packedValues[propertyId];
        expect(packed).toEqual(expected);
      }
    }
  });

  it("packVectorAndMatrixTypes does not affect other types", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const properties = {
      propertyString: {
        type: "STRING",
      },
      propertyBoolean: {
        type: "BOOLEAN",
      },
      propertyArray: {
        type: "SCALAR",
        componentType: "UINT8",
        array: true,
        count: 5,
      },
      propertyBigIntArray: {
        type: "SCALAR",
        componentType: "UINT64",
        array: true,
        count: 2,
      },
    };

    const propertyValues = {
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

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        const length = propertyValues[propertyId].length;
        for (let i = 0; i < length; ++i) {
          const value = propertyValues[propertyId][i];
          const packed = property.packVectorAndMatrixTypes(value);
          expect(packed).toEqual(value);
        }
      }
    }
  });

  it("unpackVectorAndMatrixTypes unpacks vectors and matrices", function () {
    const properties = {
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

    const propertyValues = {
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

    const packedValues = {
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

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        const length = propertyValues[propertyId].length;
        for (let i = 0; i < length; ++i) {
          const value = packedValues[propertyId][i];
          const unpacked = property.unpackVectorAndMatrixTypes(value);
          expect(unpacked).toEqual(propertyValues[propertyId][i]);
        }
      }
    }
  });

  it("unpackVectorAndMatrixTypes unpacks arrays of vectors and matrices", function () {
    const properties = {
      propertyVec2: {
        type: "VEC2",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIVec3: {
        type: "VEC3",
        componentType: "INT32",
        array: true,
        count: 3,
      },
      propertyDVec4: {
        type: "VEC4",
        componentType: "FLOAT64",
        array: true,
      },
      propertyMat4: {
        type: "MAT4",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIMat3: {
        type: "MAT3",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
      propertyDMat2: {
        type: "MAT2",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
    };

    const propertyValues = {
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

    // prettier-ignore
    const packedValues = {
      propertyVec2: [
        0.1, 0.8,
        0.3, 0.5,
        0.7, 0.2,
      ],
      propertyIVec3: [
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
      ],
      propertyDVec4: [
        0.1, 0.2, 0.3, 0.4,
        0.3, 0.2, 0.1, 0.0,
        0.1, 0.2, 0.4, 0.5,
      ],
      propertyMat4: [
        // the MatrixN constructor is row-major, but internally things are
        // stored column-major. So these are the transpose of the above
        1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 2.5, 0.5, 0, 0, 0, 0.25, 3.5, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 0, 0, 0, 0,
      ],
      propertyIMat3: [
        2, 0, 0, 0, 2, 0, 0, 0, 2,
        1, 0, 0, 0, 1, 0, 0, 0, 1,
        1, 2, 3, 2, 3, 1, 3, 1, 2,
      ],
      propertyDMat2: [
        1.5, 0.0, 0.0, 2.5,
        1.0, 0.0, 0.0, 1.0,
        1.5, 3.5, 2.5, 4.5,
      ],
    };

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });

        const packed = packedValues[propertyId];
        const unpacked = property.unpackVectorAndMatrixTypes(packed);
        const expected = propertyValues[propertyId];
        expect(unpacked).toEqual(expected);
      }
    }
  });

  it("unpackVectorAndMatrixTypes unpacks nested arrays of vectors", function () {
    const properties = {
      propertyVec2: {
        type: "VEC2",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIVec3: {
        type: "VEC3",
        componentType: "INT32",
        array: true,
        count: 3,
      },
      propertyDVec4: {
        type: "VEC4",
        componentType: "FLOAT64",
        array: true,
      },
      propertyMat4: {
        type: "MAT4",
        componentType: "FLOAT32",
        array: true,
      },
      propertyIMat3: {
        type: "MAT3",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
      propertyDMat2: {
        type: "MAT2",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
    };

    const propertyValues = {
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

    // prettier-ignore
    const packedValues = {
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

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });

        const packed = packedValues[propertyId];
        const nested = true;
        const unpacked = property.unpackVectorAndMatrixTypes(packed, nested);
        const expected = propertyValues[propertyId];
        expect(unpacked).toEqual(expected);
      }
    }
  });

  it("unpackVectorAndMatrixTypes does not affect other types", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const properties = {
      propertyString: {
        type: "STRING",
      },
      propertyBoolean: {
        type: "BOOLEAN",
      },
      propertyArray: {
        type: "SCALAR",
        componentType: "UINT8",
        array: true,
        count: 5,
      },
      propertyBigIntArray: {
        type: "SCALAR",
        componentType: "UINT64",
        array: true,
        count: 2,
      },
    };

    const propertyValues = {
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

    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = new MetadataClassProperty({
          id: propertyId,
          property: properties[propertyId],
        });
        const length = propertyValues[propertyId].length;
        for (let i = 0; i < length; ++i) {
          const value = propertyValues[propertyId][i];
          const unpacked = property.unpackVectorAndMatrixTypes(value);
          expect(unpacked).toEqual(value);
        }
      }
    }
  });

  it("validate returns undefined if the value is valid", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC3",
        componentType: "FLOAT32",
      },
    });

    expect(property.validate(new Cartesian3(1.0, 2.0, 3.0))).toBeUndefined();
  });

  it("validate returns undefined for valid arrays of vectors", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC3",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
    });

    expect(
      property.validate([
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
        new Cartesian3(7.0, 8.0, 9.0),
      ])
    ).toBeUndefined();
  });

  it("validate returns undefined for valid arrays of matrices", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "MAT3",
        componentType: "FLOAT32",
        array: true,
        count: 3,
      },
    });

    expect(
      property.validate([
        new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1),
        new Matrix3(2, 0, 0, 0, 2, 0, 0, 0, 2),
        new Matrix3(3, 0, 0, 0, 3, 0, 0, 0, 3),
      ])
    ).toBeUndefined();
  });

  it("validate returns error message if property is required but value is undefined", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "SCALAR",
        componentType: "FLOAT32",
        required: true,
      },
    });

    expect(property.validate(undefined)).toBe(
      "required property must have a value"
    );
  });

  it("validate returns undefined if value is undefined but a default is available", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "SCALAR",
        componentType: "FLOAT32",
        required: true,
        default: -1.0,
      },
    });

    expect(property.validate(undefined)).not.toBeDefined();
  });

  it("validate returns error message if type is ARRAY and value is not an array", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "SCALAR",
        componentType: "FLOAT32",
        array: true,
        count: 8,
      },
    });

    expect(property.validate(8.0)).toBe("value 8 must be an array");
  });

  it("validate returns error message if type is a vector and the component type is not vector-compatibile", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "VEC2",
        componentType: "STRING",
      },
    });

    expect(property.validate(8.0)).toBe(
      "componentType STRING is incompatible with vector type VEC2"
    );
  });

  it("validate returns error message if type is a matrix and the component type is not vector-compatibile", function () {
    const property = new MetadataClassProperty({
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
    let property = new MetadataClassProperty({
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
    let property = new MetadataClassProperty({
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

  it("validate returns error message for an array that doesn't match the count", function () {
    const property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "SCALAR",
        componentType: "FLOAT32",
        array: true,
        count: 6,
      },
    });

    expect(property.validate([1.0, 2.0])).toBe(
      "Array length does not match property.arrayLength"
    );
  });

  it("validate returns error message if enum name is invalid", function () {
    const myEnum = new MetadataEnum({
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

    const property = new MetadataClassProperty({
      id: "myEnum",
      property: {
        type: "ENUM",
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

  it("validate returns error message if value does not match the type (SCALAR)", function () {
    const types = [
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
    ];

    for (let i = 0; i < types.length; ++i) {
      const property = new MetadataClassProperty({
        id: "property",
        property: {
          type: "SCALAR",
          componentType: types[i],
        },
      });
      expect(property.validate({})).toBe(
        `value [object Object] does not match type ${types[i]}`
      );
    }
  });

  it("validate returns error message if value does not match the type (BOOLEAN)", function () {
    const property = new MetadataClassProperty({
      id: "property",
      property: {
        type: "BOOLEAN",
      },
    });
    expect(property.validate({})).toBe(
      `value [object Object] does not match type BOOLEAN`
    );
  });

  it("validate returns error message if value does not match the type (STRING)", function () {
    const property = new MetadataClassProperty({
      id: "property",
      property: {
        type: "STRING",
      },
    });
    expect(property.validate({})).toBe(
      `value [object Object] does not match type STRING`
    );
  });

  it("validate returns error message if value is out of range", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const outOfRangeValues = {
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

    for (const type in outOfRangeValues) {
      if (outOfRangeValues.hasOwnProperty(type)) {
        const values = outOfRangeValues[type];
        const property = new MetadataClassProperty({
          id: "property",
          property: {
            type: "SCALAR",
            componentType: type,
          },
        });
        for (let i = 0; i < values.length; ++i) {
          expect(property.validate(values[i])).toBe(
            `value ${values[i]} is out of range for type ${type}`
          );
        }
      }
    }
  });

  it("validate returns error message for non-finite values", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const nonFiniteValues = [
      NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    const types = [
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
    ];

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const property = new MetadataClassProperty({
        id: "property",
        property: {
          type: "SCALAR",
          componentType: type,
        },
      });
      for (let i = 0; i < nonFiniteValues.length; ++i) {
        expect(property.validate(nonFiniteValues[i])).toBe(
          `value ${nonFiniteValues[i]} of type ${type} must be finite`
        );
      }
    }
  });

  it("validate returns error message if component value is out of range", function () {
    if (!FeatureDetection.supportsBigInt()) {
      return;
    }

    const outOfRangeValues = {
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

    for (const componentType in outOfRangeValues) {
      if (outOfRangeValues.hasOwnProperty(componentType)) {
        const values = outOfRangeValues[componentType];
        const property = new MetadataClassProperty({
          id: "property",
          property: {
            array: true,
            type: "SCALAR",
            componentType: componentType,
          },
        });
        for (let i = 0; i < values.length; ++i) {
          expect(property.validate(values)).toBe(
            `value ${values[0]} is out of range for type ${componentType}`
          );
        }
      }
    }
  });

  it("validate returns error message if value is outside the normalized range", function () {
    const propertyInt8 = new MetadataClassProperty({
      id: "property",
      property: {
        type: "SCALAR",
        componentType: "INT8",
        normalized: true,
      },
    });

    const propertyUint8 = new MetadataClassProperty({
      id: "property",
      property: {
        type: "SCALAR",
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
