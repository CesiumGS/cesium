import {
  Cartesian2,
  Cartesian3,
  Math as CesiumMath,
  MetadataClass,
  MetadataEntity,
} from "../../index.js";

describe("Scene/MetadataEntity", function () {
  let classWithNoPropertiesDefinition;
  let classDefinition;
  let properties;
  let classWithNoDataValues;
  beforeAll(function () {
    classWithNoPropertiesDefinition = new MetadataClass({
      id: "building",
      class: {},
    });

    classDefinition = new MetadataClass({
      id: "building",
      class: {
        properties: {
          name: {
            type: "STRING",
            semantic: "NAME",
            required: true,
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
            array: true,
            count: 3,
            required: true,
          },
          axisColors: {
            array: true,
            count: 3,
            type: "VEC3",
            componentType: "UINT8",
            normalized: true,
            required: true,
          },
          temperature: {
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
            offset: 32,
            scale: 180,
          },
          temperatureArray: {
            array: true,
            count: 4,
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
            offset: [32, 32, 32, 32],
            scale: [180, 180, 180, 180],
          },
        },
      },
    });

    classWithNoDataValues = new MetadataClass({
      id: "noData",
      class: {
        properties: {
          noDefault: {
            type: "SCALAR",
            componentType: "INT32",
            required: false,
            noData: -1,
          },
          hasDefault: {
            type: "SCALAR",
            componentType: "INT32",
            required: false,
            noData: -1,
            default: 100,
          },
          noDefaultVector: {
            type: "VEC2",
            componentType: "FLOAT32",
            required: false,
            noData: [0.0, 0.0],
          },
          hasDefaultVector: {
            type: "VEC2",
            componentType: "FLOAT32",
            required: false,
            noData: [0.0, 0.0],
            default: [100.0, 100.0],
          },
          noDefaultArray: {
            array: true,
            type: "SCALAR",
            componentType: "UINT8",
            count: 3,
            required: false,
            noData: [0, 0, 0],
          },
          hasDefaultArray: {
            array: true,
            type: "SCALAR",
            componentType: "UINT8",
            required: false,
            noData: [],
            default: [1, 1, 1],
          },
          noDefaultArrayOfVector: {
            array: true,
            type: "VEC2",
            componentType: "FLOAT32",
            count: 3,
            required: false,
            noData: [
              [0.0, 0.0],
              [0.0, 0.0],
              [0.0, 0.0],
            ],
          },
          hasDefaultArrayOfVector: {
            array: true,
            type: "VEC2",
            componentType: "FLOAT32",
            required: false,
            noData: [],
            default: [
              [1.0, 1.0],
              [1.0, 1.0],
            ],
          },
        },
      },
    });
  });

  beforeEach(function () {
    properties = {
      name: "Building A",
      position: [0.0, 0.0, 0.0],
      axisColors: [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
      ],
      temperature: 0,
      temperatureArray: [0, 255, 255, 0],
    };
  });

  const noDataProperties = {
    noDefault: -1,
    hasDefault: -1,
    noDefaultVector: [0.0, 0.0],
    hasDefaultVector: [0.0, 0.0],
    noDefaultArray: [0, 0, 0],
    hasDefaultArray: [],
    noDefaultArrayOfVector: [
      [0.0, 0.0],
      [0.0, 0.0],
      [0.0, 0.0],
    ],
    hasDefaultArrayOfVector: [],
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
    ).toEqual([
      "axisColors",
      "height",
      "name",
      "position",
      "temperature",
      "temperatureArray",
    ]);
  });

  it("getPropertyIds uses results argument", function () {
    const results = [];
    const returnedResults = MetadataEntity.getPropertyIds(
      properties,
      classDefinition,
      results
    );

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual([
      "axisColors",
      "height",
      "name",
      "position",
      "temperature",
      "temperatureArray",
    ]);
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

  it("getProperty throws when there's no property with the given property ID", function () {
    expect(function () {
      return MetadataEntity.getProperty("volume", properties, classDefinition);
    }).toThrowDeveloperError();
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

  it("getProperty handles noData correctly", function () {
    expect(
      MetadataEntity.getProperty(
        "noDefault",
        noDataProperties,
        classWithNoDataValues
      )
    ).not.toBeDefined();
    expect(
      MetadataEntity.getProperty(
        "hasDefault",
        noDataProperties,
        classWithNoDataValues
      )
    ).toBe(100);
    expect(
      MetadataEntity.getProperty(
        "noDefaultVector",
        noDataProperties,
        classWithNoDataValues
      )
    ).not.toBeDefined();
    expect(
      MetadataEntity.getProperty(
        "hasDefaultVector",
        noDataProperties,
        classWithNoDataValues
      )
    ).toEqual(new Cartesian2(100.0, 100.0));
    expect(
      MetadataEntity.getProperty(
        "noDefaultArray",
        noDataProperties,
        classWithNoDataValues
      )
    ).not.toBeDefined();
    expect(
      MetadataEntity.getProperty(
        "hasDefaultArray",
        noDataProperties,
        classWithNoDataValues
      )
    ).toEqual([1, 1, 1]);
    expect(
      MetadataEntity.getProperty(
        "noDefaultArrayOfVector",
        noDataProperties,
        classWithNoDataValues
      )
    ).not.toBeDefined();
    expect(
      MetadataEntity.getProperty(
        "hasDefaultArrayOfVector",
        noDataProperties,
        classWithNoDataValues
      )
    ).toEqual([new Cartesian2(1.0, 1.0), new Cartesian2(1.0, 1.0)]);
  });

  it("handles offset and scale", function () {
    expect(
      MetadataEntity.getProperty("temperature", properties, classDefinition)
    ).toEqual(32);

    expect(
      MetadataEntity.getProperty(
        "temperatureArray",
        properties,
        classDefinition
      )
    ).toEqual([32, 212, 212, 32]);
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

  it("getProperty handles arrays of vectors correctly", function () {
    expect(
      MetadataEntity.getProperty("axisColors", properties, classDefinition)
    ).toEqual([
      new Cartesian3(1, 0, 0),
      new Cartesian3(0, 1, 0),
      new Cartesian3(0, 0, 1),
    ]);
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

  it("setProperty handles arrays of vectors correctly", function () {
    const axisColors = [
      new Cartesian3(1, 0, 0),
      new Cartesian3(0, 1, 0),
      new Cartesian3(0, 0, 1),
    ];
    expect(
      MetadataEntity.setProperty(
        "axisColors",
        axisColors,
        properties,
        classDefinition
      )
    ).toBe(true);
    const retrievedPosition = MetadataEntity.getProperty(
      "axisColors",
      properties,
      classDefinition
    );
    expect(retrievedPosition).toEqual(axisColors);
    expect(retrievedPosition).not.toBe(axisColors); // The value is cloned
  });

  it("handles offset and scale", function () {
    expect(
      MetadataEntity.setProperty("temperature", 70, properties, classDefinition)
    ).toBe(true);

    // There is some expected loss of precision due to storing as a UINT8
    // so the result is not 0
    expect(
      MetadataEntity.getProperty("temperature", properties, classDefinition)
    ).toEqualEpsilon(70.11764705882354, CesiumMath.EPSILON15);

    const values = [32, 32, 32, 32];
    expect(
      MetadataEntity.setProperty(
        "temperatureArray",
        values,
        properties,
        classDefinition
      )
    ).toBe(true);

    const result = MetadataEntity.getProperty(
      "temperatureArray",
      properties,
      classDefinition
    );
    expect(result).toEqual(values);
    expect(result).not.toBe(values); // value should be cloned
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
