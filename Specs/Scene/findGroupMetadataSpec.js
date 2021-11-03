import {
  findGroupMetadata,
  MetadataClass,
  GroupMetadata,
} from "../../Source/Cesium.js";

describe("Scene/findGroupMetadata", function () {
  var layerClass = new MetadataClass({
    id: "layer",
    class: {
      properties: {
        name: {
          componentType: "STRING",
        },
        elevation: {
          componentType: "FLOAT32",
        },
      },
    },
  });

  var mockTileset = {
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

  it("returns undefined if the content header is undefined", function () {
    var group = findGroupMetadata(mockTileset, undefined);
    expect(group).not.toBeDefined();
  });

  it("returns undefined if there is no extension", function () {
    var contentHeader = {
      uri: "https://example.com/model.b3dm",
    };
    var group = findGroupMetadata(mockTileset, contentHeader);
    expect(group).not.toBeDefined();
  });

  it("returns the group metadata if there is an extension", function () {
    var contentHeader = {
      uri: "https://example.com/model.b3dm",
      extensions: {
        "3DTILES_metadata": {
          group: "testGroup",
        },
      },
    };
    var group = findGroupMetadata(mockTileset, contentHeader);
    expect(group).toBeDefined();
    expect(group.getProperty("name")).toBe("Test Layer testGroup");
    expect(group.getProperty("elevation")).toBe(150.0);
  });
});
