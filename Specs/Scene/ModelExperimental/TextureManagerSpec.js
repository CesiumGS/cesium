import { TextureManager } from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/TextureManager", function () {
  it("constructs", function () {
    var textureManager = new TextureManager();
    expect(textureManager._textures).toEqual({});
    expect(textureManager._loadedImages).toEqual([]);
  });
});
