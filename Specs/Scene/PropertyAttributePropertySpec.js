import {
  PropertyAttributeProperty,
  MetadataClass,
} from "../../Source/Cesium.js";

describe("Scene/PropertyAttributeProperty", function () {
  let classProperty;
  let extras;
  let extensions;
  let propertyAttributeProperty;

  beforeAll(function () {
    const classDefinition = new MetadataClass({
      id: "pointCloud",
      class: {
        properties: {
          intensity: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    classProperty = classDefinition.properties.intensity;

    extras = {
      description: "Extra",
    };

    extensions = {
      EXT_other_extension: {},
    };

    const property = {
      attribute: "_INTENSITY",
      extensions: extensions,
      extras: extras,
    };

    propertyAttributeProperty = new PropertyAttributeProperty({
      property: property,
      classProperty: classProperty,
    });
  });

  it("creates feature attribute property", function () {
    expect(propertyAttributeProperty.attribute).toBe("_INTENSITY");
    expect(propertyAttributeProperty.extras).toBe(extras);
    expect(propertyAttributeProperty.extensions).toBe(extensions);
  });

  it("constructor throws without property", function () {
    expect(function () {
      return new PropertyAttributeProperty({
        property: undefined,
        classProperty: classProperty,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without classProperty", function () {
    expect(function () {
      return new PropertyAttributeProperty({
        property: {},
        classProperty: undefined,
      });
    }).toThrowDeveloperError();
  });
});
