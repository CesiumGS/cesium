import {
  findMetadataGroup,
  MetadataClass,
  MetadataGroup,
} from "../../Source/Cesium.js";

describe("Scene/findMetadataGroup", function () {
  var layerClass = new MetadataClass({
    id: "layer",
    class: {
      properties: {
        name: {
          type: "STRING",
        },
        elevation: {
          type: "FLOAT32",
        },
      },
    },
  });

  var mockTileset = {
    getGroup: function (groupId) {
      return new MetadataGroup({
        id: groupId,
        class: layerClass,
        group: {
          properties: {
            name: "Test Layer " + groupId,
            elevation: 150.0,
          },
        },
      });
    },
  };

  it("returns undefined if the content header is undefined", function () {
    var group = findMetadataGroup(mockTileset, undefined);
    expect(group).not.toBeDefined();
  });

  it("returns undefined if there is no extension", function () {
    var contentHeader = {
      uri: "https://example.com/model.b3dm",
    };
    var group = findMetadataGroup(mockTileset, contentHeader);
    expect(group).not.toBeDefined();
  });

  it("returns the group metadata if there is an extension", function () {
    var groupId = "testGroup";
    var contentHeader = {
      uri: "https://example.com/model.b3dm",
      extensions: {
        "3DTILES_metadata": {
          group: groupId,
        },
      },
    };
    var group = findMetadataGroup(mockTileset, contentHeader);
    expect(group).toBeDefined();
    expect(group.getProperty("name")).toBe("Test Layer testGroup");
    expect(group.getProperty("elevation")).toBe(150.0);
  });
});
