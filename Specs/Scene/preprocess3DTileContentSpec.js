import {
  Cesium3DTileContentType,
  preprocess3DTileContent,
} from "../../Source/Cesium.js";

describe("Scene/preprocess3DTileContent", function () {
  function makeBinaryFile(magic) {
    var binaryFile = new Uint8Array(magic.length + 8);
    for (var i = 0; i < magic.length; i++) {
      binaryFile[i] = magic.charCodeAt(i);
    }
    return binaryFile;
  }

  function makeJsonFile(json) {
    var jsonString = JSON.stringify(json);
    var jsonFile = new Uint8Array(jsonString.length);
    for (var i = 0; i < jsonFile.length; i++) {
      jsonFile[i] = jsonString.charCodeAt(i);
    }
    return jsonFile;
  }

  it("detects binary contents by magic number", function () {
    // glb is handled in a separate test
    var magics = ["b3dm", "i3dm", "pnts", "cmpt", "vctr", "geom", "subt"];
    magics.forEach(function (magic) {
      var typedArray = makeBinaryFile(magic);
      var results = preprocess3DTileContent(typedArray.buffer);
      expect(results).toEqual({
        contentType: magic,
        binaryPayload: typedArray,
      });
    });
  });

  it("detects external tilesets", function () {
    var externalTileset = {
      asset: {
        version: "1.0",
      },
      geometricError: 100,
      root: {},
    };
    var payload = makeJsonFile(externalTileset);
    var results = preprocess3DTileContent(payload.buffer);
    expect(results).toEqual({
      contentType: Cesium3DTileContentType.EXTERNAL_TILESET,
      jsonPayload: externalTileset,
    });
  });

  it("labels binary glTF as glb", function () {
    var typedArray = makeBinaryFile("glTF");
    var results = preprocess3DTileContent(typedArray.buffer);
    expect(results).toEqual({
      contentType: Cesium3DTileContentType.GLTF_BINARY,
      binaryPayload: typedArray,
    });
  });

  it("detects gltf JSON content", function () {
    var glTF = {
      asset: {
        version: "1.0",
      },
      meshes: [],
    };
    var payload = makeJsonFile(glTF);
    var results = preprocess3DTileContent(payload.buffer);
    expect(results).toEqual({
      contentType: Cesium3DTileContentType.GLTF,
      jsonPayload: glTF,
    });
  });

  it("throws for invalid content", function () {
    expect(function () {
      var payload = makeBinaryFile("fake");
      preprocess3DTileContent(payload.buffer);
    }).toThrowRuntimeError();
  });
});
