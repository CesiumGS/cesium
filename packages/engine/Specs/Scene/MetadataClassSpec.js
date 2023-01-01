import {
  MetadataClass,
  MetadataComponentType,
  MetadataEnum,
  MetadataType,
} from "../../index.js";

describe("Scene/MetadataClass", function () {
  it("creates class with default values", function () {
    const buildingClass = MetadataClass.fromJson({
      id: "building",
      class: {},
    });

    expect(buildingClass.id).toBe("building");
    expect(buildingClass.properties).toEqual({});
    expect(buildingClass.propertiesBySemantic).toEqual({});
    expect(buildingClass.name).toBeUndefined();
    expect(buildingClass.description).toBeUndefined();
    expect(buildingClass.extras).toBeUndefined();
    expect(buildingClass.extensions).toBeUndefined();
  });

  it("creates class", function () {
    const extras = {
      cityInfo: {
        name: "city",
      },
    };
    const extensions = {
      EXT_other_extension: {},
    };

    const buildingClass = MetadataClass.fromJson({
      id: "building",
      class: {
        name: "Building",
        description: "Building Class",
        extras: extras,
        extensions: extensions,
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
          position: {
            type: "SCALAR",
            componentType: "FLOAT32",
            array: true,
            count: 3,
            semantic: "_POSITION",
          },
          color: {
            type: "STRING",
            semantic: "_COLOR",
          },
        },
      },
    });

    expect(buildingClass.id).toBe("building");
    expect(buildingClass.name).toBe("Building");
    expect(buildingClass.description).toBe("Building Class");
    expect(buildingClass.extras).toEqual(extras);
    expect(buildingClass.extensions).toEqual(extensions);

    const properties = buildingClass.properties;
    const heightProperty = properties.height;
    const positionProperty = properties.position;
    const colorProperty = properties.color;

    expect(heightProperty.type).toBe(MetadataType.SCALAR);
    expect(heightProperty.componentType).toBe(MetadataComponentType.FLOAT32);
    expect(positionProperty.type).toBe(MetadataType.SCALAR);
    expect(positionProperty.componentType).toBe(MetadataComponentType.FLOAT32);
    expect(colorProperty.type).toBe(MetadataType.STRING);
    expect(colorProperty.componentType).not.toBeDefined();
    expect(Object.keys(properties).sort()).toEqual([
      "color",
      "height",
      "position",
    ]);

    const propertiesBySemantic = buildingClass.propertiesBySemantic;
    expect(propertiesBySemantic._COLOR).toBe(colorProperty);
    expect(propertiesBySemantic._POSITION).toBe(positionProperty);
    expect(Object.keys(propertiesBySemantic).sort()).toEqual([
      "_COLOR",
      "_POSITION",
    ]);
  });

  it("creates class with enum property", function () {
    const colorEnum = MetadataEnum.fromJson({
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

    const buildingClass = MetadataClass.fromJson({
      id: "building",
      class: {
        properties: {
          color: {
            type: "ENUM",
            enumType: "color",
          },
        },
      },
      enums: enums,
    });

    expect(buildingClass.properties.color.type).toBe(MetadataType.ENUM);
    expect(buildingClass.properties.color.componentType).not.toBeDefined();
    expect(buildingClass.properties.color.enumType).toBe(colorEnum);
  });

  it("constructor throws without id", function () {
    expect(function () {
      return MetadataClass.fromJson({
        class: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return MetadataClass.fromJson({
        id: "classId",
      });
    }).toThrowDeveloperError();
  });
});
