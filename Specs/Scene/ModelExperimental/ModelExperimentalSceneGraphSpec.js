import {
  Axis,
  Matrix4,
  ModelExperimentalSceneGraph,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadAndZoomToModelExperimental.js";

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

    it("creates runtime nodes and runtime primitives from a model", function () {
      return loadAndZoomToModelExperimental(
        { gltf: vertexColorGltfUrl },
        scene
      ).then(function (model) {
        var sceneGraph = model._sceneGraph;
        var modelComponents = sceneGraph._modelComponents;

        expect(sceneGraph).toBeDefined();

        var runtimeNodes = sceneGraph._runtimeNodes;
        expect(runtimeNodes.length).toEqual(modelComponents.nodes.length);

        expect(runtimeNodes[0].runtimePrimitives.length).toEqual(1);
        expect(runtimeNodes[1].runtimePrimitives.length).toEqual(1);
      });
    });

    it("builds draw commands for each primitive", function () {
      spyOn(
        ModelExperimentalSceneGraph.prototype,
        "buildDrawCommands"
      ).and.callThrough();
      return loadAndZoomToModelExperimental(
        { gltf: parentGltfUrl },
        scene
      ).then(function (model) {
        var sceneGraph = model._sceneGraph;
        var runtimeNodes = sceneGraph._runtimeNodes;

        var primitivesCount = 0;
        for (var i = 0; i < runtimeNodes.length; i++) {
          primitivesCount += runtimeNodes[i].runtimePrimitives.length;
        }

        var frameState = scene.frameState;
        frameState.commandList = [];

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
        expect(frameState.commandList.length).toEqual(primitivesCount);
      });
    });

    it("traverses scene graph correctly", function () {
      return loadAndZoomToModelExperimental(
        { gltf: parentGltfUrl },
        scene
      ).then(function (model) {
        var sceneGraph = model._sceneGraph;
        var modelComponents = sceneGraph._modelComponents;
        var runtimeNodes = sceneGraph._runtimeNodes;

        expect(runtimeNodes[1].node).toEqual(modelComponents.nodes[0]);
        expect(runtimeNodes[0].node).toEqual(modelComponents.nodes[1]);
      });
    });

    it("propagates node transforms correctly", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: parentGltfUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
        },
        scene
      ).then(function (model) {
        var sceneGraph = model._sceneGraph;
        var modelComponents = sceneGraph._modelComponents;
        var scene = modelComponents.scene;
        var runtimeNodes = sceneGraph._runtimeNodes;

        expect(scene.upAxis).toEqual(Axis.Z);
        expect(scene.forwardAxis).toEqual(Axis.X);

        expect(runtimeNodes[1].modelMatrix).toEqual(
          modelComponents.nodes[0].matrix
        );
        expect(runtimeNodes[0].modelMatrix).toEqual(
          Matrix4.multiplyByTranslation(
            runtimeNodes[1].modelMatrix,
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
