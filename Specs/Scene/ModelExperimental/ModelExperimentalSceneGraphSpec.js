import {
  Axis,
  Cesium3DTileStyle,
  Color,
  CustomShader,
  CustomShaderPipelineStage,
  Matrix4,
  ModelColorPipelineStage,
  ModelExperimentalSceneGraph,
  ModelExperimentalUtility,
  Pass,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadAndZoomToModelExperimental.js";

describe(
  "Scene/ModelExperimental/ModelExperimentalSceneGraph",
  function () {
    const parentGltfUrl = "./Data/Cesium3DTiles/GltfContent/glTF/parent.gltf";
    const vertexColorGltfUrl =
      "./Data/Models/PBR/VertexColorTest/VertexColorTest.gltf";
    const buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";

    let scene;

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
        const sceneGraph = model._sceneGraph;
        const modelComponents = sceneGraph._modelComponents;

        expect(sceneGraph).toBeDefined();

        const runtimeNodes = sceneGraph._runtimeNodes;
        expect(runtimeNodes.length).toEqual(modelComponents.nodes.length);

        expect(runtimeNodes[0].runtimePrimitives.length).toEqual(1);
        expect(runtimeNodes[1].runtimePrimitives.length).toEqual(1);
      });
    });

    it("builds draw commands for all opaque styled features", function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [["${height} > 1", "color('red')"]],
        },
      });
      return style.readyPromise
        .then(function () {
          return loadAndZoomToModelExperimental(
            {
              gltf: buildingsMetadata,
            },
            scene
          );
        })
        .then(function (model) {
          model.style = style;
          const frameState = scene.frameState;
          const sceneGraph = model._sceneGraph;
          // Reset the draw commands so we can inspect the draw command generation.
          model._drawCommandsBuilt = false;
          frameState.commandList = [];
          scene.renderForSpecs();

          const drawCommands = sceneGraph.getDrawCommands();

          expect(drawCommands.length).toEqual(1);
          expect(drawCommands[0].pass).toEqual(Pass.OPAQUE);
          expect(frameState.commandList.length).toEqual(1);
        });
    });

    it("builds draw commands for all translucent styled features", function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [["${height} > 1", "color('red', 0.1)"]],
        },
      });
      return style.readyPromise
        .then(function () {
          return loadAndZoomToModelExperimental(
            {
              gltf: buildingsMetadata,
            },
            scene
          );
        })
        .then(function (model) {
          model.style = style;
          const frameState = scene.frameState;
          const sceneGraph = model._sceneGraph;
          // Reset the draw commands so we can inspect the draw command generation.
          model._drawCommandsBuilt = false;
          frameState.commandList = [];
          scene.renderForSpecs();

          const drawCommands = sceneGraph.getDrawCommands();

          expect(drawCommands.length).toEqual(1);
          expect(drawCommands[0].pass).toEqual(Pass.TRANSLUCENT);
          expect(frameState.commandList.length).toEqual(1);
        });
    });

    it("builds draw commands for both opaque and translucent styled features", function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [
            ["${height} > 80", "color('red', 0.1)"],
            ["true", "color('blue')"],
          ],
        },
      });
      return style.readyPromise
        .then(function () {
          return loadAndZoomToModelExperimental(
            {
              gltf: buildingsMetadata,
            },
            scene
          );
        })
        .then(function (model) {
          model.style = style;
          const frameState = scene.frameState;
          const sceneGraph = model._sceneGraph;
          // Reset the draw commands so we can inspect the draw command generation.
          model._drawCommandsBuilt = false;
          frameState.commandList = [];
          scene.renderForSpecs();

          const drawCommands = sceneGraph.getDrawCommands();
          expect(drawCommands.length).toEqual(2);
          expect(drawCommands[0].pass).toEqual(Pass.OPAQUE);
          expect(drawCommands[1].pass).toEqual(Pass.TRANSLUCENT);
          expect(frameState.commandList.length).toEqual(2);
        });
    });

    it("builds draw commands for each primitive", function () {
      spyOn(
        ModelExperimentalSceneGraph.prototype,
        "buildDrawCommands"
      ).and.callThrough();
      spyOn(
        ModelExperimentalSceneGraph.prototype,
        "getDrawCommands"
      ).and.callThrough();
      return loadAndZoomToModelExperimental(
        { gltf: parentGltfUrl },
        scene
      ).then(function (model) {
        const sceneGraph = model._sceneGraph;
        const runtimeNodes = sceneGraph._runtimeNodes;

        let primitivesCount = 0;
        for (let i = 0; i < runtimeNodes.length; i++) {
          primitivesCount += runtimeNodes[i].runtimePrimitives.length;
        }

        const frameState = scene.frameState;
        frameState.commandList = [];
        scene.renderForSpecs();
        expect(
          ModelExperimentalSceneGraph.prototype.buildDrawCommands
        ).toHaveBeenCalled();
        expect(
          ModelExperimentalSceneGraph.prototype.getDrawCommands
        ).toHaveBeenCalled();
        expect(frameState.commandList.length).toEqual(primitivesCount);

        expect(model._drawCommandsBuilt).toEqual(true);

        // Reset the draw command list to see if they're re-built.
        model._drawCommandsBuilt = false;
        frameState.commandList = [];
        scene.renderForSpecs();
        expect(
          ModelExperimentalSceneGraph.prototype.buildDrawCommands
        ).toHaveBeenCalled();
        expect(
          ModelExperimentalSceneGraph.prototype.getDrawCommands
        ).toHaveBeenCalled();
        expect(frameState.commandList.length).toEqual(primitivesCount);
      });
    });

    it("traverses scene graph correctly", function () {
      return loadAndZoomToModelExperimental(
        { gltf: parentGltfUrl },
        scene
      ).then(function (model) {
        const sceneGraph = model._sceneGraph;
        const modelComponents = sceneGraph._modelComponents;
        const runtimeNodes = sceneGraph._runtimeNodes;

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
        const sceneGraph = model._sceneGraph;
        const modelComponents = sceneGraph._modelComponents;
        const runtimeNodes = sceneGraph._runtimeNodes;

        expect(modelComponents.upAxis).toEqual(Axis.Z);
        expect(modelComponents.forwardAxis).toEqual(Axis.X);

        expect(runtimeNodes[1].transform).toEqual(
          ModelExperimentalUtility.getNodeTransform(modelComponents.nodes[0])
        );
        expect(runtimeNodes[0].transform).toEqual(
          Matrix4.multiplyTransformation(
            runtimeNodes[1].transform,
            ModelExperimentalUtility.getNodeTransform(modelComponents.nodes[1]),
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
