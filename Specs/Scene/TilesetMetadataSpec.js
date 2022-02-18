import {
  Cartesian3,
  MetadataClass,
  TilesetMetadata,
} from "../../Source/Cesium.js";

describe("Scene/TilesetMetadata", function () {
  it("creates tileset metadata with default values", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(tilesetMetadata.extras).toBeUndefined();
  });

  it("creates tileset metadata", function () {
    const cityClass = new MetadataClass({
      id: "city",
      class: {
        properties: {
          neighborhoods: {
            type: "STRING",
            array: true,
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
      neighborhoods: ["A", "B", "C"],
    };

    const tilesetMetadata = new TilesetMetadata({
      class: cityClass,
      tileset: {
        extras: extras,
        extensions: extensions,
        properties: properties,
      },
    });

    expect(tilesetMetadata.class).toBe(cityClass);
    expect(tilesetMetadata.extras).toBe(extras);
    expect(tilesetMetadata.extensions).toBe(extensions);
    expect(tilesetMetadata.getProperty("neighborhoods")).toEqual(
      properties.neighborhoods
    );
  });

  it("constructor throws without tileset", function () {
    expect(function () {
      return new TilesetMetadata({
        class: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new TilesetMetadata({
        tileset: {},
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there's no properties", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });
    expect(tilesetMetadata.hasProperty("height")).toBe(false);
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(tilesetMetadata.hasProperty("color")).toBe(false);
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(tilesetMetadata.hasProperty("height")).toBe(true);
  });

  it("hasProperty returns true when the class has a default value for a missing property", function () {
    const buildingClass = new MetadataClass({
      id: "building",
      class: {
        properties: {
          height: {
            type: "SCALAR",
            componentType: "FLOAT32",
            optional: true,
            default: 10.0,
          },
        },
      },
    });
    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {},
    });

    expect(tilesetMetadata.hasProperty("height")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(function () {
      tilesetMetadata.hasProperty();
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no properties", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });
    expect(tilesetMetadata.hasPropertyBySemantic("HEIGHT")).toBe(false);
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(tilesetMetadata.hasPropertyBySemantic("HEIGHT")).toBe(false);
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(tilesetMetadata.hasPropertyBySemantic("HEIGHT")).toBe(true);
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
            optional: true,
            default: 10.0,
          },
        },
      },
    });
    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {},
    });

    expect(tilesetMetadata.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(function () {
      tilesetMetadata.hasPropertyBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(tilesetMetadata.getPropertyIds().length).toBe(0);
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
          color: "RED",
        },
      },
    });

    expect(tilesetMetadata.getPropertyIds().sort()).toEqual([
      "color",
      "height",
    ]);
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
    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          color: "RED",
        },
      },
    });

    expect(tilesetMetadata.getPropertyIds().sort()).toEqual([
      "color",
      "height",
    ]);
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
          color: "RED",
        },
      },
    });

    const results = [];
    const returnedResults = tilesetMetadata.getPropertyIds(results);

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual(["color", "height"]);
  });

  it("getProperty returns undefined when there's no properties", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });
    expect(tilesetMetadata.getProperty("height")).toBeUndefined();
  });

  it("getProperty returns undefined when there's no property with the given property ID", function () {
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });
    expect(tilesetMetadata.getProperty("color")).toBeUndefined();
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          position: position,
        },
      },
    });

    const value = tilesetMetadata.getProperty("position");
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {},
    });

    const value = tilesetMetadata.getProperty("position");
    expect(value).toEqual(Cartesian3.unpack(position));
  });

  it("getProperty throws without propertyId", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(function () {
      tilesetMetadata.getProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty returns false if property doesn't exist", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    const position = [0.0, 0.0, 0.0];
    expect(tilesetMetadata.setProperty("position", position)).toBe(false);
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          position: [0.0, 0.0, 0.0],
        },
      },
    });

    const position = new Cartesian3(1.0, 1.0, 1.0);
    expect(tilesetMetadata.setProperty("position", position)).toBe(true);
    expect(tilesetMetadata.getProperty("position")).toEqual(position);
    expect(tilesetMetadata.getProperty("position")).not.toBe(position); // The value is cloned
  });

  it("setProperty throws without propertyId", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(function () {
      tilesetMetadata.setProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(function () {
      tilesetMetadata.setProperty("color");
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no class", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });
    expect(tilesetMetadata.getPropertyBySemantic("_HEIGHT")).toBeUndefined();
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(tilesetMetadata.getPropertyBySemantic("_HEIGHT")).toBeUndefined();
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(tilesetMetadata.getPropertyBySemantic("_HEIGHT")).toBe(10.0);
  });

  it("getPropertyBySemantic throws without semantic", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(function () {
      tilesetMetadata.getPropertyBySemantic();
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(tilesetMetadata.setPropertyBySemantic("_HEIGHT", 20.0)).toBe(true);
    expect(tilesetMetadata.getProperty("height")).toBe(20.0);
  });

  it("setPropertyBySemantic returns false if semantic does not exist", function () {
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(tilesetMetadata.setPropertyBySemantic("_HEIGHT", 20.0)).toBe(false);
  });

  it("setPropertyBySemantic throws without semantic", function () {
    const tilesetMetadata = new TilesetMetadata({
      tileset: {},
      class: {},
    });

    expect(function () {
      tilesetMetadata.setPropertyBySemantic();
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

    const tilesetMetadata = new TilesetMetadata({
      class: buildingClass,
      tileset: {
        properties: {
          height: 10.0,
        },
      },
    });

    expect(function () {
      tilesetMetadata.setPropertyBySemantic("_HEIGHT");
    }).toThrowDeveloperError();
  });
});
