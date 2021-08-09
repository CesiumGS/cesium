import { ResourceCache } from "../../../Source/Cesium";
import createScene from "../../createScene";

describe("Scene/ModelExperimental/InstancingPipelineStage", function () {
  var scene;
  var gltfLoaders = [];

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    var gltfLoadersLength = gltfLoaders.length;
    for (var i = 0; i < gltfLoadersLength; ++i) {
      var gltfLoader = gltfLoaders[i];
      if (!gltfLoader.isDestroyed()) {
        gltfLoader.destroy();
      }
    }
    gltfLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  it("correctly computes TRANSLATION min and max", function () {});
  it("sets translation min and max from TRANSLATION accessor", function () {});

  it("creates rotation vertex attribute when ROTATION is present", function () {});
  it("creates translation vertex attribute when TRANSLATION is present", function () {});

  it("creates instance matrix vertex attributes when ROTATION is present", function () {});
  it("creates instance matrix vertex attributes when TRANSLATION min and max are not present", function () {});
});
