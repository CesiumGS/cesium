import {
  findGroupMetadata,
  MetadataClass,
  GroupMetadata,
} from "../../Source/Cesium.js";

describe("Scene/findGroupMetadata", function () {
  let layerClass;
  let mockTileset;

  beforeAll(function () {
    layerClass = new MetadataClass({
      id: "layer",
      class: {
        properties: {
          name: {
            type: "STRING",
          },
          elevation: {
            type: "SCALAR",
            componentType: "FLOAT32",
          },
        },
      },
    });

    mockTileset = {
      metadata: {
        groups: {
          testGroup: new GroupMetadata({
            id: "testGroup",
            class: layerClass,
            group: {
              properties: {
                name: "Test Layer testGroup",
                elevation: 150.0,
              },
            },
          }),
        },
      },
    };
  });

  it("returns undefined if there is no group or extension", function () {
    const contentHeader = {
      uri: "https://example.com/model.b3dm",
    };
    const group = findGroupMetadata(mockTileset, contentHeader);
    expect(group).not.toBeDefined();
  });

  it("returns the group metadata if there is a group", function () {
    const contentHeader = {
      uri: "https://example.com/model.b3dm",
      group: "testGroup",
    };
    const group = findGroupMetadata(mockTileset, contentHeader);
    expect(group).toBeDefined();
    expect(group.getProperty("name")).toBe("Test Layer testGroup");
    expect(group.getProperty("elevation")).toBe(150.0);
  });

  it("returns the group metadata if there is an extension", function () {
    const contentHeader = {
      uri: "https://example.com/model.b3dm",
      extensions: {
        "3DTILES_metadata": {
          group: "testGroup",
        },
      },
    };
    const group = findGroupMetadata(mockTileset, contentHeader);
    expect(group).toBeDefined();
    expect(group.getProperty("name")).toBe("Test Layer testGroup");
    expect(group.getProperty("elevation")).toBe(150.0);
  });
});
