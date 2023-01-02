import { MetadataComponentType, MetadataEnum } from "../../index.js";

describe("Scene/MetadataEnum", function () {
  it("creates enum with default values", function () {
    const colorEnum = MetadataEnum.fromJson({
      id: "color",
      enum: {
        values: [
          {
            name: "RED",
            value: 0,
          },
          {
            name: "GREEN",
            value: 1,
          },
          {
            name: "BLUE",
            value: 2,
          },
        ],
      },
    });

    expect(colorEnum.values[0].name).toBe("RED");
    expect(colorEnum.values[1].name).toBe("GREEN");
    expect(colorEnum.values[2].name).toBe("BLUE");
    expect(colorEnum.valueType).toBe(MetadataComponentType.UINT16);
    expect(colorEnum.id).toBe("color");
    expect(colorEnum.name).toBeUndefined();
    expect(colorEnum.description).toBeUndefined();
    expect(colorEnum.extras).toBeUndefined();
    expect(colorEnum.extensions).toBeUndefined();
  });

  it("creates enum", function () {
    const extras = {
      gain: 0.5,
      offset: 0.1,
    };
    const extensions = {
      EXT_other_extension: {},
    };

    const colorEnum = MetadataEnum.fromJson({
      id: "color",
      enum: {
        name: "Color",
        description: "Common colors",
        extras: extras,
        extensions: extensions,
        valueType: MetadataComponentType.UINT64,
        values: [
          {
            name: "RED",
            value: 0,
          },
          {
            name: "GREEN",
            value: 1,
          },
          {
            name: "BLUE",
            value: 2,
          },
        ],
      },
    });

    expect(colorEnum.values[0].name).toBe("RED");
    expect(colorEnum.values[1].name).toBe("GREEN");
    expect(colorEnum.values[2].name).toBe("BLUE");
    expect(colorEnum.valueType).toBe(MetadataComponentType.UINT64);
    expect(colorEnum.id).toBe("color");
    expect(colorEnum.name).toBe("Color");
    expect(colorEnum.description).toBe("Common colors");
    expect(colorEnum.extras).toEqual(extras);
    expect(colorEnum.extensions).toEqual(extensions);
  });

  it("constructor throws without id", function () {
    expect(function () {
      return MetadataEnum.fromJson({
        enum: {
          values: [
            {
              name: "RED",
              value: 0,
            },
          ],
        },
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without enum", function () {
    expect(function () {
      return MetadataEnum.fromJson({
        id: "enumId",
      });
    }).toThrowDeveloperError();
  });
});
