import {
  Cesium3DTileContentType,
  preprocess3DTileContent,
} from "../../Source/Cesium.js";

describe("Scene/preprocess3DTileContent", function () {
  function makeBinaryFile(magic) {
    const binaryFile = new Uint8Array(magic.length + 8);
    for (let i = 0; i < magic.length; i++) {
      binaryFile[i] = magic.charCodeAt(i);
    }
    return binaryFile;
  }

  function makeJsonFile(json) {
    const jsonString = JSON.stringify(json);
    const jsonFile = new Uint8Array(jsonString.length);
    for (let i = 0; i < jsonFile.length; i++) {
      jsonFile[i] = jsonString.charCodeAt(i);
    }
    return jsonFile;
  }

  it("detects binary contents by magic number", function () {
    // glb is handled in a separate test
    const magics = ["b3dm", "i3dm", "pnts", "cmpt", "vctr", "geom", "subt"];
    magics.forEach(function (magic) {
      const typedArray = makeBinaryFile(magic);
      const results = preprocess3DTileContent(typedArray.buffer);
      expect(results).toEqual({
        contentType: magic,
        binaryPayload: typedArray,
      });
    });
  });

  it("detects external tilesets", function () {
    const externalTileset = {
      asset: {
        version: "1.0",
      },
      geometricError: 100,
      root: {},
    };
    const payload = makeJsonFile(externalTileset);
    const results = preprocess3DTileContent(payload.buffer);
    expect(results).toEqual({
      contentType: Cesium3DTileContentType.EXTERNAL_TILESET,
      jsonPayload: externalTileset,
    });
  });

  it("labels binary glTF as glb", function () {
    const typedArray = makeBinaryFile("glTF");
    const results = preprocess3DTileContent(typedArray.buffer);
    expect(results).toEqual({
      contentType: Cesium3DTileContentType.GLTF_BINARY,
      binaryPayload: typedArray,
    });
  });

  it("detects gltf JSON content", function () {
    const glTF = {
      asset: {
        version: "1.0",
      },
      meshes: [],
    };
    const payload = makeJsonFile(glTF);
    const results = preprocess3DTileContent(payload.buffer);
    expect(results).toEqual({
      contentType: Cesium3DTileContentType.GLTF,
      jsonPayload: glTF,
    });
  });

  it("throws for invalid content", function () {
    expect(function () {
      const payload = makeBinaryFile("fake");
      preprocess3DTileContent(payload.buffer);
    }).toThrowRuntimeError();
  });
});
