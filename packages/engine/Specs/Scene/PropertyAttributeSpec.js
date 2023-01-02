import { PropertyAttribute, MetadataClass } from "../../index.js";

describe("Scene/PropertyAttribute", function () {
  let classDefinition;
  let extras;
  let extensions;
  let propertyAttribute;

  beforeAll(function () {
    classDefinition = MetadataClass.fromJson({
      id: "points",
      class: {
        properties: {
          color: {
            type: "VEC3",
            componentType: "UINT8",
            array: true,
            count: 3,
          },
          intensity: {
            type: "SCALAR",
            componentType: "UINT8",
          },
          pointSize: {
            type: "SCALAR",
            componentTYpe: "FLOAT32",
          },
        },
      },
    });

    extras = {
      description: "Extra",
    };

    extensions = {
      EXT_other_extension: {},
    };

    const propertyAttributeJson = {
      class: "points",
      extras: extras,
      extensions: extensions,
      properties: {
        color: {
          attribute: "_COLOR",
        },
        intensity: {
          attribute: "_INTENSITY",
        },
        pointSize: {
          attribute: "_POINT_SIZE",
        },
      },
    };

    propertyAttribute = new PropertyAttribute({
      propertyAttribute: propertyAttributeJson,
      class: classDefinition,
    });
  });

  it("creates property attribute", function () {
    expect(propertyAttribute.class).toBe(classDefinition);
    expect(propertyAttribute.extras).toBe(extras);
    expect(propertyAttribute.extensions).toBe(extensions);
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new PropertyAttribute({
        class: undefined,
        propertyAttribute: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without propertyAttribute", function () {
    expect(function () {
      return new PropertyAttribute({
        class: classDefinition,
        propertyAttribute: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getProperty returns property attribute property", function () {
    expect(propertyAttribute.getProperty("color").attribute).toBe("_COLOR");
    expect(propertyAttribute.getProperty("intensity").attribute).toBe(
      "_INTENSITY"
    );
    expect(propertyAttribute.getProperty("pointSize").attribute).toBe(
      "_POINT_SIZE"
    );
  });

  it("getProperty returns undefined if the property doesn't exist", function () {
    expect(propertyAttribute.getProperty("other")).toBeUndefined();
  });

  it("getProperty throws if propertyId is undefined", function () {
    expect(function () {
      propertyAttribute.getProperty(undefined);
    }).toThrowDeveloperError();
  });
});
