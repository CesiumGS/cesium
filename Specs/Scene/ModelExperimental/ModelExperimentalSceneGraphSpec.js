import {
  Cartesian3,
  defaultValue,
  HeadingPitchRange,
  Matrix4,
  ModelExperimental,
  ModelExperimentalSceneGraph,
  ResourceCache,
  when,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import pollToPromise from "../../pollToPromise.js";

describe("Scene/ModelExperimental/ModelExperimentalSceneGraph", function () {
  var boxTexturedGlbUrl =
    "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";

  var scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    //ResourceCache.clearForSpecs();
  });

  function loadModel(options) {
    var model = ModelExperimental.fromGltf({
      url: options.url,
    });
    scene.primitives.add(model);
    zoomTo(model);

    return pollToPromise(
      function () {
        scene.renderForSpecs();
        return model.ready;
      },
      { timeout: 10000 }
    )
      .then(function () {
        return model;
      })
      .otherwise(function () {
        return when.reject(model);
      });
  }

  function zoomTo(model) {
    model.zoomTo = function (zoom) {
      zoom = defaultValue(zoom, 4.0);

      var camera = scene.camera;
      var center = Matrix4.multiplyByPoint(
        model.modelMatrix,
        model.boundingSphere.center,
        new Cartesian3()
      );
      var r = zoom * Math.max(model.boundingSphere.radius, camera.frustum.near);
      camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, r));
    };
  }

  it("loads all scene nodes from a model", function () {
    return loadModel({ url: boxTexturedGlbUrl }).then(function (model) {
      expect();
    });
  });

  it("throws for undefined options.model", function () {
    expect(function () {
      return new ModelExperimentalSceneGraph({
        model: undefined,
        modelComponents: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined options.modelComponents", function () {
    expect(function () {
      return new ModelExperimentalSceneGraph({
        model: {},
        modelComponents: undefined,
      });
    }).toThrowDeveloperError();
  });
});
