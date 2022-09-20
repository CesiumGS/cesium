import {
  Cartesian3,
  MetadataClass,
  GroupMetadata,
} from "../../index.js";

describe("Scene/GroupMetadata", function () {
  const buildingClassWithNoProperties = new MetadataClass({
    id: "building",
    class: {},
  });

  it("creates group metadata with default values", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(groupMetadata.id).toBe("building");
    expect(groupMetadata.extras).toBeUndefined();
    expect(groupMetadata.extensions).toBeUndefined();
  });

  it("creates group metadata", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "VEC3",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const extras = {
      other: 0,
    };

    const extensions = {
      EXT_other_extension: {},
    };

    const properties = {
      position: [0.0, 0.0, 0.0],
    };

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        extras: extras,
        extensions: extensions,
        properties: properties,
      },
    });

    expect(groupMetadata.id).toBe("building");
    expect(groupMetadata.class).toBe(buildingClass);
    expect(groupMetadata.extras).toBe(extras);
    expect(groupMetadata.extensions).toBe(extensions);
    expect(groupMetadata.getProperty("position")).toEqual(
      Cartesian3.unpack(properties.position)
    );
  });

  it("constructor throws without group", function () {
    expect(function () {
      return new GroupMetadata({
        id: "building",
        group: undefined,
        class: buildingClassWithNoProperties,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new GroupMetadata({
        id: "building",
        group: {},
        class: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there's no properties", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });
    expect(groupMetadata.hasProperty("height")).toBe(false);
  });

  it("hasProperty returns false when there's no property with the given property ID", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(groupMetadata.hasProperty("color")).toBe(false);
  });

  it("hasProperty returns true when there's a property with the given property ID", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(groupMetadata.hasProperty("height")).toBe(true);
  });

  it("hasProperty returns true when the class has a default value for a missing property", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            required: false,
            default: 10.0,
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {},
    });

    expect(groupMetadata.hasProperty("height")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(function () {
      groupMetadata.hasProperty();
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no properties", function () {
    const groupMetadata = new GroupMetadata({
      class: buildingClassWithNoProperties,
      id: "building",
      group: {},
    });
    expect(groupMetadata.hasPropertyBySemantic("HEIGHT")).toBe(false);
  });

  it("hasPropertyBySemantic returns false when there's no property with the given semantic", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(groupMetadata.hasPropertyBySemantic("HEIGHT")).toBe(false);
  });

  it("hasPropertyBySemantic returns true when there's a property with the given semantic", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "HEIGHT",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(groupMetadata.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic returns true when the class has a default value for a missing property", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "HEIGHT",
            required: false,
            default: 10.0,
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {},
    });

    expect(groupMetadata.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(function () {
      groupMetadata.hasPropertyBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(groupMetadata.getPropertyIds().length).toBe(0);
  });

  it("getPropertyIds returns array of property IDs", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
          color: {
            type: "STRING",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      id: "building",
      class: buildingClass,
      group: {
        properties: {
          height: 10.0,
          color: "RED",
        },
      },
    });

    expect(groupMetadata.getPropertyIds().sort()).toEqual(["color", "height"]);
  });

  it("getPropertyIds includes properties with default values", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            required: false,
            default: 10.0,
          },
          color: {
            type: "STRING",
          },
        },
      },
    });
    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          color: "RED",
        },
      },
    });

    expect(groupMetadata.getPropertyIds().sort()).toEqual(["color", "height"]);
  });

  it("getPropertyIds uses results argument", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
          color: {
            type: "STRING",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
          color: "RED",
        },
      },
    });

    const results = [];
    const returnedResults = groupMetadata.getPropertyIds(results);

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual(["color", "height"]);
  });

  it("getProperty throws when there's no property with the given property ID", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(function () {
      return groupMetadata.getProperty("color");
    }).toThrowDeveloperError();
  });

  it("getProperty returns the property value", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "VEC3",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const position = [0.0, 0.0, 0.0];

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          position: position,
        },
      },
    });

    const value = groupMetadata.getProperty("position");
    expect(value).toEqual(Cartesian3.unpack(position));
  });

  it("getProperty returns the default value when the property is missing", function () {
    const position = [0.0, 0.0, 0.0];
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "VEC3",
            componentType: "FLOAT32",
            required: false,
            default: position,
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {},
    });

    const value = groupMetadata.getProperty("position");
    expect(value).toEqual(Cartesian3.unpack(position));
  });

  it("getProperty throws without propertyId", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(function () {
      groupMetadata.getProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty returns false if property doesn't exist", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    const position = [0.0, 0.0, 0.0];
    expect(groupMetadata.setProperty("position", position)).toBe(false);
  });

  it("setProperty sets property value", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "VEC3",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          position: [0.0, 0.0, 0.0],
        },
      },
    });

    const position = new Cartesian3(1.0, 1.0, 1.0);
    expect(groupMetadata.setProperty("position", position)).toBe(true);
    expect(groupMetadata.getProperty("position")).toEqual(position);
    expect(groupMetadata.getProperty("position")).not.toBe(position); // copies value
  });

  it("setProperty throws without propertyId", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(function () {
      groupMetadata.setProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(function () {
      groupMetadata.setProperty("color");
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no class", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });
    expect(groupMetadata.getPropertyBySemantic("_HEIGHT")).toBeUndefined();
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(groupMetadata.getPropertyBySemantic("_HEIGHT")).toBeUndefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(groupMetadata.getPropertyBySemantic("_HEIGHT")).toBe(10.0);
  });

  it("getPropertyBySemantic throws without semantic", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(function () {
      groupMetadata.getPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic sets property value", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(groupMetadata.setPropertyBySemantic("_HEIGHT", 20.0)).toBe(true);
    expect(groupMetadata.getProperty("height")).toBe(20.0);
  });

  it("setPropertyBySemantic returns false if the semantic does not exist", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(groupMetadata.setPropertyBySemantic("_HEIGHT", 20.0)).toBe(false);
  });

  it("setPropertyBySemantic throws without semantic", function () {
    const groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
      class: buildingClassWithNoProperties,
    });

    expect(function () {
      groupMetadata.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without value", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    const groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(function () {
      groupMetadata.setPropertyBySemantic("_HEIGHT");
    }).toThrowDeveloperError();
  });
});
