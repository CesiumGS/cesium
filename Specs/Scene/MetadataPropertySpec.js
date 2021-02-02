import { MetadataProperty } from "../../Source/Cesium.js";
import { MetadataEnum } from "../../Source/Cesium.js";
import { MetadataType } from "../../Source/Cesium.js";

describe("Scene/MetadataProperty", function () {
  it("creates property with default values", function () {
    var property = new MetadataProperty({
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

    var property = new MetadataProperty({
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
    expect(property.max).toEqual(max);
    expect(property.min).toEqual(min);
    expect(property.default).toEqual(propertyDefault);
    expect(property.optional).toBe(false);
    expect(property.semantic).toBe("_POSITION");
    expect(property.extras).toEqual(extras);

    // Check that JSON properties get cloned
    expect(property.max).not.toBe(max);
    expect(property.min).not.toBe(min);
    expect(property.default).not.toBe(propertyDefault);
    expect(property.extras).not.toBe(extras);
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

    var property = new MetadataProperty({
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
      return new MetadataProperty({
        property: {
          type: "FLOAT32",
        },
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without property", function () {
    expect(function () {
      return new MetadataProperty({
        id: "propertyId",
      });
    }).toThrowDeveloperError();
  });
});
