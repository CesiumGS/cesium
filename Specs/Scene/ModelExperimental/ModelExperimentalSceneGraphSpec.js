import {
  Axis,
  Cesium3DTileStyle,
  Color,
  CPUStylingPipelineStage,
  CustomShader,
  CustomShaderPipelineStage,
  Matrix4,
  ModelColorPipelineStage,
  ModelExperimentalSceneGraph,
  Pass,
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
    var buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";

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

    it("builds draw commands for all opaque styled features", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.style = new Cesium3DTileStyle({
          color: {
            conditions: [["${height} > 1", "color('red')"]],
          },
        });
        var frameState = scene.frameState;
        var sceneGraph = model._sceneGraph;
        // Reset the draw commands so we can inspect the draw command generation.
        model._drawCommandsBuilt = false;
        sceneGraph._drawCommands = [];
        frameState.commandList = [];

        // Run this twice to let the post-render reset call run.
        scene.renderForSpecs();
        scene.renderForSpecs();
        expect(sceneGraph._drawCommands.length).toEqual(1);
        expect(frameState.commandList.length).toEqual(1);
        expect(sceneGraph._drawCommands[0].pass).toEqual(Pass.OPAQUE);
      });
    });

    it("builds draw commands for all translucent styled features", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.style = new Cesium3DTileStyle({
          color: {
            conditions: [["${height} > 1", "color('red', 0.1)"]],
          },
        });
        var frameState = scene.frameState;
        var sceneGraph = model._sceneGraph;
        // Reset the draw commands so we can inspect the draw command generation.
        model._drawCommandsBuilt = false;
        sceneGraph._drawCommands = [];
        frameState.commandList = [];
        // Run this twice to let the post-render reset call run.
        scene.renderForSpecs();
        scene.renderForSpecs();
        expect(sceneGraph._drawCommands.length).toEqual(1);
        expect(frameState.commandList.length).toEqual(1);
        expect(sceneGraph._drawCommands[0].pass).toEqual(Pass.TRANSLUCENT);
      });
    });

    it("builds draw commands for both opaque and translucent styled features", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.style = new Cesium3DTileStyle({
          color: {
            conditions: [
              ["${height} > 80", "color('red', 0.1)"],
              ["true", "color('blue')"],
            ],
          },
        });
        var frameState = scene.frameState;
        var sceneGraph = model._sceneGraph;
        // Reset the draw commands so we can inspect the draw command generation.
        model._drawCommandsBuilt = false;
        sceneGraph._drawCommands = [];
        frameState.commandList = [];
        // Run this twice to let the post-render reset call run.
        scene.renderForSpecs();
        scene.renderForSpecs();
        expect(sceneGraph._drawCommands.length).toEqual(2);
        expect(frameState.commandList.length).toEqual(2);
        expect(sceneGraph._drawCommands[0].pass).toEqual(Pass.OPAQUE);
        expect(sceneGraph._drawCommands[1].pass).toEqual(Pass.TRANSLUCENT);
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

        scene.renderForSpecs();
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

        scene.renderForSpecs();
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

    it("adds ModelColorPipelineStage when color is set on the model", function () {
      spyOn(ModelColorPipelineStage, "process");
      return loadAndZoomToModelExperimental(
        {
          color: Color.RED,
          gltf: parentGltfUrl,
        },
        scene
      ).then(function () {
        expect(ModelColorPipelineStage.process).toHaveBeenCalled();
      });
    });

    it("adds CPUStylingPipelineStage when style is set on the model", function () {
      spyOn(CPUStylingPipelineStage, "process");
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.style = new Cesium3DTileStyle({
          color: {
            conditions: [
              ["${height} > 80", "color('#436d9d', 0.5)"],
              ["true", "color('red')"],
            ],
          },
        });
        model.update(scene.frameState);
        expect(CPUStylingPipelineStage.process).toHaveBeenCalled();
      });
    });

    it("adds CustomShaderPipelineStage when customShader is set on the model", function () {
      spyOn(CustomShaderPipelineStage, "process");
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.customShader = new CustomShader();
        model.update(scene.frameState);
        expect(CustomShaderPipelineStage.process).toHaveBeenCalled();
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
