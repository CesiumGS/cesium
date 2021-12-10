import {
  Cartesian3,
  MetadataClass,
  GroupMetadata,
} from "../../Source/Cesium.js";

describe("Scene/GroupMetadata", function () {
  it("creates group metadata with default values", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(groupMetadata.id).toBe("building");
    expect(groupMetadata.class).toBeUndefined();
    expect(groupMetadata.extras).toBeUndefined();
    expect(groupMetadata.extensions).toBeUndefined();
  });

  it("creates group metadata", function () {
    var buildingClass = new MetadataClass({
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

    var extras = {
      other: 0,
    };

    var extensions = {
      EXT_other_extension: {},
    };

    var properties = {
      position: [0.0, 0.0, 0.0],
    };

    var groupMetadata = new GroupMetadata({
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

  it("constructor throws without id", function () {
    expect(function () {
      return new GroupMetadata({
        group: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without group", function () {
    expect(function () {
      return new GroupMetadata({
        id: "building",
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there's no properties", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });
    expect(groupMetadata.hasProperty("height")).toBe(false);
  });

  it("hasProperty returns false when there's no property with the given property ID", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
            optional: true,
            default: 10.0,
          },
        },
      },
    });
    var groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {},
    });

    expect(groupMetadata.hasProperty("height")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.hasProperty();
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no properties", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });
    expect(groupMetadata.hasPropertyBySemantic("HEIGHT")).toBe(false);
  });

  it("hasPropertyBySemantic returns false when there's no property with the given semantic", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
            semantic: "HEIGHT",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
            semantic: "HEIGHT",
            optional: true,
            default: 10.0,
          },
        },
      },
    });
    var groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {},
    });

    expect(groupMetadata.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.hasPropertyBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(groupMetadata.getPropertyIds().length).toBe(0);
  });

  it("getPropertyIds returns array of property IDs", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
          color: {
            componentType: "STRING",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
            optional: true,
            default: 10.0,
          },
          color: {
            componentType: "STRING",
          },
        },
      },
    });
    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
          color: {
            componentType: "STRING",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
          color: "RED",
        },
      },
    });

    var results = [];
    var returnedResults = groupMetadata.getPropertyIds(results);

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual(["color", "height"]);
  });

  it("getProperty returns undefined when there's no properties", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });
    expect(groupMetadata.getProperty("height")).toBeUndefined();
  });

  it("getProperty returns undefined when there's no property with the given property ID", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(groupMetadata.getProperty("color")).toBeUndefined();
  });

  it("getProperty returns the property value", function () {
    var buildingClass = new MetadataClass({
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

    var position = [0.0, 0.0, 0.0];

    var groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          position: position,
        },
      },
    });

    var value = groupMetadata.getProperty("position");
    expect(value).toEqual(Cartesian3.unpack(position));
  });

  it("getProperty returns the default value when the property is missing", function () {
    var position = [0.0, 0.0, 0.0];
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "VEC3",
            componentType: "FLOAT32",
            optional: true,
            default: position,
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {},
    });

    var value = groupMetadata.getProperty("position");
    expect(value).toEqual(Cartesian3.unpack(position));
  });

  it("getProperty throws without propertyId", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.getProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty returns false if property doesn't exist", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    var position = [0.0, 0.0, 0.0];
    expect(groupMetadata.setProperty("position", position)).toBe(false);
  });

  it("setProperty sets property value", function () {
    var buildingClass = new MetadataClass({
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

    var groupMetadata = new GroupMetadata({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          position: [0.0, 0.0, 0.0],
        },
      },
    });

    var position = new Cartesian3(1.0, 1.0, 1.0);
    expect(groupMetadata.setProperty("position", position)).toBe(true);
    expect(groupMetadata.getProperty("position")).toEqual(position);
    expect(groupMetadata.getProperty("position")).not.toBe(position); // copies value
  });

  it("setProperty throws without propertyId", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.setProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.setProperty("color");
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no class", function () {
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });
    expect(groupMetadata.getPropertyBySemantic("_HEIGHT")).toBeUndefined();
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.getPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic sets property value", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
    var groupMetadata = new GroupMetadata({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without value", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            componentType: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    var groupMetadata = new GroupMetadata({
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
