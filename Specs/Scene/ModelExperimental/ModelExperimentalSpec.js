import {
  GltfLoader,
  Resource,
  ModelExperimental,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental", function () {
  var boxTexturedGlbUrl =
    "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";

  it("initializes from Uint8Array", function () {
    spyOn(GltfLoader.prototype, "load").and.callThrough();

    var resource = Resource.createIfNeeded(boxTexturedGlbUrl);
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var model = new ModelExperimental({
        gltf: new Uint8Array(buffer),
      });

      expect(GltfLoader.prototype.load).toHaveBeenCalled();
      model._readyPromise.then(function () {
        expect(model._sceneGraph).toBeDefined();
        expect(model._resourcesLoaded).toEqual(true);
      });
    });
  });

  it("destroy works", function () {
    var resource = Resource.createIfNeeded(boxTexturedGlbUrl);
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var model = new ModelExperimental({
        gltf: new Uint8Array(buffer),
      });

      model._readyPromise.then(function () {
        model.destroy();
        expect(model).toBeUndefined();
      });
    });
  });
});
