import { Cartesian3, findContentMetadata, MetadataClass } from "../../index.js";

describe("Scene/findContentMetadata", function () {
  let contentClass;
  let mockTileset;

  beforeAll(function () {
    contentClass = MetadataClass.fromJson({
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

  it("logs a warning and returns undefined if the tileset is missing a schema", function () {
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

    spyOn(findContentMetadata, "_oneTimeWarning");
    const tilesetWithoutSchema = {};
    const metadata = findContentMetadata(tilesetWithoutSchema, contentHeader);
    expect(metadata).not.toBeDefined();
    expect(findContentMetadata._oneTimeWarning).toHaveBeenCalled();
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
