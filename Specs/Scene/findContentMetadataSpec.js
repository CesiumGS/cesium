import {
  Cartesian3,
  findContentMetadata,
  MetadataClass,
} from "../../Source/Cesium.js";

describe("Scene/findContentMetadata", function () {
  let contentClass;
  let mockTileset;

  beforeAll(function () {
    contentClass = new MetadataClass({
      id: "content",
      class: {
        properties: {
          name: {
            type: "STRING",
          },
          color: {
            type: "VEC3",
            componentType: "UINT8",
          },
        },
      },
    });
    mockTileset = {
      schema: {
        classes: {
          content: contentClass,
        },
      },
    };
  });

  it("returns undefined if there is no metadata or extension", function () {
    const contentHeader = {
      uri: "https://example.com/model.b3dm",
    };
    const metadata = findContentMetadata(mockTileset, contentHeader);
    expect(metadata).not.toBeDefined();
  });

  it("returns metadata if there is metadata", function () {
    const contentHeader = {
      uri: "https://example.com/model.b3dm",
      metadata: {
        class: "content",
        properties: {
          name: "Sample Content",
          color: [255, 255, 0],
        },
      },
    };

    const metadata = findContentMetadata(mockTileset, contentHeader);
    expect(metadata).toBeDefined();
    expect(metadata.getProperty("name")).toEqual("Sample Content");
    expect(metadata.getProperty("color")).toEqual(new Cartesian3(255, 255, 0));
  });

  it("returns metadata if there is an extension (legacy)", function () {
    const contentHeader = {
      uri: "https://example.com/model.b3dm",
      extensions: {
        "3DTILES_metadata": {
          class: "content",
          properties: {
            name: "Sample Content",
            color: [255, 255, 0],
          },
        },
      },
    };

    const metadata = findContentMetadata(mockTileset, contentHeader);
    expect(metadata).toBeDefined();
    expect(metadata.getProperty("name")).toEqual("Sample Content");
    expect(metadata.getProperty("color")).toEqual(new Cartesian3(255, 255, 0));
  });
});
