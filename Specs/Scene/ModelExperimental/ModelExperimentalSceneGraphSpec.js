import {
  Axis,
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
  var parentGltfUrl = "./Data/Cesium3DTiles/GltfContent/glTF/parent.gltf";

  var scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  function loadModel(options) {
    var model = ModelExperimental.fromGltf({
      url: options.url,
      upAxis: options.upAxis,
      forwardAxis: options.forwardAxis,
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

  it("creates scene nodes from a model", function () {
    return loadModel({ url: boxTexturedGlbUrl }).then(function (model) {
      var sceneGraph = model._sceneGraph;
      var modelComponents = sceneGraph._modelComponents;
      expect(sceneGraph).toBeDefined();
      expect(sceneGraph._sceneNodes.length).toEqual(
        modelComponents.nodes.length
      );
    });
  });

  it("traverses scene graph correctly", function () {
    return loadModel({ url: boxTexturedGlbUrl }).then(function (model) {
      var sceneGraph = model._sceneGraph;
      var modelComponents = sceneGraph._modelComponents;
      var sceneNodes = sceneGraph._sceneNodes;

      expect(sceneNodes[1].node).toEqual(modelComponents.nodes[0]);
      expect(sceneNodes[0].node).toEqual(modelComponents.nodes[1]);
    });
  });

  it("propagates node transforms correctly", function () {
    return loadModel({
      url: parentGltfUrl,
      upAxis: Axis.Z,
      forwardAxis: Axis.X,
    }).then(function (model) {
      var sceneGraph = model._sceneGraph;
      var modelComponents = sceneGraph._modelComponents;
      var sceneNodes = sceneGraph._sceneNodes;

      expect(sceneNodes[1].modelMatrix).toEqual(
        modelComponents.nodes[0].matrix
      );
      expect(sceneNodes[0].modelMatrix).toEqual(
        Matrix4.multiplyByTranslation(
          sceneNodes[1].modelMatrix,
          modelComponents.nodes[1].translation,
          new Matrix4()
        )
      );
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
