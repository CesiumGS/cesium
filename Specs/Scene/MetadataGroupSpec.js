import { MetadataClass } from "../../Source/Cesium.js";
import { MetadataGroup } from "../../Source/Cesium.js";

describe("Scene/MetadataGroup", function () {
  it("creates group metadata with default values", function () {
    var groupMetadata = new MetadataGroup({
      id: "building",
      group: {},
    });

    expect(groupMetadata.id).toBe("building");
    expect(groupMetadata.class).toBeUndefined();
    expect(groupMetadata.properties).toEqual({});
    expect(groupMetadata.name).toBeUndefined();
    expect(groupMetadata.description).toBeUndefined();
    expect(groupMetadata.extras).toBeUndefined();
  });

  it("creates group metadata", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "ARRAY",
            componentType: "FLOAT32",
            componentCount: 3,
          },
        },
      },
    });

    var extras = {
      other: 0,
    };

    var properties = {
      position: [0.0, 0.0, 0.0],
    };

    var groupMetadata = new MetadataGroup({
      class: buildingClass,
      id: "building",
      group: {
        name: "Building",
        description: "Building Metadata",
        extras: extras,
        properties: properties,
      },
    });

    expect(groupMetadata.id).toBe("building");
    expect(groupMetadata.class).toBe(buildingClass);
    expect(groupMetadata.name).toBe("Building");
    expect(groupMetadata.description).toBe("Building Metadata");
    expect(groupMetadata.extras).toEqual(extras);
    expect(groupMetadata.extras).not.toBe(extras); // Extras is cloned
    expect(groupMetadata.properties).toEqual(properties);
    expect(groupMetadata.properties).not.toBe(properties); // Properties is cloned
  });

  it("constructor throws without id", function () {
    expect(function () {
      return new MetadataGroup({
        group: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without group", function () {
    expect(function () {
      return new MetadataGroup({
        id: "building",
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there's no properties", function () {
    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
            optional: true,
            default: 10.0,
          },
        },
      },
    });
    var groupMetadata = new MetadataGroup({
      class: buildingClass,
      id: "building",
      group: {},
    });

    expect(groupMetadata.hasProperty("height")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    var groupMetadata = new MetadataGroup({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.hasProperty();
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
          },
          color: {
            type: "STRING",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
            optional: true,
            default: 10.0,
          },
          color: {
            type: "STRING",
          },
        },
      },
    });
    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
          },
          color: {
            type: "STRING",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
            type: "ARRAY",
            componentType: "FLOAT32",
            componentCount: 3,
          },
        },
      },
    });

    var position = [0.0, 0.0, 0.0];

    var groupMetadata = new MetadataGroup({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          position: position,
        },
      },
    });

    var value = groupMetadata.getProperty("position");
    expect(value).toEqual(position);
    expect(value).not.toBe(position); // The value is cloned
  });

  it("getProperty returns the default value when the property is missing", function () {
    var position = [0.0, 0.0, 0.0];
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "ARRAY",
            componentType: "FLOAT32",
            componentCount: 3,
            optional: true,
            default: position,
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
      class: buildingClass,
      id: "building",
      group: {},
    });

    var value = groupMetadata.getProperty("position");
    expect(value).toEqual(position);
    expect(value).not.toBe(position); // The value is cloned
  });

  it("getProperty throws without propertyId", function () {
    var groupMetadata = new MetadataGroup({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.getProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty creates property if it doesn't exist", function () {
    var groupMetadata = new MetadataGroup({
      id: "building",
      group: {},
    });

    var position = [0.0, 0.0, 0.0];
    groupMetadata.setProperty("position", position);
    expect(groupMetadata.properties.position).toEqual(position);
    expect(groupMetadata.properties.position).not.toBe(position); // The value is cloned
  });

  it("setProperty sets property value", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          position: {
            type: "ARRAY",
            componentType: "FLOAT32",
            componentCount: 3,
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          position: [0.0, 0.0, 0.0],
        },
      },
    });

    var position = [1.0, 1.0, 1.0];
    groupMetadata.setProperty("position", position);
    expect(groupMetadata.properties.position).toEqual(position);
    expect(groupMetadata.properties.position).not.toBe(position); // The value is cloned
  });

  it("setProperty throws without propertyId", function () {
    var groupMetadata = new MetadataGroup({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.setProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    var groupMetadata = new MetadataGroup({
      id: "building",
      group: {},
    });

    expect(function () {
      groupMetadata.setProperty("color");
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no class", function () {
    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });

    groupMetadata.setPropertyBySemantic("_HEIGHT", 20.0);
    expect(groupMetadata.properties.height).toBe(20.0);
  });

  it("setPropertyBySemantic doesn't set property value when there's no matching semantic", function () {
    var buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "FLOAT32",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
      class: buildingClass,
      id: "building",
      group: {
        properties: {
          height: 10.0,
        },
      },
    });

    groupMetadata.setPropertyBySemantic("_HEIGHT", 20.0);
    expect(groupMetadata.properties.height).toBe(10.0);
  });

  it("setPropertyBySemantic throws without semantic", function () {
    var groupMetadata = new MetadataGroup({
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
            type: "FLOAT32",
            semantic: "_HEIGHT",
          },
        },
      },
    });

    var groupMetadata = new MetadataGroup({
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
