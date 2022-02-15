import { MetadataClass, MetadataEntity } from "../../Source/Cesium.js";

describe("Scene/MetadataEntity", function () {
  const classWithNoPropertiesDefinition = new MetadataClass({
    id: "building",
    class: {},
  });

  const classDefinition = new MetadataClass({
    id: "building",
    class: {
      properties: {
        name: {
          type: "STRING",
          semantic: "NAME",
        },
        height: {
          type: "SCALAR",
          componentType: "FLOAT32",
          required: false,
          default: 10.0,
        },
        position: {
          type: "SCALAR",
          componentType: "FLOAT32",
          hasFixedCount: true,
          count: 3,
        },
      },
    },
  });

  const properties = {
    name: "Building A",
    position: [0.0, 0.0, 0.0],
  };

  it("throws when using MetadataEntity directly", function () {
    const entity = new MetadataEntity();
    expect(function () {
      return entity.class;
    }).toThrowDeveloperError();
    expect(function () {
      entity.hasProperty();
    }).toThrowDeveloperError();
    expect(function () {
      entity.hasPropertyBySemantic();
    }).toThrowDeveloperError();
    expect(function () {
      entity.getPropertyIds();
    }).toThrowDeveloperError();
    expect(function () {
      entity.getProperty();
    }).toThrowDeveloperError();
    expect(function () {
      entity.setProperty();
    }).toThrowDeveloperError();
    expect(function () {
      entity.getPropertyBySemantic();
    }).toThrowDeveloperError();
    expect(function () {
      entity.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there are no properties", function () {
    expect(
      MetadataEntity.hasProperty("name", {}, classWithNoPropertiesDefinition)
    ).toBe(false);
  });

  it("hasProperty returns false when there's no property with the given property ID", function () {
    expect(
      MetadataEntity.hasProperty("volume", properties, classDefinition)
    ).toBe(false);
  });

  it("hasProperty returns true when there's a property with the given property ID", function () {
    expect(
      MetadataEntity.hasProperty("name", properties, classDefinition)
    ).toBe(true);
  });

  it("hasProperty returns true when the class has a default value for a missing property", function () {
    expect(
      MetadataEntity.hasProperty("height", properties, classDefinition)
    ).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    expect(function () {
      MetadataEntity.hasProperty(undefined, properties, classDefinition);
    }).toThrowDeveloperError();
  });

  it("hasProperty throws without properties", function () {
    expect(function () {
      MetadataEntity.hasProperty("name", undefined, classDefinition);
    }).toThrowDeveloperError();
  });

  it("hasProperty throws without classDefinition", function () {
    expect(function () {
      MetadataEntity.hasProperty("name", properties, undefined);
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no properties", function () {
    expect(
      MetadataEntity.hasPropertyBySemantic(
        "NAME",
        {},
        classWithNoPropertiesDefinition
      )
    ).toBe(false);
  });

  it("hasPropertyBySemantic returns false when there's no property with the given property ID", function () {
    expect(
      MetadataEntity.hasPropertyBySemantic(
        "VOLUME",
        properties,
        classDefinition
      )
    ).toBe(false);
  });

  it("hasPropertyBySemantic returns true when there's a property with the given property ID", function () {
    expect(
      MetadataEntity.hasPropertyBySemantic("NAME", properties, classDefinition)
    ).toBe(true);
  });

  it("hasPropertyBySemantic returns true when the class has a default value for a missing property", function () {
    expect(
      MetadataEntity.hasPropertyBySemantic("NAME", properties, classDefinition)
    ).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    expect(function () {
      MetadataEntity.hasPropertyBySemantic(
        undefined,
        properties,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic throws without properties", function () {
    expect(function () {
      MetadataEntity.hasPropertyBySemantic("NAME", undefined, classDefinition);
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic throws without class definition", function () {
    expect(function () {
      MetadataEntity.hasPropertyBySemantic("NAME", properties, undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    expect(
      MetadataEntity.getPropertyIds({}, classWithNoPropertiesDefinition).length
    ).toBe(0);
  });

  it("getPropertyIds returns array of property IDs", function () {
    // Includes height which has a default value
    expect(
      MetadataEntity.getPropertyIds(properties, classDefinition).sort()
    ).toEqual(["height", "name", "position"]);
  });

  it("getPropertyIds uses results argument", function () {
    const results = [];
    const returnedResults = MetadataEntity.getPropertyIds(
      properties,
      classDefinition,
      results
    );

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual(["height", "name", "position"]);
  });

  it("getPropertyIds throws without properties", function () {
    expect(function () {
      MetadataEntity.getPropertyIds(undefined, classDefinition);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds throws without classDefinition", function () {
    expect(function () {
      const results = [];
      MetadataEntity.getPropertyIds(properties, undefined, results);
    }).toThrowDeveloperError();
  });

  it("getProperty returns undefined when there's no properties", function () {
    expect(
      MetadataEntity.getProperty("name", {}, classWithNoPropertiesDefinition)
    ).toBeUndefined();
  });

  it("getProperty returns undefined when there's no property with the given property ID", function () {
    expect(
      MetadataEntity.getProperty("volume", properties, classDefinition)
    ).toBeUndefined();
  });

  it("getProperty returns the property value", function () {
    const value = MetadataEntity.getProperty(
      "position",
      properties,
      classDefinition
    );
    expect(value).toEqual(properties.position);
  });

  it("getProperty returns the default value when the property is missing", function () {
    expect(
      MetadataEntity.getProperty("height", properties, classDefinition)
    ).toBe(10.0);
  });

  it("getProperty throws without propertyId", function () {
    expect(function () {
      MetadataEntity.getProperty(undefined, properties, classDefinition);
    }).toThrowDeveloperError();
  });

  it("getProperty throws without properties", function () {
    expect(function () {
      MetadataEntity.getProperty("name", undefined, classDefinition);
    }).toThrowDeveloperError();
  });

  it("getProperty throws without classDefinition", function () {
    expect(function () {
      MetadataEntity.getProperty("name", properties, undefined);
    }).toThrowDeveloperError();
  });

  it("setProperty returns false if property doesn't exist", function () {
    expect(
      MetadataEntity.setProperty("volume", 100.0, properties, classDefinition)
    ).toBe(false);
  });

  it("setProperty sets property value", function () {
    const position = [1.0, 1.0, 1.0];
    expect(
      MetadataEntity.setProperty(
        "position",
        position,
        properties,
        classDefinition
      )
    ).toBe(true);
    const retrievedPosition = MetadataEntity.getProperty(
      "position",
      properties,
      classDefinition
    );
    expect(retrievedPosition).toEqual(position);
    expect(retrievedPosition).not.toBe(position); // The value is cloned
  });

  it("setProperty throws without propertyId", function () {
    expect(function () {
      MetadataEntity.setProperty(
        undefined,
        "Building B",
        properties,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    expect(function () {
      MetadataEntity.setProperty(
        "name",
        undefined,
        properties,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("setProperty throws without properties", function () {
    expect(function () {
      MetadataEntity.setProperty(
        "name",
        "Building B",
        undefined,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("setProperty throws without classDefinition", function () {
    expect(function () {
      MetadataEntity.setProperty("name", "Building B", properties, undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    expect(
      MetadataEntity.getPropertyBySemantic(
        "HEIGHT",
        properties,
        classDefinition
      )
    ).toBeUndefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    expect(
      MetadataEntity.getPropertyBySemantic("NAME", properties, classDefinition)
    ).toBe("Building A");
  });

  it("getPropertyBySemantic throws without semantic", function () {
    expect(function () {
      MetadataEntity.getPropertyBySemantic(
        undefined,
        properties,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic throws without properties", function () {
    expect(function () {
      MetadataEntity.getPropertyBySemantic("NAME", undefined, classDefinition);
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic throws without classDefinition", function () {
    expect(function () {
      MetadataEntity.getPropertyBySemantic("NAME", properties, undefined);
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic sets property value", function () {
    expect(
      MetadataEntity.setPropertyBySemantic(
        "NAME",
        "Building B",
        properties,
        classDefinition
      )
    ).toBe(true);
    expect(
      MetadataEntity.getProperty("name", properties, classDefinition)
    ).toBe("Building B");
  });

  it("setPropertyBySemantic returns false if the semantic does not exist", function () {
    expect(
      MetadataEntity.setPropertyBySemantic(
        "HEIGHT",
        20.0,
        properties,
        classDefinition
      )
    ).toBe(false);
  });

  it("setPropertyBySemantic throws without semantic", function () {
    expect(function () {
      MetadataEntity.setPropertyBySemantic(
        undefined,
        "Building B",
        properties,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without value", function () {
    expect(function () {
      MetadataEntity.setPropertyBySemantic(
        "NAME",
        undefined,
        properties,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without properties", function () {
    expect(function () {
      MetadataEntity.setPropertyBySemantic(
        "NAME",
        "Building B",
        undefined,
        classDefinition
      );
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without classDefinition", function () {
    expect(function () {
      MetadataEntity.setPropertyBySemantic(
        "NAME",
        "Building B",
        properties,
        undefined
      );
    }).toThrowDeveloperError();
  });
});
