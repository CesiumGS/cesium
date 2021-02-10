import { FeatureDetection } from "../../Source/Cesium.js";
import { MetadataClassProperty } from "../../Source/Cesium.js";
import { MetadataEnum } from "../../Source/Cesium.js";
import { MetadataType } from "../../Source/Cesium.js";

describe("Scene/MetadataClassProperty", function () {
  it("creates property with default values", function () {
    var property = new MetadataClassProperty({
      id: "height",
      property: {
        type: "FLOAT32",
      },
    });

    expect(property.id).toBe("height");
    expect(property.name).toBeUndefined();
    expect(property.description).toBeUndefined();
    expect(property.type).toBe(MetadataType.FLOAT32);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBeUndefined();
    expect(property.valueType).toBe(MetadataType.FLOAT32);
    expect(property.componentCount).toBeUndefined();
    expect(property.normalized).toBe(false);
    expect(property.max).toBeUndefined();
    expect(property.min).toBeUndefined();
    expect(property.default).toBeUndefined();
    expect(property.optional).toBe(false);
    expect(property.semantic).toBeUndefined();
    expect(property.extras).toBeUndefined();
  });

  it("creates property", function () {
    var max = [32767, 0, 100];
    var min = [-32768, 0, -100];
    var propertyDefault = [0, 0, 0];
    var extras = {
      coordinates: [0, 1, 2],
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
      },
    });

    expect(property.id).toBe("position");
    expect(property.name).toBe("Position");
    expect(property.description).toBe("Position (X, Y, Z)");
    expect(property.type).toBe(MetadataType.ARRAY);
    expect(property.enumType).toBeUndefined();
    expect(property.componentType).toBe(MetadataType.INT16);
    expect(property.valueType).toBe(MetadataType.INT16);
    expect(property.componentCount).toBe(3);
    expect(property.normalized).toBe(true);
    expect(property.max).toBe(max);
    expect(property.min).toBe(min);
    expect(property.default).toBe(propertyDefault);
    expect(property.optional).toBe(false);
    expect(property.semantic).toBe("_POSITION");
    expect(property.extras).toBe(extras);
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
        type: "ENUM",
        enumType: "color",
      },
      enums: enums,
    });

    expect(property.type).toBe(MetadataType.ENUM);
    expect(property.enumType).toBe(colorEnum);
    expect(property.valueType).toBe(MetadataType.INT32); // default enum valueType
  });

  it("constructor throws without id", function () {
    expect(function () {
      return new MetadataClassProperty({
        property: {
          type: "FLOAT32",
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

  it("validate returns undefined if the value is valid", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "ARRAY",
        componentType: "FLOAT32",
        componentCount: 3,
      },
    });

    expect(property.validate([1.0, 2.0, 3.0])).toBeUndefined();
  });

  it("validate returns error message if type is ARRAY and value is not an array", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "ARRAY",
        componentType: "FLOAT32",
        componentCount: 3,
      },
    });

    expect(property.validate(8.0)).toBe("value 8 does not match type ARRAY");
  });

  it("validate returns error message if type is ARRAY and the array length does not match componentCount", function () {
    var property = new MetadataClassProperty({
      id: "position",
      property: {
        type: "ARRAY",
        componentType: "FLOAT32",
        componentCount: 3,
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
            value: -999,
            name: "Other",
          },
        ],
      },
    });

    var property = new MetadataClassProperty({
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
          type: types[i],
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
            type: type,
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
});
