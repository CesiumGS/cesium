import {
  Axis,
  Matrix4,
  ModelExperimentalSceneGraph,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadModelExperimentalForSpec.js";

describe(
  "Scene/ModelExperimental/ModelExperimentalSceneGraph",
  function () {
    var parentGltfUrl = "./Data/Cesium3DTiles/GltfContent/glTF/parent.gltf";

    var scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    it("creates scene nodes from a model", function () {
      return loadAndZoomToModelExperimental({ url: parentGltfUrl }, scene).then(
        function (model) {
          var sceneGraph = model._sceneGraph;
          var modelComponents = sceneGraph._modelComponents;
          expect(sceneGraph).toBeDefined();
          expect(sceneGraph._sceneNodes.length).toEqual(
            modelComponents.nodes.length
          );
        }
      );
    });

    it("traverses scene graph correctly", function () {
      return loadAndZoomToModelExperimental({ url: parentGltfUrl }, scene).then(
        function (model) {
          var sceneGraph = model._sceneGraph;
          var modelComponents = sceneGraph._modelComponents;
          var sceneNodes = sceneGraph._sceneNodes;

          expect(sceneNodes[1].node).toEqual(modelComponents.nodes[0]);
          expect(sceneNodes[0].node).toEqual(modelComponents.nodes[1]);
        }
      );
    });

    it("propagates node transforms correctly", function () {
      return loadAndZoomToModelExperimental(
        {
          url: parentGltfUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
        },
        scene
      ).then(function (model) {
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
  },
  "WebGL"
);
