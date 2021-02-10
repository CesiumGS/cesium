import { MetadataClass } from "../../Source/Cesium.js";
import { MetadataEnum } from "../../Source/Cesium.js";
import { MetadataType } from "../../Source/Cesium.js";

describe("Scene/MetadataClass", function () {
  it("creates class with default values", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {},
    });

    expect(buildingClass.id).toBe("building");
    expect(buildingClass.properties).toEqual({});
    expect(buildingClass.propertiesBySemantic).toEqual({});
    expect(buildingClass.name).toBeUndefined();
    expect(buildingClass.description).toBeUndefined();
    expect(buildingClass.extras).toBeUndefined();
  });

  it("creates class", function () {
    var extras = {
      cityInfo: {
        name: "city",
      },
    };

    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        name: "Building",
        description: "Building Class",
        extras: extras,
        properties: {
          height: {
            type: "FLOAT32",
          },
          position: {
            type: "ARRAY",
            componentType: "FLOAT32",
            componentCount: 3,
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
    expect(buildingClass.extras).toBe(extras);

    var properties = buildingClass.properties;
    var heightProperty = properties.height;
    var positionProperty = properties.position;
    var colorProperty = properties.color;

    expect(heightProperty.type).toBe(MetadataType.FLOAT32);
    expect(positionProperty.type).toBe(MetadataType.ARRAY);
    expect(colorProperty.type).toBe(MetadataType.STRING);
    expect(Object.keys(properties).sort()).toEqual([
      "color",
      "height",
      "position",
    ]);

    var propertiesBySemantic = buildingClass.propertiesBySemantic;
    expect(propertiesBySemantic._COLOR).toBe(colorProperty);
    expect(propertiesBySemantic._POSITION).toBe(positionProperty);
    expect(Object.keys(propertiesBySemantic).sort()).toEqual([
      "_COLOR",
      "_POSITION",
    ]);
  });

  it("creates class with enum property", function () {
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

    var buildingClass = new MetadataClass({
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
    expect(buildingClass.properties.color.enumType).toBe(colorEnum);
  });

  it("constructor throws without id", function () {
    expect(function () {
      return new MetadataClass({
        class: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new MetadataClass({
        id: "classId",
      });
    }).toThrowDeveloperError();
  });
});
