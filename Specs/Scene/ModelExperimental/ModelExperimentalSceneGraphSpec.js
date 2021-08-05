import {
  Axis,
  buildDrawCommand,
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
    var vertexColorGltfUrl =
      "./Data/Models/PBR/VertexColorTest/VertexColorTest.gltf";

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

    it("creates scene nodes and scene primitives from a model", function () {
      return loadAndZoomToModelExperimental(
        { url: vertexColorGltfUrl },
        scene
      ).then(function (model) {
        var sceneGraph = model._sceneGraph;
        var modelComponents = sceneGraph._modelComponents;

        expect(sceneGraph).toBeDefined();

        var sceneNodes = sceneGraph._sceneNodes;
        expect(sceneNodes.length).toEqual(modelComponents.nodes.length);

        expect(sceneNodes[0].sceneMeshPrimitives.length).toEqual(1);
        expect(sceneNodes[1].sceneMeshPrimitives.length).toEqual(1);
      });
    });

    it("builds draw commands for each primitive", function () {
      spyOn(
        ModelExperimentalSceneGraph.prototype,
        "buildDrawCommands"
      ).and.callThrough();
      return loadAndZoomToModelExperimental({ url: parentGltfUrl }, scene).then(
        function (model) {
          var sceneGraph = model._sceneGraph;
          var sceneNodes = sceneGraph._sceneNodes;

          var primitivesCount = 0;
          for (var i = 0; i < sceneNodes.length; i++) {
            primitivesCount += sceneNodes[i].sceneMeshPrimitives.length;
          }

          var frameState = scene.frameState;

          model.update(frameState);
          expect(
            ModelExperimentalSceneGraph.prototype.buildDrawCommands
          ).toHaveBeenCalled();
          expect(frameState.commandList.length).toEqual(primitivesCount);

          expect(model._drawCommandsBuilt).toEqual(true);
          expect(sceneGraph._drawCommands.length).toEqual(primitivesCount);

          // Reset the draw command list to see if they're re-built.
          model._drawCommandsBuilt = false;
          sceneGraph._drawCommands = [];
          frameState.commandList = [];

          model.update(frameState);
          expect(
            ModelExperimentalSceneGraph.prototype.buildDrawCommands
          ).toHaveBeenCalled();
          expect(frameState.commandList.length).toBeGreaterThan(0);
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

        expect(model.upAxis).toEqual(Axis.Z);
        expect(model.forwardAxis).toEqual(Axis.X);

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
