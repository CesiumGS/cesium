import { MetadataClass, TileMetadata } from "../../Source/Cesium.js";

describe("Scene/TileMetadata", function () {
  const tileClassWithNoProperties = new MetadataClass({
    id: "tile",
    class: {},
  });

  const tileClass = new MetadataClass({
    id: "tile",
    class: {
      properties: {
        color: {
          type: "SCALAR",
          componentType: "FLOAT32",
          array: true,
          count: 8,
          semantic: "COLOR",
        },
        isSquare: {
          description:
            "Is a square tile, rather than a rectangular partial tile",
          type: "BOOLEAN",
        },
      },
    },
  });

  const tileExtension = {
    class: "tile",
    properties: {
      color: [1.0, 0.5, 0.0],
      isSquare: true,
    },
  };

  let tileMetadata;
  beforeEach(function () {
    tileMetadata = new TileMetadata({
      tile: tileExtension,
      class: tileClass,
    });
  });

  it("throws without tile", function () {
    expect(function () {
      tileMetadata = new TileMetadata({
        tile: undefined,
        class: tileClass,
      });
    }).toThrowDeveloperError();
  });

  it("throws without class", function () {
    expect(function () {
      tileMetadata = new TileMetadata({
        tile: {},
        class: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("creates tile metadata with default values", function () {
    const metadata = new TileMetadata({
      tile: {},
      class: tileClassWithNoProperties,
    });

    expect(metadata.extras).toBeUndefined();
    expect(metadata.extensions).toBeUndefined();
  });

  it("creates tile metadata", function () {
    const properties = {
      color: [0.0, 0.0, 1.0],
      isSquare: false,
    };

    const extras = {
      version: "0.0",
    };

    const extensions = {
      "3DTILES_extension": {},
    };
    tileMetadata = new TileMetadata({
      tile: {
        class: "tile",
        properties: properties,
        extras: extras,
        extensions: extensions,
      },
      class: tileClass,
    });
    expect(tileMetadata.class).toBe(tileClass);
    expect(tileMetadata.getProperty("color")).toEqual(properties.color);
    expect(tileMetadata.getProperty("isSquare")).toEqual(properties.isSquare);
    expect(tileMetadata.extras).toBe(extras);
    expect(tileMetadata.extensions).toBe(extensions);
  });

  it("hasProperty returns true if the tile has this property", function () {
    expect(tileMetadata.hasProperty("color")).toBe(true);
  });

  it("hasProperty returns false if the tile does not have this property", function () {
    expect(tileMetadata.hasProperty("numberOfPoints")).toBe(false);
  });

  it("hasPropertyBySemantic returns true if the tile has a property with the given semantic", function () {
    expect(tileMetadata.hasPropertyBySemantic("COLOR")).toBe(true);
  });

  it("hasPropertyBySemantic returns false if the tile does not have a property with the given semantic", function () {
    expect(tileMetadata.hasProperty("NUMBER_OF_POINTS")).toBe(false);
  });

  it("getPropertyIds returns array of property IDs", function () {
    const propertyIds = tileMetadata.getPropertyIds([]);
    propertyIds.sort();
    expect(propertyIds).toEqual(["color", "isSquare"]);
  });

  it("getProperty returns undefined if a property does not exist", function () {
    expect(tileMetadata.getProperty("numberOfPoints")).not.toBeDefined();
  });

  it("getProperty returns the property value", function () {
    expect(tileMetadata.getProperty("color")).toEqual([1.0, 0.5, 0.0]);
    expect(tileMetadata.getProperty("isSquare")).toBe(true);
  });

  it("setProperty returns false if property doesn't exist", function () {
    expect(tileMetadata.setProperty("numberOfPoints", 10)).toBe(false);
  });

  it("setProperty sets property value", function () {
    expect(tileMetadata.getProperty("isSquare")).toBe(true);
    expect(tileMetadata.setProperty("isSquare", false)).toBe(true);
    expect(tileMetadata.getProperty("isSquare")).toBe(false);
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    expect(
      tileMetadata.getPropertyBySemantic("HORIZON_OCCLUSION_POINT")
    ).not.toBeDefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    expect(tileMetadata.getPropertyBySemantic("COLOR")).toEqual([
      1.0,
      0.5,
      0.0,
    ]);
  });

  it("setPropertyBySemantic sets property value", function () {
    expect(tileMetadata.getPropertyBySemantic("COLOR")).toEqual([
      1.0,
      0.5,
      0.0,
    ]);
    expect(tileMetadata.setPropertyBySemantic("COLOR", [0.0, 0.0, 0.0])).toBe(
      true
    );
    expect(tileMetadata.getPropertyBySemantic("COLOR")).toEqual([
      0.0,
      0.0,
      0.0,
    ]);
  });

  it("setPropertyBySemantic returns false if the semantic doesn't exist", function () {
    expect(tileMetadata.setPropertyBySemantic("NAME", "Test Tile")).toBe(false);
  });
});
