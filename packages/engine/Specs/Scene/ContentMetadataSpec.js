import { MetadataClass, ContentMetadata } from "../../Source/Cesium.js";

describe("Scene/ContentMetadata", function () {
  const contentClassWithNoProperties = new MetadataClass({
    id: "content",
    class: {},
  });

  const contentClass = new MetadataClass({
    id: "content",
    class: {
      properties: {
        color: {
          type: "SCALAR",
          componentType: "UINT8",
          array: true,
          count: 3,
          semantic: "COLOR",
        },
        author: {
          type: "STRING",
        },
      },
    },
  });

  const contentMetadataJson = {
    class: "content",
    properties: {
      color: [255, 125, 0],
      author: "Cesium",
    },
  };

  let contentMetadata;
  beforeEach(function () {
    contentMetadata = new ContentMetadata({
      content: contentMetadataJson,
      class: contentClass,
    });
  });

  it("throws without content", function () {
    expect(function () {
      contentMetadata = new ContentMetadata({
        content: undefined,
        class: contentClass,
      });
    }).toThrowDeveloperError();
  });

  it("throws without class", function () {
    expect(function () {
      contentMetadata = new ContentMetadata({
        content: {},
        class: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("creates content metadata with default values", function () {
    const metadata = new ContentMetadata({
      content: {},
      class: contentClassWithNoProperties,
    });

    expect(metadata.extras).toBeUndefined();
    expect(metadata.extensions).toBeUndefined();
  });

  it("creates content metadata", function () {
    const properties = {
      color: [0, 0, 255],
      author: "Sample Author",
    };

    const extras = {
      version: "0.0",
    };

    const extensions = {
      "3DTILES_extension": {},
    };

    contentMetadata = new ContentMetadata({
      content: {
        class: "content",
        properties: properties,
        extras: extras,
        extensions: extensions,
      },
      class: contentClass,
    });
    expect(contentMetadata.class).toBe(contentClass);
    expect(contentMetadata.getProperty("color")).toEqual(properties.color);
    expect(contentMetadata.getProperty("author")).toEqual(properties.author);
    expect(contentMetadata.extras).toBe(extras);
    expect(contentMetadata.extensions).toBe(extensions);
  });

  it("hasProperty returns true if the content has this property", function () {
    expect(contentMetadata.hasProperty("color")).toBe(true);
  });

  it("hasProperty returns false if the content does not have this property", function () {
    expect(contentMetadata.hasProperty("numberOfPoints")).toBe(false);
  });

  it("hasPropertyBySemantic returns true if the content has a property with the given semantic", function () {
    expect(contentMetadata.hasPropertyBySemantic("COLOR")).toBe(true);
  });

  it("hasPropertyBySemantic returns false if the content does not have a property with the given semantic", function () {
    expect(contentMetadata.hasProperty("NUMBER_OF_POINTS")).toBe(false);
  });

  it("getPropertyIds returns array of property IDs", function () {
    const propertyIds = contentMetadata.getPropertyIds([]);
    propertyIds.sort();
    expect(propertyIds).toEqual(["author", "color"]);
  });

  it("getProperty throws if a property does not exist", function () {
    expect(function () {
      return contentMetadata.getProperty("numberOfPoints");
    }).toThrowDeveloperError();
  });

  it("getProperty returns the property value", function () {
    expect(contentMetadata.getProperty("color")).toEqual([255, 125, 0]);
    expect(contentMetadata.getProperty("author")).toBe("Cesium");
  });

  it("setProperty returns false if property doesn't exist", function () {
    expect(contentMetadata.setProperty("numberOfPoints", 10)).toBe(false);
  });

  it("setProperty sets property value", function () {
    expect(contentMetadata.getProperty("author")).toBe("Cesium");
    expect(contentMetadata.setProperty("author", "Sample Author")).toBe(true);
    expect(contentMetadata.getProperty("author")).toBe("Sample Author");
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    expect(contentMetadata.getPropertyBySemantic("AUTHOR")).not.toBeDefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    expect(contentMetadata.getPropertyBySemantic("COLOR")).toEqual([
      255,
      125,
      0,
    ]);
  });

  it("setPropertyBySemantic sets property value", function () {
    expect(contentMetadata.getPropertyBySemantic("COLOR")).toEqual([
      255,
      125,
      0,
    ]);
    expect(contentMetadata.setPropertyBySemantic("COLOR", [0, 0, 0])).toBe(
      true
    );
    expect(contentMetadata.getPropertyBySemantic("COLOR")).toEqual([0, 0, 0]);
  });

  it("setPropertyBySemantic returns false if the semantic doesn't exist", function () {
    expect(contentMetadata.setPropertyBySemantic("AUTHOR", "Test Author")).toBe(
      false
    );
  });
});
