import {
  Cartesian2,
  PropertyAttributeProperty,
  Matrix2,
  MetadataClassProperty,
} from "../../Source/Cesium.js";

describe("Scene/PropertyAttributeProperty", function () {
  let classProperty;
  let extras;
  let extensions;
  let propertyAttributeProperty;

  beforeAll(function () {
    classProperty = new MetadataClassProperty({
      id: "intensity",
      property: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    });

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

  it("creates property attribute property", function () {
    expect(propertyAttributeProperty.attribute).toBe("_INTENSITY");
    expect(propertyAttributeProperty.hasValueTransform).toBe(false);
    expect(propertyAttributeProperty.offset).toBe(0);
    expect(propertyAttributeProperty.scale).toBe(1);
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

  it("creates property with value transform from class definition", function () {
    const classProperty = new MetadataClassProperty({
      id: "transformed",
      property: {
        type: "SCALAR",
        componentType: "UINT8",
        normalized: true,
        offset: 1,
        scale: 2,
      },
    });

    propertyAttributeProperty = new PropertyAttributeProperty({
      property: {
        attribute: "_TRANSFORMED",
      },
      classProperty: classProperty,
    });

    expect(propertyAttributeProperty.attribute).toBe("_TRANSFORMED");
    expect(propertyAttributeProperty.hasValueTransform).toBe(true);
    expect(propertyAttributeProperty.offset).toBe(1);
    expect(propertyAttributeProperty.scale).toBe(2);
  });

  it("creates property with value transform override", function () {
    const classProperty = new MetadataClassProperty({
      id: "transformed",
      property: {
        type: "SCALAR",
        componentType: "UINT8",
        normalized: true,
        offset: 1,
        scale: 2,
      },
    });

    propertyAttributeProperty = new PropertyAttributeProperty({
      property: {
        attribute: "_TRANSFORMED",
        offset: 2,
        scale: 4,
      },
      classProperty: classProperty,
    });

    expect(propertyAttributeProperty.attribute).toBe("_TRANSFORMED");
    expect(propertyAttributeProperty.hasValueTransform).toBe(true);
    expect(propertyAttributeProperty.offset).toBe(2);
    expect(propertyAttributeProperty.scale).toBe(4);
  });

  it("unpacks property and scale for vectors and matrices", function () {
    let classProperty = new MetadataClassProperty({
      id: "transformed",
      property: {
        type: "VEC2",
        componentType: "UINT8",
        normalized: true,
        offset: [1, 2],
        scale: [2, 4],
      },
    });

    propertyAttributeProperty = new PropertyAttributeProperty({
      property: {
        attribute: "_TRANSFORMED",
      },
      classProperty: classProperty,
    });

    expect(propertyAttributeProperty.attribute).toBe("_TRANSFORMED");
    expect(propertyAttributeProperty.hasValueTransform).toBe(true);
    expect(propertyAttributeProperty.offset).toEqual(new Cartesian2(1, 2));
    expect(propertyAttributeProperty.scale).toEqual(new Cartesian2(2, 4));

    classProperty = new MetadataClassProperty({
      id: "transformed",
      property: {
        type: "MAT2",
        componentType: "UINT8",
        normalized: true,
        offset: [1, 2, 2, 1],
        scale: [2, 4, 4, 1],
      },
    });

    propertyAttributeProperty = new PropertyAttributeProperty({
      property: {
        attribute: "_TRANSFORMED",
      },
      classProperty: classProperty,
    });

    expect(propertyAttributeProperty.attribute).toBe("_TRANSFORMED");
    expect(propertyAttributeProperty.hasValueTransform).toBe(true);
    expect(propertyAttributeProperty.offset).toEqual(new Matrix2(1, 2, 2, 1));
    expect(propertyAttributeProperty.scale).toEqual(new Matrix2(2, 4, 4, 1));
  });
});
